import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

/**
 * GET /api/audit-logs
 * Query audit logs with filters
 */
router.get('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const {
      action,
      resource,
      status,
      startDate,
      endDate,
      limit,
      page
    } = req.query;

    const skip = page ? (parseInt(page) - 1) * (limit || 50) : 0;

    const result = await AuditLog.query(
      {
        teacherId,
        action,
        resource,
        status,
        startDate,
        endDate
      },
      {
        limit: limit || 50,
        skip
      }
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching audit logs'
    });
  }
});

/**
 * GET /api/audit-logs/summary
 * Get activity summary
 */
router.get('/summary', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { days = 30 } = req.query;

    const summary = await AuditLog.getActivitySummary(teacherId, parseInt(days));

    return res.json({
      success: true,
      data: summary,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching audit summary'
    });
  }
});

/**
 * GET /api/audit-logs/security-alerts
 * Check for suspicious activity
 */
router.get('/security-alerts', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { hours = 24 } = req.query;

    const alerts = await AuditLog.detectSuspiciousActivity(teacherId, parseInt(hours));

    return res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error checking security alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking security alerts'
    });
  }
});

/**
 * GET /api/audit-logs/user/:userId
 * Get logs for specific user
 */
router.get('/user/:userId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const result = await AuditLog.query(
      {
        teacherId,
        userId
      },
      {
        limit: parseInt(limit),
        skip
      }
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user audit logs'
    });
  }
});

/**
 * GET /api/audit-logs/resource/:resource/:resourceId
 * Get logs for specific resource
 */
router.get('/resource/:resource/:resourceId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { resource, resourceId } = req.params;

    const logs = await AuditLog.find({
      teacher: teacherId,
      resource,
      resourceId
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('user', 'name email')
      .lean();

    return res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching resource audit logs'
    });
  }
});

export default router;
