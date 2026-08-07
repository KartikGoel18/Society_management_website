import { Flat } from '../models/Flat.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { auditService } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, { user: req.user }, 'Profile fetched');
});

export const updateMe = asyncHandler(async (req, res) => {
  const updates = ['name', 'email', 'profilePhoto'].reduce((payload, field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
    return payload;
  }, {});

  if (req.body.fcmToken && !req.user.fcmTokens.includes(req.body.fcmToken)) {
    req.user.fcmTokens.push(req.body.fcmToken);
  }

  Object.assign(req.user, updates);
  await req.user.save();
  sendSuccess(res, 200, { user: req.user }, 'Profile updated');
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    ...req.tenantFilter,
    ...(req.query.role ? { role: req.query.role } : {}),
    ...(req.query.isApproved !== undefined ? { isApproved: req.query.isApproved === 'true' } : {})
  };

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Users fetched');
});

export const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, ...req.tenantFilter });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Super admin approval cannot be changed here');
  }

  user.isApproved = req.body.approved;
  await user.save();

  if (user.flatId && user.isApproved) {
    const flatUpdate = user.role === ROLES.RESIDENT ? { $addToSet: { tenantIds: user._id }, status: 'occupied' } : {};
    await Flat.updateOne({ _id: user.flatId, societyId: user.societyId }, flatUpdate);
  }

  await auditService.record({
    req,
    action: req.body.approved ? 'user_approved' : 'user_rejected',
    entityType: 'User',
    entityId: user._id
  });

  sendSuccess(res, 200, { user }, req.body.approved ? 'User approved' : 'User rejected');
});
