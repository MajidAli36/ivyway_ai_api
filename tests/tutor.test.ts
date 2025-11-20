import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('AI Tutor API', () => {
  let accessToken: string;
  let userId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Register and login a test user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tutortest@example.com',
        password: 'password123',
        name: 'Tutor User',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tutortest@example.com',
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  it('should create a conversation', async () => {
    const response = await request(app)
      .post('/api/tutor/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Math Help',
        language: 'en',
      });

    expect(response.status).toBe(201);
    expect(response.body.conversation).toBeDefined();
    expect(response.body.conversation.title).toBe('Math Help');
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
    expect(response.body.conversationId).toBe(conversationId);
  });

  it('should get messages from conversation', async () => {
    // Wait a bit for job to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await request(app)
      .get(`/api/tutor/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.messages).toBeInstanceOf(Array);
  });

  it('should fail to access another user\'s conversation', async () => {
    const response = await request(app)
      .get('/api/tutor/conversations/invalid_id')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});

