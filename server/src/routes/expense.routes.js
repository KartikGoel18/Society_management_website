import { Router } from 'express';
import { createExpense, listExpenses } from '../controllers/expense.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { tenantScopeMiddleware } from '../middleware/tenantScope.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createExpenseValidator, listExpensesValidator } from '../validators/billing.validators.js';

export const expenseRoutes = Router();

expenseRoutes.use(authMiddleware, tenantScopeMiddleware);

expenseRoutes
  .route('/')
  .get(roleMiddleware([ROLES.SOCIETY_ADMIN]), listExpensesValidator, validate, listExpenses)
  .post(roleMiddleware([ROLES.SOCIETY_ADMIN]), createExpenseValidator, validate, createExpense);
