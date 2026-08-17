import { Router } from 'express';
import {
  addStaffReview,
  addWageRecord,
  createStaff,
  listStaff,
  recordAttendance
} from '../controllers/staff.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  attendanceValidator,
  createStaffValidator,
  listStaffValidator,
  reviewValidator,
  wageRecordValidator
} from '../validators/staff.validators.js';

export const staffRoutes = Router();

staffRoutes.use(authMiddleware, tenantScopeMiddleware);

staffRoutes
  .route('/')
  .get(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT, ROLES.SECURITY_GUARD]),
    listStaffValidator,
    validate,
    listStaff
  )
  .post(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
    createStaffValidator,
    validate,
    createStaff
  );

staffRoutes.post(
  '/:id/attendance',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT, ROLES.SECURITY_GUARD]),
  attendanceValidator,
  validate,
  recordAttendance
);

staffRoutes.post(
  '/:id/reviews',
  roleMiddleware([ROLES.RESIDENT]),
  reviewValidator,
  validate,
  addStaffReview
);

staffRoutes.post(
  '/:id/wages',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT]),
  wageRecordValidator,
  validate,
  addWageRecord
);
