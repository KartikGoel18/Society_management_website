import mongoose from 'mongoose';
import {
  STAFF_CATEGORIES,
  STAFF_CATEGORY_VALUES,
  STAFF_STATUSES,
  STAFF_STATUS_VALUES,
  WAGE_PAYMENT_STATUSES,
  WAGE_PAYMENT_STATUS_VALUES
} from '../constants/staffTypes.js';

const reviewSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const wageRecordSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    period: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: WAGE_PAYMENT_STATUS_VALUES,
      default: WAGE_PAYMENT_STATUSES.PENDING
    },
    paidOn: Date,
    note: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

const staffSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    photo: String,
    idProofUrl: String,
    category: {
      type: String,
      enum: STAFF_CATEGORY_VALUES,
      default: STAFF_CATEGORIES.OTHER,
      index: true
    },
    assignedFlats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
        index: true
      }
    ],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    reviews: [reviewSchema],
    wageRecords: [wageRecordSchema],
    status: {
      type: String,
      enum: STAFF_STATUS_VALUES,
      default: STAFF_STATUSES.PENDING_VERIFICATION,
      index: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

staffSchema.index({ societyId: 1, phone: 1 }, { unique: true });
staffSchema.index({ societyId: 1, category: 1, status: 1 });
staffSchema.index({ societyId: 1, assignedFlats: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
