import crypto from 'crypto';
import request from 'supertest';
import { app } from '../app.js';
import { BILL_STATUSES, EXPENSE_CATEGORIES, PAYMENT_STATUSES } from '../constants/billingTypes.js';
import { ROLES } from '../constants/roles.js';
import { Bill } from '../models/Bill.js';
import { Flat } from '../models/Flat.js';
import { Payment } from '../models/Payment.js';
import { Society } from '../models/Society.js';
import { Tower } from '../models/Tower.js';
import { User } from '../models/User.js';
import { paymentService } from '../services/payment.service.js';
import { tokenService } from '../services/token.service.js';

const phoneSeed = { value: 7000 };

const createUser = async ({ role, societyId, flatId }) => {
  phoneSeed.value += 1;
  const user = new User({
    name: `${role} User`,
    phone: `+91955555${phoneSeed.value}`,
    role,
    societyId,
    flatId,
    isVerified: true,
    isApproved: true
  });
  await user.setPassword('StrongPass@123');
  await user.save();
  return user;
};

const setupBillingSociety = async () => {
  const society = await Society.create({
    name: 'Billing Test Society',
    address: {
      line1: 'Ledger Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001'
    }
  });
  const tower = await Tower.create({ societyId: society._id, name: 'D', floors: 9 });
  const flat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'D-404',
    floor: 4,
    sizeSqFt: 1100,
    status: 'occupied'
  });
  const admin = await createUser({ role: ROLES.SOCIETY_ADMIN, societyId: society._id });
  const resident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: flat._id });
  flat.ownerId = resident._id;
  await flat.save();

  return {
    society,
    flat,
    admin,
    resident,
    adminToken: tokenService.createAccessToken(admin),
    residentToken: tokenService.createAccessToken(resident)
  };
};

describe('Billing, accounting, and payments', () => {
  it('validates order payment signatures with HMAC SHA256', () => {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(paymentService.verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
    expect(paymentService.verifyPaymentSignature({ orderId, paymentId, signature: 'bad_signature' })).toBe(false);
  });

  it('generates bills, lists resident bills, and renders invoice PDFs', async () => {
    const { flat, adminToken, residentToken } = await setupBillingSociety();

    const generateResponse = await request(app)
      .post('/api/v1/bills/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        billingPeriod: '2026-08',
        dueDate: '2026-08-31T00:00:00.000Z',
        flatIds: [flat._id],
        lineItems: [
          { description: 'Maintenance', amount: 2500 },
          { description: 'Sinking fund', amount: 500 }
        ]
      })
      .expect(201);

    expect(generateResponse.body.data.bills).toHaveLength(1);
    expect(generateResponse.body.data.bills[0].totalAmount).toBe(3000);

    const listResponse = await request(app)
      .get('/api/v1/bills?billingPeriod=2026-08')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0].flatId._id).toBe(flat._id.toString());

    const billId = generateResponse.body.data.bills[0]._id;
    const pdfResponse = await request(app)
      .get(`/api/v1/bills/${billId}/invoice-pdf`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);

    expect(pdfResponse.headers['content-type']).toContain('application/pdf');
    expect(pdfResponse.body.length).toBeGreaterThan(1000);
  });

  it('verifies Razorpay payment signatures and marks bills paid', async () => {
    const { flat, admin, resident, residentToken } = await setupBillingSociety();
    const bill = await Bill.create({
      societyId: flat.societyId,
      flatId: flat._id,
      billingPeriod: '2026-09',
      dueDate: '2026-09-30T00:00:00.000Z',
      lineItems: [{ description: 'Maintenance', amount: 2000 }],
      totalAmount: 2000,
      generatedBy: admin._id
    });
    const payment = await Payment.create({
      societyId: flat.societyId,
      billId: bill._id,
      flatId: flat._id,
      amount: bill.totalAmount,
      razorpayOrderId: 'order_local_verify',
      paidBy: resident._id
    });
    const razorpayPaymentId = 'pay_local_verify';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${payment.razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const response = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature,
        method: 'upi'
      })
      .expect(200);

    expect(response.body.data.payment.status).toBe(PAYMENT_STATUSES.CAPTURED);
    expect(response.body.data.bill.status).toBe(BILL_STATUSES.PAID);
  });

  it('processes signed Razorpay captured webhooks idempotently', async () => {
    const { flat, admin, resident } = await setupBillingSociety();
    const bill = await Bill.create({
      societyId: flat.societyId,
      flatId: flat._id,
      billingPeriod: '2026-10',
      dueDate: '2026-10-31T00:00:00.000Z',
      lineItems: [{ description: 'Maintenance', amount: 2100 }],
      totalAmount: 2100,
      generatedBy: admin._id
    });
    await Payment.create({
      societyId: flat.societyId,
      billId: bill._id,
      flatId: flat._id,
      amount: bill.totalAmount,
      razorpayOrderId: 'order_webhook_capture',
      paidBy: resident._id
    });
    const event = {
      id: 'evt_capture_1',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_capture',
            order_id: 'order_webhook_capture',
            method: 'upi',
            created_at: 1780000000
          }
        }
      }
    };
    const rawBody = JSON.stringify(event);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody)
      .expect(200);

    const updatedBill = await Bill.findById(bill._id);
    const updatedPayment = await Payment.findOne({ razorpayOrderId: 'order_webhook_capture' });
    expect(updatedBill.status).toBe(BILL_STATUSES.PAID);
    expect(updatedPayment.status).toBe(PAYMENT_STATUSES.CAPTURED);

    const duplicateResponse = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(rawBody)
      .expect(200);

    expect(duplicateResponse.body.data.duplicate).toBe(true);
  });

  it('lets admins create and list expenses', async () => {
    const { adminToken } = await setupBillingSociety();

    const createResponse = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: EXPENSE_CATEGORIES.UTILITY,
        vendor: 'City Water Board',
        amount: 12000,
        date: '2026-08-12T00:00:00.000Z',
        receiptUrl: 'https://example.com/receipt.pdf'
      })
      .expect(201);

    expect(createResponse.body.data.expense.amount).toBe(12000);

    const listResponse = await request(app)
      .get('/api/v1/expenses?category=utility')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
  });
});
