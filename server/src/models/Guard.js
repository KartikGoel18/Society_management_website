import mongoose from 'mongoose';
import { GUARD_STATUSES, GUARD_STATUS_VALUES, SHIFT_ACTION_VALUES } from '../constants/securityTypes.js';

const shiftLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: SHIFT_ACTION_VALUES,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true
    },
    location: {
      lat: Number,
      lng: Number,
      label: String
    }
  },
  { _id: false }
);

const guardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    shiftTiming: {
      startsAt: String,
      endsAt: String
    },
    currentStatus: {
      type: String,
      enum: GUARD_STATUS_VALUES,
      default: GUARD_STATUSES.OFF_DUTY,
      index: true
    },
    currentShiftStartedAt: Date,
    lastShiftEndedAt: Date,
    shiftLogs: [shiftLogSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

guardSchema.index({ societyId: 1, currentStatus: 1 });

export const Guard = mongoose.model('Guard', guardSchema);
