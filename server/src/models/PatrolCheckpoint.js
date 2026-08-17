import mongoose from 'mongoose';

const patrolCheckpointSchema = new mongoose.Schema(
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
      trim: true
    },
    qrCodeHash: {
      type: String,
      required: true,
      select: false
    },
    location: {
      lat: Number,
      lng: Number,
      label: {
        type: String,
        trim: true
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

patrolCheckpointSchema.index({ societyId: 1, name: 1 }, { unique: true });
patrolCheckpointSchema.index({ societyId: 1, isActive: 1 });

export const PatrolCheckpoint = mongoose.model('PatrolCheckpoint', patrolCheckpointSchema);
