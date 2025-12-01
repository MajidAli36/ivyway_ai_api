import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ivy:ivy@localhost:5432/ivyway?schema=public',

  // JWT - Secrets must be set in .env file (no fallbacks)
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Server
  PORT: parseInt(process.env.PORT || '5001'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // AI Providers - API keys must be set in .env file
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  // Models
  TUTOR_MODEL_OPENAI: process.env.TUTOR_MODEL_OPENAI || 'gpt-4o-mini',
  TUTOR_MODEL_GEMINI: process.env.TUTOR_MODEL_GEMINI || 'gemini-pro',
  TUTOR_MODEL_OLLAMA: process.env.TUTOR_MODEL_OLLAMA || 'llama3:8b',
  LESSON_MODEL: process.env.LESSON_MODEL || 'gemini-pro',
  QUIZ_MODEL: process.env.QUIZ_MODEL || 'gemini-pro',

  // File Storage
  FILE_STORAGE: process.env.FILE_STORAGE || 'local',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),

  // Cloudinary (optional - only required if using Cloudinary)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || undefined,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || undefined,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || undefined,

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

