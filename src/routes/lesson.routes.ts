import { Router } from 'express';
import * as lessonController from '../controllers/lesson.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a new lesson
 *     tags: [Lessons]
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
 *                 example: "Introduction to Quantum Physics"
 *               content:
 *                 type: string
 *                 example: "Lesson content..."
 *               language:
 *                 type: string
 *                 example: "en"
 *               isPublic:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Lesson created
 */
router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    await lessonController.createLesson(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: List lessons
 *     tags: [Lessons]
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
 *           default: false
 *     responses:
 *       200:
 *         description: List of lessons
 */
router.get('/', async (req, res, next) => {
  try {
    await lessonController.getLessons(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/lessons/search:
 *   get:
 *     summary: Search lessons using full-text search
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: "quantum physics"
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
 *         description: Search results
 */
router.get('/search', async (req, res, next) => {
  try {
    await lessonController.searchLessons(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get a lesson by ID
 *     tags: [Lessons]
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
 *         description: Lesson found
 *       404:
 *         description: Lesson not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    await lessonController.getLessonById(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as lessonRouter };
