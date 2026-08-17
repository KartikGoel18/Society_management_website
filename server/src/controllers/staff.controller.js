import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';
import { ATTENDANCE_ACTIONS, STAFF_STATUSES, WAGE_PAYMENT_STATUSES } from '../constants/staffTypes.js';
import { Attendance } from '../models/Attendance.js';
import { Flat } from '../models/Flat.js';
import { Staff } from '../models/Staff.js';
import { auditService } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

const getSocietyIdForCreate = (req) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (!req.body.societyId) {
      throw new ApiError(422, 'societyId is required for super admin staff creation');
    }

    return req.body.societyId;
  }

  return req.user.societyId;
};

const ensureFlatsInTenant = async (flatIds, tenantFilter) => {
  if (!flatIds?.length) {
    return [];
  }

  const uniqueFlatIds = [...new Set(flatIds.map((flatId) => flatId.toString()))];
  const flats = await Flat.find({ _id: { $in: uniqueFlatIds }, ...tenantFilter });

  if (flats.length !== uniqueFlatIds.length) {
    throw new ApiError(404, 'One or more flats were not found in this society');
  }

  return flats;
};

const getScopedStaff = async (req) => {
  const staff = await Staff.findOne({ _id: req.params.id, ...req.tenantFilter });

  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (req.user.role === ROLES.RESIDENT && !staff.assignedFlats.some((flatId) => flatId.toString() === req.user.flatId?.toString())) {
    throw new ApiError(403, 'Staff member is not assigned to your flat');
  }

  return staff;
};

const sanitizeStaffForUser = (staff, user) => {
  const payload = staff.toObject ? staff.toObject() : staff;

  if (user.role === ROLES.RESIDENT) {
    payload.wageRecords = payload.wageRecords.filter((record) => record.flatId.toString() === user.flatId?.toString());
  }

  return payload;
};

const resolveAttendanceFlat = async (req, staff) => {
  let flatId = req.body.flatId;

  if (req.user.role === ROLES.RESIDENT) {
    flatId = req.user.flatId;
  }

  if (!flatId) {
    throw new ApiError(422, 'flatId is required');
  }

  await ensureFlatsInTenant([flatId], req.tenantFilter);

  if (!staff.assignedFlats.some((assignedFlatId) => assignedFlatId.toString() === flatId.toString())) {
    throw new ApiError(403, 'Staff member is not assigned to this flat');
  }

  return flatId;
};

const recalculateRating = (staff) => {
  const count = staff.reviews.length;
  const total = staff.reviews.reduce((sum, review) => sum + review.rating, 0);
  staff.rating = {
    count,
    average: count ? Number((total / count).toFixed(2)) : 0
  };
};

export const createStaff = asyncHandler(async (req, res) => {
  const societyId = getSocietyIdForCreate(req);
  const tenantFilter = req.user.role === ROLES.SUPER_ADMIN
    ? { societyId: new mongoose.Types.ObjectId(societyId) }
    : req.tenantFilter;
  const canVerifyStaff = [ROLES.SUPER_ADMIN, ROLES.SOCIETY_ADMIN].includes(req.user.role);

  await ensureFlatsInTenant(req.body.assignedFlats || [], tenantFilter);

  const staff = await Staff.create({
    societyId,
    name: req.body.name,
    phone: req.body.phone,
    photo: req.body.photo,
    idProofUrl: req.body.idProofUrl,
    category: req.body.category,
    assignedFlats: req.body.assignedFlats || [],
    status: canVerifyStaff ? (req.body.status || STAFF_STATUSES.ACTIVE) : STAFF_STATUSES.PENDING_VERIFICATION,
    verifiedBy: canVerifyStaff ? req.user._id : undefined,
    verifiedAt: canVerifyStaff ? new Date() : undefined,
    createdBy: req.user._id
  });

  await auditService.record({ req, action: 'staff_created', entityType: 'Staff', entityId: staff._id });
  sendSuccess(res, 201, { staff: sanitizeStaffForUser(staff, req.user) }, 'Staff member created');
});

