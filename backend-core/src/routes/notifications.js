import express from 'express';
import { Notification } from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

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
      notifications: notifications.map(n => ({
        id: n._id,
        type: n.entityType || 'system',
        priority: n.entityType === 'student' ? 'medium' : 'low',
        title: n.subject,
        message: n.body,
        entityType: n.entityType || 'system',
        entityId: n.entityId?.toString() || '',
        entityName: n.recipientName || '',
        status: n.status,
        createdAt: n.createdAt,
        readAt: n.readAt
      })),
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

