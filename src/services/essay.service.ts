import { prisma } from '../db/prisma';
import * as jobService from './job.service';
import { env } from '../config/env';

export async function analyzeEssay(userId: string, data: any) {
  const { content, essayType, topic } = data;

  // For now, queue the analysis job
  const jobId = await jobService.createJob({
    type: 'essay',
    userId,
    payload: {
      content,
      essayType,
      topic,
    },
  });

  return { jobId, message: 'Essay analysis queued' };
}

export async function getEssayAnalysis(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId, type: 'essay' },
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

