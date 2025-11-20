import { prisma } from '../db/prisma';
import { callTutorLLM, generateLesson, generateQuiz, LLMMessage } from '../ai/providers';
import * as jobService from '../services/job.service';
import { env } from '../config/env';
import { Job, JobPayload } from '../types';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processTutorJob(job: Job) {
  const { conversationId, messageId, model, provider, language } = job.payload as JobPayload;

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

  // Call LLM
  const llmResponse = await callTutorLLM({ model, provider, messages: llmMessages });

  // Save assistant message
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'assistant',
      content: llmResponse.text,
      model,
      provider,
      promptTokens: llmResponse.usage?.promptTokens,
      completionTokens: llmResponse.usage?.completionTokens,
      latencyMs: llmResponse.latencyMs,
      raw: llmResponse.raw,
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
  const { topic, level, language } = job.payload as JobPayload;
  const provider = env.LLM_PROVIDER;
  const model = env.LESSON_MODEL;

  const content = await generateLesson({ topic, level, language, provider, model });

  return { content };
}

async function processQuizGenJob(job: Job) {
  const { topic, numQuestions, language } = job.payload as JobPayload;
  const provider = env.LLM_PROVIDER;
  const model = env.QUIZ_MODEL;

  const questions = await generateQuiz({ topic, numQuestions, language, provider, model });

  return { questions };
}

async function processEssayJob(job: Job) {
  const { content, essayType, topic } = job.payload as JobPayload;
  
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

  const provider = env.LLM_PROVIDER;
  const model = provider === 'openai' ? env.TUTOR_MODEL_OPENAI : env.TUTOR_MODEL_OLLAMA;
  const response = await callTutorLLM({ model, provider, messages });

  return {
    feedback: response.text,
    suggestions: 'Review grammar, structure, and arguments',
  };
}

async function processHomeworkJob(job: Job) {
  const { imageUrl, question, subject } = job.payload as JobPayload;
  
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `You are a helpful ${subject} tutor. Explain solutions clearly with step-by-step reasoning.`,
    },
    {
      role: 'user',
      content: `Help me solve: ${question || 'See image at ' + imageUrl}`,
    },
  ];

  const provider = env.LLM_PROVIDER;
  const model = provider === 'openai' ? env.TUTOR_MODEL_OPENAI : env.TUTOR_MODEL_OLLAMA;
  const response = await callTutorLLM({ model, provider, messages });

  return {
    explanation: response.text,
    steps: 'Step-by-step solution provided',
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
    transcript: 'Transcription result for audio at ' + audioUrl,
    language: language || 'en',
    confidence: 0.95,
    note: 'STT integration required for production',
  };
}

async function processDailyChallengeJob(job: Job) {
  // Implement daily challenge generation
  return { challenge: 'Daily challenge placeholder' };
}

async function processJob() {
  const job = await jobService.claimNextJob();

  if (!job) {
    return false;
  }

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
      result,
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

  while (true) {
    try {
      const processed = await processJob();
      if (!processed) {
        await sleep(1000); // Wait 1s if no jobs
      }
    } catch (error) {
      console.error('Worker error:', error);
      await sleep(5000); // Wait 5s on error
    }
  }
}

startWorker().catch(console.error);

