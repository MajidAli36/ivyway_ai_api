# 🛣️ All API Routes - Complete Reference

This document lists all available routes in the IvyWay AI API.

## 📋 Route Summary

- **Authentication** (2 routes)
- **AI Tutor** (4 routes)
- **Lessons** (3 routes)
- **Quizzes** (3 routes)
- **Flashcards** (4 routes)
- **Study Planner** (3 routes)
- **Essays** (2 routes)
- **Homework** (2 routes)
- **Voice** (2 routes)
- **Bookmarks** (3 routes)
- **Challenges** (1 route)
- **Progress** (1 route)
- **Search** (1 route)
- **Jobs** (2 routes)

**Total: 33 routes**

---

## 🔐 Authentication (`/api/auth`)

### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "student"
}
```

**Response:** `201 Created`
```json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### POST `/api/auth/login`
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### GET `/api/auth/me`
Get current user profile.

**Headers:** `Authorization: Bearer {accessToken}`

**Response:** `200 OK`
```json
{
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

---

## 🤖 AI Tutor (`/api/tutor`)

### POST `/api/tutor/conversations`
Create a new AI tutor conversation.

**Request Body:**
```json
{
  "title": "Math Help",
  "language": "en"
}
```

**Response:** `201 Created`
```json
{
  "conversation": { "id": "...", "title": "...", "status": "active" }
}
```

### GET `/api/tutor/conversations`
Get user's conversations.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:** `200 OK`
```json
{
  "conversations": [...]
}
```

### GET `/api/tutor/conversations/:conversationId`
Get conversation messages.

**Query Parameters:**
- `limit` (default: 25)
- `offset` (default: 0)

**Response:** `200 OK`
```json
{
  "messages": [...]
}
```

### POST `/api/tutor/conversations/:conversationId/message`
Send a message to AI tutor.

**Request Body:**
```json
{
  "content": "Explain quantum physics",
  "language": "en"
}
```

**Response:** `201 Created`
```json
{
  "conversationId": "...",
  "messageId": "...",
  "jobId": "..."
}
```

---

## 📚 Lessons (`/api/lessons`)

### POST `/api/lessons`
Create a new lesson.

**Request Body:**
```json
{
  "title": "Introduction to Quantum Physics",
  "content": "Lesson content...",
  "language": "en",
  "isPublic": false
}
```

**Response:** `201 Created`
```json
{
  "lesson": { "id": "...", "title": "...", "content": "..." }
}
```

### GET `/api/lessons`
List lessons.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)
- `public` (boolean)

**Response:** `200 OK`
```json
{
  "lessons": [...]
}
```

### GET `/api/lessons/search`
Search lessons using full-text search.

**Query Parameters:**
- `q` (required) - search query
- `limit` (default: 20)
- `offset` (default: 0)

**Response:** `200 OK`
```json
{
  "lessons": [...]
}
```

---

## 📝 Quizzes (`/api/quizzes`)

### POST `/api/quizzes`
Create a new quiz.

**Request Body:**
```json
{
  "title": "History Quiz",
  "questions": [
    {
      "type": "MCQ",
      "prompt": "What year did WW2 start?",
      "answer": "1939",
      "choices": ["1939", "1941", "1945"],
      "order": 0
    }
  ],
  "isPublic": true,
  "language": "en"
}
```

**Response:** `201 Created`
```json
{
  "quiz": { "id": "...", "title": "...", "questionCount": 5 }
}
```

### GET `/api/quizzes`
List quizzes.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)
- `public` (boolean)

**Response:** `200 OK`
```json
{
  "quizzes": [...]
}
```

### POST `/api/quizzes/:quizId/attempt`
Submit quiz attempt.

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": "...",
      "choiceId": "...",
      "text": "Answer text"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "attempt": { "id": "...", "score": 85.5 }
}
```

---

## 🃏 Flashcards (`/api/flashcards`)

### POST `/api/flashcards/decks`
Create a flashcard deck.

**Request Body:**
```json
{
  "title": "Spanish Vocabulary",
  "cards": [
    { "front": "Hello", "back": "Hola" },
    { "front": "Goodbye", "back": "Adiós" }
  ]
}
```

**Response:** `201 Created`
```json
{
  "deck": { "id": "...", "title": "...", "cardCount": 2 }
}
```

### GET `/api/flashcards/decks`
List flashcard decks.

**Query Parameters:**
- `limit`
- `offset`

**Response:** `200 OK`
```json
{
  "decks": [...]
}
```

### GET `/api/flashcards/decks/:deckId/due`
Get due cards for review.

**Query Parameters:**
- `limit` (default: 10)

**Response:** `200 OK`
```json
{
  "cards": [...]
}
```

### POST `/api/flashcards/cards/:cardId/review`
Review a flashcard (SM-2 algorithm).

