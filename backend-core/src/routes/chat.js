import express from 'express';
import { Chat, Message } from '../models/Chat.js';
import Student from '../models/Student.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Listar conversas do professor
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({ teacher: req.user._id })
      .populate('relatedStudent', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    // Adicionar informações de última mensagem
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .select('content sender sentAt messageType')
          .lean();

        return {
          ...chat,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderName: lastMessage.sender.name,
            sentAt: lastMessage.sentAt,
            messageType: lastMessage.messageType
          } : null
        };
      })
    );

    res.json({ success: true, chats: chatsWithLastMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Criar nova conversa
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const { studentId, participantType = 'student' } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID é obrigatório' });
    }

    const student = await Student.findById(studentId);
    if (!student || student.teacher.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    // Verificar se já existe conversa
    let chat = await Chat.findOne({
      teacher: req.user._id,
      relatedStudent: studentId,
      type: participantType
    });

    if (!chat) {
      // Criar nova conversa
      const participants = [];
      
      if (participantType === 'student') {
        participants.push({
          type: 'student',
          userId: student._id,
          name: student.name,
          email: student.email,
          phone: student.parentPhone
        });
      } else if (participantType === 'parent') {
        participants.push({
          type: 'parent',
          userId: student._id, // Usando student ID como referência
          name: student.parentName,
          email: student.parentEmail,
          phone: student.parentPhone
        });
      }

      chat = await Chat.create({
        teacher: req.user._id,
        participants,
        type: participantType,
        relatedStudent: studentId,
        lastMessage: {
          content: 'Conversa iniciada',
          senderName: req.user.name,
          sentAt: new Date(),
          messageType: 'system'
        }
      });
    }

    res.json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/chat/:id/messages:
 *   get:
 *     summary: Obter mensagens de uma conversa
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chat = await Chat.findOne({ _id: req.params.id, teacher: req.user._id });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }

    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Message.countDocuments({ chat: chat._id });

    res.json({
      success: true,
      messages: messages.reverse(), // Mostrar do mais antigo ao mais recente
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/chat/:id/messages:
 *   post:
 *     summary: Enviar mensagem
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const { content, messageType = 'text', attachments = [] } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Conteúdo da mensagem é obrigatório' });
    }

    const chat = await Chat.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }

    // Criar mensagem
    const message = await Message.create({
      chat: chat._id,
      sender: {
        type: 'teacher',
        userId: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar
      },
      content: content.trim(),
      messageType,
      attachments,
      status: 'sent',
      deliveredAt: new Date()
    });

    // Atualizar última mensagem do chat
    chat.lastMessage = {
      content: message.content,
      senderName: req.user.name,
      sentAt: message.createdAt,
      messageType: message.messageType
    };
    chat.totalMessages += 1;
    await chat.addUnread(req.user._id);
    await chat.save();

    // Emitir evento Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(chat._id.toString()).emit('new_message', {
        message,
        chatId: chat._id.toString()
      });
      
      // Notificar participantes
      chat.participants.forEach(participant => {
        io.to(`user:${participant.userId}`).emit('chat_notification', {
          chatId: chat._id.toString(),
          message: message.content,
          sender: req.user.name
        });
      });
    }

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/chat/:id/read:
 *   post:
 *     summary: Marcar conversa como lida
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/read', async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }

    await chat.markAsRead(req.user._id);
    
    // Marcar mensagens como lidas
    await Message.updateMany(
      { chat: chat._id, 'sender.userId': { $ne: req.user._id }, status: { $ne: 'read' } },
      { $set: { status: 'read', readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

