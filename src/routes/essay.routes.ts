import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as essayController from '../controllers/essay.controller';

const router = Router();

/**
 * @swagger
 * /api/essays/analyze:
 *   post:
 *     summary: Analyze an essay
 *     tags: [Essays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Essay content here..."
 *               essayType:
 *                 type: string
 *                 example: "academic"
 *               topic:
 *                 type: string
 *                 example: "Climate Change"
 *     responses:
 *       202:
 *         description: Essay analysis queued
 */
router.use(authenticate);

router.post('/analyze', essayController.analyzeEssay);

router.get('/:jobId', essayController.getAnalysis);

export { router as essayRouter };
