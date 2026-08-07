import { connectDb, disconnectDb } from '../config/db.js';
import { ROLES } from '../constants/roles.js';
import { Flat } from '../models/Flat.js';
import { Society } from '../models/Society.js';
import { Tower } from '../models/Tower.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

const password = process.env.DEMO_PASSWORD || 'Demo@12345';

const upsertUser = async ({ name, email, phone, role, societyId, flatId }) => {
  let user = await User.findOne({ phone }).select('+passwordHash');

  if (!user) {
    user = new User({ name, email, phone, role, societyId, flatId });
  }

  user.name = name;
  user.email = email;
  user.role = role;
  user.societyId = societyId;
  user.flatId = flatId;
  user.isVerified = true;
  user.isApproved = true;
  user.isActive = true;
  await user.setPassword(password);
  await user.save();
  return user;
};

const seed = async () => {
  await connectDb();

  const superAdmin = await upsertUser({
    name: 'Platform Super Admin',
    email: 'superadmin@example.com',
    phone: '+919000000001',
    role: ROLES.SUPER_ADMIN
  });

  const society = await Society.findOneAndUpdate(
    { name: 'Sunrise Heights' },
    {
      name: 'Sunrise Heights',
      address: {
        line1: 'Plot 12, Lake Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India'
      },
      subscriptionPlan: 'trial',
      createdBy: superAdmin._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const admin = await upsertUser({
    name: 'Society Admin',
    email: 'admin@sunrise.example.com',
    phone: '+919000000002',
    role: ROLES.SOCIETY_ADMIN,
    societyId: society._id
  });

  const tower = await Tower.findOneAndUpdate(
    { societyId: society._id, name: 'A' },
    { societyId: society._id, name: 'A', floors: 12 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const flat = await Flat.findOneAndUpdate(
    { societyId: society._id, towerId: tower._id, flatNumber: 'A-101' },
    {
      societyId: society._id,
      towerId: tower._id,
      flatNumber: 'A-101',
      floor: 1,
      sizeSqFt: 1050,
      status: 'occupied'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const resident = await upsertUser({
    name: 'Demo Resident',
    email: 'resident@sunrise.example.com',
    phone: '+919000000003',
    role: ROLES.RESIDENT,
    societyId: society._id,
    flatId: flat._id
  });

  flat.ownerId = resident._id;
  flat.status = 'occupied';
  await flat.save();

  await upsertUser({
    name: 'Gate Guard',
    email: 'guard@sunrise.example.com',
    phone: '+919000000004',
    role: ROLES.SECURITY_GUARD,
    societyId: society._id
  });

  logger.info({
    password,
    users: {
      superAdmin: superAdmin.phone,
      societyAdmin: admin.phone,
      resident: resident.phone,
      guard: '+919000000004'
    }
  }, 'Demo seed completed');

  await disconnectDb();
};

seed().catch(async (error) => {
  logger.error(error, 'Demo seed failed');
  await disconnectDb();
  process.exit(1);
});
