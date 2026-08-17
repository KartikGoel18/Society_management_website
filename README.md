# Society Management Platform

Production-oriented MERN society and apartment management platform, built module by module.

## Current Build Status

Module 5 complete: backend billing, accounting, expenses, invoice PDFs, and Razorpay payment verification are implemented.

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

## Module 2 API Checklist

Visitors:

```txt
GET   /api/v1/visitors
POST  /api/v1/visitors/pre-approve
POST  /api/v1/visitors/walk-in
PATCH /api/v1/visitors/:id/respond
POST  /api/v1/visitors/:id/checkin
POST  /api/v1/visitors/:id/checkout
```

Supported flows:

```txt
Resident pre-approval -> OTP/QR pass -> guard check-in -> guard check-out
Guard walk-in request -> resident approve/reject -> guard check-in
Delivery leave-at-gate status for approved delivery requests
Visitor history filtering by flat, date range, visitor type, status, and search text
```

Visitor pass security:

```txt
OTP and QR token values are returned only at pass creation time.
Only hashes are stored in MongoDB.
VisitorLog snapshots also exclude pass hashes.
```

## Module 3 API Checklist

Guard shifts:

```txt
POST /api/v1/guards/:id/shift
POST /api/v1/guards/me/shift
```

Patrol:

```txt
GET  /api/v1/patrol/checkpoints
POST /api/v1/patrol/checkpoints
POST /api/v1/patrol/log
```

Alerts and incidents:

```txt
POST /api/v1/alerts/sos
GET  /api/v1/incidents
POST /api/v1/incidents
```

Supported flows:

```txt
Guard shift check-in/check-out with shift log history
Admin-created patrol checkpoints with QR payload generation
Guard QR patrol scan logging while on duty
Resident/guard/admin SOS alerts broadcast to society admins and guards
Guard/admin incident reporting with photo URL support
```

Security note:

```txt
Patrol checkpoint QR tokens are returned only on creation.
Only QR token hashes are stored in MongoDB.
```

## Module 4 API Checklist

Staff directory:

```txt
GET  /api/v1/staff
POST /api/v1/staff
```

Attendance, reviews, and wages:

```txt
POST /api/v1/staff/:id/attendance
POST /api/v1/staff/:id/reviews
POST /api/v1/staff/:id/wages
```

Supported flows:

```txt
Admin/guard staff registration with ID proof/photo URL fields
Society-wide active staff directory with filters and pagination
Flat assignment enforcement for attendance, reviews, and resident wage records
Staff check-in/check-out attendance history
Resident ratings and reviews with average rating recalculation
Resident wage tracking per staff member and flat
```

Privacy note:

```txt
Resident responses only include wage records for the resident's own flat.
Admins can see the full staff profile.
```

## Module 5 API Checklist

Bills and invoices:

```txt
GET  /api/v1/bills
POST /api/v1/bills/generate
GET  /api/v1/bills/:id/invoice-pdf
```

Payments:

```txt
POST /api/v1/payments/create-order
POST /api/v1/payments/verify
POST /api/v1/payments/webhook
```

Expenses:

```txt
GET  /api/v1/expenses
POST /api/v1/expenses
```

Supported flows:

```txt
Admin bill generation for all flats or selected flats
Resident bill listing scoped to their own flat
Overdue bill status recalculation on bill listing
PDF invoice/receipt download
Razorpay order creation through paymentService
Razorpay client payment signature verification
Razorpay webhook HMAC verification using raw request body
Payment captured -> bill marked paid -> notification + socket event
Admin expense tracking with filters and pagination
```

Payment security note:

```txt
Payment status is never accepted from the client.
Client verification uses razorpay_order_id + razorpay_payment_id + razorpay_signature.
Webhook verification uses the x-razorpay-signature header over the raw JSON body.
```
