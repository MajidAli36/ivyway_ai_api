import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { errorHandler, notFound, AppError } from './middlewares/error.middleware';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';

// Routes
import { authRouter } from './routes/auth.routes';
import { tutorRouter } from './routes/tutor.routes';
import { lessonRouter } from './routes/lesson.routes';
import { quizRouter } from './routes/quiz.routes';
import { plannerRouter } from './routes/planner.routes';
import { essayRouter } from './routes/essay.routes';
import { homeworkRouter } from './routes/homework.routes';
import { voiceRouter } from './routes/voice.routes';
import { bookmarkRouter } from './routes/bookmark.routes';
import { challengeRouter } from './routes/challenge.routes';
import { progressRouter } from './routes/progress.routes';
import { searchRouter } from './routes/search.routes';
import { jobRouter } from './routes/job.routes';

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : true, // Allow all origins in development (for mobile apps)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Add request ID for tracing
app.use((req, res, next) => {
  res.locals.requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/tutor', tutorRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/essays', essayRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/bookmarks', bookmarkRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/progress', progressRouter);
app.use('/api/search', searchRouter);
app.use('/api/jobs', jobRouter);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export { app };

