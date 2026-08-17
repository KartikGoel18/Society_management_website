import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { ALERT_SEVERITIES, GUARD_STATUSES, SHIFT_ACTIONS } from '../constants/securityTypes.js';
import { EmergencyAlert } from '../models/EmergencyAlert.js';
import { Flat } from '../models/Flat.js';
import { Guard } from '../models/Guard.js';
import { IncidentReport } from '../models/IncidentReport.js';
import { PatrolCheckpoint } from '../models/PatrolCheckpoint.js';
import { PatrolLog } from '../models/PatrolLog.js';
import { User } from '../models/User.js';
import { auditService } from '../services/audit.service.js';
import { notificationService } from '../services/notification.service.js';
import { qrTokenService } from '../services/qrToken.service.js';
import { getIo } from '../sockets/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

const emitSocietyEvent = (societyId, event, payload) => {
  const io = getIo();
  if (io) {
    io.to(`society:${societyId}`).emit(event, payload);
  }
};

const sanitizeCheckpoint = (checkpoint) => {
  const payload = checkpoint.toObject ? checkpoint.toObject() : checkpoint;
  delete payload.qrCodeHash;
  return payload;
};

const resolveGuardForShift = async (req) => {
  if (req.params.id === 'me') {
    if (req.user.role !== ROLES.SECURITY_GUARD) {
      throw new ApiError(403, 'Only guards can use the me shortcut');
    }

    return Guard.findOneAndUpdate(
      { userId: req.user._id, societyId: req.user.societyId },
      { userId: req.user._id, societyId: req.user.societyId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const guard = await Guard.findOne({ _id: req.params.id, ...req.tenantFilter });

  if (!guard) {
    throw new ApiError(404, 'Guard profile not found');
  }

  if (req.user.role === ROLES.SECURITY_GUARD && guard.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Guards can only update their own shift');
  }

  return guard;
};

const resolveCurrentGuard = async (req) => {
  const guard = await Guard.findOneAndUpdate(
    { userId: req.user._id, societyId: req.user.societyId },
    { userId: req.user._id, societyId: req.user.societyId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!guard.isActive) {
    throw new ApiError(403, 'Guard profile is inactive');
  }

  return guard;
};

const notifySecurityResponders = async (alert) => {
  const responders = await User.find({
    societyId: alert.societyId,
    role: { $in: [ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD] },
    isActive: true
  });

  await Promise.all(
    responders.map(async (user) => {
      await notificationService.create({
        userId: user._id,
        type: NOTIFICATION_TYPES.ALERT_SOS,
        title: 'Emergency alert',
        body: alert.message,
        relatedEntityId: alert._id
      });

      try {
        await notificationService.pushToUser(user, { title: 'Emergency alert', body: alert.message }, {
          type: NOTIFICATION_TYPES.ALERT_SOS,
          alertId: alert._id.toString()
        });
      } catch (_error) {
        // Push is best-effort; sockets and in-app notifications carry the durable alert.
      }
    })
  );
};

export const updateGuardShift = asyncHandler(async (req, res) => {
  const guard = await resolveGuardForShift(req);
  const action = req.body.action;

  if (action === SHIFT_ACTIONS.CHECK_IN && guard.currentStatus !== GUARD_STATUSES.OFF_DUTY) {
    throw new ApiError(409, 'Guard is already on duty');
  }

  if (action === SHIFT_ACTIONS.CHECK_OUT && guard.currentStatus === GUARD_STATUSES.OFF_DUTY) {
    throw new ApiError(409, 'Guard is already off duty');
  }

  guard.shiftLogs.push({
    action,
    timestamp: new Date(),
    note: req.body.note,
    location: req.body.location
  });

  if (action === SHIFT_ACTIONS.CHECK_IN) {
    guard.currentStatus = GUARD_STATUSES.ON_DUTY;
    guard.currentShiftStartedAt = new Date();
  } else {
    guard.currentStatus = GUARD_STATUSES.OFF_DUTY;
    guard.lastShiftEndedAt = new Date();
    guard.currentShiftStartedAt = undefined;
  }

  await guard.save();
  await auditService.record({ req, action: `guard_${action}`, entityType: 'Guard', entityId: guard._id });

  sendSuccess(res, 200, { guard }, action === SHIFT_ACTIONS.CHECK_IN ? 'Guard checked in' : 'Guard checked out');
});

export const createPatrolCheckpoint = asyncHandler(async (req, res) => {
  const token = qrTokenService.createToken();
  const checkpoint = await PatrolCheckpoint.create({
    societyId: req.user.societyId,
    name: req.body.name,
    qrCodeHash: token.tokenHash,
    location: req.body.location,
    createdBy: req.user._id
  });

  await auditService.record({
    req,
    action: 'patrol_checkpoint_created',
    entityType: 'PatrolCheckpoint',
    entityId: checkpoint._id
  });

  sendSuccess(
    res,
    201,
    {
      checkpoint: sanitizeCheckpoint(checkpoint),
      qr: {
        token: token.token,
        payload: qrTokenService.encodePayload('patrol_checkpoint', checkpoint._id, token.token)
      }
    },
    'Patrol checkpoint created'
  );
});

export const listPatrolCheckpoints = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    ...req.tenantFilter,
    ...(req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {})
  };
  const [items, total] = await Promise.all([
    PatrolCheckpoint.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    PatrolCheckpoint.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Patrol checkpoints fetched');
});

export const logPatrolCheckpoint = asyncHandler(async (req, res) => {
  const guard = await resolveCurrentGuard(req);

  if (guard.currentStatus === GUARD_STATUSES.OFF_DUTY) {
    throw new ApiError(409, 'Guard must be on duty to log patrol checkpoints');
  }

  const checkpoint = await PatrolCheckpoint.findOne({
    _id: req.body.checkpointId,
    ...req.tenantFilter,
    isActive: true
  }).select('+qrCodeHash');

  if (!checkpoint) {
    throw new ApiError(404, 'Patrol checkpoint not found');
  }

  let qrToken = req.body.qrToken;
  if (req.body.qrPayload) {
    const decoded = qrTokenService.decodePayload(req.body.qrPayload);

    if (decoded.entityType !== 'patrol_checkpoint' || decoded.entityId !== checkpoint._id.toString()) {
      throw new ApiError(400, 'QR payload does not match this checkpoint');
    }

    qrToken = decoded.token;
  }

  if (!qrToken || checkpoint.qrCodeHash !== qrTokenService.hash(qrToken)) {
    throw new ApiError(400, 'Valid checkpoint QR token is required');
  }

  guard.currentStatus = GUARD_STATUSES.ON_PATROL;
  await guard.save();

  const patrolLog = await PatrolLog.create({
    societyId: checkpoint.societyId,
    guardId: guard._id,
    checkpointId: checkpoint._id,
    location: req.body.location,
    note: req.body.note
  });

  sendSuccess(res, 201, { patrolLog }, 'Patrol checkpoint logged');
});

export const raiseSosAlert = asyncHandler(async (req, res) => {
  let flatId = req.body.flatId;

  if (req.user.role === ROLES.RESIDENT) {
    flatId = req.user.flatId;
  }

  if (flatId) {
    const flat = await Flat.findOne({ _id: flatId, ...req.tenantFilter });
    if (!flat) {
      throw new ApiError(404, 'Flat not found in this society');
    }
  }

  const alert = await EmergencyAlert.create({
    societyId: req.user.societyId,
    raisedBy: req.user._id,
    flatId,
    severity: req.body.severity || ALERT_SEVERITIES.CRITICAL,
    message: req.body.message,
    location: req.body.location
  });

  await notifySecurityResponders(alert);
  emitSocietyEvent(alert.societyId, NOTIFICATION_TYPES.ALERT_SOS, {
    alertId: alert._id,
    severity: alert.severity,
    raisedBy: alert.raisedBy,
    flatId: alert.flatId,
    location: alert.location
  });
  await auditService.record({ req, action: 'sos_alert_raised', entityType: 'EmergencyAlert', entityId: alert._id });

  sendSuccess(res, 201, { alert }, 'SOS alert raised');
});

export const createIncidentReport = asyncHandler(async (req, res) => {
  const incident = await IncidentReport.create({
    societyId: req.user.societyId,
    reportedBy: req.user._id,
    category: req.body.category,
    description: req.body.description,
    photos: req.body.photos || [],
    location: req.body.location
  });

  await auditService.record({ req, action: 'incident_reported', entityType: 'IncidentReport', entityId: incident._id });

  sendSuccess(res, 201, { incident }, 'Incident report created');
});

export const listIncidentReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    ...req.tenantFilter,
    ...(req.query.status ? { status: req.query.status } : {}),
    ...(req.query.category ? { category: req.query.category } : {})
  };

  if (req.user.role === ROLES.SECURITY_GUARD) {
    filter.reportedBy = req.user._id;
  }

  const [items, total] = await Promise.all([
    IncidentReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    IncidentReport.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Incident reports fetched');
});
