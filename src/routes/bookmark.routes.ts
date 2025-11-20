import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/bookmarks:
 *   post:
 *     summary: Create a bookmark
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kind:
 *                 type: string
 *                 example: "lesson"
 *               targetId:
 *                 type: string
 *                 example: "cuid..."
 *     responses:
 *       201:
 *         description: Bookmark created
 */
router.use(authenticate);

router.post('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { kind, targetId } = req.body;

  const bookmark = await prisma.bookmark.create({
    data: { userId, kind, targetId },
  });

  res.status(201).json({ bookmark });
});

/**
 * @swagger
 * /api/bookmarks:
 *   get:
 *     summary: List bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookmarks
 */
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ bookmarks });
});

/**
 * @swagger
 * /api/bookmarks/{id}:
 *   delete:
 *     summary: Delete a bookmark
 *     tags: [Bookmarks]
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
 *         description: Bookmark deleted
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id;
  await prisma.bookmark.delete({ where: { id } });
  res.json({ message: 'Deleted' });
});

export { router as bookmarkRouter };
