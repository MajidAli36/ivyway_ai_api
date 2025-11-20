# Setup Instructions

## Quick Start

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up database**
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Add full-text search indices
docker-compose exec db psql -U ivy -d ivyway -f /path/to/prisma/migrations/0001_init/schema.sql
```

4. **Start services**
```bash
# Option 1: Docker Compose
docker-compose up -d

# Option 2: Manual
npm run dev        # Terminal 1
npm run worker     # Terminal 2
```

## Environment Variables

Required variables in `.env`:

```env
DATABASE_URL=postgresql://ivy:ivy@localhost:5432/ivyway?schema=public
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
OPENAI_API_KEY=your_openai_key_here  # If using OpenAI
OLLAMA_BASE_URL=http://localhost:11434  # If using Ollama
```

## Database Migrations

The project includes a full-text search setup that requires running SQL migrations:

```bash
# After initial Prisma migration
docker-compose exec db psql -U ivy -d ivyway << EOF
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "search" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
CREATE INDEX IF NOT EXISTS lesson_search_idx ON "Lesson" USING GIN("search");

ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "search" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,''))) STORED;
CREATE INDEX IF NOT EXISTS quiz_search_idx ON "Quiz" USING GIN("search");
EOF
```

## Testing the Setup

1. **Register a user**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}'
```

2. **Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

3. **Create a conversation**
```bash
curl -X POST http://localhost:3000/api/tutor/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Conversation","language":"en"}'
```

4. **Send a message**
```bash
curl -X POST http://localhost:3000/api/tutor/conversations/CONVERSATION_ID/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Explain quantum physics"}'
```

## Verifying AI Jobs

Check job status:
```bash
curl http://localhost:3000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify credentials match docker-compose.yml

### AI Provider Issues
- For OpenAI: Set `OPENAI_API_KEY`
- For Ollama: Start Ollama and set `OLLAMA_BASE_URL`
- Check `LLM_PROVIDER` in `.env`

### Worker Not Processing Jobs
- Ensure worker is running: `npm run worker`
- Check database connectivity
- Review logs for errors

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Start services:
```bash
# API Server
npm start

# Worker (in separate process)
NODE_ENV=production npm run worker
```

4. Use process manager (PM2 recommended):
```bash
npm install -g pm2
pm2 start dist/server.js --name ivyway-api
pm2 start dist/workers/job.worker.js --name ivyway-worker
```

