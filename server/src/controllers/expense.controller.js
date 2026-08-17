import { Expense } from '../models/Expense.js';
import { auditService } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    societyId: req.user.societyId,
    category: req.body.category,
    vendor: req.body.vendor,
    amount: req.body.amount,
    currency: req.body.currency || 'INR',
    date: req.body.date,
    approvedBy: req.user._id,
    receiptUrl: req.body.receiptUrl,
    notes: req.body.notes
  });

  await auditService.record({ req, action: 'expense_created', entityType: 'Expense', entityId: expense._id });
  sendSuccess(res, 201, { expense }, 'Expense created');
});

export const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...req.tenantFilter };

  if (req.query.category) filter.category = req.query.category;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }

  const [items, total] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Expenses fetched');
});
