/**
 * Audit Logging Middleware
 * Automatically logs sensitive actions for compliance and security
 */

import AuditLog from '../models/AuditLog.js';

/**
 * Extract IP address from request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Middleware to audit specific actions
 * Usage: router.post('/path', auditAction('action_name', 'resource'), handler)
 */
export function auditAction(action, resource = null) {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function(body) {
      // Log after successful response
      setImmediate(async () => {
        try {
          const teacherId = req.user?._id || req.teacherId;
          const userId = req.user?._id || req.studentId;
          const userModel = req.studentId ? 'Student' : 'User';

          if (!teacherId) {
            return; // Skip if no teacher context
          }

          const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';

          await AuditLog.log({
            teacherId,
            userId,
            userModel,
            action,
            resource,
            resourceId: req.params.id || req.params.studentId || req.body.id || null,
            details: {
              method: req.method,
              path: req.path,
              query: req.query,
              statusCode: res.statusCode
            },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status,
            errorMessage: status === 'failure' ? body.message : null
          });
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Log authentication events
 */
export async function logAuthEvent(req, action, status = 'success', userId = null) {
  try {
    await AuditLog.log({
      teacherId: req.user?._id || userId,
      userId,
      userModel: 'User',
      action,
      resource: 'user',
      details: {
        method: req.method,
        path: req.path
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      status,
      errorMessage: status === 'failure' ? 'Authentication failed' : null
    });
  } catch (error) {
    console.error('Auth audit logging error:', error);
  }
}

/**
 * Log data export events (critical for compliance)
 */
export async function logDataExport(teacherId, userId, exportType, details = {}) {
  try {
    await AuditLog.log({
      teacherId,
      userId,
      userModel: 'User',
      action: 'data_export',
      resource: 'report',
      details: {
        exportType,
        ...details
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Data export audit logging error:', error);
  }
}

/**
 * Log access denied events (security monitoring)
 */
export async function logAccessDenied(req, reason) {
  try {
    await AuditLog.log({
      teacherId: req.user?._id || req.teacherId,
      userId: req.user?._id || req.studentId,
      userModel: req.studentId ? 'Student' : 'User',
      action: 'access_denied',
      resource: null,
      details: {
        method: req.method,
        path: req.path,
        reason
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      status: 'warning'
    });
  } catch (error) {
    console.error('Access denied audit logging error:', error);
  }
}

export default {
  auditAction,
  logAuthEvent,
  logDataExport,
  logAccessDenied
};
