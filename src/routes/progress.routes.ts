import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import * as progressService from '../services/progress.service';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/progress/stats:
 *   get:
 *     summary: Get user progress statistics
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const progress = await progressService.getUserProgress(userId);

    // Also get conversations count
    const conversations = await prisma.conversation.count({ where: { userId } });

    res.json({
      ...progress,
      conversations,
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({ error: 'Failed to fetch progress statistics' });
  }
});

/**
 * @swagger
 * /api/progress/lesson-complete:
 *   post:
 *     summary: Track lesson completion
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 */
const lessonCompleteSchema = z.object({
  lessonId: z.string(),
  timeSpent: z.number().optional(), // in milliseconds
  progress: z.number().min(0).max(100).default(100),
});

router.post('/lesson-complete', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const data = lessonCompleteSchema.parse(req.body);

    await progressService.trackLessonCompletion(
      userId,
      data.lessonId,
      data.timeSpent,
      data.progress
    );

    return res.json({ success: true, message: 'Lesson completion tracked' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error tracking lesson completion:', error);
    return res.status(500).json({ error: 'Failed to track lesson completion' });
  }
});

/**
 * @swagger
 * /api/progress/quiz-complete:
 *   post:
 *     summary: Track quiz completion
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 */
const quizCompleteSchema = z.object({
  score: z.number(),
  totalPoints: z.number(),
});

router.post('/quiz-complete', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const data = quizCompleteSchema.parse(req.body);

    await progressService.trackQuizCompletion(userId, data.score, data.totalPoints);

    return res.json({ success: true, message: 'Quiz completion tracked' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error tracking quiz completion:', error);
    return res.status(500).json({ error: 'Failed to track quiz completion' });
  }
});

/**
 * @swagger
 * /api/progress/task-complete:
 *   post:
 *     summary: Track task completion
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 */
router.post('/task-complete', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    await progressService.trackTaskCompletion(userId);

    return res.json({ success: true, message: 'Task completion tracked' });
  } catch (error) {
    console.error('Error tracking task completion:', error);
    return res.status(500).json({ error: 'Failed to track task completion' });
  }
});

export { router as progressRouter };
