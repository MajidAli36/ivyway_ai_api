import { prisma } from '../db/prisma';
import { callTutorLLM, generateLesson, generateQuiz, LLMMessage } from '../ai/providers';
import * as jobService from '../services/job.service';
import { env } from '../config/env';
import { Job, JobPayload } from '../types';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to map AI question types to QType enum
function mapQuestionType(type: string | undefined): 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' {
  if (!type) return 'MCQ';
  
  const normalized = type.toLowerCase().trim();
  if (normalized.includes('true') || normalized.includes('false') || normalized === 'true_false') {
    return 'TRUE_FALSE';
  }
  if (normalized.includes('short') || normalized.includes('text') || normalized === 'short_answer') {
    return 'SHORT_ANSWER';
  }
  // Default to MCQ for multiple-choice, multiple choice, mcq, etc.
  return 'MCQ';
}

// Helper function to sanitize raw response for JSON storage
function sanitizeRawResponse(raw: any): any {
  if (!raw) return null;
  
  try {
    // Convert to JSON string and back to remove functions
    const jsonString = JSON.stringify(raw, (_key, value) => {
      // Skip functions
      if (typeof value === 'function') {
        return undefined;
      }
      // Handle special objects that might contain functions
      if (value && typeof value === 'object') {
        // Check if it's an object with function properties
        const hasFunctions = Object.values(value).some(v => typeof v === 'function');
        if (hasFunctions) {
          // Return a simplified version
          return Object.fromEntries(
            Object.entries(value).filter(([_, v]) => typeof v !== 'function')
          );
        }
      }
      return value;
    });
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to sanitize raw response, storing minimal data:', error);
    // Return minimal safe data
    return {
      error: 'Could not serialize full response',
      timestamp: new Date().toISOString(),
    };
  }
}

