import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma';

const router = Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Full-text search
 *     tags: [Search]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lesson, quiz]
 *           example: "lesson"
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.use(authenticate);

router.get('/', async (req, res) => {
  const query = req.query.q as string;
  const type = req.query.type as string;

  if (type === 'lesson') {
    const results = await prisma.$queryRaw`
      SELECT id, "ownerId", title, content, language, "isPublic", "createdAt" 
      FROM "Lesson"
      WHERE search @@ plainto_tsquery('simple', ${query})
      ORDER BY ts_rank(search, plainto_tsquery('simple', ${query})) DESC
      LIMIT 20
    `;
    res.json({ results });
  } else if (type === 'quiz') {
    const results = await prisma.$queryRaw`
      SELECT id, "ownerId", title, "isPublic", language, "createdAt" 
      FROM "Quiz"
      WHERE search @@ plainto_tsquery('simple', ${query})
      ORDER BY ts_rank(search, plainto_tsquery('simple', ${query})) DESC
      LIMIT 20
    `;
    res.json({ results });
  } else {
    res.json({ results: [] });
  }
});

export { router as searchRouter };
