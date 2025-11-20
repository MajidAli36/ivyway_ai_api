import { prisma } from '../db/prisma';
import * as jobService from './job.service';

export async function submitHomework(userId: string, data: any) {
  const { imageUrl, question, subject } = data;

  // Queue homework help job
  const jobId = await jobService.createJob({
    type: 'homework_help',
    userId,
    payload: {
      imageUrl,
      question,
      subject,
    },
  });

  return { jobId, message: 'Homework help queued' };
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

