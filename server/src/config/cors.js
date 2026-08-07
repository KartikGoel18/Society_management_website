import { env } from './env.js';

const origins = env.clientUrl.split(',').map((origin) => origin.trim());

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
