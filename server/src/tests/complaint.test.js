import request from 'supertest';
import { app } from '../app.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '../constants/complaintTypes.js';
import { ROLES } from '../constants/roles.js';
import { Flat } from '../models/Flat.js';
import { Notification } from '../models/Notification.js';
import { Society } from '../models/Society.js';
import { Staff } from '../models/Staff.js';
import { Tower } from '../models/Tower.js';
import { User } from '../models/User.js';
import { tokenService } from '../services/token.service.js';

const phoneSeed = { value: 9000 };

const createUser = async ({ role, societyId, flatId }) => {
  phoneSeed.value += 1;
  const user = new User({
    name: `${role} User`,
    phone: `+91944444${phoneSeed.value}`,
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

const setupComplaintSociety = async () => {
  const society = await Society.create({
    name: 'Complaint Test Society',
    address: {
      line1: 'Helpdesk Road',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700001'
    }
  });
  const tower = await Tower.create({ societyId: society._id, name: 'E', floors: 7 });
  const flat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'E-505',
    floor: 5,
    sizeSqFt: 980,
    status: 'occupied'
  });
  const otherFlat = await Flat.create({
    societyId: society._id,
    towerId: tower._id,
    flatNumber: 'E-506',
    floor: 5,
    sizeSqFt: 980,
    status: 'occupied'
  });
  const admin = await createUser({ role: ROLES.SOCIETY_ADMIN, societyId: society._id });
  const guard = await createUser({ role: ROLES.SECURITY_GUARD, societyId: society._id });
  const resident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: flat._id });
  const otherResident = await createUser({ role: ROLES.RESIDENT, societyId: society._id, flatId: otherFlat._id });
  const staff = await Staff.create({
    societyId: society._id,
    name: 'Electrician Staff',
    phone: '+919812349999',
    category: 'electrician',
    assignedFlats: [flat._id],
    status: 'active',
    createdBy: admin._id
  });
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
    staff,
    adminToken: tokenService.createAccessToken(admin),
    guardToken: tokenService.createAccessToken(guard),
    residentToken: tokenService.createAccessToken(resident),
    otherResidentToken: tokenService.createAccessToken(otherResident)
  };
};

describe('Helpdesk and complaints', () => {
  it('supports complaint lifecycle from creation to resident feedback', async () => {
    const { staff, adminToken, residentToken } = await setupComplaintSociety();

    const createResponse = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: COMPLAINT_CATEGORIES.ELECTRICAL,
        description: 'Power socket is sparking in the kitchen',
        photos: ['https://example.com/socket.jpg']
      })
      .expect(201);

    expect(createResponse.body.data.complaint.status).toBe(COMPLAINT_STATUSES.OPEN);
    const complaintId = createResponse.body.data.complaint._id;

    const statusResponse = await request(app)
      .patch(`/api/v1/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: COMPLAINT_STATUSES.IN_PROGRESS,
        assignedTo: staff._id,
        assignedToModel: 'Staff',
        comment: 'Assigned to electrician'
      })
      .expect(200);

    expect(statusResponse.body.data.complaint.status).toBe(COMPLAINT_STATUSES.IN_PROGRESS);
    expect(statusResponse.body.data.complaint.assignedTo).toBe(staff._id.toString());
    expect(statusResponse.body.data.complaint.comments).toHaveLength(1);
    expect(await Notification.countDocuments()).toBe(1);

    await request(app)
      .post(`/api/v1/complaints/${complaintId}/comment`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ body: 'Please visit after 6 PM' })
      .expect(201);

    const resolvedResponse = await request(app)
      .patch(`/api/v1/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: COMPLAINT_STATUSES.RESOLVED,
        comment: 'Socket replaced'
      })
      .expect(200);

    expect(resolvedResponse.body.data.complaint.resolvedAt).toBeTruthy();

    const feedbackResponse = await request(app)
      .post(`/api/v1/complaints/${complaintId}/feedback`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ score: 5, feedback: 'Quick resolution' })
      .expect(200);

    expect(feedbackResponse.body.data.complaint.status).toBe(COMPLAINT_STATUSES.CLOSED);
    expect(feedbackResponse.body.data.complaint.rating.score).toBe(5);
  });

  it('scopes resident complaint lists to their own flat', async () => {
    const { flat, otherFlat, residentToken, otherResidentToken, resident, otherResident } = await setupComplaintSociety();

    await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: COMPLAINT_CATEGORIES.PLUMBING,
        description: 'Bathroom tap leakage'
      })
      .expect(201);

    await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .send({
        category: COMPLAINT_CATEGORIES.HOUSEKEEPING,
        description: 'Corridor cleaning needed'
      })
      .expect(201);

    const residentList = await request(app)
      .get('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);

    expect(residentList.body.data.items).toHaveLength(1);
    expect(residentList.body.data.items[0].flatId._id).toBe(flat._id.toString());

    const otherList = await request(app)
      .get('/api/v1/complaints')
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .expect(200);

    expect(otherList.body.data.items).toHaveLength(1);
    expect(otherList.body.data.items[0].flatId._id).toBe(otherFlat._id.toString());
    expect(resident._id.toString()).not.toBe(otherResident._id.toString());
  });

  it('allows guards to add internal comments and update security-ticket status', async () => {
    const { residentToken, guardToken } = await setupComplaintSociety();

    const createResponse = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: COMPLAINT_CATEGORIES.SECURITY,
        description: 'Unknown person near stairwell'
      })
      .expect(201);

    const complaintId = createResponse.body.data.complaint._id;

    const commentResponse = await request(app)
      .post(`/api/v1/complaints/${complaintId}/comment`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ body: 'Checked the area', isInternal: true })
      .expect(201);

    expect(commentResponse.body.data.complaint.comments[0].isInternal).toBe(true);

    await request(app)
      .patch(`/api/v1/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ status: COMPLAINT_STATUSES.RESOLVED })
      .expect(200);
  });
});
