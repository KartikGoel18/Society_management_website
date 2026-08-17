import { Router } from 'express';
import { createPaymentOrder, handlePaymentWebhook, verifyPayment } from '../controllers/payment.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createPaymentOrderValidator, verifyPaymentValidator } from '../validators/billing.validators.js';

export const paymentRoutes = Router();

paymentRoutes.post('/webhook', handlePaymentWebhook);

paymentRoutes.use(authMiddleware, tenantScopeMiddleware);

paymentRoutes.post(
  '/create-order',
  roleMiddleware([ROLES.RESIDENT, ROLES.SOCIETY_ADMIN]),
  createPaymentOrderValidator,
  validate,
  createPaymentOrder
);
paymentRoutes.post(
  '/verify',
  roleMiddleware([ROLES.RESIDENT, ROLES.SOCIETY_ADMIN]),
  verifyPaymentValidator,
  validate,
  verifyPayment
);
