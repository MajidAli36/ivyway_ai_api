import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as essayController from '../controllers/essay.controller';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/essays/outline:
 *   post:
 *     summary: Generate essay outline from thesis
 *     tags: [Essays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - thesis
 *             properties:
 *               thesis:
 *                 type: string
 *                 example: "Social media has both positive and negative effects on teenagers"
 *               subject:
 *                 type: string
 *                 example: "English"
 *     responses:
 *       202:
 *         description: Essay outline generation queued
 */
router.post('/outline', essayController.generateOutline);

/**
 * @swagger
 * /api/essays/grade:
 *   post:
 *     summary: Grade an essay draft
 *     tags: [Essays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - draft
 *             properties:
 *               draft:
 *                 type: string
 *                 example: "Essay content here..."
 *               rubric:
 *                 type: string
 *                 example: "academic"
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       202:
 *         description: Essay grading queued
 */
router.post('/grade', essayController.gradeEssay);

router.get('/:jobId', essayController.getAnalysis);

export { router as essayRouter };
