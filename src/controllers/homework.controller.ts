import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as homeworkService from '../services/homework.service';

export async function submitHomework(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await homeworkService.submitHomework(userId, req.body);
  res.status(202).json(result);
}

export async function getHomeworkHelp(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { jobId } = req.params;

  const result = await homeworkService.getHomeworkHelp(jobId, userId);
  res.json(result);
}

