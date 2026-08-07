import { body } from 'express-validator';
import { normalizePhone } from '../middleware/sanitize.middleware.js';
import { ROLE_VALUES } from '../constants/roles.js';

export const sendOtpValidator = [
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone)
];

export const verifyOtpValidator = [
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone),
  body('otp').isLength({ min: 4, max: 8 }).isNumeric()
];

export const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }),
  body('role').optional().isIn(ROLE_VALUES),
  body('societyId').optional({ nullable: true }).isMongoId(),
  body('flatId').optional({ nullable: true }).isMongoId()
];

export const loginValidator = [
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone),
  body('password').isLength({ min: 1, max: 128 })
];

export const forgotPasswordValidator = [
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone)
];
