# Production Code Audit — Nexus Academy

## Architecture Confirmed
- **Production entry point**: `backend-core/src/server-prod.js` (started via `node src/server-prod.js`)
- `server.js` and `server-simple.js` are **NOT used in production** — all prior issues were irrelevant
- Production uses modular architecture: routes → controllers → models + middleware

---

## CRITICAL Bugs (Revenue / Security Breaking)

### 1. Stripe Webhook Raw Body Not Configured
**File**: `backend-core/src/server-prod.js` (line 94), `backend-core/src/routes/webhooks.js` (line 13), `backend-core/src/controllers/webhookController.js` (line 33)

**Problem**: `server-prod.js` applies `express.json()` globally. The Stripe `/api/webhooks/stripe` route calls `stripe.webhooks.constructEvent(req.body, sig, webhookSecret)` which requires the **raw Buffer body**, not a parsed JSON object. Without `express.raw()` applied before `express.json()` for this specific route, webhook signature verification **always fails** — meaning Stripe subscription events (payment success, cancellation, trial activation) are silently dropped or rejected.

The comment in `webhooks.js:13` says _"O express.raw já está configurado no server.js"_ — this is incorrect for `server-prod.js`.

**Fix**: In `server-prod.js`, add `express.raw({ type: 'application/json' })` specifically for `/api/webhooks/stripe` **before** the global `express.json()` middleware.

---

### 2. `paidDate` Field Bug — Monthly Revenue Always Returns 0
**File**: `backend-core/src/controllers/paymentController.js` (line 127)

**Problem**: The Payment schema defines the field as `paidAt` (Payment.js line 18). The `updatePayment` function correctly writes to `payment.paidAt` (line 85–87). However, `getFinancialStats` at line 127 filters using `p.paidDate` — a field that **does not exist** on the schema. This means `monthlyRevenue` always returns `0` regardless of actual paid payments.

**Fix**: Change `p.paidDate` → `p.paidAt` in `paymentController.js:127`.

---

## IMPORTANT Issues (Security / Data Integrity)

### 3. `getMe` Returns Full User Without Excluding Sensitive Fields
**File**: `backend-core/src/controllers/authController.js` (line 159)

**Problem**: `User.findById(req.user._id)` without `.select('-password -gatewayCredentials')`. The `gatewayCredentials` field (payment gateway API keys) has `select: false` on the schema, but explicitly calling `.select()` with exclusions is a defensive programming requirement.

**Fix**: Add `.select('-password -gatewayCredentials')` to the `getMe` query.

---

### 4. Cryptographically Weak Random IDs
**Files**:
- `backend-core/src/models/Payment.js` (line 107) — invoice numbers
- `backend-core/src/models/User.js` (line 154) — referral codes

**Problem**: Both use `Math.random()` for generating unique identifiers. `Math.random()` is not cryptographically secure and has higher collision probability. Invoice numbers are financial records; referral codes affect revenue attribution.

**Fix**: Replace both with `crypto.randomBytes()` from Node's built-in `crypto` module.

---

### 5. N+1 Query Problem in `getStudentPaymentAnalytics`
**File**: `backend-core/src/controllers/analyticsController.js` (lines 74–88)

**Problem**: For each student, a separate `Payment.findOne()` call is made. With 50 students = 51 DB queries per request. This will degrade performance at scale and can cause timeouts.

**Fix**: Replace with a single MongoDB aggregation using `$lookup` or `$group` to get latest payment per student in one query.

---

### 6. `getPayments` Makes 2 Queries When 1 Would Do
**File**: `backend-core/src/controllers/paymentController.js` (lines 7–13)

**Problem**: Gets all student IDs for the teacher first, then queries payments by `student: { $in: studentIds }`. The Payment schema already has a `teacher` field (line 6) — a direct query `Payment.find({ teacher: teacherId })` would work and be faster.

**Fix**: Replace 2-query approach with `Payment.find({ teacher: teacherId })`.

---

## LOW Issues (Performance / Maintainability)

### 7. Duplicate Rate Limiting on Login Route
**File**: `backend-core/src/routes/auth.js` (line 35), `backend-core/src/middleware/auth.js` (lines 232–290)

**Problem**: Login route applies both `loginLimiter` (express-rate-limit middleware) and `loginRateLimiter` (in-memory Map inside `auth.js`). The in-memory Map is per-process and doesn't work in multi-instance deployments. The express-rate-limit middleware is sufficient and correct.

**Fix**: Remove `loginRateLimiter` and `recordLoginAttempt` exports from `auth.js`. Remove their import/use in `authController.js` and `auth.js` route.

---

### 8. `getStudentStats` Runs 2 Separate Student Queries
**File**: `backend-core/src/controllers/studentController.js` (lines 253–261)

**Problem**: First runs `Student.countDocuments()`, then `Student.find()` — both with identical filters. The count can be derived from the results of `find()`.

**Fix**: Remove `countDocuments` call; use `students.length` from the `find()` result.

---

### 9. `getTeacherAnalytics` Loads All Paid Payments Into Memory
**File**: `backend-core/src/controllers/analyticsController.js` (lines 14–21)

**Problem**: `Payment.find({ student: { $in: studentIds }, status: 'paid' })` loads ALL historical paid payments into memory, then filters in JS. A teacher with 2 years of history could have thousands of payment records loaded unnecessarily just to compute a monthly sum.

**Fix**: Use MongoDB `$match` + `$group` aggregation to compute `monthlyRevenue` and `totalRevenue` server-side.

---

## Files to Modify

| Priority | File | Change |
|---|---|---|
| CRITICAL | `backend-core/src/server-prod.js` | Add `express.raw()` for `/api/webhooks/stripe` before `express.json()` |
| CRITICAL | `backend-core/src/controllers/paymentController.js` | Fix `paidDate` → `paidAt` (line 127); consolidate `getPayments` to single query |
| IMPORTANT | `backend-core/src/controllers/authController.js` | Add `.select('-password -gatewayCredentials')` to `getMe` |
| IMPORTANT | `backend-core/src/models/Payment.js` | Replace `Math.random()` with `crypto.randomBytes()` for invoice numbers |
| IMPORTANT | `backend-core/src/models/User.js` | Replace `Math.random()` with `crypto.randomBytes()` for referral codes |
| IMPORTANT | `backend-core/src/controllers/analyticsController.js` | Fix N+1 in `getStudentPaymentAnalytics`; use aggregation in `getTeacherAnalytics` |
| LOW | `backend-core/src/middleware/auth.js` | Remove in-memory `loginRateLimiter` and `loginAttempts` Map |
| LOW | `backend-core/src/controllers/studentController.js` | Remove redundant `countDocuments` call in `getStudentStats` |
