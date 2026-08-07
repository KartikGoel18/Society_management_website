import { Router } from 'express';
import {
  createFlat,
  createSociety,
  createTower,
  deleteSociety,
  listFlats,
  listSocieties,
  listTowers,
  updateSociety
} from '../controllers/society.controller.js';
import { ROLES } from '../constants/roles.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createFlatValidator,
  createSocietyValidator,
  createTowerValidator,
  societyIdValidator
} from '../validators/society.validators.js';

export const societyRoutes = Router();

societyRoutes.use(authMiddleware);

societyRoutes
  .route('/')
  .get(roleMiddleware([ROLES.SOCIETY_ADMIN]), listSocieties)
  .post(roleMiddleware([ROLES.SUPER_ADMIN]), createSocietyValidator, validate, createSociety);

societyRoutes
  .route('/:id')
  .put(roleMiddleware([ROLES.SOCIETY_ADMIN]), societyIdValidator, createSocietyValidator, validate, updateSociety)
  .delete(roleMiddleware([ROLES.SUPER_ADMIN]), societyIdValidator, validate, deleteSociety);

societyRoutes
  .route('/:id/towers')
  .get(roleMiddleware([ROLES.SOCIETY_ADMIN]), societyIdValidator, validate, listTowers)
  .post(roleMiddleware([ROLES.SOCIETY_ADMIN]), createTowerValidator, validate, createTower);

societyRoutes
  .route('/:id/flats')
  .get(roleMiddleware([ROLES.SOCIETY_ADMIN]), societyIdValidator, validate, listFlats)
  .post(roleMiddleware([ROLES.SOCIETY_ADMIN]), createFlatValidator, validate, createFlat);
