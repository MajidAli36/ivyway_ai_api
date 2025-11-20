import { prisma } from '../db/prisma';
import * as jobService from './job.service';
import { AppError } from '../middlewares/error.middleware';
import { env } from '../config/env';

export async function createLesson(userId: string, data: any) {
  const { title, content, language, isPublic } = data;

  // If content is empty, queue AI generation
  if (!content || content.trim() === '') {
    const jobId = await jobService.createJob({
      type: 'lesson_gen',
      userId,
      payload: { title, language: language || 'en' },
    });

    return { lesson: null, jobId };
  }

  const lesson = await prisma.lesson.create({
    data: {
      ownerId: userId,
      title,
      content,
      language: language || 'en',
      isPublic: isPublic || false,
    },
  });

  return { lesson };
}

export async function getLessons(userId: string, limit = 20, offset = 0, publicOnly = false) {
  const where: any = {};
  if (publicOnly) {
    where.isPublic = true;
  } else {
    where.ownerId = userId;
  }

  return prisma.lesson.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
  });
}

export async function searchLessons(query: string, limit = 20, offset = 0) {
  return prisma.$queryRaw`
    SELECT id, "ownerId", title, content, language, "isPublic", "createdAt" 
    FROM "Lesson"
    WHERE search @@ plainto_tsquery('simple', ${query})
    ORDER BY ts_rank(search, plainto_tsquery('simple', ${query})) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

