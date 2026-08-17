import mongoose from 'mongoose';
import { VISITOR_STATUS_VALUES } from '../constants/visitorTypes.js';

const visitorLogSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visitor',
      required: true,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: VISITOR_STATUS_VALUES,
      required: true,
      index: true
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

visitorLogSchema.index({ societyId: 1, occurredAt: -1 });
visitorLogSchema.index({ societyId: 1, flatId: 1, occurredAt: -1 });

export const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);