**Request Body:**
```json
{
  "quality": 3
}
```
Quality: 0=Again, 1=Hard, 2=Good, 3=Easy

**Response:** `200 OK`
```json
{
  "ease": 2.5,
  "due": "2025-10-30T..."
}
```

---

## 📅 Study Planner (`/api/planner`)

### POST `/api/planner/tasks`
Create a study task.

**Request Body:**
```json
{
  "title": "Study Math",
  "details": "Review chapter 5",
  "due": "2025-10-28T18:00:00Z",
  "repeat": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
}
```

**Response:** `201 Created`
```json
{
  "task": { "id": "...", "title": "...", "status": "pending" }
}
```

### GET `/api/planner/tasks`
List study tasks.

**Query Parameters:**
- `status` (pending, completed, cancelled)

**Response:** `200 OK`
```json
{
  "tasks": [...]
}
```

### PATCH `/api/planner/tasks/:taskId`
Update task status.

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response:** `200 OK`
```json
{
  "task": { "id": "...", "status": "completed" }
}
```

---

## ✍️ Essays (`/api/essays`)

### POST `/api/essays/analyze`
Analyze an essay (queued).

**Request Body:**
```json
{
  "content": "Essay content here...",
  "essayType": "academic",
  "topic": "Climate Change"
}
```

**Response:** `202 Accepted`
```json
{
  "jobId": "..."
}
```

### GET `/api/essays/:jobId`
Get essay analysis result.

**Response:** `200 OK`
```json
{
  "job": { "id": "...", "status": "completed", "result": {...} }
}
```

---

## 📖 Homework (`/api/homework`)

### POST `/api/homework/help`
Get homework help (queued).

**Request Body:**
```json
{
  "imageUrl": "https://example.com/problem.jpg",
  "question": "Solve this math problem",
  "subject": "mathematics"
}
```

**Response:** `202 Accepted`
```json
{
  "jobId": "..."
}
```

### GET `/api/homework/:jobId`
Get homework help result.

**Response:** `200 OK`
```json
{
  "job": { "id": "...", "status": "completed", "result": {...} }
}
```

---

## 🎙️ Voice (`/api/voice`)

### POST `/api/voice/transcribe`
Transcribe audio to text (queued).

**Request Body:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "language": "en"
}
```

**Response:** `202 Accepted`
```json
{
  "jobId": "..."
}
```

### GET `/api/voice/:jobId`
Get transcription result.

**Response:** `200 OK`
```json
{
  "job": { "id": "...", "status": "completed", "result": "..." }
}
```

---

## 🔖 Bookmarks (`/api/bookmarks`)

### POST `/api/bookmarks`
Create a bookmark.

**Request Body:**
```json
{
  "kind": "lesson",
  "targetId": "cuid..."
}
```

**Response:** `201 Created`
```json
{
  "bookmark": { "id": "...", "kind": "lesson", "targetId": "..." }
}
```

### GET `/api/bookmarks`
List bookmarks.

**Response:** `200 OK`
```json
{
  "bookmarks": [...]
}
```

### DELETE `/api/bookmarks/:id`
Delete a bookmark.

**Response:** `200 OK`
```json
{
  "message": "Deleted"
}
```

---

## 🎯 Challenges (`/api/challenges`)

### GET `/api/challenges/daily`
Get daily challenge.

**Response:** `200 OK`
```json
{
  "challenge": {
    "id": "...",
    "title": "...",
    "description": "...",
    "difficulty": "medium"
  }
}
```

---

## 📊 Progress (`/api/progress`)

### GET `/api/progress/stats`
Get user progress statistics.

**Response:** `200 OK`
```json
{
  "conversations": 10,
  "lessons": 5,
  "quizzes": 3,
  "flashcards": 2,
  "tasks": 8
}
```

---

## 🔍 Search (`/api/search`)

### GET `/api/search`
Full-text search.

**Query Parameters:**
- `q` (required) - search query
- `type` (lesson, quiz)

**Response:** `200 OK`
```json
{
  "results": [...]
}
```

---

## 💼 Jobs (`/api/jobs`)

### GET `/api/jobs`
List user's jobs.

**Query Parameters:**
- `status` (queued, processing, completed, failed)

**Response:** `200 OK`
```json
{
  "jobs": [...]
}
```

### GET `/api/jobs/:id`
Get job status.

**Response:** `200 OK`
```json
{
  "job": {
    "id": "...",
    "type": "ai_tutor",
    "status": "completed",
    "result": {...}
  }
}
```

---

## 🔗 Base URLs

- **Development:** `http://localhost:3000`
- **Production:** `https://api.ivyway.com`

## 🔑 Authentication

All routes except `/api/auth/register` and `/api/auth/login` require authentication:

```
Authorization: Bearer {accessToken}
```

Get your access token from `/api/auth/login`.

## 📖 API Documentation

- **Swagger UI:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health

---

**Total Routes: 33** ✅

