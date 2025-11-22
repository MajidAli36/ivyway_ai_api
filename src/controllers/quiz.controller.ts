import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as quizService from '../services/quiz.service';

export async function createQuiz(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await quizService.createQuiz(userId, req.body);
  res.status(201).json(result);
}

export async function getQuizzes(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const publicOnly = req.query.public === 'true';

  const quizzes = await quizService.getQuizzes(userId, limit, offset, publicOnly);
  res.json({ quizzes });
}

export async function getQuizById(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const quiz = await quizService.getQuizById(userId, id);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  res.json({ quiz });
}

export async function submitAttempt(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { quizId } = req.params;
  const { answers } = req.body;

  const result = await quizService.submitQuizAttempt(userId, quizId, answers);
  res.json(result);
}

export async function generateQuiz(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await quizService.generateQuiz(userId, req.body);
  res.status(202).json(result);
}

