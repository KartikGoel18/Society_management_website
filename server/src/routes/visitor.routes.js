import { Router } from 'express';
import {
  checkInVisitor,
  checkOutVisitor,
  createWalkInVisitor,
  listVisitors,
  preApproveVisitor,
  respondToVisitor
} from '../controllers/visitor.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  checkInVisitorValidator,
  listVisitorsValidator,
  preApproveVisitorValidator,
  respondVisitorValidator,
  visitorIdValidator,
  walkInVisitorValidator
} from '../validators/visitor.validators.js';

export const visitorRoutes = Router();

visitorRoutes.use(authMiddleware, tenantScopeMiddleware);

visitorRoutes.get(
  '/',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT, ROLES.SECURITY_GUARD]),
  listVisitorsValidator,
  validate,
  listVisitors
);

visitorRoutes.post(
  '/pre-approve',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT]),
  preApproveVisitorValidator,
  validate,
  preApproveVisitor
);

visitorRoutes.post(
  '/walk-in',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
  walkInVisitorValidator,
  validate,
  createWalkInVisitor
);

visitorRoutes.patch(
  '/:id/respond',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT]),
  respondVisitorValidator,
  validate,
  respondToVisitor
);

visitorRoutes.post(
  '/:id/checkin',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
  checkInVisitorValidator,
  validate,
  checkInVisitor
);

visitorRoutes.post(
  '/:id/checkout',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
  visitorIdValidator,
  validate,
  checkOutVisitor
);
