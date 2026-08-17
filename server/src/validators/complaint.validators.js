import { body, param, query } from 'express-validator';
import { COMPLAINT_CATEGORY_VALUES, COMPLAINT_STATUS_VALUES } from '../constants/complaintTypes.js';

export const createComplaintValidator = [
  body('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('category').isIn(COMPLAINT_CATEGORY_VALUES),
  body('description').trim().isLength({ min: 5, max: 2000 }),
  body('photos').optional().isArray({ max: 6 }),
  body('photos.*').optional().isURL(),
  body('slaDeadline').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate()
];

export const listComplaintsValidator = [
  query('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  query('category').optional({ nullable: true, checkFalsy: true }).isIn(COMPLAINT_CATEGORY_VALUES),
  query('status').optional({ nullable: true, checkFalsy: true }).isIn(COMPLAINT_STATUS_VALUES),
  query('assignedTo').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

export const updateComplaintStatusValidator = [
  param('id').isMongoId(),
  body('status').isIn(COMPLAINT_STATUS_VALUES),
  body('assignedTo').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('assignedToModel').optional({ nullable: true, checkFalsy: true }).isIn(['User', 'Staff']),
  body('comment').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }),
  body('slaDeadline').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate()
];

export const addComplaintCommentValidator = [
  param('id').isMongoId(),
  body('body').trim().isLength({ min: 1, max: 1000 }),
  body('attachments').optional().isArray({ max: 6 }),
  body('attachments.*').optional().isURL(),
  body('isInternal').optional().isBoolean()
];

export const complaintFeedbackValidator = [
  param('id').isMongoId(),
  body('score').isInt({ min: 1, max: 5 }),
  body('feedback').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 })
];
