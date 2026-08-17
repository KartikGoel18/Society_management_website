import mongoose from 'mongoose';
import { BILL_STATUSES, BILL_STATUS_VALUES } from '../constants/billingTypes.js';

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true
    },
    billingPeriod: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    lineItems: {
      type: [lineItemSchema],
      required: true,
      validate: [(items) => items.length > 0, 'At least one line item is required']
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    dueDate: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: BILL_STATUS_VALUES,
      default: BILL_STATUSES.PENDING,
      index: true
    },
    paidOn: Date,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

billSchema.index({ societyId: 1, flatId: 1, billingPeriod: 1 }, { unique: true });
billSchema.index({ societyId: 1, status: 1, dueDate: 1 });

export const Bill = mongoose.model('Bill', billSchema);
