import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { VISITOR_STATUSES, VISITOR_TYPES } from '../constants/visitorTypes.js';
import { Flat } from '../models/Flat.js';
import { User } from '../models/User.js';
import { Visitor } from '../models/Visitor.js';
import { notificationService } from '../services/notification.service.js';
import { visitorLogService } from '../services/visitorLog.service.js';
import { visitorPassService } from '../services/visitorPass.service.js';
import { getIo } from '../sockets/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

const defaultValidUntil = (expectedArrival) => {
  const base = expectedArrival ? new Date(expectedArrival) : new Date();
  return new Date(base.getTime() + 24 * 60 * 60 * 1000);
};

const emitSocietyEvent = (societyId, event, payload) => {
  const io = getIo();
  if (io) {
    io.to(`society:${societyId}`).emit(event, payload);
  }
};

const emitUserEvent = (userId, event, payload) => {
  const io = getIo();
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
};

const notifyFlatResidents = async (visitor, { type, title, body }) => {
  const residents = await User.find({
    societyId: visitor.societyId,
    flatId: visitor.flatId,
    role: ROLES.RESIDENT,
    isActive: true
  });

  await Promise.all(
    residents.map(async (resident) => {
      await notificationService.create({
        userId: resident._id,
        type,
        title,
        body,
        relatedEntityId: visitor._id
      });

      try {
        await notificationService.pushToUser(resident, { title, body }, {
          type,
          visitorId: visitor._id.toString()
        });
      } catch (_error) {
        // Push delivery is best-effort; in-app notification and socket event remain the source of truth.
      }

      emitUserEvent(resident._id, type, { visitorId: visitor._id, status: visitor.status });
    })
  );
};

const ensureFlatInTenant = async (flatId, tenantFilter) => {
  const flat = await Flat.findOne({ _id: flatId, ...tenantFilter });

  if (!flat) {
    throw new ApiError(404, 'Flat not found in this society');
  }

  return flat;
};

const resolveResidentFlat = async (req) => {
  if (req.user.role === ROLES.RESIDENT) {
    const requestedFlatId = req.body.flatId || req.user.flatId?.toString();

    if (!req.user.flatId || requestedFlatId !== req.user.flatId.toString()) {
      throw new ApiError(403, 'Residents can only manage visitors for their own flat');
    }

    return ensureFlatInTenant(req.user.flatId, req.tenantFilter);
  }

  if (!req.body.flatId) {
    throw new ApiError(422, 'flatId is required');
  }

  return ensureFlatInTenant(req.body.flatId, req.tenantFilter);
};

const getScopedVisitor = async (req, includeSecrets = false) => {
  const query = Visitor.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (includeSecrets) {
    query.select('+otpHash +qrTokenHash');
  }

  const visitor = await query;

  if (!visitor) {
    throw new ApiError(404, 'Visitor not found');
  }

  if (req.user.role === ROLES.RESIDENT && visitor.flatId.toString() !== req.user.flatId?.toString()) {
    throw new ApiError(403, 'Visitor access denied');
  }

  return visitor;
};

const sanitizeVisitorPayload = (visitor) => {
  const payload = visitor.toObject ? visitor.toObject() : visitor;
  delete payload.otpHash;
  delete payload.qrTokenHash;
  return payload;
};

