import mongoose from 'mongoose';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_CATEGORY_VALUES,
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_VALUES
} from '../constants/complaintTypes.js';

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    attachments: [String],
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
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
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORY_VALUES,
      default: COMPLAINT_CATEGORIES.OTHER,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    photos: [String],
    status: {
      type: String,
      enum: COMPLAINT_STATUS_VALUES,
      default: COMPLAINT_STATUSES.OPEN,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignedToModel',
      index: true
    },
    assignedToModel: {
      type: String,
      enum: ['User', 'Staff']
    },
    comments: [commentSchema],
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: {
        type: String,
        trim: true
      },
      submittedAt: Date
    },
    slaDeadline: {
      type: Date,
      index: true
    },
    resolvedAt: Date,
    closedAt: Date
  },
  { timestamps: true }
);

complaintSchema.index({ societyId: 1, status: 1, createdAt: -1 });
complaintSchema.index({ societyId: 1, flatId: 1, createdAt: -1 });
complaintSchema.index({ societyId: 1, category: 1, status: 1 });
complaintSchema.index({ societyId: 1, assignedTo: 1, status: 1 });

export const Complaint = mongoose.model('Complaint', complaintSchema);
