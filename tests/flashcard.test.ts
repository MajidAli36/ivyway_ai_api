import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Flashcards API', () => {
  let accessToken: string;
  let deckId: string;

  beforeAll(async () => {
    // Register first to ensure user exists
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'flashcardtest@example.com',
        password: 'password123',
        name: 'Flashcard Test User',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'flashcardtest@example.com',
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
  });

  it('should create a flashcard deck', async () => {
    const response = await request(app)
      .post('/api/flashcards/decks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Spanish Vocabulary',
        cards: [
          { front: 'Hello', back: 'Hola' },
          { front: 'Goodbye', back: 'Adiós' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.deck).toBeDefined();
    deckId = response.body.deck.id;
  });

  it('should list decks', async () => {
    const response = await request(app)
      .get('/api/flashcards/decks')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.decks).toBeInstanceOf(Array);
  });

  it('should get due cards', async () => {
    const response = await request(app)
      .get(`/api/flashcards/decks/${deckId}/due`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.cards).toBeInstanceOf(Array);
  });

  it('should review a card', async () => {
    const response = await request(app)
      .get(`/api/flashcards/decks/${deckId}/due`)
      .set('Authorization', `Bearer ${accessToken}`);

    if (!response.body.cards || response.body.cards.length === 0) {
      // Skip if no due cards
      return;
    }

    const cardId = response.body.cards[0].id;

    const reviewResponse = await request(app)
      .post(`/api/flashcards/cards/${cardId}/review`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ quality: 3 });

    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.ease).toBeDefined();
    expect(reviewResponse.body.due).toBeDefined();
  });
});

