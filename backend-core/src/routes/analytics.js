import express from 'express';
import { getTeacherAnalytics, getStudentPaymentAnalytics } from '../controllers/analyticsController.js';
import { authorize, protect, requireCompletedOnboarding } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));
router.use(requireCompletedOnboarding);

router.get('/teacher', getTeacherAnalytics);
router.get('/student-payments', getStudentPaymentAnalytics);

export default router;
