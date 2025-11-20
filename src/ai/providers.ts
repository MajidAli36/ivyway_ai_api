import axios from 'axios';
import OpenAI from 'openai';
import { env } from '../config/env';

export interface LLMResponse {
  text: string;
  model?: string;
  provider: string;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw?: unknown;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callTutorLLM({
  model,
  provider,
  messages,
}: {
  model: string;
  provider: string;
  messages: LLMMessage[];
}): Promise<LLMResponse> {
  const start = Date.now();

  try {
    if (provider === 'openai') {
      if (!env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });

      const msg = res.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - start;

      return {
        text: msg,
        model: res.model,
        provider: 'openai',
        latencyMs,
        usage: res.usage ? {
          promptTokens: res.usage.prompt_tokens,
          completionTokens: res.usage.completion_tokens,
          totalTokens: res.usage.total_tokens,
        } : undefined,
        raw: res,
      };
    }

    if (provider === 'ollama') {
      const res = await axios.post(
        `${env.OLLAMA_BASE_URL}/api/chat`,
        {
          model,
          messages,
          stream: false,
        },
        { timeout: 60000 }
      );

      const msg = res.data.message?.content || '';
      const latencyMs = Date.now() - start;

      return {
        text: msg,
        model,
        provider: 'ollama',
        latencyMs,
        raw: res.data,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    const latencyMs = Date.now() - start;
    console.error('LLM call failed:', error);
    throw error;
  }
}

export async function generateLesson({
  topic,
  level,
  language,
  provider,
  model,
}: {
  topic: string;
  level: string;
  language: string;
  provider: string;
  model: string;
}): Promise<string> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: 'You are an expert educator. Generate comprehensive, engaging lesson content.',
    },
    {
      role: 'user',
      content: `Create a lesson on "${topic}" for ${level} level in ${language}. Include theory, examples, and practical applications.`,
    },
  ];

  const response = await callTutorLLM({ model, provider, messages });
  return response.text;
}

export async function generateQuiz({
  topic,
  numQuestions,
  language,
  provider,
  model,
}: {
  topic: string;
  numQuestions: number;
  language: string;
  provider: string;
  model: string;
}): Promise<string> {
  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: 'You are a quiz generator. Output JSON format with questions and answers.',
    },
    {
      role: 'user',
      content: `Generate ${numQuestions} quiz questions on "${topic}" in ${language}. Output as JSON with questions array containing type, prompt, answer, and choices.`,
    },
  ];

  const response = await callTutorLLM({ model, provider, messages });
  return response.text;
}

