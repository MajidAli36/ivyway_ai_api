import { prisma } from '../db/prisma';
import * as jobService from './job.service';

export async function submitHomework(userId: string, data: any) {
  const { imageUrl, question, subject } = data;

  // Validate input - at least one input method required
  if (!question && !imageUrl) {
    throw new Error('Either question text or image URL is required');
  }

  // Validate question text if provided
  if (question && typeof question === 'string' && question.trim().length === 0) {
    throw new Error('Question text cannot be empty');
  }

  // Validate question text length
  if (question && typeof question === 'string' && question.trim().length < 3) {
    throw new Error('Question text is too short. Please provide a more detailed problem description.');
  }

  // Queue homework help job
  const job = await jobService.createJob({
    type: 'homework_help',
    userId,
    payload: {
      imageUrl: imageUrl || undefined,
      question: question ? question.trim() : undefined,
      subject: subject || 'mathematics',
    },
  });

  return { jobId: job.id, message: 'Homework help queued' };
}

export async function getHomeworkHelp(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId, type: 'homework_help' },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  return {
    status: job.status,
    result: job.result,
    error: job.error,
  };
}

