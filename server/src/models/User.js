import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ROLE_VALUES, ROLES } from '../constants/roles.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const otpSchema = new mongoose.Schema(
  {
    codeHash: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    },
    lastSentAt: Date
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      select: false
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.RESIDENT,
      index: true
    },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      index: true
    },
    profilePhoto: String,
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    fcmTokens: [
      {
        type: String,
        trim: true
      }
    ],
    refreshTokens: [refreshTokenSchema],
    otp: otpSchema,
    passwordReset: otpSchema
  },
  { timestamps: true }
);

userSchema.index({ societyId: 1, role: 1 });
userSchema.index({ societyId: 1, flatId: 1 });

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

userSchema.methods.comparePassword = function comparePassword(password) {
  if (!this.passwordHash) {
    return false;
  }

  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.refreshTokens;
  delete user.otp;
  delete user.passwordReset;
  return user;
};

export const User = mongoose.model('User', userSchema);
