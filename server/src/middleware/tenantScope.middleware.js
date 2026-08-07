import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';

export const tenantScopeMiddleware = (req, _res, next) => {
  if (!req.user) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  if (req.user.role === ROLES.SUPER_ADMIN) {
    req.tenantFilter = {};
    next();
    return;
  }

  if (!req.user.societyId) {
    next(new ApiError(403, 'User is not linked to a society'));
    return;
  }

  req.tenantFilter = { societyId: new mongoose.Types.ObjectId(req.user.societyId) };
  next();
};
