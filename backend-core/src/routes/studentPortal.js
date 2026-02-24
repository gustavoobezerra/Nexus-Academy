/**
 * Student Portal — router principal
 * Montado em /api/portal pelo server-prod.js
 *
 * Sub-routers:
 *   portal/auth.js     → POST /auth/register, POST /auth/login
 *   portal/profile.js  → GET/PUT /profile, POST /onboarding, GET /me, GET /activities
 *   portal/goals.js    → GET/POST /goals, PUT/DELETE /goals/:goalId
 *   portal/classes.js  → GET /classes
 *   portal/payments.js → GET /payments
 *   portal/courses.js  → GET /courses
 *   portal/chat.js     → GET /chat/messages, POST /chat/send, POST /chat/mark-read/:messageId
 */
import express from 'express';
import authRoutes from './portal/auth.js';
import profileRoutes from './portal/profile.js';
import goalsRoutes from './portal/goals.js';
import classesRoutes from './portal/classes.js';
import paymentsRoutes from './portal/payments.js';
import coursesRoutes from './portal/courses.js';
import chatRoutes from './portal/chat.js';

const router = express.Router();

router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/', goalsRoutes);
router.use('/', classesRoutes);
router.use('/', paymentsRoutes);
router.use('/', coursesRoutes);
router.use('/', chatRoutes);

export default router;