export const preApproveVisitor = asyncHandler(async (req, res) => {
  const flat = await resolveResidentFlat(req);
  const pass = visitorPassService.createPass();

  const visitor = await Visitor.create({
    societyId: flat.societyId,
    flatId: flat._id,
    name: req.body.name,
    phone: req.body.phone,
    photo: req.body.photo,
    purpose: req.body.purpose,
    visitorType: req.body.visitorType || VISITOR_TYPES.GUEST,
    source: 'pre_approved',
    vehicleNumber: req.body.vehicleNumber,
    expectedArrival: req.body.expectedArrival,
    validFrom: req.body.validFrom || new Date(),
    validUntil: req.body.validUntil || defaultValidUntil(req.body.expectedArrival),
    status: VISITOR_STATUSES.APPROVED,
    otpHash: pass.otpHash,
    qrTokenHash: pass.qrTokenHash,
    approvedBy: req.user._id,
    createdBy: req.user._id,
    residentResponseAt: new Date(),
    isRecurring: Boolean(req.body.isRecurring),
    recurringRule: req.body.recurringRule,
    leaveAtGate: Boolean(req.body.leaveAtGate),
    gateNote: req.body.gateNote
  });

  await visitorLogService.record(visitor, { actorId: req.user._id, action: 'pre_approved' });
  emitSocietyEvent(visitor.societyId, NOTIFICATION_TYPES.VISITOR_STATUS_UPDATE, {
    visitorId: visitor._id,
    status: visitor.status
  });

  sendSuccess(
    res,
    201,
    {
      visitor: sanitizeVisitorPayload(visitor),
      pass: {
        otp: pass.otp,
        qrToken: pass.qrToken,
        qrPayload: visitorPassService.encodeQrPayload(visitor._id, pass.qrToken),
        validUntil: visitor.validUntil
      }
    },
    'Visitor pre-approved'
  );
});

export const createWalkInVisitor = asyncHandler(async (req, res) => {
  const flat = await ensureFlatInTenant(req.body.flatId, req.tenantFilter);
  const pass = visitorPassService.createPass();

  const visitor = await Visitor.create({
    societyId: flat.societyId,
    flatId: flat._id,
    name: req.body.name,
    phone: req.body.phone,
    photo: req.body.photo,
    purpose: req.body.purpose,
    visitorType: req.body.visitorType || VISITOR_TYPES.GUEST,
    source: 'walk_in',
    vehicleNumber: req.body.vehicleNumber,
    expectedArrival: new Date(),
    validFrom: new Date(),
    validUntil: defaultValidUntil(new Date()),
    status: VISITOR_STATUSES.PENDING,
    otpHash: pass.otpHash,
    qrTokenHash: pass.qrTokenHash,
    createdBy: req.user._id,
    gateNote: req.body.gateNote,
    leaveAtGate: Boolean(req.body.leaveAtGate)
  });

  await visitorLogService.record(visitor, { actorId: req.user._id, action: 'walk_in_created' });
  await notifyFlatResidents(visitor, {
    type: NOTIFICATION_TYPES.VISITOR_NEW_REQUEST,
    title: 'Visitor waiting at gate',
    body: `${visitor.name} is waiting for ${visitor.purpose}`
  });
  emitSocietyEvent(visitor.societyId, NOTIFICATION_TYPES.VISITOR_NEW_REQUEST, {
    visitorId: visitor._id,
    flatId: visitor.flatId,
    status: visitor.status
  });

  sendSuccess(res, 201, { visitor: sanitizeVisitorPayload(visitor) }, 'Walk-in visitor request created');
});

export const respondToVisitor = asyncHandler(async (req, res) => {
  const visitor = await getScopedVisitor(req);

  if (![VISITOR_STATUSES.PENDING, VISITOR_STATUSES.APPROVED].includes(visitor.status)) {
    throw new ApiError(409, `Visitor cannot be changed from status ${visitor.status}`);
  }

  const approved = req.body.decision === 'approved';
  visitor.status = approved
    ? (req.body.leaveAtGate && visitor.visitorType === VISITOR_TYPES.DELIVERY
        ? VISITOR_STATUSES.LEFT_AT_GATE
        : VISITOR_STATUSES.APPROVED)
    : VISITOR_STATUSES.REJECTED;
  visitor.approvedBy = approved ? req.user._id : undefined;
  visitor.residentResponseAt = new Date();
  visitor.approvalNote = req.body.approvalNote;
  visitor.leaveAtGate = Boolean(req.body.leaveAtGate || visitor.leaveAtGate);
  await visitor.save();

  await visitorLogService.record(visitor, {
    actorId: req.user._id,
    action: approved ? 'approved' : 'rejected'
  });
  emitSocietyEvent(visitor.societyId, NOTIFICATION_TYPES.VISITOR_STATUS_UPDATE, {
    visitorId: visitor._id,
    status: visitor.status
  });

  sendSuccess(res, 200, { visitor: sanitizeVisitorPayload(visitor) }, approved ? 'Visitor approved' : 'Visitor rejected');
});

