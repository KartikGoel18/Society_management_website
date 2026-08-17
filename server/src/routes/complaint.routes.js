import { Router } from 'express';
import {
  addComplaintComment,
  createComplaint,
  listComplaints,
  submitComplaintFeedback,
  updateComplaintStatus
} from '../controllers/complaint.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  addComplaintCommentValidator,
  complaintFeedbackValidator,
  createComplaintValidator,
  listComplaintsValidator,
  updateComplaintStatusValidator
} from '../validators/complaint.validators.js';

export const complaintRoutes = Router();

complaintRoutes.use(authMiddleware, tenantScopeMiddleware);

complaintRoutes
  .route('/')
  .get(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT, ROLES.SECURITY_GUARD]),
    listComplaintsValidator,
    validate,
    listComplaints
  )
  .post(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT]),
    createComplaintValidator,
    validate,
    createComplaint
  );

complaintRoutes.patch(
  '/:id/status',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
  updateComplaintStatusValidator,
  validate,
  updateComplaintStatus
);

complaintRoutes.post(
  '/:id/comment',
  roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT, ROLES.SECURITY_GUARD]),
  addComplaintCommentValidator,
  validate,
  addComplaintComment
);

complaintRoutes.post(
  '/:id/feedback',
  roleMiddleware([ROLES.RESIDENT]),
  complaintFeedbackValidator,
  validate,
  submitComplaintFeedback
);
