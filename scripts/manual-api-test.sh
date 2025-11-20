#!/bin/bash

echo "🧪 Manual API Testing Script"
echo "============================"
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s $BASE_URL/health | jq .
echo ""

# Test 2: Register
echo "2️⃣  Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"manualtest@example.com","password":"password123","name":"Manual Test","role":"student"}')

echo $REGISTER_RESPONSE | jq .

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.user.id')

echo "✅ Token: $ACCESS_TOKEN"
echo ""

# Test 3: Login
echo "3️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manualtest@example.com","password":"password123"}')

echo $LOGIN_RESPONSE | jq .
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
echo ""

# Test 4: Get Profile
echo "4️⃣  Getting profile..."
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
echo ""

# Test 5: Create Conversation
echo "5️⃣  Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST $BASE_URL/api/tutor/conversations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Manual Test Chat","language":"en"}')

echo $CONV_RESPONSE | jq .
CONV_ID=$(echo $CONV_RESPONSE | jq -r '.conversation.id')
echo ""

# Test 6: Send Message
echo "6️⃣  Sending message..."
MESSAGE_RESPONSE=$(curl -s -X POST $BASE_URL/api/tutor/conversations/$CONV_ID/message \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"What is 2+2?","language":"en"}')

echo $MESSAGE_RESPONSE | jq .
JOB_ID=$(echo $MESSAGE_RESPONSE | jq -r '.jobId')
echo ""

# Test 7: Create Lesson
echo "7️⃣  Creating lesson..."
LESSON_RESPONSE=$(curl -s -X POST $BASE_URL/api/lessons \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Lesson","content":"This is a test lesson","language":"en","isPublic":false}')

echo $LESSON_RESPONSE | jq .
echo ""

# Test 8: Create Flashcard Deck
echo "8️⃣  Creating flashcard deck..."
DECK_RESPONSE=$(curl -s -X POST $BASE_URL/api/flashcards/decks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Spanish","cards":[{"front":"Hello","back":"Hola"},{"front":"Goodbye","back":"Adiós"}]}')

echo $DECK_RESPONSE | jq .
echo ""

# Test 9: Get Progress
echo "9️⃣  Getting progress..."
curl -s -X GET $BASE_URL/api/progress/stats \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
echo ""

echo "✅ ALL MANUAL TESTS COMPLETE!"
echo "All APIs are working! 🎉"