async function processTutorJob(job: Job) {
  const { conversationId, model, provider, language, subject, grade } = job.payload as JobPayload;

  if (!conversationId) {
    throw new Error('conversationId is required');
  }

  // Get last 25 messages for context
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });

  // Build context for LLM
  const llmMessages: LLMMessage[] = messages.map((msg: any) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  // Build subject-specific system prompt with strong enforcement
  let subjectContext = '';
  if (subject) {
    const subjectName = subject.trim();
    subjectContext = `CRITICAL SUBJECT RESTRICTION: The student has selected "${subjectName}" as their subject. 

You MUST:
- ONLY provide answers, explanations, examples, and follow-up questions related to ${subjectName}
- Stay strictly within the ${subjectName} domain
- NOT include content from Mathematics, Science, Physics, Chemistry, Biology, English, History, Geography, Computer Science, or Art unless it directly and explicitly relates to ${subjectName}
- Focus exclusively on ${subjectName} concepts, topics, and examples

You MUST NOT:
- Mix subjects or provide examples from other subjects
- Include math examples when the subject is Science
- Include science examples when the subject is Mathematics
- Provide content from unrelated subjects

If the student's question seems to relate to multiple subjects, interpret it ONLY in the context of ${subjectName}.`;
  }

  const gradeContext = grade 
    ? `The student is in grade ${grade}. Adjust your explanations to be age-appropriate and suitable for a grade ${grade} level. Use vocabulary and concepts appropriate for this grade level.`
    : '';

  // Enhanced system message that requests structured response with subject enforcement
  const systemPrompt = `You are an AI tutor. Respond in ${language || 'English'}. Be helpful, clear, and engaging.

${subjectContext}

${gradeContext}

When responding, provide a comprehensive answer. If possible, structure your response to include:
- A clear and detailed explanation${subject ? ` (ONLY related to ${subject})` : ''}
- Your confidence level in the answer (as a number between 0 and 1)
- Relevant sources or topics if applicable${subject ? ` (ONLY from ${subject})` : ''}
- Follow-up questions that would help the student learn more${subject ? ` (ONLY about ${subject})` : ''}

${subject ? `CRITICAL: All examples, explanations, follow-up questions, and content MUST be exclusively about ${subject}. Do not mix subjects or provide examples from other subjects.` : ''}

Format your response naturally in conversational style. The student will see your full response, so make it educational and engaging.`;

  llmMessages.unshift({
    role: 'system',
    content: systemPrompt,
  });

  const modelName = model || (
    provider === 'openai' ? env.TUTOR_MODEL_OPENAI :
    provider === 'gemini' ? env.TUTOR_MODEL_GEMINI :
    env.TUTOR_MODEL_OLLAMA
  );
  const providerName = provider || env.LLM_PROVIDER || 'gemini';

  // Call LLM
  const llmResponse = await callTutorLLM({ 
    model: modelName, 
    provider: providerName, 
    messages: llmMessages 
  });

  // Parse the AI response to extract structured information
  const responseText = llmResponse.text.trim();
  
  // Try to extract structured data from the response
  // Look for JSON-like structures or parse natural language
  let parsedResponse: {
    reply: string;
    confidence?: number;
    sources?: string[];
    followUpQuestions?: string[];
  } = {
    reply: responseText,
  };

  // Try to parse JSON if the response contains structured data
  try {
    // Check if response contains JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);
      if (jsonData.reply || jsonData.answer || jsonData.content) {
        parsedResponse.reply = jsonData.reply || jsonData.answer || jsonData.content || responseText;
        parsedResponse.confidence = jsonData.confidence;
        parsedResponse.sources = jsonData.sources;
        parsedResponse.followUpQuestions = jsonData.followUpQuestions || jsonData.followUp;
      }
    }
  } catch (error) {
    // If JSON parsing fails, use the full response as reply
    // We'll calculate confidence based on response quality
  }

  // Calculate confidence based on response characteristics if not provided
  if (parsedResponse.confidence === undefined) {
    // Base confidence on response length and quality indicators
    const hasExplanation = responseText.length > 100;
    const hasStructure = responseText.includes('\n') || responseText.includes('.');
    const hasDetails = responseText.split('.').length > 2;
    
    // Calculate confidence: 0.7-0.95 based on quality indicators
    let calculatedConfidence = 0.7;
    if (hasExplanation) calculatedConfidence += 0.1;
    if (hasStructure) calculatedConfidence += 0.05;
    if (hasDetails) calculatedConfidence += 0.1;
    parsedResponse.confidence = Math.min(calculatedConfidence, 0.95);
  }

  // Extract follow-up questions if not provided
  if (!parsedResponse.followUpQuestions || parsedResponse.followUpQuestions.length === 0) {
    // Look for question patterns in the response
    const questionPattern = /(?:Would you like to|Do you|Can you|Have you|What|How|Why|When|Where).*?\?/gi;
    const questions = responseText.match(questionPattern);
    if (questions && questions.length > 0) {
      parsedResponse.followUpQuestions = questions.slice(0, 3).map(q => q.trim());
    }
  }

  // Extract sources if mentioned but not structured
  if (!parsedResponse.sources || parsedResponse.sources.length === 0) {
    // Look for source mentions (topics, subjects, concepts)
    const sourcePattern = /(?:from|based on|according to|source:|topic:)\s+([^\.\n]+)/gi;
    const sources = [];
    let match;
    while ((match = sourcePattern.exec(responseText)) !== null && sources.length < 3) {
      sources.push(match[1].trim());
    }
    if (sources.length > 0) {
      parsedResponse.sources = sources;
    }
  }

  // Save assistant message
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'assistant',
      content: parsedResponse.reply,
      model: llmResponse.model || modelName, // Use actual model from response
      provider: providerName,
      promptTokens: llmResponse.usage?.promptTokens,
      completionTokens: llmResponse.usage?.completionTokens,
      latencyMs: llmResponse.latencyMs,
      raw: sanitizeRawResponse(llmResponse.raw), // Sanitize to remove functions
    },
  });

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Return structured response for the client
  return {
    reply: parsedResponse.reply,
    content: parsedResponse.reply, // Also include for backward compatibility
    confidence: parsedResponse.confidence,
    sources: parsedResponse.sources || [],
    followUpQuestions: parsedResponse.followUpQuestions || [],
  };
}

