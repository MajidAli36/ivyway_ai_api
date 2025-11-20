# IvyWay AI - Production Backend

A production-ready backend for an AI-powered learning platform built with Node.js, Express.js, TypeScript, PostgreSQL, and Prisma.

## 🎯 Features

- **AI Tutor (Chatbot)** - Conversational AI tutor with persistent chat history
- **AI Lesson Generator** - Generate custom lessons on any topic
- **Quiz/Test Generator** - Create interactive quizzes
- **Homework Help** - OCR + AI explanations
- **Essay Assistant** - AI-powered essay feedback
- **Flashcards** - SM-2 spaced repetition algorithm
- **Daily Challenge Mode** - Personalized daily challenges
- **Voice Input** - Speech-to-Text integration
- **Multi-language Support** - International content
- **Topic Search Engine** - Full-text search (FTS)
- **Save/Bookmark System** - Bookmark important content
- **Study Planner** - RRULE-based recurring tasks
- **Progress Tracker** - Track learning progress
- **Job Queue** - Postgres-based async job processing (Redis-free)
- **Comprehensive Testing** - Vitest + Supertest

## 🛠️ Tech Stack

- **Framework**: Express.js (TypeScript)
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Auth**: JWT (Access + Refresh) + bcrypt
- **Validation**: Zod
- **AI Providers**: OpenAI + Ollama (switchable)
- **Queue**: Postgres-based (FOR UPDATE SKIP LOCKED)
- **Scheduler**: node-cron
- **Security**: helmet, cors, rate-limiting
- **Testing**: Vitest + Supertest

## 📦 Installation

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Docker & Docker Compose (optional)

### Setup

1. **Clone the repository**

```bash
git clone <repo-url>
cd API
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment setup**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://ivy:ivy@localhost:5432/ivyway?schema=public

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Server
PORT=3000
NODE_ENV=development

# AI Providers
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OLLAMA_BASE_URL=http://localhost:11434

# Models
TUTOR_MODEL_OPENAI=gpt-4o-mini
TUTOR_MODEL_OLLAMA=llama3:8b
LESSON_MODEL=gpt-4
QUIZ_MODEL=gpt-4
```

4. **Database setup**

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:studio
```

5. **Start the application**

```bash
# Development mode
npm run dev

# In another terminal, start the worker
npm run worker
```

## 🐳 Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api npm run prisma:migrate

# Stop services
docker-compose down
```

## 📁 Project Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts              # Server entry point
├── config/
│   ├── env.ts            # Environment variables
│   └── swagger.ts        # Swagger configuration
├── db/
│   └── prisma.ts         # Prisma client
├── middlewares/
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── utils/
│   ├── jwt.ts
│   ├── validation.ts
│   ├── rrule.ts
│   └── sm2.ts
├── ai/
│   └── providers.ts      # AI provider wrapper
├── routes/               # API routes
├── controllers/          # Request handlers
├── services/             # Business logic
├── workers/
│   └── job.worker.ts     # Job queue processor
└── schedulers/
    ├── daily.scheduler.ts
    └── index.ts
```

## 📚 API Documentation

**Swagger UI** is available at: `http://localhost:3000/api-docs`

Visit the Swagger UI for interactive API documentation, try out endpoints, and see all available endpoints with request/response schemas.

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get profile

### AI Tutor
- `POST /api/tutor/conversations` - Create conversation
- `GET /api/tutor/conversations` - List conversations
- `GET /api/tutor/conversations/:id` - Get messages
- `POST /api/tutor/conversations/:id/message` - Send message

### Lessons
- `POST /api/lessons` - Create lesson
- `GET /api/lessons` - List lessons
- `GET /api/lessons/search` - Search lessons

### Quizzes
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes` - List quizzes
- `POST /api/quizzes/:id/attempt` - Submit attempt

### Flashcards
- `POST /api/flashcards/decks` - Create deck
- `GET /api/flashcards/decks` - List decks
- `GET /api/flashcards/decks/:id/due` - Get due cards
- `POST /api/flashcards/cards/:id/review` - Review card

### Study Planner
- `POST /api/planner/tasks` - Create task
- `GET /api/planner/tasks` - List tasks
- `PATCH /api/planner/tasks/:id` - Update task

### Other Endpoints
- Bookmarks, Progress, Search, Jobs, etc.

## 🤖 AI Job Flow

1. **User sends message** → Creates user message in DB
2. **Job queued** → `Job` table with type `ai_tutor`
3. **Worker picks up** → `FOR UPDATE SKIP LOCKED`
4. **LLM called** → OpenAI or Ollama
5. **Assistant reply saved** → Message table with usage stats
6. **Job completed** → Status updated

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build production
npm run start        # Start production server
npm run worker       # Start job worker
npm run prisma:studio # Open Prisma Studio
```

## 🔐 Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Bcrypt password hashing
- Input validation with Zod
- SQL injection prevention (Prisma)

## 🚀 Production Deployment

1. Build the application:

```bash
npm run build
```

2. Set production environment variables
3. Start services:

```bash
npm start
npm run worker  # In another process
```

## 📊 Database Schema

The application uses PostgreSQL with the following key models:

- `User` - User accounts and profiles
- `Conversation` - AI tutor conversations
- `Message` - Chat messages (user + assistant)
- `Lesson` - Generated lessons
- `Quiz` - Quizzes and questions
- `FlashCard` - Flashcards with SM-2 algorithm
- `StudyTask` - Study planner tasks
- `Job` - Async job queue

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

ISC

## 👥 Author

IvyWay AI Team

