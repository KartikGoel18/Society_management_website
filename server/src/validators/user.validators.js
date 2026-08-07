import { body, param } from 'express-validator';

export const updateMeValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('profilePhoto').optional({ nullable: true }).isURL(),
  body('fcmToken').optional({ nullable: true }).isString().isLength({ min: 20, max: 4096 })
];

export const approveUserValidator = [
  param('id').isMongoId(),
  body('approved').isBoolean()
];
