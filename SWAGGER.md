# Swagger API Documentation

## 🎯 Overview

Swagger UI has been integrated into the IvyWay AI backend for interactive API documentation.

## 📍 Access

Once the server is running, visit:
```
http://localhost:3000/api-docs
```

## 🔧 Setup

### Install Dependencies
```bash
npm install
```

### Start the Server
```bash
npm run dev
```

### Access Swagger
Open your browser and navigate to:
- Local: http://localhost:3000/api-docs
- Production: https://api.ivyway.com/api-docs

## 📝 Features

### Interactive Documentation
- **Try It Out**: Test endpoints directly from the browser
- **Authentication**: Enter JWT tokens to access protected endpoints
- **Schema Validation**: See request/response schemas
- **Code Generation**: Copy curl commands for testing

### Endpoints Documented

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get profile

#### AI Tutor
- `POST /api/tutor/conversations` - Create conversation
- `GET /api/tutor/conversations` - List conversations
- `GET /api/tutor/conversations/{id}` - Get messages
- `POST /api/tutor/conversations/{id}/message` - Send message

## 🚀 Using Swagger

### 1. Authorize
Click the "Authorize" button at the top right and enter your JWT token:
```
Bearer YOUR_JWT_TOKEN
```

### 2. Test Endpoints
1. Find the endpoint you want to test
2. Click "Try it out"
3. Enter parameters in the request body
4. Click "Execute"
5. See the response below

### 3. Example: Register a User

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "student"
}
```

**Response**:
```json
{
  "user": {
    "id": "cuid...",
    "email": "student@example.com",
    "name": "John Doe",
    "role": "student"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4. Example: Send AI Tutor Message

**Endpoint**: `POST /api/tutor/conversations/{conversationId}/message`

**Request Body**:
```json
{
  "content": "Explain quantum physics",
  "language": "en"
}
```

**Response**:
```json
{
  "conversationId": "cuid...",
  "messageId": "cuid...",
  "jobId": "cuid..."
}
```

## 🔒 Authentication

Most endpoints require authentication. To use them:

1. **Register/Login** to get a JWT token
2. Click **"Authorize"** button in Swagger UI
3. Enter: `Bearer YOUR_TOKEN`
4. All protected endpoints will now use this token

## 📋 Adding More Documentation

To add Swagger documentation to a new route, use JSDoc comments:

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Your endpoint description
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/your-endpoint', yourHandler);
```

## 📦 Dependencies

```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0",
  "@types/swagger-jsdoc": "^6.0.1",
  "@types/swagger-ui-express": "^4.1.6"
}
```

## 🎨 Customization

Edit `src/config/swagger.ts` to customize:
- API title and description
- Server URLs
- Security schemes
- Response schemas
- Tags and grouping

## 🌐 Production

In production, you may want to:
1. Restrict Swagger to internal IPs
2. Add authentication to `/api-docs` endpoint
3. Disable Swagger in production environments

Example middleware:
```typescript
if (env.NODE_ENV === 'production') {
  app.use('/api-docs', (req, res) => res.send('Documentation disabled in production'));
} else {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
```

## 📚 Resources

- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)

## ✅ Benefits

- **Interactive Testing**: Test API endpoints without Postman
- **Auto-Generated Docs**: Always up-to-date with code
- **Team Collaboration**: Shared documentation for frontend/backend
- **Client Code Generation**: Generate API clients automatically
- **Schema Validation**: Validate requests/responses
- **Better DX**: Improve developer experience

