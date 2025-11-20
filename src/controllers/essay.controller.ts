import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as essayService from '../services/essay.service';

export async function analyzeEssay(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await essayService.analyzeEssay(userId, req.body);
  res.status(202).json(result);
}

export async function getAnalysis(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { jobId } = req.params;

  const result = await essayService.getEssayAnalysis(jobId, userId);
  res.json(result);
}

