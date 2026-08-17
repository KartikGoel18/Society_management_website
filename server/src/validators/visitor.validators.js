import { body, query, param } from 'express-validator';
import { normalizePhone } from '../middleware/sanitize.middleware.js';
import { VISITOR_STATUS_VALUES, VISITOR_TYPE_VALUES } from '../constants/visitorTypes.js';

const optionalIsoDate = (field) => field.optional({ nullable: true, checkFalsy: true }).isISO8601().toDate();

export const preApproveVisitorValidator = [
  body('flatId').optional({ nullable: true }).isMongoId(),
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone),
  body('photo').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('purpose').trim().isLength({ min: 2, max: 160 }),
  body('visitorType').optional().isIn(VISITOR_TYPE_VALUES),
  body('vehicleNumber').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
  optionalIsoDate(body('expectedArrival')),
  optionalIsoDate(body('validFrom')),
  optionalIsoDate(body('validUntil')),
  body('isRecurring').optional().isBoolean(),
  body('recurringRule.frequency').optional().isIn(['daily', 'weekly', 'monthly']),
  body('recurringRule.daysOfWeek').optional().isArray({ max: 7 }),
  body('recurringRule.endsAt').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  body('leaveAtGate').optional().isBoolean(),
  body('gateNote').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 })
];

export const walkInVisitorValidator = [
  body('flatId').isMongoId(),
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('phone').isMobilePhone('any').customSanitizer(normalizePhone),
  body('photo').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('purpose').trim().isLength({ min: 2, max: 160 }),
  body('visitorType').optional().isIn(VISITOR_TYPE_VALUES),
  body('vehicleNumber').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
  body('gateNote').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 }),
  body('leaveAtGate').optional().isBoolean()
];

export const visitorIdValidator = [
  param('id').isMongoId()
];

export const respondVisitorValidator = [
  param('id').isMongoId(),
  body('decision').isIn(['approved', 'rejected']),
  body('approvalNote').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 }),
  body('leaveAtGate').optional().isBoolean()
];

export const checkInVisitorValidator = [
  param('id').isMongoId(),
  body('otp').optional({ nullable: true, checkFalsy: true }).isLength({ min: 4, max: 8 }).isNumeric(),
  body('qrToken').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 20, max: 160 }),
  body('qrPayload').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 20, max: 512 }),
  body('gateNote').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 })
];

export const listVisitorsValidator = [
  query('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  query('visitorType').optional({ nullable: true, checkFalsy: true }).isIn(VISITOR_TYPE_VALUES),
  query('status').optional({ nullable: true, checkFalsy: true }).isIn(VISITOR_STATUS_VALUES),
  query('from').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  query('to').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  query('search').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];
