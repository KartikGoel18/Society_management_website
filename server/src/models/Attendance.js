import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true
    },
    checkIn: {
      type: Date,
      required: true,
      index: true
    },
    checkOut: {
      type: Date,
      index: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    checkInNote: {
      type: String,
      trim: true
    },
    checkOutNote: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ societyId: 1, staffId: 1, checkIn: -1 });
attendanceSchema.index({ societyId: 1, flatId: 1, checkIn: -1 });
attendanceSchema.index({ staffId: 1, flatId: 1, checkOut: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
