import express from 'express';
import Student from '../../models/Student.js';
import Class from '../../models/Class.js';
import Payment from '../../models/Payment.js';
import Activity from '../../models/Activity.js';
import User from '../../models/User.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';
import aiAssistantService from '../../services/aiAssistantService.js';

const router = express.Router();

const models = { Student, Class, Payment, Activity, User };

router.use('/ai', authenticateStudent);

router.get('/ai/history', async (req, res) => {
  try {
    const history = aiAssistantService.getHistory(req.studentId, 'student');
    res.json({ success: true, history });
  } catch (error) {
    console.error('[Portal AI] Error loading history:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar histórico' });
  }
});

router.get('/ai/suggestions', async (req, res) => {
  try {
    const suggestions = await aiAssistantService.getQuickSuggestions(req.studentId, models, 'student');
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('[Portal AI] Error loading suggestions:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar sugestões' });
  }
});

router.post('/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mensagem é obrigatória'
      });
    }

    const response = await aiAssistantService.processStudentMessage(
      req.studentId,
      String(message),
      models
    );

    res.json(response);
  } catch (error) {
    console.error('[Portal AI] Error processing message:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar mensagem' });
  }
});

router.delete('/ai/history', async (req, res) => {
  try {
    aiAssistantService.clearHistory(req.studentId, 'student');
    res.json({ success: true, message: 'Histórico limpo' });
  } catch (error) {
    console.error('[Portal AI] Error clearing history:', error);
    res.status(500).json({ success: false, message: 'Erro ao limpar histórico' });
  }
});

export default router;
