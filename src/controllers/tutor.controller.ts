import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as tutorService from '../services/tutor.service';
import * as subscriptionService from '../services/subscription.service';

export async function createConversation(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { title, language } = req.body;

  const conversation = await tutorService.createConversation(userId, title, language);
  res.status(201).json({ conversation });
}

export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const conversations = await tutorService.getUserConversations(userId, limit, offset);
  res.json({ conversations });
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit as string) || 25;
  const offset = parseInt(req.query.offset as string) || 0;

  const messages = await tutorService.getConversationMessages(conversationId, userId, limit, offset);
  res.json({ messages });
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId || null;
  const deviceId = req.headers['x-device-id'] as string | undefined || null;
  const { conversationId } = req.params;
  const { content, language, subject, grade } = req.body;

  // For guest users, we need to handle conversation creation differently
  // For now, guest users can't create conversations - they'll need to sign up
  if (!userId) {
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please sign in to continue using the AI tutor.'
    });
    return;
  }

  const result = await tutorService.sendMessage(
    userId, 
    conversationId || null, 
    content, 
    language,
    subject,
    grade
  );

  // Track the request
  await subscriptionService.trackRequest(userId, deviceId, 'tutor');

  // Get updated quota info
  const quotaCheck = await subscriptionService.checkQuota(userId, deviceId);

  res.status(201).json({
    ...result,
    quota: {
      remaining: quotaCheck.remaining,
      limit: quotaCheck.limit,
      shouldShowSoftPrompt: quotaCheck.shouldShowSoftPrompt,
      shouldShowHardPaywall: quotaCheck.shouldShowHardPaywall,
      message: quotaCheck.message,
    },
  });
}

