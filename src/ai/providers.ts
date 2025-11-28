import axios from 'axios';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

    if (provider === 'gemini') {
      if (!env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }

      // First, try to list available models to find a working one
      let availableModels: string[] = [];
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
        const listResponse = await axios.get(listUrl, { timeout: 10000 });
        if (listResponse.data?.models) {
          availableModels = listResponse.data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));
        }
      } catch (error) {
        // If listing fails, continue with fallback models
        console.warn('Failed to list Gemini models, using fallback list');
      }

      // Use Google Generative AI SDK
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const modelName = model || env.TUTOR_MODEL_GEMINI || 'gemini-pro';
      
      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      if (conversationMessages.length === 0) {
        throw new Error('No conversation messages provided');
      }

      // Build the prompt with system message and conversation
      let prompt = '';
      if (systemMessage) {
        prompt += `${systemMessage.content}\n\n`;
      }

      // Combine all messages into a single prompt
      const userMessages = conversationMessages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n');
      
      const assistantMessages = conversationMessages
        .filter(m => m.role === 'assistant')
        .map(m => m.content)
        .join('\n\n');

      if (assistantMessages) {
        prompt += `Previous conversation:\n${assistantMessages}\n\n`;
      }
      prompt += userMessages || conversationMessages[conversationMessages.length - 1].content;

      // Filter available models to prefer free-tier models (avoid experimental/preview models)
      const freeTierModels = availableModels.filter(m => 
        !m.includes('preview') && 
        !m.includes('exp') && 
        !m.includes('experimental') &&
        (m.includes('gemini-pro') || m.includes('gemini-1.5-flash') || m.includes('gemini-1.5-pro'))
      );
      
      // Try models: first free-tier from available list, then common free-tier models, then others
      const modelVariants = availableModels.length > 0 
        ? [
            ...freeTierModels,
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            ...availableModels.filter(m => !freeTierModels.includes(m)),
            modelName
          ]
        : [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            modelName
          ];

      let lastError: any = null;
      let result: any = null;
      let usedModel = modelName;
      let retryDelay = 0;

      for (const modelVariant of modelVariants) {
        try {
          // Remove 'models/' prefix if present
          const cleanModelName = modelVariant.replace('models/', '');
          const geminiModel = genAI.getGenerativeModel({ model: cleanModelName });

          // If we have a retry delay from previous quota error, wait
          if (retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
            retryDelay = 0;
          }

          // Generate content
          result = await geminiModel.generateContent(prompt);
          usedModel = cleanModelName;
          break; // Success, exit loop
        } catch (error: any) {
          lastError = error;
          const errorMessage = error?.message || '';
          const status = error?.status || error?.response?.status;
          
          // Handle quota exceeded (429) - retry with delay
          if (status === 429 || errorMessage.includes('quota') || errorMessage.includes('429')) {
            // Extract retry delay from error if available
            const retryInfo = error?.errorDetails?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
            if (retryInfo?.retryDelay) {
              retryDelay = parseFloat(retryInfo.retryDelay.replace('s', '')) || 3;
            } else {
              retryDelay = 3; // Default 3 seconds
            }
            
            // If quota exceeded, try next model (might be different quota bucket)
            continue;
          }
          
          // If it's not a model not found error, don't try other variants
          if (!errorMessage.includes('not found') && !errorMessage.includes('404') && !errorMessage.includes('is not found')) {
            throw error;
          }
          // Continue to next variant
          continue;
        }
      }

      if (!result) {
        const availableInfo = availableModels.length > 0 
          ? ` Available models: ${availableModels.join(', ')}` 
          : '';
        throw new Error(`All Gemini model variants failed. Last error: ${lastError?.message || 'Unknown error'}.${availableInfo}`);
      }

      const response = result.response;
      const msg = response.text();

      const latencyMs = Date.now() - start;

      // Extract token usage if available
      const usageMetadata = response.usageMetadata;

      return {
        text: msg,
        model: usedModel,
        provider: 'gemini',
        latencyMs,
        usage: usageMetadata ? {
          promptTokens: usageMetadata.promptTokenCount || 0,
          completionTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        } : undefined,
        raw: result,
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

