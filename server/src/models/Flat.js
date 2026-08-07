import mongoose from 'mongoose';

const flatSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    towerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tower',
      required: true,
      index: true
    },
    flatNumber: {
      type: String,
      required: true,
      trim: true
    },
    floor: {
      type: Number,
      required: true
    },
    sizeSqFt: {
      type: Number,
      required: true,
      min: 1
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    tenantIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['occupied', 'vacant'],
      default: 'vacant',
      index: true
    }
  },
  { timestamps: true }
);

flatSchema.index({ societyId: 1, towerId: 1, flatNumber: 1 }, { unique: true });

export const Flat = mongoose.model('Flat', flatSchema);
