import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  bio: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  profileImage: z.string().url().optional().nullable(),
});

export const tutorMessageSchema = z.object({
  content: z.string().min(1),
  conversationId: z.string().optional(),
});

export const lessonCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  language: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const quizCreateSchema = z.object({
  title: z.string().min(1),
  questions: z.array(z.object({
    type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
    prompt: z.string().min(1),
    answer: z.string().optional(),
    choices: z.array(z.object({
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })).optional(),
    order: z.number(),
  })),
  language: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const flashcardCreateSchema = z.object({
  title: z.string().min(1),
  cards: z.array(z.object({
    front: z.string().min(1),
    back: z.string().min(1),
  })),
});

export const studyTaskCreateSchema = z.object({
  title: z.string().min(1),
  details: z.string().optional(),
  due: z.string().datetime(),
  repeat: z.string().optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1),
  type: z.enum(['lesson', 'quiz']).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

