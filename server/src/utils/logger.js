import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.nodeEnv === 'test' ? 'silent' : 'info',
  transport: env.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    : undefined
});
