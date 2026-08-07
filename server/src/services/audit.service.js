import { AuditLog } from '../models/AuditLog.js';

export const auditService = {
  async record({ req, action, entityType, entityId, metadata = {} }) {
    return AuditLog.create({
      societyId: req.user?.societyId || metadata.societyId || null,
      actorId: req.user?._id || null,
      action,
      entityType,
      entityId,
      metadata
    });
  }
};
