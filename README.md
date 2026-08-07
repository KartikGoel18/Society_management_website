# Society Management Platform

Production-oriented MERN society and apartment management platform, built module by module.

## Current Build Status

Module 1 complete: backend authentication, onboarding, society, tower, flat, user foundation, service boundaries, and initial tests.

## Local Development

1. Copy environment files:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

2. Start MongoDB and the API:

```bash
docker compose up --build
```

3. API base URL:

```txt
http://localhost:5000/api/v1
```

4. Run backend tests:

```bash
cd server
npm test
```

5. Seed demo data:

```bash
cd server
npm run seed
```

Default seeded password:

```txt
Demo@12345
```

Demo users:

```txt
Super Admin:   +919000000001
Society Admin: +919000000002
Resident:      +919000000003
Guard:         +919000000004
```

## External Services

External integrations are isolated behind service modules:

- MSG91: `server/src/services/sms.service.js`
- Cloudinary: `server/src/services/upload.service.js`
- Razorpay: `server/src/services/payment.service.js`
- Firebase FCM: `server/src/services/push.service.js`

Each service reads credentials from environment variables and can be swapped without changing controller code.

## Module 1 API Checklist

Auth:

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
```

Society onboarding:

```txt
GET    /api/v1/societies
POST   /api/v1/societies
PUT    /api/v1/societies/:id
DELETE /api/v1/societies/:id
GET    /api/v1/societies/:id/towers
POST   /api/v1/societies/:id/towers
GET    /api/v1/societies/:id/flats
POST   /api/v1/societies/:id/flats
```

Users:

```txt
GET /api/v1/users/me
PUT /api/v1/users/me
GET /api/v1/users
PUT /api/v1/users/:id/approve
```

Security note: public registration is resident-only. Admin and guard accounts are seeded for development now and should be provisioned through protected admin flows in later modules.
