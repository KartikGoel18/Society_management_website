import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import xssClean from 'xss-clean';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { authLimiter } from './middleware/rateLimit.middleware.js';
import { apiRoutes } from './routes/index.js';
import { env } from './config/env.js';

export const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(cookieParser());
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/payments/webhook') {
    next();
    return;
  }

  mongoSanitize()(req, res, next);
});
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/payments/webhook') {
    next();
    return;
  }

  xssClean()(req, res, next);
});

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' }, message: 'API is healthy', error: null });
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
