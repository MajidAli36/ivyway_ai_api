import { prisma } from '../db/prisma';
import * as jobService from './job.service';

export async function generateOutline(userId: string, data: { thesis: string; subject?: string }) {
  const { thesis, subject } = data;

  if (!thesis || !thesis.trim()) {
    throw new Error('Thesis statement is required');
  }

  const job = await jobService.createJob({
    type: 'essay_outline',
    userId,
    payload: {
      thesis: thesis.trim(),
      subject: subject || 'General',
    },
  });

  return { jobId: job.id, message: 'Essay outline generation queued' };
}

export async function gradeEssay(userId: string, data: { draft: string; rubric?: string; focusAreas?: string[] }) {
  const { draft, rubric, focusAreas } = data;

  if (!draft || !draft.trim()) {
    throw new Error('Essay draft is required');
  }

  const job = await jobService.createJob({
    type: 'essay_grade',
    userId,
    payload: {
      draft: draft.trim(),
      rubric,
      focusAreas: focusAreas || [],
    },
  });

  return { jobId: job.id, message: 'Essay grading queued' };
}

export async function getEssayAnalysis(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: { 
      id: jobId, 
      userId, 
      type: { in: ['essay', 'essay_outline', 'essay_grade'] }
    },
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

