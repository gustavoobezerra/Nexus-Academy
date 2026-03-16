import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import Student from '../../models/Student.js';
import { Chat, Message } from '../../models/Chat.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const mapMessageForPortal = (message, studentId) => {
  const attachment = Array.isArray(message.attachments) ? message.attachments[0] : null;
  return {
    _id: message._id,
    sender: message.sender?.userId?.toString() === studentId.toString() ? 'student' : 'teacher',
    senderName: message.sender?.name || 'Usuário',
    content: message.content,
    timestamp: message.createdAt || message.timestamp || new Date(),
    read: message.status === 'read',
    type: message.messageType === 'image' ? 'image' : (message.messageType === 'file' ? 'file' : 'text'),
    fileUrl: attachment?.url,
    fileName: attachment?.filename
  };
};

const resolveTeacherId = (req) => {
  const requestedTeacherId = typeof req.body?.teacherId === 'string'
    ? req.body.teacherId
    : (typeof req.query?.teacherId === 'string' ? req.query.teacherId : null);
  const tokenTeacherId = req.teacherId ? req.teacherId.toString() : null;

  if (tokenTeacherId && requestedTeacherId && requestedTeacherId !== tokenTeacherId) {
    return { error: { status: 403, message: 'Acesso negado' } };
  }

  const teacherId = tokenTeacherId || requestedTeacherId;
  if (!teacherId) {
    return { error: { status: 400, message: 'teacherId obrigatorio' } };
  }

  if (!isValidObjectId(teacherId)) {
    return { error: { status: 400, message: 'teacherId invalido' } };
  }

  return { teacherId };
};

const ensureChat = async (teacherId, student) => {
  let chat = await Chat.findOne({
    teacher: teacherId,
    relatedStudent: student._id,
    type: 'student'
  });

  if (!chat) {
    chat = await Chat.create({
      teacher: teacherId,
      participants: [{
        type: 'student',
        userId: student._id,
        name: student.name,
        email: student.email,
        phone: student.parentPhone
      }],
      type: 'student',
      relatedStudent: student._id,
      lastMessage: {
        content: 'Conversa iniciada',
        senderName: student.name,
        sentAt: new Date(),
        messageType: 'system'
      }
    });
  }

  return chat;
};

// GET /api/portal/chat/messages
router.get('/chat/messages', authenticateStudent, async (req, res) => {
  try {
    const { teacherId, error } = resolveTeacherId(req);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const student = await Student.findById(req.studentId).select('name email parentPhone');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const chat = await ensureChat(teacherId, student);
    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      messages: messages.map((message) => mapMessageForPortal(message, req.studentId))
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar mensagens' });
  }
});

// POST /api/portal/chat/send
router.post('/chat/send', authenticateStudent, async (req, res) => {
  try {
    const { teacherId, error } = resolveTeacherId(req);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const content = String(req.body?.content || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'content é obrigatorio' });
    }

    const student = await Student.findById(req.studentId).select('name email parentPhone');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const chat = await ensureChat(teacherId, student);
    const message = await Message.create({
      chat: chat._id,
      sender: {
        type: 'student',
        userId: student._id,
        name: student.name
      },
      content,
      messageType: req.body?.type === 'image' ? 'image' : (req.body?.type === 'file' ? 'file' : 'text'),
      status: 'sent',
      deliveredAt: new Date()
    });

    chat.lastMessage = {
      content: message.content,
      senderName: student.name,
      sentAt: message.createdAt,
      messageType: message.messageType
    };
    chat.totalMessages += 1;
    await chat.save();

    res.json({
      success: true,
      message: mapMessageForPortal(message.toObject(), req.studentId)
    });
  } catch (error) {
    console.error('[StudentPortal] Error sending message:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
  }
});

// POST /api/portal/chat/upload
router.post('/chat/upload', authenticateStudent, upload.single('file'), async (req, res) => {
  try {
    const { teacherId, error } = resolveTeacherId(req);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Arquivo é obrigatório' });
    }

    const student = await Student.findById(req.studentId).select('name email parentPhone');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const chat = await ensureChat(teacherId, student);
    const attachmentType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const message = await Message.create({
      chat: chat._id,
      sender: {
        type: 'student',
        userId: student._id,
        name: student.name
      },
      content: req.file.originalname,
      messageType: attachmentType,
      attachments: [{
        type: attachmentType,
        url: dataUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }],
      status: 'sent',
      deliveredAt: new Date()
    });

    chat.lastMessage = {
      content: req.file.originalname,
      senderName: student.name,
      sentAt: message.createdAt,
      messageType: attachmentType
    };
    chat.totalMessages += 1;
    await chat.save();

    res.json({
      success: true,
      message: mapMessageForPortal(message.toObject(), req.studentId)
    });
  } catch (error) {
    console.error('[StudentPortal] Error uploading attachment:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar arquivo' });
  }
});

// POST /api/portal/chat/mark-read/:messageId
router.post('/chat/mark-read/:messageId', authenticateStudent, async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: 'ID de mensagem invalido' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Mensagem não encontrada' });
    }

    message.status = 'read';
    message.readAt = new Date();
    await message.save();

    res.json({ success: true, message: 'Mensagem marcada como lida' });
  } catch (error) {
    console.error('[StudentPortal] Error marking message as read:', error);
    res.status(500).json({ success: false, message: 'Erro ao marcar mensagem como lida' });
  }
});

export default router;
