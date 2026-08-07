import { body, param } from 'express-validator';

export const createSocietyValidator = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('address.line1').trim().isLength({ min: 2, max: 160 }),
  body('address.line2').optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body('address.city').trim().isLength({ min: 2, max: 80 }),
  body('address.state').trim().isLength({ min: 2, max: 80 }),
  body('address.pincode').trim().isLength({ min: 4, max: 12 }),
  body('subscriptionPlan').optional().isIn(['trial', 'basic', 'standard', 'premium', 'enterprise']),
  body('settings.billingCycle').optional().isIn(['monthly', 'quarterly', 'half_yearly', 'yearly']),
  body('settings.currency').optional().isLength({ min: 3, max: 3 })
];

export const societyIdValidator = [
  param('id').isMongoId()
];

export const createTowerValidator = [
  param('id').isMongoId(),
  body('name').trim().isLength({ min: 1, max: 50 }),
  body('floors').isInt({ min: 1, max: 200 })
];

export const createFlatValidator = [
  param('id').isMongoId(),
  body('towerId').isMongoId(),
  body('flatNumber').trim().isLength({ min: 1, max: 30 }),
  body('floor').isInt({ min: -5, max: 200 }),
  body('sizeSqFt').isFloat({ min: 1 }),
  body('status').optional().isIn(['occupied', 'vacant'])
];
