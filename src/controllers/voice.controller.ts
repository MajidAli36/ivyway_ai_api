import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as voiceService from '../services/voice.service';

export async function transcribeAudio(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await voiceService.transcribeAudio(userId, req.body);
  res.status(202).json(result);
}

export async function getTranscription(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { jobId } = req.params;

  const result = await voiceService.getTranscription(jobId, userId);
  res.json(result);
}

