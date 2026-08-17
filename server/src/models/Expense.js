import mongoose from 'mongoose';
import { EXPENSE_CATEGORY_VALUES } from '../constants/billingTypes.js';

const expenseSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORY_VALUES,
      required: true,
      index: true
    },
    vendor: {
      type: String,
      required: true,
      trim: true
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
    date: {
      type: Date,
      required: true,
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiptUrl: String,
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

expenseSchema.index({ societyId: 1, category: 1, date: -1 });
expenseSchema.index({ societyId: 1, date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
