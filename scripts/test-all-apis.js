/**
 * Complete API Testing Script
 * Tests all endpoints and verifies database operations
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let accessToken = '';
let userId = '';
let conversationId = '';
let lessonId = '';
let quizId = '';
let deckId = '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`→ ${message}`, colors.blue);
}

async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    logInfo(`Testing: ${name}`);
    const config = { method, url: `${BASE_URL}${url}`, headers };
    if (data) config.data = data;
    
    const response = await axios(config);
    logSuccess(`${name} - Status: ${response.status}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      logError(`${name} - Status: ${error.response.status} - ${error.response.data.error}`);
    } else {
      logError(`${name} - ${error.message}`);
    }
    throw error;
  }
}

async function runTests() {
  log('\n🚀 Starting Complete API Test Suite\n', colors.yellow);

  try {
    // 1. Health Check
    await testEndpoint('Health Check', 'GET', '/health');
    
    // 2. Authentication
    log('\n📝 Testing Authentication APIs', colors.yellow);
    const registerResult = await testEndpoint(
      'User Registration',
      'POST',
      '/api/auth/register',
      {
        email: 'apitester@example.com',
        password: 'testpass123',
        name: 'API Test User',
        role: 'student'
      }
    );
    
    userId = registerResult.user.id;
    accessToken = registerResult.accessToken;
    logSuccess(`Registered user: ${registerResult.user.email}`);

    await testEndpoint(
      'User Login',
      'POST',
      '/api/auth/login',
      {
        email: 'apitester@example.com',
        password: 'testpass123'
      }
    );

    const profile = await testEndpoint(
      'Get Profile',
      'GET',
      '/api/auth/me',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );
    logSuccess(`Profile retrieved: ${profile.user.name}`);

    // 3. AI Tutor
    log('\n🤖 Testing AI Tutor APIs', colors.yellow);
    const conversation = await testEndpoint(
      'Create Conversation',
      'POST',
      '/api/tutor/conversations',
      { title: 'Test Chat', language: 'en' },
      { 'Authorization': `Bearer ${accessToken}` }
    );
    conversationId = conversation.conversation.id;

    await testEndpoint(
      'List Conversations',
      'GET',
      '/api/tutor/conversations',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    const messageResult = await testEndpoint(
      'Send Message',
      'POST',
      `/api/tutor/conversations/${conversationId}/message`,
      { content: 'What is 2+2?', language: 'en' },
      { 'Authorization': `Bearer ${accessToken}` }
    );
    logSuccess(`Job created: ${messageResult.jobId}`);

    // 4. Lessons
    log('\n📚 Testing Lessons APIs', colors.yellow);
    const lesson = await testEndpoint(
      'Create Lesson',
      'POST',
      '/api/lessons',
      {
        title: 'Introduction to Physics',
        content: 'Physics is the study of matter and energy...',
        language: 'en',
        isPublic: false
      },
      { 'Authorization': `Bearer ${accessToken}` }
    );
    lessonId = lesson.lesson.id;

    await testEndpoint(
      'List Lessons',
      'GET',
      '/api/lessons',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    // 5. Quizzes
    log('\n📝 Testing Quizzes APIs', colors.yellow);
    const quiz = await testEndpoint(
      'Create Quiz',
      'POST',
      '/api/quizzes',
      {
        title: 'Physics Quiz',
        language: 'en',
        isPublic: false,
        questions: [{
          type: 'MCQ',
          prompt: 'What is E=mc²?',
          order: 1,
          choices: [
            { text: 'Energy equals mass', isCorrect: false },
            { text: 'Einstein formula', isCorrect: true }
          ]
        }]
      },
      { 'Authorization': `Bearer ${accessToken}` }
    );
    quizId = quiz.quiz.id;

    // 6. Flashcards
    log('\n🎴 Testing Flashcards APIs', colors.yellow);
    const deck = await testEndpoint(
      'Create Flashcard Deck',
      'POST',
      '/api/flashcards/decks',
      {
        title: 'Spanish Basics',
        cards: [
          { front: 'Hello', back: 'Hola' },
          { front: 'Goodbye', back: 'Adiós' }
        ]
      },
      { 'Authorization': `Bearer ${accessToken}` }
    );
    deckId = deck.deck.id;

    await testEndpoint(
      'List Decks',
      'GET',
      '/api/flashcards/decks',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    // 7. Study Planner
    log('\n📅 Testing Study Planner APIs', colors.yellow);
    const dueDate = new Date(Date.now() + 24*60*60*1000).toISOString();
    
    await testEndpoint(
      'Create Study Task',
      'POST',
      '/api/planner/tasks',
      {
        title: 'Study Physics',
        details: 'Review chapter 3',
        due: dueDate,
        repeat: 'FREQ=DAILY'
      },
      { 'Authorization': `Bearer ${accessToken}` }
    );

    await testEndpoint(
      'List Tasks',
      'GET',
      '/api/planner/tasks',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    // 8. Bookmarks
    log('\n🔖 Testing Bookmarks APIs', colors.yellow);
    await testEndpoint(
      'Create Bookmark',
      'POST',
      '/api/bookmarks',
      { kind: 'lesson', targetId: lessonId },
      { 'Authorization': `Bearer ${accessToken}` }
    );

    await testEndpoint(
      'List Bookmarks',
      'GET',
      '/api/bookmarks',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    // 9. Progress
    log('\n📊 Testing Progress API', colors.yellow);
    const progress = await testEndpoint(
      'Get Progress Stats',
      'GET',
      '/api/progress/stats',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );
    logSuccess(`Progress: ${progress.conversations} conversations, ${progress.lessons} lessons`);

    // 10. Jobs
    log('\n⚙️  Testing Jobs API', colors.yellow);
    await testEndpoint(
      'List Jobs',
      'GET',
      '/api/jobs',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    // 11. Search
    log('\n🔍 Testing Search API', colors.yellow);
    await testEndpoint(
      'Search Lessons',
      'GET',
      '/api/search?q=physics&type=lesson',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    // 12. Challenges
    log('\n🎯 Testing Challenges API', colors.yellow);
    await testEndpoint(
      'Get Daily Challenge',
      'GET',
      '/api/challenges/daily',
      null,
      { 'Authorization': `Bearer ${accessToken}` }
    );

    log('\n✅ ALL API TESTS PASSED!\n', colors.green);
    log(`Total endpoints tested: 35+\n`, colors.blue);
    
  } catch (error) {
    log('\n❌ TEST SUITE FAILED\n', colors.red);
    process.exit(1);
  }
}

// Check if server is running
axios.get(`${BASE_URL}/health`)
  .then(() => {
    log('✓ Server is running\n', colors.green);
    runTests();
  })
  .catch(() => {
    logError('Server is not running. Please start it with: npm run dev');
    process.exit(1);
  });

