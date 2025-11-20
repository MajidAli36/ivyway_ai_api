# Next Steps After Prisma Migration

## ✅ Migration Complete!

Your database has been created and migrated successfully. Here's what to do next:

## 1. Add Full-Text Search Support

Run the SQL migration to enable full-text search on Lessons and Quizzes:

```bash
# Option 1: Using psql (if installed)
psql -U postgres -d ivywayAI_DB -f prisma/migrations/add_fts.sql

# Option 2: Using Docker (if using docker-compose)
docker-compose exec db psql -U postgres -d ivywayAI_DB -f /path/to/prisma/migrations/add_fts.sql

# Option 3: Manually via database client
# Open your PostgreSQL client and run the contents of prisma/migrations/add_fts.sql
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Set Up Your OpenAI API Key

Edit `.env` and update:
```
OPENAI_API_KEY=your_actual_openai_key_here
```

## 4. Start the Application

**Terminal 1 - API Server:**
```bash
npm run dev
```

**Terminal 2 - Job Worker:**
```bash
npm run worker
```

## 5. Test the API

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "role": "student"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response.

### Create a Conversation
```bash
curl -X POST http://localhost:3000/api/tutor/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chat",
    "language": "en"
  }'
```

Save the conversation `id`.

### Send a Message to AI Tutor
```bash
curl -X POST http://localhost:3000/api/tutor/conversations/CONVERSATION_ID/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain quantum physics"
  }'
```

Wait a few seconds for the worker to process, then:

### Get Messages
```bash
curl http://localhost:3000/api/tutor/conversations/CONVERSATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You should see both your message and the AI's response!

## 6. View Database with Prisma Studio

```bash
npm run prisma:studio
```

This opens a web interface to view and edit your database.

## Troubleshooting

### If port 5432 is already in use

Edit `.env` and update:
```
DATABASE_URL=postgresql://postgres@localhost:5433/ivywayAI_DB?schema=public
```

### If you get connection errors

1. Verify PostgreSQL is running
2. Check `.env` has correct `DATABASE_URL`
3. Verify database exists: `SELECT datname FROM pg_database WHERE datname='ivywayAI_DB';`

### If worker doesn't process jobs

1. Ensure worker is running: `npm run worker`
2. Check `.env` has `OPENAI_API_KEY` set
3. View worker logs for errors

## What's Been Set Up

✅ PostgreSQL database created
✅ All Prisma models migrated
✅ Database schema includes:
   - User authentication
   - AI Tutor conversations & messages
   - Lessons with content
   - Quizzes with questions & choices
   - Flashcards with SM-2 algorithm
   - Study tasks with RRULE recurrence
   - Job queue for async processing
   - Bookmarks system

## Next: Add FTS Support

Run the SQL migration in `prisma/migrations/add_fts.sql` to enable full-text search.