export const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...req.tenantFilter };

  if (req.user.role === ROLES.RESIDENT) {
    filter.status = STAFF_STATUSES.ACTIVE;
    if (req.query.flatId && req.query.flatId !== req.user.flatId?.toString()) {
      throw new ApiError(403, 'Residents can only filter staff for their own flat');
    }
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.category) filter.category = req.query.category;
  if (req.query.flatId) filter.assignedFlats = new mongoose.Types.ObjectId(req.query.flatId);
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { phone: new RegExp(req.query.search, 'i') }
    ];
  }

  const [items, total] = await Promise.all([
    Staff.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Staff.countDocuments(filter)
  ]);

  sendSuccess(
    res,
    200,
    paginatedPayload({ items: items.map((staff) => sanitizeStaffForUser(staff, req.user)), total, page, limit }),
    'Staff directory fetched'
  );
});

export const recordAttendance = asyncHandler(async (req, res) => {
  const staff = await getScopedStaff(req);
  const flatId = await resolveAttendanceFlat(req, staff);

  if (req.body.action === ATTENDANCE_ACTIONS.CHECK_IN) {
    const existingOpen = await Attendance.findOne({
      staffId: staff._id,
      flatId,
      checkOut: { $exists: false }
    });

    if (existingOpen) {
      throw new ApiError(409, 'Staff member is already checked in for this flat');
    }

    const attendance = await Attendance.create({
      societyId: staff.societyId,
      staffId: staff._id,
      flatId,
      checkIn: new Date(),
      verifiedBy: req.user._id,
      checkInNote: req.body.note
    });

    await auditService.record({ req, action: 'staff_checked_in', entityType: 'Attendance', entityId: attendance._id });
    sendSuccess(res, 201, { attendance }, 'Staff attendance check-in recorded');
    return;
  }

  const attendance = await Attendance.findOne({
    staffId: staff._id,
    flatId,
    checkOut: { $exists: false }
  }).sort({ checkIn: -1 });

  if (!attendance) {
    throw new ApiError(409, 'No open check-in found for this staff member and flat');
  }

  attendance.checkOut = new Date();
  attendance.verifiedBy = req.user._id;
  attendance.checkOutNote = req.body.note;
  await attendance.save();

  await auditService.record({ req, action: 'staff_checked_out', entityType: 'Attendance', entityId: attendance._id });
  sendSuccess(res, 200, { attendance }, 'Staff attendance check-out recorded');
});

export const addStaffReview = asyncHandler(async (req, res) => {
  const staff = await getScopedStaff(req);

  const existingReview = staff.reviews.find(
    (review) => review.residentId.toString() === req.user._id.toString() && review.flatId.toString() === req.user.flatId?.toString()
  );

  if (existingReview) {
    existingReview.rating = req.body.rating;
    existingReview.comment = req.body.comment;
    existingReview.createdAt = new Date();
  } else {
    staff.reviews.push({
      residentId: req.user._id,
      flatId: req.user.flatId,
      rating: req.body.rating,
      comment: req.body.comment
    });
  }

  recalculateRating(staff);
  await staff.save();

  sendSuccess(res, 200, { staff: sanitizeStaffForUser(staff, req.user) }, 'Staff review saved');
});

export const addWageRecord = asyncHandler(async (req, res) => {
  const staff = await getScopedStaff(req);
  const flatId = req.user.role === ROLES.RESIDENT ? req.user.flatId : req.body.flatId;

  if (!flatId) {
    throw new ApiError(422, 'flatId is required');
  }

  await ensureFlatsInTenant([flatId], req.tenantFilter);

  if (!staff.assignedFlats.some((assignedFlatId) => assignedFlatId.toString() === flatId.toString())) {
    throw new ApiError(403, 'Staff member is not assigned to this flat');
  }

  staff.wageRecords.push({
    flatId,
    residentId: req.user._id,
    amount: req.body.amount,
    currency: req.body.currency || 'INR',
    period: req.body.period,
    status: req.body.status || WAGE_PAYMENT_STATUSES.PENDING,
    paidOn: req.body.paidOn,
    note: req.body.note
  });
  await staff.save();

  const wageRecord = staff.wageRecords[staff.wageRecords.length - 1];
  await auditService.record({ req, action: 'staff_wage_record_added', entityType: 'Staff', entityId: staff._id });

  sendSuccess(res, 201, { wageRecord }, 'Staff wage record added');
});
