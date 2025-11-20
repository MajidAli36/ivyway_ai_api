import { Router } from 'express';
import * as tutorController from '../controllers/tutor.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { tutorMessageSchema } from '../utils/validation';

const router = Router();

/**
 * @swagger
 * /api/tutor/conversations:
 *   post:
 *     summary: Create a new AI tutor conversation
 *     tags: [AI Tutor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Math Help
 *               language:
 *                 type: string
 *                 example: en
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.post('/conversations', authenticate, async (req, res, next) => {
  try {
    await tutorController.createConversation(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tutor/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [AI Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    await tutorController.getConversations(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tutor/conversations/{conversationId}:
 *   get:
 *     summary: Get conversation messages
 *     tags: [AI Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Conversation messages
 */
router.get('/conversations/:conversationId', authenticate, async (req, res, next) => {
  try {
    await tutorController.getMessages(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tutor/conversations/{conversationId}/message:
 *   post:
 *     summary: Send a message to AI tutor
 *     tags: [AI Tutor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Explain quantum physics
 *               language:
 *                 type: string
 *                 example: en
 *     responses:
 *       201:
 *         description: Message sent, job queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                 messageId:
 *                   type: string
 *                 jobId:
 *                   type: string
 */
router.post('/conversations/:conversationId/message', authenticate, async (req, res, next) => {
  try {
    const data = tutorMessageSchema.parse(req.body);
    req.body = data;
    await tutorController.sendMessage(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as tutorRouter };

