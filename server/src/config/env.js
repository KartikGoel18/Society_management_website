import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

if (process.env.NODE_ENV === 'test') {
  process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/society_management_test';
  process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-that-is-long-enough';
  process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-that-is-long-enough';
  process.env.CLIENT_URL ||= 'http://localhost:5173';
  process.env.RAZORPAY_KEY_SECRET ||= 'test_razorpay_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET ||= 'test_razorpay_webhook_secret';
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_TEMPLATE_ID: z.string().optional().default(''),
  MSG91_SENDER_ID: z.string().optional().default(''),
  MSG91_BASE_URL: z.string().url().default('https://api.msg91.com/api/v5'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('Society Management <no-reply@example.com>')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  clientUrl: parsed.data.CLIENT_URL,
  mongoUri: parsed.data.MONGO_URI,
  jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  cookieSecure: parsed.data.COOKIE_SECURE,
  msg91: {
    authKey: parsed.data.MSG91_AUTH_KEY,
    templateId: parsed.data.MSG91_TEMPLATE_ID,
    senderId: parsed.data.MSG91_SENDER_ID,
    baseUrl: parsed.data.MSG91_BASE_URL
  },
  cloudinary: {
    cloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
    apiKey: parsed.data.CLOUDINARY_API_KEY,
    apiSecret: parsed.data.CLOUDINARY_API_SECRET
  },
  razorpay: {
    keyId: parsed.data.RAZORPAY_KEY_ID,
    keySecret: parsed.data.RAZORPAY_KEY_SECRET,
    webhookSecret: parsed.data.RAZORPAY_WEBHOOK_SECRET
  },
  firebase: {
    projectId: parsed.data.FIREBASE_PROJECT_ID,
    clientEmail: parsed.data.FIREBASE_CLIENT_EMAIL,
    privateKey: parsed.data.FIREBASE_PRIVATE_KEY
  },
  smtp: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    from: parsed.data.SMTP_FROM
  }
};
