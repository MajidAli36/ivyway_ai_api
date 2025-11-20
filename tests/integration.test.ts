import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';

describe('Integration Tests - Complete API Suite', () => {
  let accessToken: string;
  let userId: string;
  let conversationId: string;
  let lessonId: string;
  let quizId: string;
  let deckId: string;
  let cardId: string;

  beforeAll(async () => {
    // Clean up test database
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.attemptAnswer.deleteMany({});
    await prisma.choice.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.flashCard.deleteMany({});
    await prisma.flashDeck.deleteMany({});
    await prisma.studyTask.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication API', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integration@test.com',
          password: 'testpass123',
          name: 'Integration Test User',
          role: 'student',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.accessToken).toBeDefined();
      userId = response.body.user.id;
      accessToken = response.body.accessToken;
    });

    it('should login successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpass123',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      accessToken = response.body.accessToken;
    });

    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('integration@test.com');
    });
  });

  describe('AI Tutor API', () => {
    it('should create a conversation', async () => {
      const response = await request(app)
        .post('/api/tutor/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Math Help',
          language: 'en',
        });

      expect(response.status).toBe(201);
      expect(response.body.conversation.id).toBeDefined();
      conversationId = response.body.conversation.id;
    });

    it('should list conversations', async () => {
      const response = await request(app)
        .get('/api/tutor/conversations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.conversations).toBeInstanceOf(Array);
      expect(response.body.conversations.length).toBeGreaterThan(0);
    });

    it('should send a message', async () => {
      const response = await request(app)
        .post(`/api/tutor/conversations/${conversationId}/message`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'What is 2+2?',
          language: 'en',
        });

      expect(response.status).toBe(201);
      expect(response.body.jobId).toBeDefined();
    });

    it('should get conversation messages', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await request(app)
        .get(`/api/tutor/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toBeInstanceOf(Array);
      expect(response.body.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Lessons API', () => {
    it('should create a lesson', async () => {
      const response = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Introduction to Algebra',
          content: 'Algebra is the branch of mathematics...',
          language: 'en',
          isPublic: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.lesson).toBeDefined();
      lessonId = response.body.lesson.id;
    });

    it('should list lessons', async () => {
      const response = await request(app)
        .get('/api/lessons')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lessons).toBeInstanceOf(Array);
    });

    it('should search lessons', async () => {
      const response = await request(app)
        .get('/api/lessons/search?q=algebra')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lessons).toBeDefined();
    });
  });

  describe('Quizzes API', () => {
    it('should create a quiz', async () => {
      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Math Basics Quiz',
          language: 'en',
          isPublic: false,
          questions: [
            {
              type: 'MCQ',
              prompt: 'What is 2+2?',
              answer: null,
              order: 1,
              choices: [
                { text: '3', isCorrect: false },
                { text: '4', isCorrect: true },
                { text: '5', isCorrect: false },
              ],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.quiz).toBeDefined();
      quizId = response.body.quiz.id;
    });

    it('should list quizzes', async () => {
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.quizzes).toBeInstanceOf(Array);
    });
  });

  describe('Flashcards API', () => {
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
      if (response.body.cards.length > 0) {
        cardId = response.body.cards[0].id;
      }
    });

    it('should review a card', async () => {
      if (!cardId) return;
      
      const response = await request(app)
        .post(`/api/flashcards/cards/${cardId}/review`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quality: 3 });

      expect(response.status).toBe(200);
      expect(response.body.ease).toBeDefined();
      expect(response.body.due).toBeDefined();
    });
  });

  describe('Study Planner API', () => {
    it('should create a study task', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const response = await request(app)
        .post('/api/planner/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Study Math Chapter 5',
          details: 'Complete exercises 1-10',
          due: dueDate.toISOString(),
          repeat: 'FREQ=DAILY',
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
    });

    it('should list tasks', async () => {
      const response = await request(app)
        .get('/api/planner/tasks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
    });
  });

  describe('Bookmarks API', () => {
    it('should create a bookmark', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          kind: 'lesson',
          targetId: lessonId,
        });

      expect(response.status).toBe(201);
      expect(response.body.bookmark).toBeDefined();
    });

    it('should list bookmarks', async () => {
      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bookmarks).toBeInstanceOf(Array);
    });
  });

  describe('Progress API', () => {
    it('should get user progress stats', async () => {
      const response = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('conversations');
      expect(response.body).toHaveProperty('lessons');
      expect(response.body).toHaveProperty('quizzes');
      expect(response.body).toHaveProperty('flashcards');
      expect(response.body).toHaveProperty('tasks');
    });
  });

  describe('Jobs API', () => {
    it('should list jobs', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toBeInstanceOf(Array);
    });
  });

  describe('Search API', () => {
    it('should search lessons', async () => {
      const response = await request(app)
        .get('/api/search?q=algebra&type=lesson')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('Challenges API', () => {
    it('should get daily challenge', async () => {
      const response = await request(app)
        .get('/api/challenges/daily')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});

