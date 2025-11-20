import { prisma } from '../db/prisma';
import { calculateSM2 } from '../utils/sm2';

export async function createDeck(userId: string, data: any) {
  const { title, cards } = data;

  const deck = await prisma.flashDeck.create({
    data: {
      ownerId: userId,
      title,
    },
  });

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

  return { deck };
}

export async function getDecks(userId: string, limit = 20, offset = 0) {
  return prisma.flashDeck.findMany({
    where: { ownerId: userId },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    include: { cards: true },
  });
}

export async function getDueCards(userId: string, deckId: string, limit = 10) {
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

