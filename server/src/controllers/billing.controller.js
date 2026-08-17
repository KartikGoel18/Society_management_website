import mongoose from 'mongoose';
import { BILL_STATUSES } from '../constants/billingTypes.js';
import { ROLES } from '../constants/roles.js';
import { Bill } from '../models/Bill.js';
import { Flat } from '../models/Flat.js';
import { Payment } from '../models/Payment.js';
import { Society } from '../models/Society.js';
import { auditService } from '../services/audit.service.js';
import { invoiceService } from '../services/invoice.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

const calculateTotal = (lineItems) => lineItems.reduce((sum, item) => sum + Number(item.amount), 0);

const getBillFilterForUser = (req) => {
  const filter = { ...req.tenantFilter };

  if (req.user.role === ROLES.RESIDENT) {
    if (!req.user.flatId) {
      throw new ApiError(403, 'Resident is not linked to a flat');
    }
    filter.flatId = req.user.flatId;
  }

  return filter;
};

export const generateBills = asyncHandler(async (req, res) => {
  const flatFilter = { ...req.tenantFilter };
  if (req.body.flatIds?.length) {
    flatFilter._id = { $in: req.body.flatIds };
  }

  const flats = await Flat.find(flatFilter);
  if (!flats.length) {
    throw new ApiError(404, 'No flats found for bill generation');
  }

  const totalAmount = calculateTotal(req.body.lineItems);
  const bills = [];
  const skipped = [];

  for (const flat of flats) {
    const existing = await Bill.findOne({
      societyId: flat.societyId,
      flatId: flat._id,
      billingPeriod: req.body.billingPeriod
    });

    if (existing) {
      skipped.push(flat._id);
      continue;
    }

    bills.push(await Bill.create({
      societyId: flat.societyId,
      flatId: flat._id,
      billingPeriod: req.body.billingPeriod,
      lineItems: req.body.lineItems,
      totalAmount,
      dueDate: req.body.dueDate,
      generatedBy: req.user._id,
      notes: req.body.notes
    }));
  }

  await auditService.record({
    req,
    action: 'bills_generated',
    entityType: 'Bill',
    metadata: { billingPeriod: req.body.billingPeriod, generated: bills.length, skipped: skipped.length }
  });

  sendSuccess(res, 201, { bills, skipped }, 'Bills generated');
});

export const listBills = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = getBillFilterForUser(req);

  if (req.query.flatId) {
    if (req.user.role === ROLES.RESIDENT && req.query.flatId !== req.user.flatId?.toString()) {
      throw new ApiError(403, 'Residents can only view bills for their own flat');
    }
    filter.flatId = new mongoose.Types.ObjectId(req.query.flatId);
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.billingPeriod) filter.billingPeriod = req.query.billingPeriod;

  await Bill.updateMany(
    { ...getBillFilterForUser(req), status: BILL_STATUSES.PENDING, dueDate: { $lt: new Date() } },
    { status: BILL_STATUSES.OVERDUE }
  );

  const [items, total] = await Promise.all([
    Bill.find(filter).populate('flatId', 'flatNumber floor towerId').sort({ dueDate: -1 }).skip(skip).limit(limit),
    Bill.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Bills fetched');
});

export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, ...getBillFilterForUser(req) }).populate('flatId');

  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }

  const society = await Society.findById(bill.societyId);
  const payment = await Payment.findOne({ billId: bill._id, status: 'captured' }).sort({ paidAt: -1 });
  const pdf = await invoiceService.createInvoicePdf({ bill, flat: bill.flatId, society, payment });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${bill._id}.pdf"`);
  res.status(200).send(pdf);
});
