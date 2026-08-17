import mongoose from 'mongoose';
import { VISITOR_STATUS_VALUES, VISITOR_STATUSES, VISITOR_TYPE_VALUES, VISITOR_TYPES } from '../constants/visitorTypes.js';

const visitorSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    photo: String,
    purpose: {
      type: String,
      required: true,
      trim: true
    },
    visitorType: {
      type: String,
      enum: VISITOR_TYPE_VALUES,
      default: VISITOR_TYPES.GUEST,
      index: true
    },
    source: {
      type: String,
      enum: ['pre_approved', 'walk_in'],
      required: true,
      index: true
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    expectedArrival: {
      type: Date,
      index: true
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      index: true
    },
    entryTime: {
      type: Date,
      index: true
    },
    exitTime: {
      type: Date,
      index: true
    },
    status: {
      type: String,
      enum: VISITOR_STATUS_VALUES,
      default: VISITOR_STATUSES.PENDING,
      index: true
    },
    otpHash: {
      type: String,
      select: false
    },
    qrTokenHash: {
      type: String,
      select: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    residentResponseAt: Date,
    isRecurring: {
      type: Boolean,
      default: false,
      index: true
    },
    recurringRule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      daysOfWeek: [Number],
      endsAt: Date
    },
    leaveAtGate: {
      type: Boolean,
      default: false
    },
    gateNote: {
      type: String,
      trim: true
    },
    approvalNote: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

visitorSchema.index({ societyId: 1, status: 1, expectedArrival: -1 });
visitorSchema.index({ societyId: 1, flatId: 1, createdAt: -1 });
visitorSchema.index({ societyId: 1, visitorType: 1, createdAt: -1 });
visitorSchema.index({ societyId: 1, phone: 1, isRecurring: 1 });
visitorSchema.index({ societyId: 1, source: 1, createdAt: -1 });

export const Visitor = mongoose.model('Visitor', visitorSchema);
