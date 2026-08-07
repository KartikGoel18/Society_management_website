import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';

export const roleMiddleware = (allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  if (req.user.role === ROLES.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
    next();
    return;
  }

  next(new ApiError(403, 'You do not have permission to perform this action'));
};
