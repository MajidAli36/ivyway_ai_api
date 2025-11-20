import { prisma } from '../db/prisma';
import * as jobService from './job.service';

export async function transcribeAudio(userId: string, data: any) {
  const { audioUrl, language } = data;

  // Queue transcription job
  const jobId = await jobService.createJob({
    type: 'stt',
    userId,
    payload: {
      audioUrl,
      language: language || 'en',
    },
  });

  return { jobId, message: 'Transcription queued' };
}

export async function getTranscription(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId, type: 'stt' },
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

