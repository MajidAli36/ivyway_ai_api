import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma';

const router = Router();

/**
 * @swagger
 * /api/challenges/daily:
 *   get:
 *     summary: Get daily challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily challenge retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 challenge:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     difficulty:
 *                       type: string
 */
router.use(authenticate);

router.get('/daily', async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get today's challenge from jobs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const job = await prisma.job.findFirst({
      where: {
        userId: req.user.userId,
        type: 'daily_challenge',
        createdAt: { gte: today },
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!job) {
      res.json({ 
        challenge: null, 
        message: 'No challenge available yet' 
      });
      return;
    }

    res.json({ challenge: job.result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get daily challenge' });
  }
});

export { router as challengeRouter };
