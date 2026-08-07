import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  if (statusCode === 500) {
    logger.error(error);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: {
      details: error.details || null,
      stack: env.nodeEnv === 'development' ? error.stack : undefined
    }
  });
};
