import express from 'express';
import {
  getPayments,
  createPayment,
  updatePayment,
  getFinancialStats
} from '../controllers/paymentController.js';
import { authorize, protect, requireCompletedOnboarding } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));
router.use(requireCompletedOnboarding);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.get('/stats', getFinancialStats);

router.route('/:id')
  .put(updatePayment);

export default router;
