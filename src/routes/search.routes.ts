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

  if (!query || !query.trim()) {
    return res.json({ results: [] });
  }

  try {
    let results: any[] = [];

    if (type === 'lesson') {
      // Search lessons by title and content using case-insensitive text matching
      const lessons = await prisma.lesson.findMany({
        where: {
          OR: [
            { title: { contains: query.trim(), mode: 'insensitive' } },
            { content: { contains: query.trim(), mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ownerId: true,
          title: true,
          content: true,
          language: true,
          isPublic: true,
          createdAt: true,
        },
      });
      
      results = lessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        type: 'lesson',
        description: lesson.content ? lesson.content.substring(0, 150) + '...' : '',
        subject: 'General',
        grade: 8,
        difficulty: 'beginner',
        rating: 4.0,
        author: 'System',
        createdAt: lesson.createdAt,
        tags: [],
      }));
    } else if (type === 'quiz') {
      const quizzes = await prisma.quiz.findMany({
        where: {
          title: { contains: query.trim(), mode: 'insensitive' },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ownerId: true,
          title: true,
          isPublic: true,
          language: true,
          createdAt: true,
        },
      });
      
      results = quizzes.map((quiz: any) => ({
        id: quiz.id,
        title: quiz.title,
        type: 'quiz',
        description: `Quiz: ${quiz.title}`,
        subject: 'General',
        grade: 8,
        difficulty: 'beginner',
        rating: 4.0,
        author: 'System',
        createdAt: quiz.createdAt,
        tags: [],
      }));
    } else {
      // Search both lessons and quizzes
      const [lessons, quizzes] = await Promise.all([
        prisma.lesson.findMany({
          where: {
            OR: [
              { title: { contains: query.trim(), mode: 'insensitive' } },
              { content: { contains: query.trim(), mode: 'insensitive' } },
            ],
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ownerId: true,
            title: true,
            content: true,
            language: true,
            isPublic: true,
            createdAt: true,
          },
        }),
        prisma.quiz.findMany({
          where: {
            title: { contains: query.trim(), mode: 'insensitive' },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ownerId: true,
            title: true,
            isPublic: true,
            language: true,
            createdAt: true,
          },
        }),
      ]);

      const lessonResults = lessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        type: 'lesson',
        description: lesson.content ? lesson.content.substring(0, 150) + '...' : '',
        subject: 'General',
        grade: 8,
        difficulty: 'beginner',
        rating: 4.0,
        author: 'System',
        createdAt: lesson.createdAt,
        tags: [],
      }));

      const quizResults = quizzes.map((quiz: any) => ({
        id: quiz.id,
        title: quiz.title,
        type: 'quiz',
        description: `Quiz: ${quiz.title}`,
        subject: 'General',
        grade: 8,
        difficulty: 'beginner',
        rating: 4.0,
        author: 'System',
        createdAt: quiz.createdAt,
        tags: [],
      }));

      results = [...lessonResults, ...quizResults];
    }

    return res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as searchRouter };
