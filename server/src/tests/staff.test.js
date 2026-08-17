import request from 'supertest';
import { app } from '../app.js';
import { ROLES } from '../constants/roles.js';
import { ATTENDANCE_ACTIONS, STAFF_CATEGORIES, WAGE_PAYMENT_STATUSES } from '../constants/staffTypes.js';
import { Attendance } from '../models/Attendance.js';
import { Flat } from '../models/Flat.js';
import { Society } from '../models/Society.js';
import { Staff } from '../models/Staff.js';
import { Tower } from '../models/Tower.js';
import { User } from '../models/User.js';
import { tokenService } from '../services/token.service.js';

const phoneSeed = { value: 5000 };

const createUser = async ({ role, societyId, flatId }) => {
  phoneSeed.value += 1;
  const user = new User({
    name: `${role} User`,
    phone: `+91966666${phoneSeed.value}`,
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

const setupStaffSociety = async () => {
  const society = await Society.create({
    name: 'Staff Test Society',
    address: {
      line1: 'Service Road',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001'
    }
  });
  const tower = await Tower.create({ societyId: society._id, name: 'C', floors: 11 });
  const flat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'C-303',
    floor: 3,
    sizeSqFt: 950,
    status: 'occupied'
  });
  const otherFlat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'C-304',
    floor: 3,
    sizeSqFt: 950,
    status: 'occupied'
  });
  const admin = await createUser({ role: ROLES.SOCIETY_ADMIN, societyId: society._id });
  const guard = await createUser({ role: ROLES.SECURITY_GUARD, societyId: society._id });
  const resident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: flat._id });
  const otherResident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: otherFlat._id });
  flat.ownerId = resident._id;
  otherFlat.ownerId = otherResident._id;
  await flat.save();
  await otherFlat.save();

  return {
    society,
    flat,
    otherFlat,
    admin,
    guard,
    resident,
    otherResident,
    adminToken: tokenService.createAccessToken(admin),
    guardToken: tokenService.createAccessToken(guard),
    residentToken: tokenService.createAccessToken(resident),
    otherResidentToken: tokenService.createAccessToken(otherResident)
  };
};

describe('Staff and domestic help management', () => {
  it('allows admins to register staff and residents to view active directory entries', async () => {
    const { flat, adminToken, residentToken } = await setupStaffSociety();

    const createResponse = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Meera Cook',
        phone: '+919812340001',
        category: STAFF_CATEGORIES.COOK,
        idProofUrl: 'https://example.com/id-proof.pdf',
        assignedFlats: [flat._id]
      })
      .expect(201);

    expect(createResponse.body.data.staff.status).toBe('active');
    expect(createResponse.body.data.staff.assignedFlats[0]).toBe(flat._id.toString());

    const listResponse = await request(app)
      .get('/api/v1/staff?category=cook')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0].name).toBe('Meera Cook');
  });

  it('records staff check-in and check-out attendance', async () => {
    const { flat, adminToken, guardToken } = await setupStaffSociety();
    const staff = await Staff.create({
      societyId: flat.societyId,
      name: 'Ravi Driver',
      phone: '+919812340002',
      category: STAFF_CATEGORIES.DRIVER,
      assignedFlats: [flat._id],
      status: 'active',
      createdBy: flat.ownerId
    });

    const checkInResponse = await request(app)
      .post(`/api/v1/staff/${staff._id}/attendance`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ action: ATTENDANCE_ACTIONS.CHECK_IN, flatId: flat._id, note: 'Entered via gate 1' })
      .expect(201);

    expect(checkInResponse.body.data.attendance.checkIn).toBeTruthy();

    const checkOutResponse = await request(app)
      .post(`/api/v1/staff/${staff._id}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: ATTENDANCE_ACTIONS.CHECK_OUT, flatId: flat._id })
      .expect(200);

    expect(checkOutResponse.body.data.attendance.checkOut).toBeTruthy();
    expect(await Attendance.countDocuments({ staffId: staff._id })).toBe(1);
  });

  it('allows assigned residents to review staff and add wage records', async () => {
    const { flat, residentToken } = await setupStaffSociety();
    const staff = await Staff.create({
      societyId: flat.societyId,
      name: 'Anita Maid',
      phone: '+919812340003',
      category: STAFF_CATEGORIES.MAID,
      assignedFlats: [flat._id],
      status: 'active',
      createdBy: flat.ownerId
    });

    const reviewResponse = await request(app)
      .post(`/api/v1/staff/${staff._id}/reviews`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ rating: 5, comment: 'Reliable and punctual' })
      .expect(200);

    expect(reviewResponse.body.data.staff.rating.average).toBe(5);
    expect(reviewResponse.body.data.staff.rating.count).toBe(1);

    const wageResponse = await request(app)
      .post(`/api/v1/staff/${staff._id}/wages`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        amount: 3500,
        period: '2026-08',
        status: WAGE_PAYMENT_STATUSES.PAID,
        paidOn: '2026-08-05T00:00:00.000Z'
      })
      .expect(201);

    expect(wageResponse.body.data.wageRecord.amount).toBe(3500);
    expect(wageResponse.body.data.wageRecord.flatId).toBe(flat._id.toString());
  });

  it('prevents residents from managing staff not assigned to their flat', async () => {
    const { flat, otherResidentToken } = await setupStaffSociety();
    const staff = await Staff.create({
      societyId: flat.societyId,
      name: 'Assigned Only',
      phone: '+919812340004',
      category: STAFF_CATEGORIES.CAR_CLEANER,
      assignedFlats: [flat._id],
      status: 'active',
      createdBy: flat.ownerId
    });

    await request(app)
      .post(`/api/v1/staff/${staff._id}/reviews`)
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .send({ rating: 4 })
      .expect(403);
  });
});
