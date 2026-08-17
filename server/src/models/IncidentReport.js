import mongoose from 'mongoose';
import { INCIDENT_CATEGORY_VALUES, INCIDENT_STATUSES, INCIDENT_STATUS_VALUES } from '../constants/securityTypes.js';

const incidentReportSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: INCIDENT_CATEGORY_VALUES,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    photos: [String],
    location: {
      lat: Number,
      lng: Number,
      label: String
    },
    status: {
      type: String,
      enum: INCIDENT_STATUS_VALUES,
      default: INCIDENT_STATUSES.OPEN,
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

incidentReportSchema.index({ societyId: 1, status: 1, createdAt: -1 });

export const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);
