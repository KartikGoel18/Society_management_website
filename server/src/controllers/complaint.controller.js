import mongoose from 'mongoose';
import { COMPLAINT_STATUSES } from '../constants/complaintTypes.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { ROLES } from '../constants/roles.js';
import { Complaint } from '../models/Complaint.js';
import { Flat } from '../models/Flat.js';
import { Staff } from '../models/Staff.js';
import { User } from '../models/User.js';
import { auditService } from '../services/audit.service.js';
import { notificationService } from '../services/notification.service.js';
import { getIo } from '../sockets/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

const emitComplaintEvent = (societyId, payload) => {
  const io = getIo();
  if (io) {
    io.to(`society:${societyId}`).emit(NOTIFICATION_TYPES.COMPLAINT_STATUS_UPDATE, payload);
  }
};

const resolveFlatForComplaint = async (req) => {
  let flatId = req.body.flatId;

  if (req.user.role === ROLES.RESIDENT) {
    flatId = req.user.flatId;
  }

  if (!flatId) {
    throw new ApiError(422, 'flatId is required');
  }

  const flat = await Flat.findOne({ _id: flatId, ...req.tenantFilter });
  if (!flat) {
    throw new ApiError(404, 'Flat not found in this society');
  }

  return flat;
};

const getScopedComplaint = async (req) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, ...req.tenantFilter });

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  if (req.user.role === ROLES.RESIDENT && complaint.flatId.toString() !== req.user.flatId?.toString()) {
    throw new ApiError(403, 'Complaint access denied');
  }

  return complaint;
};

const notifyResident = async (complaint, { title, body }) => {
  const resident = await User.findById(complaint.raisedBy);
  if (!resident) return;

  await notificationService.create({
    userId: resident._id,
    type: NOTIFICATION_TYPES.COMPLAINT_STATUS_UPDATE,
    title,
    body,
    relatedEntityId: complaint._id
  });

  try {
    await notificationService.pushToUser(resident, { title, body }, {
      type: NOTIFICATION_TYPES.COMPLAINT_STATUS_UPDATE,
      complaintId: complaint._id.toString()
    });
  } catch (_error) {
    // Push delivery is best-effort; in-app notification and socket event remain durable.
  }
};

const validateAssignee = async (req, assignedTo, assignedToModel) => {
  if (!assignedTo) {
    return {};
  }

  if (!assignedToModel) {
    throw new ApiError(422, 'assignedToModel is required when assignedTo is provided');
  }

  if (assignedToModel === 'User') {
    const user = await User.findOne({ _id: assignedTo, ...req.tenantFilter, role: { $in: [ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD] } });
    if (!user) {
      throw new ApiError(404, 'Assignee user not found in this society');
    }
  } else {
    const staff = await Staff.findOne({ _id: assignedTo, ...req.tenantFilter });
    if (!staff) {
      throw new ApiError(404, 'Assignee staff member not found in this society');
    }
  }

  return { assignedTo, assignedToModel };
};

export const createComplaint = asyncHandler(async (req, res) => {
  const flat = await resolveFlatForComplaint(req);
  const complaint = await Complaint.create({
    societyId: flat.societyId,
    flatId: flat._id,
    raisedBy: req.user._id,
    category: req.body.category,
    description: req.body.description,
    photos: req.body.photos || [],
    slaDeadline: req.body.slaDeadline
  });

  await auditService.record({ req, action: 'complaint_created', entityType: 'Complaint', entityId: complaint._id });
  emitComplaintEvent(complaint.societyId, {
    complaintId: complaint._id,
    status: complaint.status,
    flatId: complaint.flatId
  });

  sendSuccess(res, 201, { complaint }, 'Complaint created');
});

export const listComplaints = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...req.tenantFilter };

  if (req.user.role === ROLES.RESIDENT) {
    if (!req.user.flatId) {
      throw new ApiError(403, 'Resident is not linked to a flat');
    }
    filter.flatId = req.user.flatId;
  } else if (req.query.flatId) {
    filter.flatId = new mongoose.Types.ObjectId(req.query.flatId);
  }

  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = new mongoose.Types.ObjectId(req.query.assignedTo);

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .populate('flatId', 'flatNumber floor towerId')
      .populate('raisedBy', 'name phone')
      .populate('assignedTo', 'name phone category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Complaints fetched');
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const complaint = await getScopedComplaint(req);
  const assignee = await validateAssignee(req, req.body.assignedTo, req.body.assignedToModel);

  complaint.status = req.body.status;
  if (assignee.assignedTo) {
    complaint.assignedTo = assignee.assignedTo;
    complaint.assignedToModel = assignee.assignedToModel;
  }
  if (req.body.slaDeadline) complaint.slaDeadline = req.body.slaDeadline;
  if (req.body.status === COMPLAINT_STATUSES.RESOLVED) complaint.resolvedAt = new Date();
  if (req.body.status === COMPLAINT_STATUSES.CLOSED) complaint.closedAt = new Date();
  if (req.body.comment) {
    complaint.comments.push({
      authorId: req.user._id,
      body: req.body.comment,
      isInternal: false
    });
  }

  await complaint.save();
  await auditService.record({ req, action: 'complaint_status_updated', entityType: 'Complaint', entityId: complaint._id });
  await notifyResident(complaint, {
    title: 'Complaint status updated',
    body: `Your ${complaint.category} complaint is now ${complaint.status.replace('_', ' ')}`
  });
  emitComplaintEvent(complaint.societyId, {
    complaintId: complaint._id,
    status: complaint.status,
    assignedTo: complaint.assignedTo
  });

  sendSuccess(res, 200, { complaint }, 'Complaint status updated');
});

export const addComplaintComment = asyncHandler(async (req, res) => {
  const complaint = await getScopedComplaint(req);
  const isInternal = req.user.role !== ROLES.RESIDENT && Boolean(req.body.isInternal);

  complaint.comments.push({
    authorId: req.user._id,
    body: req.body.body,
    attachments: req.body.attachments || [],
    isInternal
  });
  await complaint.save();

  if (!isInternal && req.user._id.toString() !== complaint.raisedBy.toString()) {
    await notifyResident(complaint, {
      title: 'New complaint comment',
      body: req.body.body
    });
  }

  emitComplaintEvent(complaint.societyId, {
    complaintId: complaint._id,
    status: complaint.status,
    commentAdded: true
  });

  sendSuccess(res, 201, { complaint }, 'Complaint comment added');
});

export const submitComplaintFeedback = asyncHandler(async (req, res) => {
  const complaint = await getScopedComplaint(req);

  if (req.user.role !== ROLES.RESIDENT || complaint.raisedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the resident who raised the complaint can submit feedback');
  }

  if (![COMPLAINT_STATUSES.RESOLVED, COMPLAINT_STATUSES.CLOSED].includes(complaint.status)) {
    throw new ApiError(409, 'Feedback can only be submitted after resolution');
  }

  complaint.rating = {
    score: req.body.score,
    feedback: req.body.feedback,
    submittedAt: new Date()
  };
  if (complaint.status === COMPLAINT_STATUSES.RESOLVED) {
    complaint.status = COMPLAINT_STATUSES.CLOSED;
    complaint.closedAt = new Date();
  }
  await complaint.save();

  await auditService.record({ req, action: 'complaint_feedback_submitted', entityType: 'Complaint', entityId: complaint._id });
  sendSuccess(res, 200, { complaint }, 'Complaint feedback submitted');
});
