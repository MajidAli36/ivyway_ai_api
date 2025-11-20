# Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment
```bash
# Copy and configure environment
cp env .env
# Edit .env and add your OPENAI_API_KEY
```

### Step 3: Set Up Database
```bash
# Start PostgreSQL (Docker)
docker-compose up -d db

# Run migrations
npm run prisma:generate
npm run prisma:migrate

# Add FTS indices
docker-compose exec db psql -U ivy -d ivyway -c "ALTER TABLE \"Lesson\" ADD COLUMN IF NOT EXISTS \"search\" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;"
docker-compose exec db psql -U ivy -d ivyway -c "CREATE INDEX IF NOT EXISTS lesson_search_idx ON \"Lesson\" USING GIN(\"search\");"
docker-compose exec db psql -U ivy -d ivyway -c "ALTER TABLE \"Quiz\" ADD COLUMN IF NOT EXISTS \"search\" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,''))) STORED;"
docker-compose exec db psql -U ivy -d ivyway -c "CREATE INDEX IF NOT EXISTS quiz_search_idx ON \"Quiz\" USING GIN(\"search\");"
```

### Step 4: Start Services

**Terminal 1 - API Server:**
```bash
npm run dev
```

**Terminal 2 - Job Worker:**
```bash
npm run worker
```

### Step 5: Test It

```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "student"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'

# Save the accessToken from response and use it below
```

```bash
# Create a conversation
curl -X POST http://localhost:3000/api/tutor/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Physics Chat",
    "language": "en"
  }'

# Save conversationId from response
```

```bash
# Send a message to AI tutor
curl -X POST http://localhost:3000/api/tutor/conversations/CONVERSATION_ID/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain the theory of relativity"
  }'

# Wait a few seconds for the worker to process, then:
```

```bash
# Get messages (includes AI response)
curl http://localhost:3000/api/tutor/conversations/CONVERSATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📋 Common Commands

```bash
# Start development server
npm run dev

# Start job worker
npm run worker

# Build for production
npm run build

# Run tests
npm test

# Open Prisma Studio (Database GUI)
npm run prisma:studio

# View database logs
docker-compose logs -f db

# View API logs
docker-compose logs -f api

# Reset database
docker-compose down -v
docker-compose up -d db
npm run prisma:migrate
```

## 🔍 Key Features to Try

1. **AI Tutor** - Chat with AI about any topic
2. **Lessons** - Generate lessons on subjects
3. **Quizzes** - Create and take quizzes
4. **Flashcards** - Use spaced repetition
5. **Study Planner** - Schedule recurring tasks
6. **Search** - Find lessons and quizzes by topic

## 🐛 Troubleshooting

### Database not connecting
```bash
docker-compose up -d db
```

### Worker not processing jobs
- Ensure worker is running: `npm run worker`
- Check `.env` has correct `DATABASE_URL`

### OpenAI API errors
- Verify `OPENAI_API_KEY` in `.env`
- Check account has credits

### Port already in use
```bash
# Change PORT in .env
PORT=3001
```

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Read [SETUP.md](SETUP.md) for detailed setup
- Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture details

