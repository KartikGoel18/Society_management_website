import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { alertRoutes } from './alert.routes.js';
import { billingRoutes } from './billing.routes.js';
import { expenseRoutes } from './expense.routes.js';
import { guardRoutes } from './guard.routes.js';
import { incidentRoutes } from './incident.routes.js';
import { patrolRoutes } from './patrol.routes.js';
import { paymentRoutes } from './payment.routes.js';
import { staffRoutes } from './staff.routes.js';
import { societyRoutes } from './society.routes.js';
import { userRoutes } from './user.routes.js';
import { visitorRoutes } from './visitor.routes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/alerts', alertRoutes);
apiRoutes.use('/bills', billingRoutes);
apiRoutes.use('/expenses', expenseRoutes);
apiRoutes.use('/guards', guardRoutes);
apiRoutes.use('/incidents', incidentRoutes);
apiRoutes.use('/patrol', patrolRoutes);
apiRoutes.use('/payments', paymentRoutes);
apiRoutes.use('/societies', societyRoutes);
apiRoutes.use('/staff', staffRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/visitors', visitorRoutes);
