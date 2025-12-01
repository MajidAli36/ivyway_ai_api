import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List user's jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, processing, completed, failed]
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const status = req.query.status as string;

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ jobs });
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job status
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id;
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userId = req.user.userId;

  const job = await prisma.job.findFirst({
    where: { id, userId },
  });

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({ job });
});

export { router as jobRouter };
