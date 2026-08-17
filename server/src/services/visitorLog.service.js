import { VisitorLog } from '../models/VisitorLog.js';

export const visitorLogService = {
  async record(visitor, { actorId, action }) {
    const snapshot = visitor.toObject();
    delete snapshot.otpHash;
    delete snapshot.qrTokenHash;

    return VisitorLog.create({
      societyId: visitor.societyId,
      visitorId: visitor._id,
      flatId: visitor.flatId,
      actorId,
      action,
      status: visitor.status,
      snapshot
    });
  }
};
