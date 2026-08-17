import { BILL_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../constants/billingTypes.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { ROLES } from '../constants/roles.js';
import { Bill } from '../models/Bill.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { auditService } from '../services/audit.service.js';
import { notificationService } from '../services/notification.service.js';
import { paymentService } from '../services/payment.service.js';
import { getIo } from '../sockets/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const emitPaymentConfirmed = (societyId, payload) => {
  const io = getIo();
  if (io) {
    io.to(`society:${societyId}`).emit(NOTIFICATION_TYPES.PAYMENT_CONFIRMED, payload);
  }
};

const getBillForPayment = async (req, billId) => {
  const bill = await Bill.findOne({ _id: billId, ...req.tenantFilter });

  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }

  if (req.user.role === ROLES.RESIDENT && bill.flatId.toString() !== req.user.flatId?.toString()) {
    throw new ApiError(403, 'Residents can only pay bills for their own flat');
  }

  if (bill.status === BILL_STATUSES.PAID) {
    throw new ApiError(409, 'Bill is already paid');
  }

  return bill;
};

const markBillPaid = async ({ bill, payment }) => {
  bill.status = BILL_STATUSES.PAID;
  bill.paidOn = payment.paidAt || new Date();
  await bill.save();
};

const notifyBillPayer = async ({ bill, payment }) => {
  const payer = await User.findById(payment.paidBy);
  if (!payer) return;

  await notificationService.create({
    userId: payer._id,
    type: NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
    title: 'Payment confirmed',
    body: `Payment of INR ${payment.amount.toFixed(2)} for ${bill.billingPeriod} was confirmed`,
    relatedEntityId: payment._id
  });

  try {
    await notificationService.pushToUser(payer, {
      title: 'Payment confirmed',
      body: `Payment of INR ${payment.amount.toFixed(2)} was confirmed`
    }, {
      type: NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
      paymentId: payment._id.toString(),
      billId: bill._id.toString()
    });
  } catch (_error) {
    // FCM delivery is best-effort; persisted notification remains authoritative.
  }
};

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const bill = await getBillForPayment(req, req.body.billId);
  const amountPaise = Math.round(bill.totalAmount * 100);
  const order = await paymentService.createOrder({
    amountPaise,
    currency: 'INR',
    receipt: `bill_${bill._id.toString().slice(-24)}`,
    notes: {
      billId: bill._id.toString(),
      societyId: bill.societyId.toString(),
      flatId: bill.flatId.toString()
    }
  });

  const payment = await Payment.create({
    societyId: bill.societyId,
    billId: bill._id,
    flatId: bill.flatId,
    amount: bill.totalAmount,
    currency: 'INR',
    razorpayOrderId: order.id,
    status: PAYMENT_STATUSES.CREATED,
    paidBy: req.user._id
  });

  sendSuccess(res, 201, { order, payment }, 'Payment order created');
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const valid = paymentService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature
  });

  if (!valid) {
    throw new ApiError(400, 'Payment signature verification failed');
  }

  const payment = await Payment.findOne({ razorpayOrderId, ...req.tenantFilter });
  if (!payment) {
    throw new ApiError(404, 'Payment order not found');
  }

  const bill = await Bill.findOne({ _id: payment.billId, ...req.tenantFilter });
  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.status = PAYMENT_STATUSES.CAPTURED;
  payment.method = req.body.method || PAYMENT_METHODS.OTHER;
  payment.paidAt = new Date();
  await payment.save();
  await markBillPaid({ bill, payment });
  await notifyBillPayer({ bill, payment });
  emitPaymentConfirmed(payment.societyId, { paymentId: payment._id, billId: bill._id, flatId: bill.flatId });
  await auditService.record({ req, action: 'payment_verified', entityType: 'Payment', entityId: payment._id });

  sendSuccess(res, 200, { payment, bill }, 'Payment verified');
});

export const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !paymentService.verifyWebhookSignature(req.body, signature)) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature');
  }

  const event = JSON.parse(req.body.toString('utf8'));
  const eventId = event.id;
  const paymentEntity = event.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;

  if (!orderId) {
    sendSuccess(res, 200, { ignored: true }, 'Webhook ignored');
    return;
  }

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    sendSuccess(res, 200, { ignored: true }, 'Payment order not found locally');
    return;
  }

  if (eventId && payment.rawWebhookEventIds.includes(eventId)) {
    sendSuccess(res, 200, { duplicate: true }, 'Webhook already processed');
    return;
  }

  if (eventId) payment.rawWebhookEventIds.push(eventId);

  if (event.event === 'payment.captured') {
    payment.razorpayPaymentId = paymentEntity.id;
    payment.status = PAYMENT_STATUSES.CAPTURED;
    payment.method = paymentEntity.method || PAYMENT_METHODS.OTHER;
    payment.paidAt = new Date((paymentEntity.created_at || Math.floor(Date.now() / 1000)) * 1000);
    await payment.save();

    const bill = await Bill.findById(payment.billId);
    if (bill && bill.status !== BILL_STATUSES.PAID) {
      await markBillPaid({ bill, payment });
      await notifyBillPayer({ bill, payment });
      emitPaymentConfirmed(payment.societyId, { paymentId: payment._id, billId: bill._id, flatId: bill.flatId });
    }
  } else if (event.event === 'payment.failed') {
    payment.status = PAYMENT_STATUSES.FAILED;
    payment.failureReason = paymentEntity.error_description || paymentEntity.error_reason;
    await payment.save();
  } else {
    await payment.save();
  }

  sendSuccess(res, 200, { processed: true }, 'Webhook processed');
});
