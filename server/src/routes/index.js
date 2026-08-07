import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { societyRoutes } from './society.routes.js';
import { userRoutes } from './user.routes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/societies', societyRoutes);
apiRoutes.use('/users', userRoutes);
