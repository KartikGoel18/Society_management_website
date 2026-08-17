import request from 'supertest';
import { app } from '../app.js';
import { ROLES } from '../constants/roles.js';
import { VISITOR_STATUSES, VISITOR_TYPES } from '../constants/visitorTypes.js';
import { Flat } from '../models/Flat.js';
import { Society } from '../models/Society.js';
import { Tower } from '../models/Tower.js';
import { User } from '../models/User.js';
import { VisitorLog } from '../models/VisitorLog.js';
import { tokenService } from '../services/token.service.js';

const phoneSeed = { value: 1000 };

const createUser = async ({ role, societyId, flatId }) => {
  phoneSeed.value += 1;
  const user = new User({
    name: `${role} User`,
    phone: `+91988888${phoneSeed.value}`,
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

const setupSociety = async () => {
  const society = await Society.create({
    name: 'Visitor Test Society',
    address: {
      line1: 'Gate Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }
  });
  const tower = await Tower.create({ societyId: society._id, name: 'A', floors: 10 });
  const flat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'A-101',
    floor: 1,
    sizeSqFt: 1000,
    status: 'occupied'
  });
  const resident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: flat._id });
  const guard = await createUser({ role: ROLES.SECURITY_GUARD, societyId: society._id });
  flat.ownerId = resident._id;
  await flat.save();

  return {
    society,
    flat,
    resident,
    guard,
    residentToken: tokenService.createAccessToken(resident),
    guardToken: tokenService.createAccessToken(guard)
  };
};

describe('Visitor and gate management', () => {
  it('lets a resident pre-approve a visitor and a guard check them in and out with OTP', async () => {
    const { residentToken, guardToken } = await setupSociety();

    const preApproveResponse = await request(app)
      .post('/api/v1/visitors/pre-approve')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        name: 'Amit Guest',
        phone: '+919812345678',
        purpose: 'Dinner visit',
        visitorType: VISITOR_TYPES.GUEST
      })
      .expect(201);

    expect(preApproveResponse.body.data.visitor.status).toBe(VISITOR_STATUSES.APPROVED);
    expect(preApproveResponse.body.data.pass.otp).toHaveLength(6);
    expect(preApproveResponse.body.data.visitor.otpHash).toBeUndefined();

    const visitorId = preApproveResponse.body.data.visitor._id;
    const otp = preApproveResponse.body.data.pass.otp;

    const checkInResponse = await request(app)
      .post(`/api/v1/visitors/${visitorId}/checkin`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ otp })
      .expect(200);

    expect(checkInResponse.body.data.visitor.status).toBe(VISITOR_STATUSES.CHECKED_IN);
    expect(checkInResponse.body.data.visitor.entryTime).toBeTruthy();

    const checkOutResponse = await request(app)
      .post(`/api/v1/visitors/${visitorId}/checkout`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send()
      .expect(200);

    expect(checkOutResponse.body.data.visitor.status).toBe(VISITOR_STATUSES.CHECKED_OUT);
    expect(await VisitorLog.countDocuments({ visitorId })).toBe(3);
  });

  it('supports guard walk-in approval and resident-scoped history', async () => {
    const { flat, residentToken, guardToken } = await setupSociety();

    const walkInResponse = await request(app)
      .post('/api/v1/visitors/walk-in')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        flatId: flat._id,
        name: 'Courier Person',
        phone: '+919812345679',
        purpose: 'Parcel delivery',
        visitorType: VISITOR_TYPES.DELIVERY
      })
      .expect(201);

    expect(walkInResponse.body.data.visitor.status).toBe(VISITOR_STATUSES.PENDING);

    const visitorId = walkInResponse.body.data.visitor._id;
    const approveResponse = await request(app)
      .patch(`/api/v1/visitors/${visitorId}/respond`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ decision: 'approved', approvalNote: 'Send up after entry' })
      .expect(200);

    expect(approveResponse.body.data.visitor.status).toBe(VISITOR_STATUSES.APPROVED);

    const checkInResponse = await request(app)
      .post(`/api/v1/visitors/${visitorId}/checkin`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send()
      .expect(200);

    expect(checkInResponse.body.data.visitor.status).toBe(VISITOR_STATUSES.CHECKED_IN);

    const listResponse = await request(app)
      .get('/api/v1/visitors?visitorType=delivery')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0]._id).toBe(visitorId);
  });
});
