import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as essayService from '../services/essay.service';

export async function generateOutline(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { thesis, subject } = req.body;

    if (!thesis || !thesis.trim()) {
      res.status(400).json({ error: 'Thesis statement is required' });
      return;
    }

    const result = await essayService.generateOutline(userId, { thesis, subject });
    res.status(202).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to generate outline' });
  }
}

export async function gradeEssay(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { draft, rubric, focusAreas } = req.body;

    if (!draft || !draft.trim()) {
      res.status(400).json({ error: 'Essay draft is required' });
      return;
    }

    const result = await essayService.gradeEssay(userId, { draft, rubric, focusAreas });
    res.status(202).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to grade essay' });
  }
}

export async function getAnalysis(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { jobId } = req.params;

    const result = await essayService.getEssayAnalysis(jobId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Analysis not found' });
  }
}

