import express from 'express';
import Student from '../../models/Student.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';
import { isValidObjectId } from './helpers.js';

const router = express.Router();

// GET /api/portal/goals
router.get('/goals', authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select('goals');
    res.json({ success: true, goals: student?.goals || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter metas' });
  }
});

// POST /api/portal/goals
router.post('/goals', authenticateStudent, async (req, res) => {
  try {
    const { title, description, targetDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Título da meta é obrigatório (mínimo 3 caracteres)' });
    }

    const student = await Student.findById(req.studentId).select('goals');
    if (student.goals && student.goals.length >= 20) {
      return res.status(400).json({ success: false, message: 'Limite de 20 metas atingido' });
    }

    const newGoal = {
      title: title.trim().slice(0, 100),
      description: description ? String(description).trim().slice(0, 300) : '',
      targetDate: targetDate ? new Date(targetDate) : null,
      progress: 0,
      status: 'active',
      createdAt: new Date()
    };

    await Student.findByIdAndUpdate(req.studentId, { $push: { goals: newGoal } });

    res.status(201).json({ success: true, message: 'Meta criada com sucesso!', goal: newGoal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar meta' });
  }
});

// PUT /api/portal/goals/:goalId
router.put('/goals/:goalId', authenticateStudent, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { title, description, targetDate, progress, status } = req.body;

    if (!isValidObjectId(goalId)) {
      return res.status(400).json({ success: false, message: 'ID de meta invalido' });
    }

    const updateFields = {};

    if (title !== undefined) updateFields['goals.$.title'] = String(title).trim().slice(0, 100);
    if (description !== undefined) updateFields['goals.$.description'] = String(description).trim().slice(0, 300);
    if (targetDate !== undefined) updateFields['goals.$.targetDate'] = targetDate ? new Date(targetDate) : null;
    if (progress !== undefined) {
      const prog = parseInt(progress);
      if (prog >= 0 && prog <= 100) updateFields['goals.$.progress'] = prog;
    }
    if (status !== undefined && ['active', 'completed', 'paused'].includes(status)) {
      updateFields['goals.$.status'] = status;
    }

    const result = await Student.findOneAndUpdate(
      { _id: req.studentId, 'goals._id': goalId },
      { $set: updateFields },
      { new: true }
    ).select('goals');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    const updatedGoal = result.goals.find(g => g._id.toString() === goalId);
    res.json({ success: true, message: 'Meta atualizada com sucesso!', goal: updatedGoal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar meta' });
  }
});

// DELETE /api/portal/goals/:goalId
router.delete('/goals/:goalId', authenticateStudent, async (req, res) => {
  try {
    const { goalId } = req.params;

    if (!isValidObjectId(goalId)) {
      return res.status(400).json({ success: false, message: 'ID de meta invalido' });
    }

    const result = await Student.findByIdAndUpdate(
      req.studentId,
      { $pull: { goals: { _id: goalId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    res.json({ success: true, message: 'Meta excluída com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir meta' });
  }
});

export default router;
