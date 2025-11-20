import { Router } from 'express';
import * as flashcardController from '../controllers/flashcard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/flashcards/decks:
 *   post:
 *     summary: Create a flashcard deck
 *     tags: [Flashcards]
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
 *                 example: "Spanish Vocabulary"
 *               cards:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     front:
 *                       type: string
 *                     back:
 *                       type: string
 *     responses:
 *       201:
 *         description: Deck created
 */
router.post('/decks', async (req, res, next) => {
  try {
    await flashcardController.createDeck(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flashcards/decks:
 *   get:
 *     summary: List flashcard decks
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of decks
 */
router.get('/decks', async (req, res, next) => {
  try {
    await flashcardController.getDecks(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flashcards/decks/{deckId}/due:
 *   get:
 *     summary: Get due cards for review
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deckId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of due cards
 */
router.get('/decks/:deckId/due', async (req, res, next) => {
  try {
    await flashcardController.getDueCards(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flashcards/cards/{cardId}/review:
 *   post:
 *     summary: Review a flashcard (SM-2 algorithm)
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
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
 *               quality:
 *                 type: integer
 *                 description: "0=Again, 1=Hard, 2=Good, 3=Easy"
 *                 minimum: 0
 *                 maximum: 5
 *                 example: 3
 *     responses:
 *       200:
 *         description: Card reviewed successfully
 */
router.post('/cards/:cardId/review', async (req, res, next) => {
  try {
    await flashcardController.reviewCard(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as flashcardRouter };
