import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as voiceController from '../controllers/voice.controller';

const router = Router();

/**
 * @swagger
 * /api/voice/transcribe:
 *   post:
 *     summary: Transcribe audio to text
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               audioUrl:
 *                 type: string
 *                 example: "https://example.com/audio.mp3"
 *               language:
 *                 type: string
 *                 example: "en"
 *     responses:
 *       202:
 *         description: Transcription queued
 */
router.use(authenticate);

router.post('/transcribe', voiceController.transcribeAudio);

router.get('/:jobId', voiceController.getTranscription);

export { router as voiceRouter };
