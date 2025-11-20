import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Lessons API', () => {
  let accessToken: string;

  beforeAll(async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'lessontest@example.com',
        password: 'password123',
        name: 'Lesson Test User',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'lessontest@example.com',
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
  });

  it('should create a lesson', async () => {
    const response = await request(app)
      .post('/api/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Introduction to Quantum Physics',
        content: 'Quantum physics is...',
        language: 'en',
        isPublic: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.lesson).toBeDefined();
    expect(response.body.lesson.title).toBe('Introduction to Quantum Physics');
  });

  it('should list user lessons', async () => {
    const response = await request(app)
      .get('/api/lessons')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.lessons).toBeInstanceOf(Array);
  });

  it('should fail without authentication', async () => {
    const response = await request(app)
      .post('/api/lessons')
      .send({
        title: 'Test',
        content: 'Test content',
      });

    expect(response.status).toBe(401);
  });
});

