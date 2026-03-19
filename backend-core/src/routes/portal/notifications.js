import express from 'express';
import { Notification } from '../../models/Notification.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';

const router = express.Router();

/**
 * Lista notificacoes in-app do aluno. Nesta rodada elas sao usadas para
 * expor convites do jogo da forca no dashboard do portal.
 */
router.get('/notifications', authenticateStudent, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const notifications = await Notification.find({
      recipientType: 'student',
      recipientId: req.studentId,
      channel: 'in_app'
    })
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(Number(limit) || 20, 50)))
      .lean();

    const unreadCount = notifications.filter((notification) => !notification.readAt).length;

    res.json({
      success: true,
      notifications: notifications.map((notification) => ({
        id: notification._id.toString(),
        title: notification.subject || 'Notificacao',
        message: notification.body,
        status: notification.status,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        entityType: notification.entityType || 'system',
        gameId: notification.providerResponse?.gameId || notification.entityId?.toString?.() || null,
        route: notification.providerResponse?.route || null,
        invitedBy: notification.providerResponse?.invitedBy || null,
        category: notification.providerResponse?.category || null,
        hint: notification.providerResponse?.hint || null,
        turnDurationSeconds: notification.providerResponse?.turnDurationSeconds || null,
        kind: notification.providerResponse?.type || 'system'
      })),
      unreadCount
    });
  } catch (error) {
    console.error('Get portal notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notificacoes do portal'
    });
  }
});

router.put('/notifications/:id/read', authenticateStudent, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientType: 'student',
        recipientId: req.studentId,
        channel: 'in_app'
      },
      {
        status: 'read',
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificacao nao encontrada'
      });
    }

    return res.json({
      success: true,
      message: 'Notificacao marcada como lida'
    });
  } catch (error) {
    console.error('Read portal notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar notificacao'
    });
  }
});

export default router;
