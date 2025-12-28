import express from 'express';
import aiAssistantService from '../services/aiAssistantService.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';

const router = express.Router();

const models = { User, Student, Class, Payment, Course };

/**
 * @swagger
 * /api/ai-assistant/chat:
 *   post:
 *     summary: Enviar mensagem para assistente IA
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chat', protect, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mensagem é obrigatória' 
      });
    }

    const response = await aiAssistantService.processMessage(
      req.user._id,
      message,
      models
    );

    res.json(response);
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar mensagem' 
    });
  }
});

/**
 * @swagger
 * /api/ai-assistant/suggestions:
 *   get:
 *     summary: Obter sugestões rápidas baseadas em contexto
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 */
router.get('/suggestions', protect, async (req, res) => {
  try {
    const suggestions = await aiAssistantService.getQuickSuggestions(
      req.user._id,
      models
    );

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter sugestões' 
    });
  }
});

/**
 * @swagger
 * /api/ai-assistant/history:
 *   get:
 *     summary: Obter histórico de conversa
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', protect, async (req, res) => {
  try {
    const history = aiAssistantService.getHistory(req.user._id.toString());
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/ai-assistant/history:
 *   delete:
 *     summary: Limpar histórico de conversa
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/history', protect, async (req, res) => {
  try {
    aiAssistantService.clearHistory(req.user._id.toString());
    res.json({ success: true, message: 'Histórico limpo' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