export const checkInVisitor = asyncHandler(async (req, res) => {
  const visitor = await getScopedVisitor(req, true);

  if (visitor.status !== VISITOR_STATUSES.APPROVED) {
    throw new ApiError(409, 'Only approved visitors can be checked in');
  }

  if (visitor.validFrom && visitor.validFrom > new Date()) {
    throw new ApiError(409, 'Visitor pass is not active yet');
  }

  if (visitor.validUntil && visitor.validUntil < new Date()) {
    throw new ApiError(409, 'Visitor pass has expired');
  }

  let qrToken = req.body.qrToken;

  if (req.body.qrPayload) {
    const decoded = visitorPassService.decodeQrPayload(req.body.qrPayload);

    if (decoded.visitorId !== visitor._id.toString()) {
      throw new ApiError(400, 'QR payload does not match this visitor');
    }

    qrToken = decoded.token;
  }

  const otpMatches = req.body.otp && visitor.otpHash === visitorPassService.hash(req.body.otp);
  const qrMatches = qrToken && visitor.qrTokenHash === visitorPassService.hash(qrToken);
  const approvedWalkIn = visitor.source === 'walk_in' && Boolean(visitor.residentResponseAt);

  if (!otpMatches && !qrMatches && !approvedWalkIn) {
    throw new ApiError(400, 'Valid OTP or QR token is required');
  }

  visitor.status = VISITOR_STATUSES.CHECKED_IN;
  visitor.entryTime = new Date();
  visitor.checkedInBy = req.user._id;
  visitor.gateNote = req.body.gateNote || visitor.gateNote;
  await visitor.save();

  await visitorLogService.record(visitor, { actorId: req.user._id, action: 'checked_in' });
  await notifyFlatResidents(visitor, {
    type: NOTIFICATION_TYPES.VISITOR_STATUS_UPDATE,
    title: 'Visitor checked in',
    body: `${visitor.name} has checked in at the gate`
  });
  emitSocietyEvent(visitor.societyId, NOTIFICATION_TYPES.VISITOR_STATUS_UPDATE, {
    visitorId: visitor._id,
    status: visitor.status
  });

  sendSuccess(res, 200, { visitor: sanitizeVisitorPayload(visitor) }, 'Visitor checked in');
});

export const checkOutVisitor = asyncHandler(async (req, res) => {
  const visitor = await getScopedVisitor(req);

  if (visitor.status !== VISITOR_STATUSES.CHECKED_IN) {
    throw new ApiError(409, 'Only checked-in visitors can be checked out');
  }

  visitor.status = VISITOR_STATUSES.CHECKED_OUT;
  visitor.exitTime = new Date();
  visitor.checkedOutBy = req.user._id;
  await visitor.save();

  await visitorLogService.record(visitor, { actorId: req.user._id, action: 'checked_out' });
  emitSocietyEvent(visitor.societyId, NOTIFICATION_TYPES.VISITOR_STATUS_UPDATE, {
    visitorId: visitor._id,
    status: visitor.status
  });

  sendSuccess(res, 200, { visitor: sanitizeVisitorPayload(visitor) }, 'Visitor checked out');
});

export const listVisitors = asyncHandler(async (req, res) => {
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

  if (req.query.visitorType) filter.visitorType = req.query.visitorType;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = req.query.from;
    if (req.query.to) filter.createdAt.$lte = req.query.to;
  }
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { phone: new RegExp(req.query.search, 'i') },
      { purpose: new RegExp(req.query.search, 'i') },
      { vehicleNumber: new RegExp(req.query.search, 'i') }
    ];
  }

  const [items, total] = await Promise.all([
    Visitor.find(filter)
      .populate('flatId', 'flatNumber floor towerId')
      .populate('approvedBy', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Visitor.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Visitors fetched');
});
