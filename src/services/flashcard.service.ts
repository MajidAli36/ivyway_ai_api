import { prisma } from '../db/prisma';
import { calculateSM2 } from '../utils/sm2';

export async function createDeck(userId: string, data: any) {
  const { title, cards } = data;

  const deck = await prisma.flashDeck.create({
    data: {
      ownerId: userId,
      title,
    },
    include: { cards: true },
  });

  if (cards && cards.length > 0) {
    await prisma.flashCard.createMany({
      data: cards.map((card: any) => ({
        deckId: deck.id,
        front: card.front,
        back: card.back,
        ease: 2.5,
        interval: 1,
        due: new Date(),
      })),
    });

    // Reload deck with cards
    const deckWithCards = await prisma.flashDeck.findUnique({
      where: { id: deck.id },
      include: { cards: true },
    });

    return formatDeckResponse(deckWithCards!);
  }

  return formatDeckResponse(deck);
}

function formatDeckResponse(deck: any) {
  const totalCards = deck.cards?.length || 0;
  const masteredCards = deck.cards?.filter((c: any) => c.ease >= 2.5).length || 0;
  
  return {
    deck: {
      id: deck.id,
      title: deck.title,
      description: `Study deck for ${deck.title}`,
      subject: 'General',
      grade: 8,
      cards: (deck.cards || []).map((card: any) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        difficulty: card.ease < 2.0 ? 'hard' : card.ease < 2.5 ? 'medium' : 'easy',
        category: 'General',
        tags: [],
        createdAt: card.due?.toISOString() || new Date().toISOString(),
        lastReviewed: card.due?.toISOString(),
        reviewCount: 0,
        masteryLevel: Math.min(5, Math.max(0, Math.round(card.ease * 2))),
      })),
      createdAt: deck.createdAt.toISOString(),
      lastStudied: deck.cards?.[0]?.due?.toISOString(),
      totalCards,
      masteredCards,
    },
  };
}

export async function getDecks(userId: string, limit = 20, offset = 0) {
  const decks = await prisma.flashDeck.findMany({
    where: { ownerId: userId },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    include: { cards: true },
  });

  return decks.map(formatDeckResponse).map((d: any) => d.deck);
}

export async function getDueCards(_userId: string, deckId: string, limit = 10) {
  return prisma.flashCard.findMany({
    where: {
      deckId,
      due: { lte: new Date() },
    },
    take: limit,
    orderBy: { due: 'asc' },
  });
}

export async function reviewCard(cardId: string, quality: number) {
  const card = await prisma.flashCard.findUnique({
    where: { id: cardId },
  });

  if (!card) throw new Error('Card not found');

  const result = calculateSM2(quality, card.ease, card.interval);

  await prisma.flashCard.update({
    where: { id: cardId },
    data: {
      ease: result.ease,
      interval: result.interval,
      due: result.due,
    },
  });

  return result;
}

