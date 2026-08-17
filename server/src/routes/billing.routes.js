import { Router } from 'express';
import { downloadInvoicePdf, generateBills, listBills } from '../controllers/billing.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { billIdValidator, generateBillsValidator, listBillsValidator } from '../validators/billing.validators.js';

export const billingRoutes = Router();

billingRoutes.use(authMiddleware, tenantScopeMiddleware);

billingRoutes.get('/', roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT]), listBillsValidator, validate, listBills);
billingRoutes.post('/generate', roleMiddleware([ROLES.SOCIETY_ADMIN]), generateBillsValidator, validate, generateBills);
billingRoutes.get('/:id/invoice-pdf', roleMiddleware([ROLES.SOCIETY_ADMIN, ROLES.RESIDENT]), billIdValidator, validate, downloadInvoicePdf);
