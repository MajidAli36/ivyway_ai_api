import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IvyWay AI Learning Platform API',
      version: '1.0.0',
      description: 'API documentation for IvyWay AI - AI-powered learning platform',
      contact: {
        name: 'IvyWay AI Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.ivyway.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            email: { type: 'string', example: 'user@example.com' },
            fullName: { type: 'string', example: 'John Doe' },
            bio: { type: 'string', example: 'Student passionate about learning' },
            profileImage: { type: 'string', example: 'https://example.com/profile.jpg' },
            language: { type: 'string', example: 'en' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            title: { type: 'string', example: 'Math Help' },
            language: { type: 'string', example: 'en' },
            status: { type: 'string', example: 'active' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            sender: { type: 'string', enum: ['user', 'assistant', 'system'] },
            content: { type: 'string', example: 'Explain photosynthesis' },
            model: { type: 'string', example: 'gpt-4o-mini' },
            provider: { type: 'string', example: 'openai' },
            promptTokens: { type: 'integer', example: 150 },
            completionTokens: { type: 'integer', example: 200 },
            latencyMs: { type: 'integer', example: 1250 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Lesson: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            ownerId: { type: 'string' },
            title: { type: 'string', example: 'Introduction to Quantum Physics' },
            content: { type: 'string', example: 'Lesson content...' },
            language: { type: 'string', example: 'en' },
            isPublic: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Quiz: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            ownerId: { type: 'string' },
            title: { type: 'string', example: 'History Quiz' },
            isPublic: { type: 'boolean', example: false },
            language: { type: 'string', example: 'en' },
            questions: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        FlashDeck: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            title: { type: 'string', example: 'Spanish Vocabulary' },
            createdAt: { type: 'string', format: 'date-time' },
            cards: { type: 'array', items: { type: 'object' } },
          },
        },
        FlashCard: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            front: { type: 'string', example: 'Hello' },
            back: { type: 'string', example: 'Hola' },
            ease: { type: 'number', example: 2.5 },
            interval: { type: 'integer', example: 1 },
            due: { type: 'string', format: 'date-time' },
          },
        },
        StudyTask: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            title: { type: 'string', example: 'Study Math' },
            details: { type: 'string', example: 'Review chapter 5' },
            due: { type: 'string', format: 'date-time' },
            repeat: { type: 'string', example: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' },
            status: { type: 'string', example: 'pending' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid' },
            type: { type: 'string', example: 'ai_tutor' },
            status: { type: 'string', example: 'completed' },
            attempts: { type: 'integer', example: 1 },
            runAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            result: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            details: { type: 'object' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

