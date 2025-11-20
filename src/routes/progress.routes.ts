import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: integer
 *                   example: 10
 *                 lessons:
 *                   type: integer
 *                   example: 5
 *                 quizzes:
 *                   type: integer
 *                   example: 3
 *                 flashcards:
 *                   type: integer
 *                   example: 2
 *                 tasks:
 *                   type: integer
 *                   example: 8
 */
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const [conversations, lessons, quizzes, flashcards, tasks] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.lesson.count({ where: { ownerId: userId } }),
    prisma.quiz.count({ where: { ownerId: userId } }),
    prisma.flashDeck.count({ where: { ownerId: userId } }),
    prisma.studyTask.count({ where: { userId } }),
  ]);

  res.json({
    conversations,
    lessons,
    quizzes,
    flashcards,
    tasks,
  });
});

export { router as progressRouter };
