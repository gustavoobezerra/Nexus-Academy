import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    enum: ['User', 'Student']
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Auth actions
      'login', 'logout', 'register', 'password_change',
      // Student actions
      'student_create', 'student_update', 'student_delete',
      // Class actions
      'class_create', 'class_update', 'class_delete', 'class_attend',
      // Payment actions
      'payment_create', 'payment_update', 'payment_refund',
      // Pronunciation actions
      'pronunciation_test', 'pronunciation_phrase_create',
      // Game actions
      'game_create', 'game_join', 'game_complete',
      // Settings actions
      'settings_update', 'integration_connect', 'integration_disconnect',
      // Data export
      'data_export', 'report_generate',
      // Security
      'permission_change', 'access_denied'
    ],
    index: true
  },
  resource: {
    type: String,
    enum: ['student', 'class', 'payment', 'pronunciation', 'game', 'user', 'settings', 'report', 'integration'],
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success',
    index: true
  },
  errorMessage: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound indexes for efficient queries
auditLogSchema.index({ teacher: 1, timestamp: -1 });
auditLogSchema.index({ teacher: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ teacher: 1, user: 1, timestamp: -1 });
auditLogSchema.index({ teacher: 1, resource: 1, resourceId: 1 });

// TTL index - auto-delete logs older than 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log action
auditLogSchema.statics.log = async function(data) {
  try {
    const log = await this.create({
      teacher: data.teacherId,
      user: data.userId || null,
      userModel: data.userModel || 'User',
      action: data.action,
      resource: data.resource || null,
      resourceId: data.resourceId || null,
      details: data.details || {},
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      status: data.status || 'success',
      errorMessage: data.errorMessage || null
    });

    return log;
  } catch (error) {
    // Fail silently - don't break main operation
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Static method to query logs with filters
auditLogSchema.statics.query = async function(filters, options = {}) {
  const {
    teacherId,
    userId,
    action,
    resource,
    status,
    startDate,
    endDate,
    limit = 50,
    skip = 0
  } = { ...filters, ...options };

  const query = {};

  if (teacherId) query.teacher = teacherId;
  if (userId) query.user = userId;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const logs = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .populate('user', 'name email')
    .lean();

  const total = await this.countDocuments(query);

  return {
    logs,
    total,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

// Static method to get activity summary
auditLogSchema.statics.getActivitySummary = async function(teacherId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        teacher: new mongoose.Types.ObjectId(teacherId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        total: { $sum: '$count' },
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);

  return summary;
};

// Static method to detect suspicious activity
auditLogSchema.statics.detectSuspiciousActivity = async function(teacherId, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  // Check for multiple failed login attempts
  const failedLogins = await this.countDocuments({
    teacher: teacherId,
    action: 'login',
    status: 'failure',
    timestamp: { $gte: startDate }
  });

  // Check for unusual access patterns
  const accessDenied = await this.countDocuments({
    teacher: teacherId,
    action: 'access_denied',
    timestamp: { $gte: startDate }
  });

  // Check for rapid data exports
  const dataExports = await this.countDocuments({
    teacher: teacherId,
    action: 'data_export',
    timestamp: { $gte: startDate }
  });

  const alerts = [];

  if (failedLogins > 5) {
    alerts.push({
      type: 'security',
      severity: 'high',
      message: `${failedLogins} failed login attempts in last ${hours} hours`,
      action: 'Consider resetting password or enabling 2FA'
    });
  }

  if (accessDenied > 10) {
    alerts.push({
      type: 'security',
      severity: 'medium',
      message: `${accessDenied} access denied events in last ${hours} hours`,
      action: 'Review user permissions and access patterns'
    });
  }

  if (dataExports > 3) {
    alerts.push({
      type: 'data',
      severity: 'medium',
      message: `${dataExports} data exports in last ${hours} hours`,
      action: 'Verify these exports were authorized'
    });
  }

  return {
    suspicious: alerts.length > 0,
    alerts,
    period: `${hours} hours`,
    checkedAt: new Date()
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
