import express from 'express';
import liveClassService from '../services/liveClassService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/live-class/start:
 *   post:
 *     summary: Iniciar aula ao vivo
 *     tags: [Live Class]
 *     security:
 *       - bearerAuth: []
 */
router.post('/start', protect, async (req, res) => {
  try {
    const { classId } = req.body;
    const io = req.app.get('io');

    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'classId é obrigatório' 
      });
    }

    const result = await liveClassService.startLiveSession(
      classId,
      req.user._id,
      io
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/live-class/:sessionId/join:
 *   post:
 *     summary: Entrar na sessão de aula
 *     tags: [Live Class]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:sessionId/join', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userType = req.user.role === 'student' ? 'student' : 'teacher';
    const io = req.app.get('io');

    const userId = req.user._id;

    const result = await liveClassService.joinSession(
      sessionId,
      userId,
      userType,
      io
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/live-class/:sessionId/end:
 *   post:
 *     summary: Finalizar aula ao vivo
 *     tags: [Live Class]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:sessionId/end', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const io = req.app.get('io');

    const result = await liveClassService.endLiveSession(
      sessionId,
      req.user._id,
      io
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/live-class/:sessionId:
 *   get:
 *     summary: Obter informações da sessão
 *     tags: [Live Class]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = liveClassService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sessão não encontrada' 
      });
    }

    // Verificar acesso
    if (session.teacherId !== req.user._id.toString() && 
        session.studentId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/live-class/active:
 *   get:
 *     summary: Listar sessões ativas do professor
 *     tags: [Live Class]
 *     security:
 *       - bearerAuth: []
 */
router.get('/active/list', protect, async (req, res) => {
  try {
    const sessions = liveClassService.getTeacherActiveSessions(req.user._id);
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;

