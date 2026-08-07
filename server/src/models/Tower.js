import mongoose from 'mongoose';

const towerSchema = new mongoose.Schema(
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
    floors: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { timestamps: true }
);

towerSchema.index({ societyId: 1, name: 1 }, { unique: true });

export const Tower = mongoose.model('Tower', towerSchema);
