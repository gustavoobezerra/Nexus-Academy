import express from 'express';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  generateAISummary,
  getClassStats
} from '../controllers/classController.js';
import { authorize, protect, requireCompletedOnboarding } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));
router.use(requireCompletedOnboarding);

router.route('/')
  .get(getClasses)
  .post(createClass);

router.get('/stats', getClassStats);

router.post('/:id/generate-summary', generateAISummary);

// Iniciar aula (mudar status para in_progress)
router.post('/:id/start', async (req, res) => {
  try {
    const { default: ClassModel } = await import('../models/Class.js');
    const classData = await ClassModel.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status: 'in_progress', startedAt: new Date() },
      { new: true }
    );
    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }
    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao iniciar aula', error: error.message });
  }
});

// Finalizar aula (mudar status para completed)
router.post('/:id/end', async (req, res) => {
  try {
    const { default: ClassModel } = await import('../models/Class.js');
    const classData = await ClassModel.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status: 'completed', endedAt: new Date() },
      { new: true }
    );
    if (!classData) {
      return res.status(404).json({ message: 'Aula não encontrada.' });
    }
    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao finalizar aula', error: error.message });
  }
});

router.route('/:id')
  .get(getClass)
  .put(updateClass)
  .patch(updateClass)
  .delete(async (req, res) => {
    try {
      const { default: ClassModel } = await import('../models/Class.js');
      const classData = await ClassModel.findOneAndDelete({
        _id: req.params.id,
        teacher: req.user._id
      });
      if (!classData) {
        return res.status(404).json({ message: 'Aula não encontrada.' });
      }
      res.json({ success: true, message: 'Aula removida com sucesso.' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao remover aula', error: error.message });
    }
  });

export default router;
