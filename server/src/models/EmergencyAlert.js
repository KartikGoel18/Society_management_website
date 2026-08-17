import mongoose from 'mongoose';
import { ALERT_SEVERITIES, ALERT_SEVERITY_VALUES } from '../constants/securityTypes.js';

const emergencyAlertSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      index: true
    },
    severity: {
      type: String,
      enum: ALERT_SEVERITY_VALUES,
      default: ALERT_SEVERITIES.CRITICAL,
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      lat: Number,
      lng: Number,
      label: String
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  { timestamps: true }
);

emergencyAlertSchema.index({ societyId: 1, status: 1, createdAt: -1 });

export const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema);
