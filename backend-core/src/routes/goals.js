import express from 'express';
import Goal from '../models/Goal.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: Listar metas do professor
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, type, priority } = req.query;
    const query = { teacher: req.user._id };

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const goals = await Goal.find(query)
      .populate('scope.studentId', 'name')
      .populate('scope.classId', 'title')
      .sort({ priority: -1, endDate: 1 });

    res.json({ success: true, goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/goals:
 *   post:
 *     summary: Criar nova meta
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', protect, async (req, res) => {
  try {
    const goalData = {
      ...req.body,
      teacher: req.user._id
    };

    const goal = await Goal.create(goalData);
    res.status(201).json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/goals/:id/update:
 *   post:
 *     summary: Atualizar progresso da meta
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/update', protect, async (req, res) => {
  try {
    const { value, notes } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, teacher: req.user._id });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    await goal.updateProgress(value, notes);
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/goals/auto-update:
 *   post:
 *     summary: Atualizar metas automaticamente baseado em dados
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auto-update', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ 
      teacher: req.user._id, 
      status: 'active' 
    });

    const updatedGoals = [];

    for (const goal of goals) {
      let newValue = goal.currentValue;

      // Atualizar baseado no tipo de meta
      if (goal.type === 'academic' && goal.scope.type === 'student') {
        const student = await Student.findById(goal.scope.studentId);
        if (student) {
          newValue = student.performance?.overall || 0;
        }
      } else if (goal.type === 'financial') {
        const payments = await Payment.find({ 
          teacher: req.user._id,
          status: 'paid',
          paidAt: { $gte: goal.startDate, $lte: goal.endDate }
        });
        newValue = payments.reduce((sum, p) => sum + p.amount, 0);
      } else if (goal.type === 'operational') {
        if (goal.unit === 'students') {
          const students = await Student.countDocuments({ 
            teacher: req.user._id, 
            active: true 
          });
          newValue = students;
        } else if (goal.unit === 'classes') {
          const classes = await Class.countDocuments({ 
            teacher: req.user._id,
            status: 'completed',
            endedAt: { $gte: goal.startDate, $lte: goal.endDate }
          });
          newValue = classes;
        }
      }

      if (newValue !== goal.currentValue) {
        await goal.updateProgress(newValue, 'Atualização automática');
        updatedGoals.push(goal._id);
      }
    }

    res.json({ 
      success: true, 
      message: `${updatedGoals.length} meta(s) atualizada(s)`,
      updatedGoals 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

