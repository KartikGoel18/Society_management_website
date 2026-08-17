import { Router } from 'express';
import { updateGuardShift } from '../controllers/security.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { shiftGuardValidator } from '../validators/security.validators.js';

export const guardRoutes = Router();

guardRoutes.use(authMiddleware, tenantScopeMiddleware);

guardRoutes.post(
  '/:id/shift',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
  shiftGuardValidator,
  validate,
  updateGuardShift
);
