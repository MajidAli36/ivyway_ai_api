import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as lessonService from '../services/lesson.service';

export async function createLesson(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await lessonService.createLesson(userId, req.body);
  res.status(201).json(result);
}

export async function getLessons(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const publicOnly = req.query.public === 'true';

  const lessons = await lessonService.getLessons(userId, limit, offset, publicOnly);
  res.json({ lessons });
}

export async function searchLessons(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const lessons = await lessonService.searchLessons(query, limit, offset);
    res.json({ lessons });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}