async function processLessonGenJob(job: Job) {
  const { topic, level, language, title } = job.payload as JobPayload;
  const provider = env.LLM_PROVIDER || 'gemini';
  const model = env.LESSON_MODEL || 'gemini-pro';

  if (!topic) {
    throw new Error('topic is required');
  }

  const lessonTitle = (title as string) || (topic as string);
  const lessonLevel = (level as string) || 'intermediate';
  const lessonLanguage = (language as string) || 'en';

  const content = await generateLesson({ 
    topic: topic as string, 
    level: lessonLevel, 
    language: lessonLanguage, 
    provider, 
    model 
  });

  // Create lesson in database
  const lesson = await prisma.lesson.create({
    data: {
      ownerId: job.userId,
      title: lessonTitle,
      content: content,
      language: lessonLanguage,
      isPublic: false,
    },
  });

  return { 
    lessonId: lesson.id,
    content: content,
    title: lesson.title,
  };
}

async function processQuizGenJob(job: Job) {
  const { topic, numQuestions = 10, language = 'en' } = job.payload as JobPayload;
  const provider = env.LLM_PROVIDER || 'gemini';
  const model = env.QUIZ_MODEL || 'gemini-pro';

  if (!topic) {
    throw new Error('Topic is required for quiz generation');
  }

  const questionsText = await generateQuiz({ 
    topic: topic as string, 
    numQuestions: numQuestions as number, 
    language: language as string, 
    provider, 
    model 
  });
  
  // Parse JSON response from AI
  let questions: Array<{
    type?: string;
    prompt?: string;
    question?: string;
    answer?: string;
    choices?: Array<string | { text?: string; label?: string; isCorrect?: boolean; correct?: boolean }>;
  }>;
  
  try {
    // Try to extract JSON from the response (AI might wrap it in markdown code blocks)
    let jsonText = questionsText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonText);
    questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.error('Failed to parse quiz questions JSON:', error);
    console.error('Raw response:', questionsText);
    throw new Error(`Failed to parse quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions generated or invalid format');
  }

  // Create quiz in database
  const quiz = await prisma.quiz.create({
    data: {
      ownerId: job.userId,
      title: `${topic} Quiz`,
      language: language as string,
      isPublic: false,
    },
  });

  // Create questions and choices
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const question = await prisma.question.create({
      data: {
        quizId: quiz.id,
        type: mapQuestionType(q.type), // Use helper function to map types
        prompt: q.prompt || q.question || '',
        answer: q.answer || '',
        order: i + 1,
      },
    });

    if (q.choices && Array.isArray(q.choices) && q.choices.length > 0) {
      // Get the answer text for matching
      const answerText = (q.answer || '').trim().toLowerCase();
      
      // Create choices and determine which one is correct
      const choicesData = q.choices.map((choice: any, idx: number) => {
        const choiceText = typeof choice === 'string' ? choice : (choice.text || choice.label || '');
        const choiceTextLower = choiceText.trim().toLowerCase();
        
        // Determine if this choice is correct
        let isCorrect = false;
        
        // First check if explicitly marked as correct
        if (typeof choice === 'object') {
          isCorrect = choice.isCorrect || choice.correct || false;
        }
        
        // If answer field exists, match it with choice text
        if (answerText && !isCorrect) {
          // Check for exact match or significant overlap
          isCorrect = choiceTextLower === answerText ||
                     (choiceTextLower.length > 5 && answerText.length > 5 && 
                      (choiceTextLower.includes(answerText) || answerText.includes(choiceTextLower)));
        }
        
        // Fallback: if no answer field and no explicit marking, default to first choice
        if (!answerText && !isCorrect && idx === 0) {
          isCorrect = true;
        }
        
        return {
          questionId: question.id,
          text: choiceText,
          isCorrect,
        };
      });
      
      await prisma.choice.createMany({
        data: choicesData,
      });
    }
  }

  // Return quiz info along with raw AI response for storage in Job.result
  return { 
    quiz: { id: quiz.id, title: quiz.title },
    rawAiResponse: questionsText, // Save the raw AI model response
    parsedQuestions: questions.length // Include count of parsed questions
  };
}

async function processEssayJob(job: Job) {
  // Legacy support - redirect to outline or grade based on payload
  const { content, topic } = job.payload as JobPayload;
  
  if (!content || typeof content !== 'string') {
    throw new Error('content is required');
  }

  // If it looks like a thesis (short), treat as outline, otherwise as grade
  if (content.length < 500) {
    return await processEssayOutlineJob({
      ...job,
      payload: { ...job.payload, thesis: content, subject: topic || 'General' }
    } as Job);
  } else {
    return await processEssayGradeJob({
      ...job,
      payload: { ...job.payload, draft: content }
    } as Job);
  }
}

async function processEssayOutlineJob(job: Job) {
  const { thesis, subject } = job.payload as JobPayload;
  
  const thesisText = typeof thesis === 'string' ? thesis : '';
  if (!thesisText || !thesisText.trim()) {
    throw new Error('Thesis statement is required');
  }

  const subjectName = (typeof subject === 'string' ? subject : 'General') || 'General';

  // Enhanced prompt for structured outline generation
  const systemPrompt = `You are an expert essay writing tutor. Generate a comprehensive, structured essay outline based on a thesis statement.

You MUST respond with ONLY valid JSON in this exact format:
{
  "thesis": "the thesis statement",
  "outline": {
    "introduction": {
      "hook": "engaging opening sentence",
      "background": "context and background information",
      "thesis": "the thesis statement restated"
    },
    "body": [
      {
        "paragraphNumber": 1,
        "topic": "main topic of paragraph",
        "mainPoint": "the main argument/point",
        "supportingEvidence": ["evidence point 1", "evidence point 2", "evidence point 3"],
        "transition": "transition sentence to next paragraph"
      }
    ],
    "conclusion": {
      "restateThesis": "thesis restated in different words",
      "summary": "summary of main points",
      "callToAction": "final thought or call to action"
    }
  }
}

Generate 3-5 body paragraphs. Make the outline comprehensive, educational, and well-structured.`;

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `Generate a comprehensive essay outline for this thesis statement in the subject of ${subjectName}:\n\n"${thesisText}"\n\nRespond with ONLY the JSON object, no markdown, no explanations.`,
    },
  ];

  const provider = env.LLM_PROVIDER || 'gemini';
  const model = provider === 'openai' ? (env.TUTOR_MODEL_OPENAI || 'gpt-4o-mini') :
                provider === 'gemini' ? (env.TUTOR_MODEL_GEMINI || 'gemini-pro') :
                (env.TUTOR_MODEL_OLLAMA || 'llama3:8b');
  const response = await callTutorLLM({ model, provider, messages });

  // Parse JSON response
  let parsedResult: any;
  try {
    let jsonText = response.text.trim();
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }
    
    parsedResult = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse essay outline JSON:', error);
    console.error('Raw response:', response.text);
    throw new Error('AI returned invalid JSON format. Please try again.');
  }

  // Validate and structure the response
  if (!parsedResult.outline || !parsedResult.outline.introduction || !parsedResult.outline.body) {
    throw new Error('AI response missing required outline structure');
  }

  const wordCountEstimate = thesisText.split(/\s+/).length * 50; // Rough estimate
  
  return {
    thesis: parsedResult.thesis || thesisText,
    outline: {
      introduction: {
        hook: parsedResult.outline.introduction.hook || '',
        background: parsedResult.outline.introduction.background || '',
        thesis: parsedResult.outline.introduction.thesis || parsedResult.thesis || thesisText,
      },
      body: Array.isArray(parsedResult.outline.body) ? parsedResult.outline.body.map((para: any, index: number) => ({
        paragraphNumber: para.paragraphNumber || index + 1,
        topic: para.topic || `Body Paragraph ${index + 1}`,
        mainPoint: para.mainPoint || '',
        supportingEvidence: Array.isArray(para.supportingEvidence) ? para.supportingEvidence : [],
        transition: para.transition || '',
      })) : [],
      conclusion: {
        restateThesis: parsedResult.outline.conclusion?.restateThesis || '',
        summary: parsedResult.outline.conclusion?.summary || '',
        callToAction: parsedResult.outline.conclusion?.callToAction || '',
      },
    },
    wordCount: wordCountEstimate,
    estimatedTime: Math.ceil(wordCountEstimate / 15), // 15 words per minute
    difficulty: 'medium' as const,
  };
}

async function processEssayGradeJob(job: Job) {
  const { draft, focusAreas } = job.payload as JobPayload;
  
  const draftText = typeof draft === 'string' ? draft : '';
  if (!draftText || !draftText.trim()) {
    throw new Error('Essay draft is required');
  }

  const focusAreasList = Array.isArray(focusAreas) ? focusAreas : [];
  const focusText = focusAreasList.length > 0 
    ? ` Pay special attention to: ${focusAreasList.join(', ')}.`
    : '';

  // Enhanced prompt for structured grading
  const systemPrompt = `You are an expert essay grader and writing tutor. Provide comprehensive, detailed feedback on an essay draft.

You MUST respond with ONLY valid JSON in this exact format:
{
  "score": 85,
  "overallFeedback": "comprehensive feedback on the essay",
  "rubric": {
    "content": {
      "score": 18,
      "maxScore": 20,
      "feedback": "feedback on content quality"
    },
    "organization": {
      "score": 13,
      "maxScore": 15,
      "feedback": "feedback on structure and organization"
    },
    "style": {
      "score": 12,
      "maxScore": 15,
      "feedback": "feedback on writing style"
    },
    "grammar": {
      "score": 17,
      "maxScore": 20,
      "feedback": "feedback on grammar and mechanics"
    }
  },
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"]
}

Score the essay on a scale of 0-100. Be fair, constructive, and educational. Provide specific, actionable feedback.${focusText}`;

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `Grade and provide detailed feedback on this essay draft:\n\n"${draftText}"\n\nRespond with ONLY the JSON object, no markdown, no explanations.`,
    },
  ];

  const provider = env.LLM_PROVIDER || 'gemini';
  const model = provider === 'openai' ? (env.TUTOR_MODEL_OPENAI || 'gpt-4o-mini') :
                provider === 'gemini' ? (env.TUTOR_MODEL_GEMINI || 'gemini-pro') :
                (env.TUTOR_MODEL_OLLAMA || 'llama3:8b');
  const response = await callTutorLLM({ model, provider, messages });

  // Parse JSON response
  let parsedResult: any;
  try {
    let jsonText = response.text.trim();
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }
    
    parsedResult = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse essay grade JSON:', error);
    console.error('Raw response:', response.text);
    throw new Error('AI returned invalid JSON format. Please try again.');
  }

  // Validate and structure the response
  const score = typeof parsedResult.score === 'number' ? Math.max(0, Math.min(100, parsedResult.score)) : 75;
  
  return {
    score,
    overallFeedback: parsedResult.overallFeedback || parsedResult.feedback || 'Essay reviewed successfully.',
    rubric: {
      content: {
        score: parsedResult.rubric?.content?.score || Math.round(score * 0.2),
        maxScore: parsedResult.rubric?.content?.maxScore || 20,
        feedback: parsedResult.rubric?.content?.feedback || 'Content evaluation provided.',
      },
      organization: {
        score: parsedResult.rubric?.organization?.score || Math.round(score * 0.15),
        maxScore: parsedResult.rubric?.organization?.maxScore || 15,
        feedback: parsedResult.rubric?.organization?.feedback || 'Organization evaluation provided.',
      },
      style: {
        score: parsedResult.rubric?.style?.score || Math.round(score * 0.15),
        maxScore: parsedResult.rubric?.style?.maxScore || 15,
        feedback: parsedResult.rubric?.style?.feedback || 'Style evaluation provided.',
      },
      grammar: {
        score: parsedResult.rubric?.grammar?.score || Math.round(score * 0.2),
        maxScore: parsedResult.rubric?.grammar?.maxScore || 20,
        feedback: parsedResult.rubric?.grammar?.feedback || 'Grammar evaluation provided.',
      },
    },
    suggestions: Array.isArray(parsedResult.suggestions) ? parsedResult.suggestions : 
                 (parsedResult.suggestions ? [parsedResult.suggestions] : []),
    strengths: Array.isArray(parsedResult.strengths) ? parsedResult.strengths : [],
    areasForImprovement: Array.isArray(parsedResult.areasForImprovement) ? parsedResult.areasForImprovement : [],
  };
}

async function processHomeworkJob(job: Job) {
  const { imageUrl, question, subject } = job.payload as JobPayload;
  
  const subjectName = (typeof subject === 'string' ? subject : 'mathematics') || 'mathematics';
  const problemText = (typeof question === 'string' ? question : '') || (imageUrl ? 'Problem from image' : 'Homework problem');

  if (!problemText || problemText.trim().length === 0) {
    throw new Error('Problem question is required');
  }

  // Enhanced system prompt for structured, educational solutions
  const systemPrompt = `You are an expert ${subjectName} tutor and educator. Your goal is to help students understand problems by providing clear, step-by-step solutions.

You MUST respond with ONLY valid JSON in this exact format:
{
  "finalAnswer": "the final answer clearly stated",
  "method": "the method or approach used to solve the problem",
  "difficulty": "easy" | "medium" | "hard",
  "steps": [
    {
      "stepNumber": 1,
      "description": "what we do in this step",
      "working": "mathematical work/calculations (if applicable)",
      "explanation": "why we do this step and what it means"
    }
  ],
  "estimatedTime": number (in minutes)
}

CRITICAL REQUIREMENTS:
- Provide 3-8 detailed steps that break down the solution
- Each step should be educational and help the student understand the process
- Include working/calculations for mathematical problems
- Explain WHY each step is taken, not just WHAT to do
- Make the solution clear enough for a student to follow and learn from
- The finalAnswer should be clearly stated with units if applicable
- Difficulty should reflect the complexity: easy (basic), medium (requires some thinking), hard (complex/multi-step)
- estimatedTime should be realistic for solving this problem

Format your response as valid JSON only, no markdown code blocks, no explanations outside the JSON.`;

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `Solve this ${subjectName} problem step-by-step:\n\n"${problemText.trim()}"${imageUrl ? `\n\nNote: There is an image associated with this problem.` : ''}\n\nProvide a comprehensive, educational solution that helps the student understand the process. Respond with ONLY the JSON object.`,
    },
  ];

  const provider = env.LLM_PROVIDER || 'gemini';
  const model = provider === 'openai' ? (env.TUTOR_MODEL_OPENAI || 'gpt-4o-mini') :
                provider === 'gemini' ? (env.TUTOR_MODEL_GEMINI || 'gemini-pro') :
                (env.TUTOR_MODEL_OLLAMA || 'llama3:8b');
  const response = await callTutorLLM({ model, provider, messages });

  // Parse JSON response from AI
  let parsedResult: {
    finalAnswer?: string;
    answer?: string;
    method?: string;
    difficulty?: string;
    steps?: Array<{
      stepNumber?: number;
      description?: string;
      working?: string;
      explanation?: string;
    }>;
    estimatedTime?: number;
  };

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```\s*$/, '').trim();
    }
    
    // Try to find JSON object if wrapped in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    parsedResult = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse homework solution JSON:', error);
    console.error('Raw response:', response.text);
    throw new Error('AI returned invalid JSON format. Please try again with a clearer problem description.');
  }

  // Validate and structure the response
  if (!parsedResult.finalAnswer && !parsedResult.answer) {
    throw new Error('AI response missing final answer');
  }

  // Ensure steps array exists and is valid
  let steps = Array.isArray(parsedResult.steps) ? parsedResult.steps : [];
  
  // If no steps provided, create a fallback step from the response
  if (steps.length === 0) {
    steps = [{
      stepNumber: 1,
      description: 'Solution provided',
      explanation: response.text.substring(0, 500), // Use first 500 chars of response
    }];
  }

  // Normalize step numbers and ensure all required fields
  steps = steps.map((step, index) => ({
    stepNumber: step.stepNumber || index + 1,
    description: step.description || `Step ${index + 1}`,
    working: step.working || undefined,
    explanation: step.explanation || step.description || 'See working above',
  }));

  // Validate difficulty
  const difficulty = ['easy', 'medium', 'hard'].includes(parsedResult.difficulty || '')
    ? (parsedResult.difficulty as 'easy' | 'medium' | 'hard')
    : 'medium';

  // Calculate estimated time if not provided
  const estimatedTime = parsedResult.estimatedTime || Math.max(5, Math.ceil(steps.length * 2));

  return {
    finalAnswer: parsedResult.finalAnswer || parsedResult.answer || 'Solution provided',
    method: parsedResult.method || 'Problem solving',
    difficulty,
    steps,
    estimatedTime,
    confidence: steps.length >= 3 ? 0.9 : 0.7, // Higher confidence with more detailed steps
  };
}

