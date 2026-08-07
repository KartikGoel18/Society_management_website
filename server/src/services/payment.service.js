import crypto from 'crypto';
import { razorpay } from '../config/razorpay.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { timingSafeEqual } from '../utils/crypto.js';

export const paymentService = {
  async createOrder({ amountPaise, currency = 'INR', receipt, notes = {} }) {
    if (!razorpay) {
      throw new ApiError(503, 'Razorpay is not configured');
    }

    return razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes
    });
  },

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!env.razorpay.keySecret) {
      throw new ApiError(503, 'Razorpay is not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return timingSafeEqual(expectedSignature, signature);
  },

  verifyWebhookSignature(rawBody, signature) {
    if (!env.razorpay.webhookSecret) {
      throw new ApiError(503, 'Razorpay webhook secret is not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return timingSafeEqual(expectedSignature, signature);
  }
};
