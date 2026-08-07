import mongoose from 'mongoose';

const societySettingsSchema = new mongoose.Schema(
  {
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
      default: 'monthly'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  { _id: false }
);

const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    address: {
      line1: { type: String, required: true, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, required: true, trim: true, index: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      country: { type: String, default: 'India', trim: true }
    },
    subscriptionPlan: {
      type: String,
      enum: ['trial', 'basic', 'standard', 'premium', 'enterprise'],
      default: 'trial',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    settings: {
      type: societySettingsSchema,
      default: () => ({})
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

societySchema.index({ name: 1, 'address.city': 1 });

export const Society = mongoose.model('Society', societySchema);
