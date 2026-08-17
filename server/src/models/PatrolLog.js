import mongoose from 'mongoose';

const patrolLogSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guard',
      required: true,
      index: true
    },
    checkpointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatrolCheckpoint',
      required: true,
      index: true
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    location: {
      lat: Number,
      lng: Number,
      label: String
    },
    note: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

patrolLogSchema.index({ societyId: 1, scannedAt: -1 });
patrolLogSchema.index({ guardId: 1, scannedAt: -1 });
patrolLogSchema.index({ checkpointId: 1, scannedAt: -1 });

export const PatrolLog = mongoose.model('PatrolLog', patrolLogSchema);
