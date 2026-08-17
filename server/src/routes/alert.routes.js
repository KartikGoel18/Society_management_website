import { Router } from 'express';
import { raiseSosAlert } from '../controllers/security.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { sosAlertValidator } from '../validators/security.validators.js';

export const alertRoutes = Router();

alertRoutes.use(authMiddleware, tenantScopeMiddleware);

alertRoutes.post(
  '/sos',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT, ROLES.SECURITY_GUARD]),
  sosAlertValidator,
  validate,
  raiseSosAlert
);
