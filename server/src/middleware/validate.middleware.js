import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const validate = (req, _res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  next(new ApiError(422, 'Validation failed', result.array()));
};
