import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as flashcardService from '../services/flashcard.service';

export async function createDeck(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await flashcardService.createDeck(userId, req.body);
  res.status(201).json(result);
}

export async function getDecks(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const decks = await flashcardService.getDecks(userId, limit, offset);
  res.json({ decks });
}

export async function getDueCards(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { deckId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;

  const cards = await flashcardService.getDueCards(userId, deckId, limit);
  res.json({ cards });
}

export async function reviewCard(req: AuthRequest, res: Response): Promise<void> {
  const { cardId } = req.params;
  const { quality } = req.body;

  const result = await flashcardService.reviewCard(cardId, quality);
  res.json(result);
}

