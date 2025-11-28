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
  const { conversationId, model, provider, language } = job.payload as JobPayload;

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
  const llmMessages: LLMMessage[] = messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  // Add system message for language
  llmMessages.unshift({
    role: 'system',
    content: `You are an AI tutor. Respond in ${language || 'English'}. Be helpful, clear, and engaging.`,
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

  // Save assistant message
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'assistant',
      content: llmResponse.text,
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

  return { success: true };
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

  return { quiz: { id: quiz.id, title: quiz.title } };
}

async function processEssayJob(job: Job) {
  const { content, essayType, topic } = job.payload as JobPayload;
  
  if (!content || !essayType || !topic) {
    throw new Error('content, essayType, and topic are required');
  }

  // Call LLM for essay analysis
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `You are an expert essay analyzer. Analyze the essay for ${essayType} writing on ${topic}.`,
    },
    {
      role: 'user',
      content: `Analyze this essay: ${content}`,
    },
  ];

  const provider = env.LLM_PROVIDER || 'gemini';
  const model = provider === 'openai' ? (env.TUTOR_MODEL_OPENAI || 'gpt-4o-mini') :
                provider === 'gemini' ? (env.TUTOR_MODEL_GEMINI || 'gemini-pro') :
                (env.TUTOR_MODEL_OLLAMA || 'llama3:8b');
  const response = await callTutorLLM({ model, provider, messages });

  return {
    feedback: response.text,
    suggestions: 'Review grammar, structure, and arguments',
  };
}

async function processHomeworkJob(job: Job) {
  const { imageUrl, question, subject } = job.payload as JobPayload;
  
  const subjectName = (subject as string) || 'mathematics';
  const problemText = (question as string) || (imageUrl ? 'Problem from image' : 'Homework problem');

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `You are an expert ${subjectName} tutor. Provide step-by-step solutions to homework problems. Always respond with a JSON object containing:
- finalAnswer: The final answer to the problem
- method: The method used to solve it
- difficulty: "easy", "medium", or "hard"
- steps: An array of step objects, each with:
  - stepNumber: number
  - description: string
  - working: string (optional, for equations/calculations)
  - explanation: string
- estimatedTime: number (in minutes)

Format your response as valid JSON only, no markdown.`,
    },
    {
      role: 'user',
      content: `Solve this ${subjectName} problem: ${problemText}${imageUrl ? `\n\nImage URL: ${imageUrl}` : ''}`,
    },
  ];

  const provider = env.LLM_PROVIDER || 'gemini';
  const model = provider === 'openai' ? (env.TUTOR_MODEL_OPENAI || 'gpt-4o-mini') :
                provider === 'gemini' ? (env.TUTOR_MODEL_GEMINI || 'gemini-pro') :
                (env.TUTOR_MODEL_OLLAMA || 'llama3:8b');
  const response = await callTutorLLM({ model, provider, messages });

  // Parse JSON response from AI
  let result: {
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
    // Try to extract JSON from the response (AI might wrap it in markdown code blocks)
    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }
    
    result = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse homework solution JSON:', error);
    console.error('Raw response:', response.text);
    // Fallback: create a simple structure from the text response
    result = {
      finalAnswer: 'See explanation below',
      method: 'Problem solving',
      difficulty: 'medium',
      estimatedTime: 10,
      steps: [
        {
          stepNumber: 1,
          description: 'Problem analysis',
          explanation: response.text,
        },
      ],
    };
  }

  return {
    finalAnswer: result.finalAnswer || result.answer || 'Solution provided',
    method: result.method || 'Problem solving',
    difficulty: result.difficulty || 'medium',
    steps: result.steps || [
      {
        stepNumber: 1,
        description: 'Solution',
        explanation: response.text,
      },
    ],
    estimatedTime: result.estimatedTime || 10,
    confidence: 0.8,
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

