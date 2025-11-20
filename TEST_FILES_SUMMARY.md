# 🧪 Test Files Summary

This document lists all test files in the IvyWay AI backend.

## 📁 Test Files (7 total)

### 1. `tests/auth.test.ts` - Authentication Tests
**What it tests:**
- ✅ User registration
- ✅ User login
- ✅ Profile retrieval
- ✅ Token validation
- ✅ Email format validation
- ✅ Password length validation
- ✅ Authentication failures

**Total tests:** 10 tests

---

### 2. `tests/tutor.test.ts` - AI Tutor Tests
**What it tests:**
- ✅ Create conversation
- ✅ List conversations
- ✅ Send message to AI tutor
- ✅ Get conversation messages
- ✅ User isolation (access control)

**Total tests:** 5 tests

---

### 3. `tests/lesson.test.ts` - Lessons Tests
**What it tests:**
- ✅ Create lesson
- ✅ List lessons
- ✅ Authentication required
- ✅ Lesson CRUD operations

**Total tests:** 3 tests

---

### 4. `tests/flashcard.test.ts` - Flashcard Tests
**What it tests:**
- ✅ Create flashcard deck
- ✅ List decks
- ✅ Get due cards for review
- ✅ Review card (SM-2 algorithm)

**Total tests:** 4 tests

---

### 5. `tests/utils.test.ts` - Utility Tests
**What it tests:**
- ✅ SM-2 spaced repetition algorithm
  - Quality 0 (Again) calculation
  - Quality 3 (Good) calculation
  - Quality 5 (Easy) calculation
  - Minimum ease factor (1.3)
  - Due date calculation
- ✅ RRULE parser
  - Valid RRULE parsing
  - Invalid RRULE handling
  - Next occurrence calculation

**Total tests:** 9 tests

---

### 6. `tests/integration.test.ts` - Complete Integration Tests
**What it tests:**
- ✅ Authentication flow
- ✅ AI Tutor (conversations, messages)
- ✅ Lessons (create, list, search)
- ✅ Quizzes (create, list)
- ✅ Flashcards (decks, due cards, review)
- ✅ Study Planner (tasks)
- ✅ Bookmarks
- ✅ Progress stats
- ✅ Jobs listing
- ✅ Search functionality
- ✅ Daily challenges
- ✅ Health check

**Total tests:** 26 tests

---

### 7. `tests/setup.ts` - Test Setup
**What it does:**
- Sets up test environment
- Cleans up after tests
- Configures global test hooks

---

## 📊 Test Coverage Summary

### By Category:
- **Authentication**: 10 tests
- **AI Tutor**: 5 tests
- **Lessons**: 3 tests
- **Flashcards**: 4 tests
- **Utilities**: 9 tests
- **Integration**: 26 tests
- **Setup**: 1 file

**Total Test Cases: ~60+ tests**

---

## 🧪 Test Commands

### Run all tests:
```bash
npm test
```

### Run specific test suite:
```bash
npm test auth
npm test tutor
npm test lesson
npm test flashcard
npm test utils
```

### Run with coverage:
```bash
npm run test:coverage
```

### Run integration tests only:
```bash
npm run test:integration
```

---

## 🔧 Testing Stack

- **Framework**: Vitest
- **HTTP Testing**: Supertest
- **Database**: PostgreSQL (via Prisma)
- **Coverage**: @vitest/coverage-v8

---

## 📝 Test Structure

### Example Test Structure:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Feature Name API', () => {
  let accessToken: string;
  let featureId: string;

  beforeAll(async () => {
    // Setup: Register and login user
    await request(app).post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'pass123', name: 'Test' });
    
    const loginRes = await request(app).post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass123' });
    
    accessToken = loginRes.body.accessToken;
  });

  it('should create feature', async () => {
    const response = await request(app)
      .post('/api/feature')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Feature' });
    
    expect(response.status).toBe(201);
    expect(response.body.feature).toBeDefined();
  });
});
```

---

## ✅ Test Quality

- ✅ **Integration tests** for all major API endpoints
- ✅ **Authentication testing** (JWT tokens)
- ✅ **Error handling** tests
- ✅ **Input validation** tests
- ✅ **Algorithm verification** (SM-2, RRULE)
- ✅ **User isolation** tests
- ✅ **Database operations** tests

---

## 📁 File Locations

```
tests/
├── auth.test.ts          # Authentication tests
├── tutor.test.ts         # AI Tutor tests
├── lesson.test.ts        # Lesson tests
├── flashcard.test.ts     # Flashcard tests
├── utils.test.ts         # Utility tests (SM-2, RRULE)
├── integration.test.ts    # Complete integration tests
└── setup.ts              # Test configuration
```

---

## 🎯 Test Execution

All tests use:
- **Vitest** as the test runner
- **Supertest** for HTTP testing
- **Prisma** for database operations
- **JWT** for authentication testing

Tests run against the actual database in development mode.

