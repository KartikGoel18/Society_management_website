import request from 'supertest';
import { app } from '../app.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';

describe('Auth flow', () => {
  it('registers and logs in a resident', async () => {
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Resident User',
        phone: '+919876543210',
        email: 'resident@example.com',
        password: 'StrongPass@123'
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.accessToken).toBeTruthy();
    expect(registerResponse.body.data.user.passwordHash).toBeUndefined();
    expect(registerResponse.body.data.user.role).toBe(ROLES.RESIDENT);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: '+919876543210',
        password: 'StrongPass@123'
      })
      .expect(200);

    expect(loginResponse.body.data.accessToken).toBeTruthy();
  });

  it('blocks public admin self-registration', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bad Admin',
        phone: '+919876543211',
        email: 'bad-admin@example.com',
        password: 'StrongPass@123',
        role: ROLES.SUPER_ADMIN
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(await User.countDocuments()).toBe(0);
  });
});
