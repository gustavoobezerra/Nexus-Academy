import express from 'express';
import Payment from '../../models/Payment.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';

const router = express.Router();

// GET /api/portal/payments
router.get('/payments', authenticateStudent, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.studentId })
      .sort({ dueDate: -1 })
      .select('amount status dueDate paidAt month year paymentMethod');

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter pagamentos' });
  }
});

export default router;
