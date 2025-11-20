// Type definitions for better type safety

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface JobPayload {
  conversationId?: string;
  messageId?: string;
  model?: string;
  provider?: string;
  language?: string;
  topic?: string;
  level?: string;
  content?: string;
  essayType?: string;
  imageUrl?: string;
  question?: string;
  subject?: string;
  audioUrl?: string;
  numQuestions?: number;
  [key: string]: unknown;
}

export interface Job {
  id: string;
  type: string;
  userId: string;
  payload: JobPayload;
  status: string;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  nextRunAt?: Date;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobData {
  type: string;
  userId: string;
  payload: unknown;
  runAt?: Date;
}

export interface UpdateJobData {
  status?: string;
  result?: unknown;
  error?: string;
  nextRunAt?: Date;
  attempts?: number;
}

