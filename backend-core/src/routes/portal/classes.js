import express from 'express';
import Class from '../../models/Class.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';

const router = express.Router();

// GET /api/portal/classes
router.get('/classes', authenticateStudent, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const query = { student: req.studentId };

    if (status) query.status = status;

    const classes = await Class.find(query)
      .sort({ scheduledAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('title subject scheduledAt duration status assessmentScore notes homework');

    const total = await Class.countDocuments(query);

    res.json({
      success: true,
      classes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter aulas' });
  }
});

export default router;
