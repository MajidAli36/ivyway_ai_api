import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as homeworkController from '../controllers/homework.controller';

const router = Router();

/**
 * @swagger
 * /api/homework/help:
 *   post:
 *     summary: Get homework help
 *     tags: [Homework]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/problem.jpg"
 *               question:
 *                 type: string
 *                 example: "Solve this math problem"
 *               subject:
 *                 type: string
 *                 example: "mathematics"
 *     responses:
 *       202:
 *         description: Homework help queued
 */
router.use(authenticate);

router.post('/help', homeworkController.submitHomework);

router.get('/:jobId', homeworkController.getHomeworkHelp);

export { router as homeworkRouter };
