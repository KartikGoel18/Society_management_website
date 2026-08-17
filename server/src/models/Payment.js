import mongoose from 'mongoose';
import { PAYMENT_METHOD_VALUES, PAYMENT_STATUSES } from '../constants/billingTypes.js';

const paymentSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.CREATED,
      index: true
    },
    method: {
      type: String,
      enum: PAYMENT_METHOD_VALUES
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    paidAt: Date,
    failureReason: {
      type: String,
      trim: true
    },
    rawWebhookEventIds: [String]
  },
  { timestamps: true }
);

paymentSchema.index({ societyId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ billId: 1, status: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
