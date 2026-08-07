import request from 'supertest';
import { app } from '../app.js';
import { ROLES } from '../constants/roles.js';
import { Society } from '../models/Society.js';
import { User } from '../models/User.js';
import { tokenService } from '../services/token.service.js';

const createUser = async (role, societyId = null) => {
  const user = new User({
    name: `${role} User`,
    phone: `+91999999${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    role,
    societyId,
    isVerified: true,
    isApproved: true
  });
  await user.setPassword('StrongPass@123');
  await user.save();
  return user;
};

describe('Society onboarding foundation', () => {
  it('allows a super admin to create a society', async () => {
    const superAdmin = await createUser(ROLES.SUPER_ADMIN);
    const token = tokenService.createAccessToken(superAdmin);

    const response = await request(app)
      .post('/api/v1/societies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Green Acres',
        address: {
          line1: 'Main Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001'
        }
      })
      .expect(201);

    expect(response.body.data.society.name).toBe('Green Acres');
  });

  it('allows a society admin to create towers and flats inside their society', async () => {
    const society = await Society.create({
      name: 'Green Acres',
      address: {
        line1: 'Main Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001'
      }
    });
    const admin = await createUser(ROLES.SOCIETY_ADMIN, society._id);
    const token = tokenService.createAccessToken(admin);

    const towerResponse = await request(app)
      .post(`/api/v1/societies/${society._id}/towers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A', floors: 10 })
      .expect(201);

    const flatResponse = await request(app)
      .post(`/api/v1/societies/${society._id}/flats`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        towerId: towerResponse.body.data.tower._id,
        flatNumber: 'A-101',
        floor: 1,
        sizeSqFt: 1000
      })
      .expect(201);

    expect(flatResponse.body.data.flat.flatNumber).toBe('A-101');
  });
});
