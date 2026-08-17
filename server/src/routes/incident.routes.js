import { Router } from 'express';
import { createIncidentReport, listIncidentReports } from '../controllers/security.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { incidentReportValidator, listIncidentsValidator } from '../validators/security.validators.js';

export const incidentRoutes = Router();

incidentRoutes.use(authMiddleware, tenantScopeMiddleware);

incidentRoutes
  .route('/')
  .get(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
    listIncidentsValidator,
    validate,
    listIncidentReports
  )
  .post(
    roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD]),
    incidentReportValidator,
    validate,
    createIncidentReport
  );
