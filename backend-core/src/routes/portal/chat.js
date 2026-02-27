import express from 'express';
import Student from '../../models/Student.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';
import { isValidObjectId, loadChatModel } from './helpers.js';

const router = express.Router();

// GET /api/portal/chat/messages
router.get('/chat/messages', authenticateStudent, async (req, res) => {
  try {
    const { teacherId } = req.query;
    const requestedTeacherId = typeof teacherId === 'string' ? teacherId : null;
    const tokenTeacherId = req.teacherId ? req.teacherId.toString() : null;

    if (tokenTeacherId && requestedTeacherId && requestedTeacherId != tokenTeacherId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const effectiveTeacherId = tokenTeacherId || requestedTeacherId;
    if (!effectiveTeacherId) {
      return res.status(400).json({ success: false, message: 'teacherId obrigatorio' });
    }

    if (!isValidObjectId(effectiveTeacherId)) {
      return res.status(400).json({ success: false, message: 'teacherId invalido' });
    }

    let Chat;
    try {
      Chat = await loadChatModel();
    } catch (error) {
      console.error('[StudentPortal] Chat model load error:', error);
      return res.status(500).json({ success: false, message: 'Erro ao carregar chat' });
    }

    const messages = await Chat.find({
      $or: [
        { sender: req.studentId, recipient: effectiveTeacherId },
        { sender: effectiveTeacherId, recipient: req.studentId }
      ]
    })
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      messages: messages.map(m => ({
        _id: m._id,
        sender: m.sender.toString() === req.studentId.toString() ? 'student' : 'teacher',
        senderName: m.senderName || 'Usuario',
        content: m.content,
        timestamp: m.timestamp,
        read: m.read || false,
        type: m.type || 'text',
        fileUrl: m.fileUrl,
        fileName: m.fileName
      }))
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar mensagens' });
  }
});

// POST /api/portal/chat/send
router.post('/chat/send', authenticateStudent, async (req, res) => {
  try {
    const { teacherId, content, type = 'text' } = req.body;
    const requestedTeacherId = typeof teacherId === 'string' ? teacherId : null;
    const tokenTeacherId = req.teacherId ? req.teacherId.toString() : null;

    if (tokenTeacherId && requestedTeacherId && requestedTeacherId != tokenTeacherId) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    const targetTeacherId = tokenTeacherId || requestedTeacherId;
    if (!targetTeacherId) {
      return res.status(400).json({ success: false, message: 'teacherId obrigatorio' });
    }

    if (!isValidObjectId(targetTeacherId)) {
      return res.status(400).json({ success: false, message: 'teacherId invalido' });
    }

    if (!content) {
      return res.status(400).json({ success: false, message: 'content é obrigatorio' });
    }

    const student = await Student.findById(req.studentId);

    let Chat;
    try {
      Chat = await loadChatModel();
    } catch (error) {
      console.error('[StudentPortal] Chat model load error:', error);
      return res.status(500).json({ success: false, message: 'Erro ao carregar chat' });
    }

    const message = new Chat({
      sender: req.studentId,
      senderName: student.name,
      recipient: targetTeacherId,
      content,
      type,
      timestamp: new Date(),
      read: false
    });

    await message.save();

    res.json({
      success: true,
      message: {
        _id: message._id,
        sender: 'student',
        senderName: student.name,
        content: message.content,
        timestamp: message.timestamp,
        read: false,
        type: message.type
      }
    });
  } catch (error) {
    console.error('[StudentPortal] Error sending message:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
  }
});

// POST /api/portal/chat/mark-read/:messageId
router.post('/chat/mark-read/:messageId', authenticateStudent, async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: 'ID de mensagem invalido' });
    }

    let Chat;
    try {
      Chat = await loadChatModel();
    } catch (error) {
      console.error('[StudentPortal] Chat model load error:', error);
      return res.status(500).json({ success: false, message: 'Erro ao carregar chat' });
    }

    await Chat.findOneAndUpdate(
      { _id: messageId, recipient: req.studentId },
      { read: true }
    );

    res.json({ success: true, message: 'Mensagem marcada como lida' });
  } catch (error) {
    console.error('[StudentPortal] Error marking message as read:', error);
    res.status(500).json({ success: false, message: 'Erro ao marcar mensagem como lida' });
  }
});

export default router;
