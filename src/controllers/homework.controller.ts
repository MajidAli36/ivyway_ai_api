import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as homeworkService from '../services/homework.service';

export async function submitHomework(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { imageUrl, question, subject } = req.body;

    // Validate request body
    if (!question && !imageUrl) {
      res.status(400).json({ error: 'Either question text or image URL is required' });
      return;
    }

    const result = await homeworkService.submitHomework(userId, { imageUrl, question, subject });
    res.status(202).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to submit homework help request' });
  }
}

export async function getHomeworkHelp(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    const result = await homeworkService.getHomeworkHelp(jobId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Homework help not found' });
  }
}