async function processSTTJob(job: Job) {
  const { audioUrl, language } = job.payload as JobPayload;
  
  // Note: Actual STT would require integration with services like:
  // - OpenAI Whisper API
  // - Google Cloud Speech-to-Text
  // - AWS Transcribe
  // This is a placeholder for the logic
  
  return {
    transcript: 'Transcription result for audio at ' + (audioUrl || ''),
    language: language || 'en',
    confidence: 0.95,
    note: 'STT integration required for production',
  };
}

async function processDailyChallengeJob(_job: Job) {
  // Implement daily challenge generation
  return { challenge: 'Daily challenge placeholder' };
}

async function processJob() {
  const jobData = await jobService.claimNextJob();

  if (!jobData) {
    return false;
  }

  // Convert jobData to Job type
  const job: Job = {
    id: jobData.id,
    type: jobData.type,
    userId: jobData.userId,
    payload: jobData.payload as JobPayload,
    status: jobData.status,
    attempts: jobData.attempts,
    maxAttempts: jobData.maxAttempts,
    runAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    let result;

    switch (job.type) {
      case 'ai_tutor':
        result = await processTutorJob(job);
        break;
      case 'lesson_gen':
        result = await processLessonGenJob(job);
        break;
      case 'quiz_gen':
        result = await processQuizGenJob(job);
        break;
      case 'essay':
        result = await processEssayJob(job);
        break;
      case 'essay_outline':
        result = await processEssayOutlineJob(job);
        break;
      case 'essay_grade':
        result = await processEssayGradeJob(job);
        break;
      case 'homework_help':
        result = await processHomeworkJob(job);
        break;
      case 'stt':
        result = await processSTTJob(job);
        break;
      case 'daily_challenge':
        result = await processDailyChallengeJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await jobService.updateJob(job.id, {
      status: 'completed',
      result: result as any,
    });
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    const attempts = job.attempts + 1;

    if (attempts >= job.maxAttempts) {
      await jobService.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts,
      });
    } else {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempts), 60000);
      await jobService.updateJob(job.id, {
        status: 'queued',
        error: error instanceof Error ? error.message : 'Unknown error',
        nextRunAt: new Date(Date.now() + delay),
        attempts,
      });
    }
  }

  return true;
}

