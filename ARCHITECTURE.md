# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express API Server                     │
│  - Handles HTTP requests                                    │
│  - Authentication & Authorization                           │
│  - Route middleware                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
    ┌───────▼────────┐      ┌────────▼────────┐
    │   Controllers   │      │    Services     │
    │  - Request      │ ────►│  - Business    │
    │  - Validation   │      │    Logic       │
    │  - Response     │      │  - Data Access │
    └────────────────┘      └────────┬────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Prisma ORM        │
                          │   - Type-safe DB    │
                          │   - Migrations      │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   PostgreSQL 16     │
                          │   - Job Queue       │
                          │   - FTS Search      │
                          │   - Main DB         │
                          └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Job Worker Process                     │
│  - Claims jobs (FOR UPDATE SKIP LOCKED)                     │
│  - Processes AI requests                                    │
│  - Saves results to DB                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
    ┌───────▼────────┐      ┌────────▼────────┐
    │   AI Providers  │      │   OpenAI /      │
    │  - OpenAI API   │      │   Ollama        │
    │  - Ollama API    │      │   (Switchable) │
    └────────────────┘      └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Scheduler Service                      │
│  - Daily challenge generation                               │
│  - Recurring task management                                │
│  - Cron-based scheduling                                    │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. AI Tutor Message Flow

```
Client Request
    │
    ▼
POST /api/tutor/conversations/:id/message
    │
    ▼
Auth Middleware (JWT verification)
    │
    ▼
Tutor Controller
    │
    ▼
Tutor Service
    │
    ├──► Save user message to DB
    ├──► Create job in Job table
    └──► Return jobId to client
    │
    ▼
Job Worker (Background)
    │
    ├──► Claim next queued job (FOR UPDATE SKIP LOCKED)
    ├──► Load conversation history (last 25 messages)
    ├──► Call AI Provider (OpenAI/Ollama)
    ├──► Save assistant message with stats
    └──► Mark job as completed
    │
    ▼
Client polls /api/tutor/conversations/:id
    │
    └──► Receives conversation with AI response
```

### 2. Database Layer

```
Prisma Schema
    │
    ├──► User (Authentication)
    │   ├── email, password (bcrypt)
    │   └── role (student/teacher/admin)
    │
    ├──► Conversation (AI Tutor)
    │   ├── userId
    │   ├── title, language
    │   └── messages[]
    │
    ├──► Message (Chat History)
    │   ├── conversationId
    │   ├── sender (user/assistant/system)
    │   ├── content, contentJson
    │   ├── model, provider
    │   ├── promptTokens, completionTokens
    │   ├── latencyMs
    │   └── raw JSON
    │
    ├──► Job (Async Queue)
    │   ├── type (ai_tutor, lesson_gen, etc.)
    │   ├── userId, payload
    │   ├── status (queued/processing/completed/failed)
    │   ├── attempts, maxAttempts
    │   ├── runAt, nextRunAt
    │   └── result, error
    │
    ├──► Lesson (Content)
    │   ├── ownerId
    │   ├── title, content, language
    │   ├── isPublic
    │   └── search (tsvector for FTS)
    │
    ├──► Quiz (Content)
    │   ├── ownerId, title
    │   ├── questions[] → choices[]
    │   ├── attempts[]
    │   └── search (tsvector for FTS)
    │
    ├──► FlashCard (SM-2 Algorithm)
    │   ├── deckId
    │   ├── front, back
    │   ├── ease, interval
    │   └── due (DateTime)
    │
    └──► StudyTask (RRULE Recurrence)
        ├── userId, title
        ├── due (DateTime)
        ├── repeat (RRULE string)
        └── status
```

## Key Algorithms

### SM-2 Spaced Repetition

```typescript
function calculateSM2(quality: number, ease = 2.5, interval = 1) {
  if (quality < 3) {
    // Failed/Hard
    ease = max(1.3, ease - 0.15);
    interval = 1;
  } else {
    // Passed/Good/Easy
    ease += (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    if (interval === 1) interval = 1;
    else if (interval === 2) interval = 6;
    else interval = round(interval * ease);
  }
  
  due = now() + interval * 24h;
  return { ease, interval, due };
}
```

### FOR UPDATE SKIP LOCKED

```sql
-- Worker claims one job atomically
SELECT * FROM "Job"
WHERE status = 'queued' AND "runAt" <= NOW()
ORDER BY "runAt" ASC
LIMIT 1
FOR UPDATE SKIP LOCKED

-- Only one worker can claim the job
-- Other workers skip locked rows
-- No Redis needed!
```

### Full-Text Search

```sql
-- Auto-generated tsvector column
ALTER TABLE "Lesson" ADD COLUMN "search" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', 
      coalesce(title,'') || ' ' || 
      coalesce(content,'')
    )
  ) STORED;

-- GIN index for fast searches
CREATE INDEX lesson_search_idx 
  ON "Lesson" USING GIN("search");

-- Query with ranking
SELECT * FROM "Lesson"
WHERE search @@ plainto_tsquery('simple', 'quantum')
ORDER BY ts_rank(search, plainto_tsquery('simple', 'quantum')) DESC;
```

### RRULE Recurrence

```typescript
// Parse RRULE string
const rrule = RRule.fromString("FREQ=DAILY;BYDAY=MO,TU,WE");

// Get next occurrence
const next = rrule.after(new Date(), true);

// Check if due
const isDue = rrule.after(now, true) === null && due <= now;

// Auto-generate next task on completion
if (task.repeat && status === 'completed') {
  const nextDue = nextOccurrence(task.repeat, now);
  if (nextDue) {
    createTask({ ...task, due: nextDue, status: 'pending' });
  }
}
```

## Security Features

1. **Helmet.js** - Security headers
2. **CORS** - Cross-origin configuration
3. **Rate Limiting** - Prevent abuse
4. **JWT Auth** - Secure token-based auth
5. **Bcrypt** - Password hashing
6. **Zod Validation** - Input sanitization
7. **Prisma** - SQL injection prevention

## Scalability

- **Stateless API** - Easy horizontal scaling
- **Postgres Queue** - No external dependencies
- **Job Workers** - Can run multiple instances
- **Connection Pooling** - Prisma handles pooling
- **Indexes** - Optimized for queries

## Monitoring

- **Health Check** - `/health` endpoint
- **Job Status** - `/api/jobs` endpoint
- **Logging** - Morgan for HTTP, console for errors
- **Error Tracking** - Structured error responses

## Deployment Strategy

```
Production Deployment:

1. Build
   ├── npm run build
   └── Generates dist/

2. Start Services
   ├── PM2 Process 1: API Server (dist/server.js)
   ├── PM2 Process 2: Worker (dist/workers/job.worker.js)
   └── PM2 Process 3: Schedulers (dist/schedulers/)

3. Database
   └── PostgreSQL (managed or self-hosted)

4. Environment
   ├── DATABASE_URL (production DB)
   ├── JWT_SECRET (strong secret)
   └── OPENAI_API_KEY (or Ollama)
```

