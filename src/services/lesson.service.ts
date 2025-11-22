import { prisma } from '../db/prisma';
import * as jobService from './job.service';

export async function createLesson(userId: string, data: any) {
  const { title, content, language, isPublic } = data;

  // If content is empty, queue AI generation
  if (!content || content.trim() === '') {
    const job = await jobService.createJob({
      type: 'lesson_gen',
      userId,
      payload: { 
        topic: title, 
        level: 'intermediate', // Default level, can be made configurable
        language: language || 'en',
        title, // Keep title for lesson creation
      },
    });

    return { lesson: null, jobId: job.id };
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

export async function getLessonById(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      ownerId: userId, // Ensure user owns the lesson
    },
  });

  return lesson;
}

