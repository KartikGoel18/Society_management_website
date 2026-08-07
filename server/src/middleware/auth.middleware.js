import { User } from '../models/User.js';
import { tokenService } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Authentication required');
  }

  const payload = tokenService.verifyAccessToken(token);
  const user = await User.findById(payload.sub);

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid authentication token');
  }

  req.auth = payload;
  req.user = user;
  next();
});
