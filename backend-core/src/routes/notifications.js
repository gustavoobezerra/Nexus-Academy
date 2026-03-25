import express from 'express';
import { Notification, NotificationTemplate } from '../models/Notification.js';
import Student from '../models/Student.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

const serializeNotification = (notification) => ({
  id: notification._id?.toString?.() || notification.id,
  type: notification.entityType || 'system',
  priority: notification.entityType === 'student' ? 'medium' : 'low',
  title: notification.subject,
  message: notification.body,
  entityType: notification.entityType || 'system',
  entityId: notification.entityId?.toString() || '',
  entityName: notification.recipientName || '',
  status: notification.status,
  createdAt: notification.createdAt,
  readAt: notification.readAt,
  channel: notification.channel,
  recipientName: notification.recipientName,
  recipientId: notification.recipientId?.toString() || '',
  scheduledFor: notification.scheduledFor,
  route: notification.providerResponse?.route || null
});

const serializeTemplate = (template) => ({
  id: template._id?.toString() || template.id,
  _id: template._id?.toString() || template.id,
  name: template.name,
  description: template.description || '',
  type: template.type,
  channel: template.channel,
  subject: template.subject || '',
  body: template.body,
  variables: Array.isArray(template.variables)
    ? template.variables
      .map((variable) => variable?.name || variable)
      .filter(Boolean)
    : [],
  category: template.category || '',
  active: Boolean(template.isActive),
  isDefault: Boolean(template.isDefault),
  createdAt: template.createdAt,
  updatedAt: template.updatedAt
});

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lista notificações do professor
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, read, all]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de notificações
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'all', limit = 20, page = 1 } = req.query;
    const teacherId = req.user._id;

    const query = { teacher: teacherId };
    
    if (status === 'pending') {
      query.status = { $in: ['pending', 'sent', 'delivered'] };
    } else if (status === 'read') {
      query.status = 'read';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      teacher: teacherId,
      status: { $in: ['pending', 'sent', 'delivered'] }
    });

    res.json({
      success: true,
      notifications: notifications.map(serializeNotification),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notificações'
    });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const templates = await NotificationTemplate.find({ teacher: req.user._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      templates: templates.map(serializeTemplate)
    });
  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar templates de mensagem'
    });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const payload = {
      teacher: req.user._id,
      name: String(req.body?.name || '').trim(),
      description: String(req.body?.description || '').trim(),
      type: req.body?.type || 'custom',
      channel: req.body?.channel || 'in_app',
      subject: String(req.body?.subject || '').trim(),
      body: String(req.body?.body || '').trim(),
      variables: Array.isArray(req.body?.variables)
        ? req.body.variables
          .filter(Boolean)
          .map((variable) => ({
            name: String(variable?.name || variable).trim()
          }))
        : [],
      category: String(req.body?.category || '').trim(),
      isDefault: Boolean(req.body?.isDefault),
      isActive: req.body?.active !== undefined ? Boolean(req.body.active) : true
    };

    if (!payload.name || !payload.body) {
      return res.status(400).json({
        success: false,
        message: 'Nome e corpo do template são obrigatórios'
      });
    }

    const template = await NotificationTemplate.create(payload);

    return res.status(201).json({
      success: true,
      template: serializeTemplate(template)
    });
  } catch (error) {
    console.error('Create notification template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar template de mensagem'
    });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const update = {
      name: req.body?.name !== undefined ? String(req.body.name || '').trim() : undefined,
      description: req.body?.description !== undefined ? String(req.body.description || '').trim() : undefined,
      type: req.body?.type,
      channel: req.body?.channel,
      subject: req.body?.subject !== undefined ? String(req.body.subject || '').trim() : undefined,
      body: req.body?.body !== undefined ? String(req.body.body || '').trim() : undefined,
      variables: Array.isArray(req.body?.variables)
        ? req.body.variables
          .filter(Boolean)
          .map((variable) => ({
            name: String(variable?.name || variable).trim()
          }))
        : undefined,
      category: req.body?.category !== undefined ? String(req.body.category || '').trim() : undefined,
      isActive: req.body?.active !== undefined ? Boolean(req.body.active) : undefined
    };

    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const template = await NotificationTemplate.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      update,
      { new: true }
    ).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    return res.json({
      success: true,
      template: serializeTemplate(template)
    });
  } catch (error) {
    console.error('Update notification template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar template de mensagem'
    });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await NotificationTemplate.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }

    return res.json({
      success: true,
      message: 'Template removido com sucesso'
    });
  } catch (error) {
    console.error('Delete notification template error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao remover template de mensagem'
    });
  }
});

router.post('/send', async (req, res) => {
  try {
    const {
      recipientId,
      title,
      message,
      channel = 'in_app',
      type = 'custom',
      scheduledFor,
      subject = '',
      route
    } = req.body || {};

    if (!recipientId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Aluno, título e mensagem são obrigatórios'
      });
    }

    const student = await Student.findOne({
      _id: recipientId,
      teacher: req.user._id,
      active: true
    }).select('name email parentName parentEmail').lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Aluno não encontrado para envio'
      });
    }

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    const isFutureSchedule = Boolean(scheduledDate && !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now());
    const normalizedChannel = ['email', 'whatsapp', 'sms', 'push', 'in_app'].includes(channel)
      ? channel
      : 'in_app';
    const normalizedType = [
      'class_reminder',
      'payment_reminder',
      'payment_overdue',
      'birthday',
      'welcome',
      'feedback',
      'report',
      'custom'
    ].includes(type)
      ? type
      : 'custom';

    const notification = await Notification.create({
      teacher: req.user._id,
      recipientType: 'student',
      recipientId: student._id,
      recipientName: student.name,
      recipientContact: normalizedChannel === 'email' ? student.email : '',
      channel: normalizedChannel,
      subject: String(subject || title).trim(),
      body: String(message).trim(),
      scheduledFor: isFutureSchedule ? scheduledDate : null,
      sentAt: isFutureSchedule ? null : new Date(),
      deliveredAt: normalizedChannel === 'in_app' && !isFutureSchedule ? new Date() : null,
      status: isFutureSchedule ? 'scheduled' : (normalizedChannel === 'in_app' ? 'delivered' : 'pending'),
      entityType: 'system',
      providerResponse: {
        type: 'teacher_message',
        templateType: normalizedType,
        route: route || '/portal/dashboard'
      }
    });

    return res.status(201).json({
      success: true,
      notification: serializeNotification(notification)
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao agendar mensagem'
    });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Obtém contagem de notificações não lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contagem de não lidas
 */
router.get('/unread-count', async (req, res) => {
  try {
    const teacherId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      teacher: teacherId,
      status: { $in: ['pending', 'sent', 'delivered'] }
    });

    res.json({
      success: true,
      count: unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao contar notificações'
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marca notificação como lida
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificação marcada como lida
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, teacher: teacherId },
      { 
        status: 'read',
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao marcar notificação'
    });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Marca todas as notificações como lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas as notificações marcadas como lidas
 */
router.put('/read-all', async (req, res) => {
  try {
    const teacherId = req.user._id;

    const result = await Notification.updateMany(
      { 
        teacher: teacherId,
        status: { $in: ['pending', 'sent', 'delivered'] }
      },
      { 
        status: 'read',
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notificações marcadas como lidas`
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao marcar notificações'
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Deleta uma notificação
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificação deletada
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      teacher: teacherId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificação deletada'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar notificação'
    });
  }
});

export default router;

