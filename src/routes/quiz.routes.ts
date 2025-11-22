import { Router } from 'express';
import * as quizController from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create a new quiz
 *     tags: [Quizzes]
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
 *                 example: "History Quiz"
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [MCQ, TRUE_FALSE, SHORT_ANSWER]
 *                     prompt:
 *                       type: string
 *                     answer:
 *                       type: string
 *                     choices:
 *                       type: array
 *                     order:
 *                       type: integer
 *               isPublic:
 *                 type: boolean
 *               language:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quiz created
 */
router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    await quizController.createQuiz(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: List quizzes
 *     tags: [Quizzes]
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
 *       - in: query
 *         name: public
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of quizzes
 */
router.get('/', async (req, res, next) => {
  try {
    await quizController.getQuizzes(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get quiz by ID
 *     tags: [Quizzes]
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
 *         description: Quiz details
 *       404:
 *         description: Quiz not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    await quizController.getQuizById(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/quizzes/{quizId}/attempt:
 *   post:
 *     summary: Submit quiz attempt
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     choiceId:
 *                       type: string
 *                     text:
 *                       type: string
 *     responses:
 *       200:
 *         description: Attempt submitted successfully
 */
router.post('/:quizId/attempt', async (req, res, next) => {
  try {
    await quizController.submitAttempt(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/quizzes/generate:
 *   post:
 *     summary: Generate a quiz from topic or image
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *                 example: "Photosynthesis"
 *               imageUri:
 *                 type: string
 *                 example: "data:image/jpeg;base64,..."
 *               language:
 *                 type: string
 *                 default: "en"
 *               numQuestions:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       202:
 *         description: Quiz generation job created
 */
router.post('/generate', async (req, res, next) => {
  try {
    await quizController.generateQuiz(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as quizRouter };
