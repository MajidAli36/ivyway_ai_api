import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ivy:ivy@localhost:5432/ivyway?schema=public',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'supersecret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Server
  PORT: parseInt(process.env.PORT || '5001'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // AI Providers
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
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

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
};

