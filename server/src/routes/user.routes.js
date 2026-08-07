import { Router } from 'express';
import { approveUser, getMe, listUsers, updateMe } from '../controllers/user.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { approveUserValidator, updateMeValidator } from '../validators/user.validators.js';

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.route('/me').get(getMe).put(updateMeValidator, validate, updateMe);

userRoutes.get('/', roleMiddleware([ROLES.SOCIETY_ADMIN]), tenantScopeMiddleware, listUsers);
userRoutes.put(
  '/:id/approve',
  roleMiddleware([ROLES.SOCIETY_ADMIN]),
  tenantScopeMiddleware,
  approveUserValidator,
  validate,
  approveUser
);
