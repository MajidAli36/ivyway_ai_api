import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticate, authenticateOptional } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

const upgradeSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'PREMIUM']),
});

/**
 * @swagger
 * /api/subscription:
 *   get:
 *     summary: Get current subscription info and quota
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription info
 */
router.get('/', authenticateOptional, async (req, res, next) => {
  try {
    await subscriptionController.getSubscription(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subscription/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [FREE, PRO, PREMIUM]
 *     responses:
 *       200:
 *         description: Subscription upgraded
 */
router.post('/upgrade', authenticate, async (req, res, next) => {
  try {
    const data = upgradeSchema.parse(req.body);
    req.body = data;
    await subscriptionController.upgradeSubscription(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as subscriptionRouter };

