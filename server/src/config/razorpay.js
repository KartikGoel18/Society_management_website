import Razorpay from 'razorpay';
import { env } from './env.js';

export const razorpay = env.razorpay.keyId && env.razorpay.keySecret
  ? new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret
    })
  : null;
