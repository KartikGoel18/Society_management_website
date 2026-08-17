import { body, param, query } from 'express-validator';
import { BILL_STATUS_VALUES, EXPENSE_CATEGORY_VALUES } from '../constants/billingTypes.js';

export const generateBillsValidator = [
  body('billingPeriod').trim().isLength({ min: 4, max: 40 }),
  body('dueDate').isISO8601().toDate(),
  body('flatIds').optional().isArray({ min: 1, max: 1000 }),
  body('flatIds.*').optional().isMongoId(),
  body('lineItems').isArray({ min: 1, max: 20 }),
  body('lineItems.*.description').trim().isLength({ min: 2, max: 120 }),
  body('lineItems.*.amount').isFloat({ min: 0 }),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 })
];

export const listBillsValidator = [
  query('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  query('status').optional({ nullable: true, checkFalsy: true }).isIn(BILL_STATUS_VALUES),
  query('billingPeriod').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 40 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

export const billIdValidator = [
  param('id').isMongoId()
];

export const createPaymentOrderValidator = [
  body('billId').isMongoId()
];

export const verifyPaymentValidator = [
  body('razorpayOrderId').isString().isLength({ min: 6, max: 120 }),
  body('razorpayPaymentId').isString().isLength({ min: 6, max: 120 }),
  body('razorpaySignature').isString().isLength({ min: 20, max: 256 }),
  body('method').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 40 })
];

export const createExpenseValidator = [
  body('category').isIn(EXPENSE_CATEGORY_VALUES),
  body('vendor').trim().isLength({ min: 2, max: 120 }),
  body('amount').isFloat({ min: 0 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('date').isISO8601().toDate(),
  body('receiptUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 })
];

export const listExpensesValidator = [
  query('category').optional({ nullable: true, checkFalsy: true }).isIn(EXPENSE_CATEGORY_VALUES),
  query('from').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  query('to').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];
