import crypto from 'crypto';
import { paymentService } from '../services/payment.service.js';

describe('Razorpay payment signature verification', () => {
  it('validates order payment signatures with HMAC SHA256', () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret';
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(paymentService.verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
    expect(paymentService.verifyPaymentSignature({ orderId, paymentId, signature: 'bad_signature' })).toBe(false);
  });
});
