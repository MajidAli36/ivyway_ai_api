import { Router } from 'express';
import * as plannerController from '../controllers/planner.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/planner/tasks:
 *   post:
 *     summary: Create a study task
 *     tags: [Study Planner]
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
 *                 example: "Study Math"
 *               details:
 *                 type: string
 *                 example: "Review chapter 5"
 *               due:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-28T18:00:00Z"
 *               repeat:
 *                 type: string
 *                 example: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 *     responses:
 *       201:
 *         description: Task created
 */
router.post('/tasks', async (req, res, next) => {
  try {
    await plannerController.createTask(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/planner/tasks:
 *   get:
 *     summary: List study tasks
 *     tags: [Study Planner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/tasks', async (req, res, next) => {
  try {
    await plannerController.getTasks(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/planner/tasks/{taskId}:
 *   patch:
 *     summary: Update task status
 *     tags: [Study Planner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *               status:
 *                 type: string
 *                 enum: [pending, completed, cancelled]
 *     responses:
 *       200:
 *         description: Task updated
 */
router.patch('/tasks/:taskId', async (req, res, next) => {
  try {
    await plannerController.updateTask(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as plannerRouter };
