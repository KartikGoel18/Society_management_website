import request from 'supertest';
import { app } from '../app.js';
import { ROLES } from '../constants/roles.js';
import { GUARD_STATUSES, INCIDENT_CATEGORIES, SHIFT_ACTIONS } from '../constants/securityTypes.js';
import { Flat } from '../models/Flat.js';
import { Guard } from '../models/Guard.js';
import { Notification } from '../models/Notification.js';
import { PatrolLog } from '../models/PatrolLog.js';
import { Society } from '../models/Society.js';
import { Tower } from '../models/Tower.js';
import { User } from '../models/User.js';
import { tokenService } from '../services/token.service.js';

const phoneSeed = { value: 3000 };

const createUser = async ({ role, societyId, flatId }) => {
  phoneSeed.value += 1;
  const user = new User({
    name: `${role} User`,
    phone: `+91977777${phoneSeed.value}`,
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

const setupSecuritySociety = async () => {
  const society = await Society.create({
    name: 'Security Test Society',
    address: {
      line1: 'Patrol Road',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    }
  });
  const tower = await Tower.create({ societyId: society._id, name: 'B', floors: 8 });
  const flat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'B-202',
    floor: 2,
    sizeSqFt: 900,
    status: 'occupied'
  });
  const admin = await createUser({ role: ROLES.SOCIETY_ADMIN, societyId: society._id });
  const guardUser = await createUser({ role: ROLES.SECURITY_GUARD, societyId: society._id });
  const resident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: flat._id });
  flat.ownerId = resident._id;
  await flat.save();

  return {
    society,
    flat,
    admin,
    guardUser,
    resident,
    adminToken: tokenService.createAccessToken(admin),
    guardToken: tokenService.createAccessToken(guardUser),
    residentToken: tokenService.createAccessToken(resident)
  };
};

describe('Security and guard operations', () => {
  it('lets a guard check in and check out their own shift', async () => {
    const { guardToken } = await setupSecuritySociety();

    const checkInResponse = await request(app)
      .post('/api/v1/guards/me/shift')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ action: SHIFT_ACTIONS.CHECK_IN, note: 'Starting morning shift' })
      .expect(200);

    expect(checkInResponse.body.data.guard.currentStatus).toBe(GUARD_STATUSES.ON_DUTY);
    expect(checkInResponse.body.data.guard.shiftLogs).toHaveLength(1);

    const checkOutResponse = await request(app)
      .post('/api/v1/guards/me/shift')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ action: SHIFT_ACTIONS.CHECK_OUT })
      .expect(200);

    expect(checkOutResponse.body.data.guard.currentStatus).toBe(GUARD_STATUSES.OFF_DUTY);
    expect(checkOutResponse.body.data.guard.shiftLogs).toHaveLength(2);
  });

  it('creates patrol checkpoints and logs scans with QR payload validation', async () => {
    const { adminToken, guardToken, guardUser } = await setupSecuritySociety();

    await request(app)
      .post('/api/v1/guards/me/shift')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ action: SHIFT_ACTIONS.CHECK_IN })
      .expect(200);

    const checkpointResponse = await request(app)
      .post('/api/v1/patrol/checkpoints')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'North Gate',
        location: { label: 'Near north gate', lat: 28.61, lng: 77.2 }
      })
      .expect(201);

    expect(checkpointResponse.body.data.checkpoint.qrCodeHash).toBeUndefined();
    expect(checkpointResponse.body.data.qr.payload).toBeTruthy();

    const checkpointId = checkpointResponse.body.data.checkpoint._id;
    const patrolResponse = await request(app)
      .post('/api/v1/patrol/log')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        checkpointId,
        qrPayload: checkpointResponse.body.data.qr.payload,
        note: 'All clear'
      })
      .expect(201);

    expect(patrolResponse.body.data.patrolLog.checkpointId).toBe(checkpointId);
    expect(await PatrolLog.countDocuments()).toBe(1);

    const guard = await Guard.findOne({ userId: guardUser._id });
    expect(guard.currentStatus).toBe(GUARD_STATUSES.ON_PATROL);
  });

  it('raises SOS alerts to admins and guards', async () => {
    const { residentToken } = await setupSecuritySociety();

    const response = await request(app)
      .post('/api/v1/alerts/sos')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        message: 'Medical emergency near lobby',
        location: { label: 'Tower B lobby' }
      })
      .expect(201);

    expect(response.body.data.alert.status).toBe('active');
    expect(await Notification.countDocuments()).toBe(2);
  });

  it('allows guards to report and list their incidents', async () => {
    const { guardToken } = await setupSecuritySociety();

    const createResponse = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        category: INCIDENT_CATEGORIES.SECURITY,
        description: 'Unauthorized vehicle attempted entry',
        location: { label: 'Main gate' }
      })
      .expect(201);

    expect(createResponse.body.data.incident.status).toBe('open');

    const listResponse = await request(app)
      .get('/api/v1/incidents?category=security')
      .set('Authorization', `Bearer ${guardToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
  });
});