export async function startWorker() {
  console.log('🚀 Job worker started');

  let consecutiveEmptyPolls = 0;
  const MAX_EMPTY_POLLS = 4; // Max backoff at 4 consecutive empty polls
  const BASE_DELAY = 2000; // 2 seconds base delay (more conservative)
  const MAX_DELAY = 10000; // Max 10 seconds between polls when idle
  const POST_JOB_DELAY = 100; // Small delay after processing a job

  while (true) {
    try {
      const processed = await processJob();
      if (!processed) {
        // Exponential backoff when no jobs found
        consecutiveEmptyPolls++;
        // More aggressive backoff: 2s -> 3s -> 5s -> 8s -> 10s (capped)
        const delay = Math.min(
          BASE_DELAY * Math.pow(1.5, Math.min(consecutiveEmptyPolls - 1, MAX_EMPTY_POLLS)),
          MAX_DELAY
        );
        await sleep(Math.round(delay));
      } else {
        // Reset counter when job is processed
        consecutiveEmptyPolls = 0;
        // Small delay to prevent rapid-fire polling if jobs complete quickly
        await sleep(POST_JOB_DELAY);
      }
    } catch (error) {
      console.error('Worker error:', error);
      consecutiveEmptyPolls = 0; // Reset on error
      await sleep(5000); // Wait 5s on error
    }
  }
}

