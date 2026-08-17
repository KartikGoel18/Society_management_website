import { body, param, query } from 'express-validator';
import { normalizePhone } from '../middleware/sanitize.middleware.js';
import {
  ATTENDANCE_ACTION_VALUES,
  STAFF_CATEGORY_VALUES,
  STAFF_STATUS_VALUES,
  WAGE_PAYMENT_STATUS_VALUES
} from '../constants/staffTypes.js';

export const createStaffValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone),
  body('photo').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('idProofUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('category').optional().isIn(STAFF_CATEGORY_VALUES),
  body('assignedFlats').optional().isArray({ max: 100 }),
  body('assignedFlats.*').optional().isMongoId(),
  body('status').optional().isIn(STAFF_STATUS_VALUES)
];

export const listStaffValidator = [
  query('category').optional({ nullable: true, checkFalsy: true }).isIn(STAFF_CATEGORY_VALUES),
  query('status').optional({ nullable: true, checkFalsy: true }).isIn(STAFF_STATUS_VALUES),
  query('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  query('search').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

export const staffIdValidator = [
  param('id').isMongoId()
];

export const attendanceValidator = [
  param('id').isMongoId(),
  body('action').isIn(ATTENDANCE_ACTION_VALUES),
  body('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('note').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 })
];

export const reviewValidator = [
  param('id').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 })
];

export const wageRecordValidator = [
  param('id').isMongoId(),
  body('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('amount').isFloat({ min: 0 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('period').trim().isLength({ min: 4, max: 40 }),
  body('status').optional().isIn(WAGE_PAYMENT_STATUS_VALUES),
  body('paidOn').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  body('note').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 })
];
