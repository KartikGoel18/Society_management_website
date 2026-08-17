import { Router } from 'express';
import {
  createPatrolCheckpoint,
  listPatrolCheckpoints,
  logPatrolCheckpoint
} from '../controllers/security.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCheckpointValidator,
  listCheckpointsValidator,
  patrolLogValidator
} from '../validators/security.validators.js';

export const patrolRoutes = Router();

patrolRoutes.use(authMiddleware, tenantScopeMiddleware);

patrolRoutes
  .route('/checkpoints')
  .get(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
    listCheckpointsValidator,
    validate,
    listPatrolCheckpoints
  )
  .post(
    roleMiddleware([ROLES.SOCIETY_ADMIN]),
    createCheckpointValidator,
    validate,
    createPatrolCheckpoint
  );

patrolRoutes.post(
  '/log',
  roleMiddleware([ROLES.SECURITY_GUARD]),
  patrolLogValidator,
  validate,
  logPatrolCheckpoint
);
