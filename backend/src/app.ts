import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { senderRouter } from './routes/senders.js';
import { emailRouter } from './routes/emails.js';

export const app = express();

// Security and CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Redis client for session store (with graceful degradation for tests)
let sessionStore: session.Store | undefined;
try {
  if (env.NODE_ENV !== 'test') {
    const redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    redisClient.connect().catch((err) => {
      logger.warn({ err }, 'Redis session connection delayed; using memory fallback until connected');
    });
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
    });
  }
} catch (e) {
  logger.warn({ err: e }, 'Could not initialize RedisStore, falling back to MemoryStore');
}

// Session middleware configured strictly to use cookie named "sid"
app.use(
  session({
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Base API Routes
app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', senderRouter);
app.use('/api', emailRouter);

// Catch-all for unmatched /api routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Centralized error handler strictly adhering to API contract
app.use(errorHandler);
