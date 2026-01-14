import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const reportSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Type
  type: { type: String, required: true, enum: [
    'financial_summary', 'financial_detailed', 'revenue_forecast',
    'student_performance', 'student_engagement', 'student_churn',
    'class_summary', 'class_attendance',
    'course_progress', 'course_completion',
    'custom'
  ]},

  // Filters
  filters: {
    dateRange: { start: Date, end: Date },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    subjects: [String],
    status: [String],
    custom: mongoose.Schema.Types.Mixed
  },

  // Schedule (for recurring reports)
  schedule: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'] },
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    time: String, // HH:mm
    timezone: { type: String, default: 'America/Sao_Paulo' },
    lastRun: Date,
    nextRun: Date
  },

  // Delivery
  delivery: {
    email: { enabled: { type: Boolean, default: false }, recipients: [String] },
    webhook: { enabled: { type: Boolean, default: false }, url: String }
  },

  // Output
  format: { type: String, enum: ['pdf', 'excel', 'csv', 'json'], default: 'pdf' },
  templateId: String,
  customTemplate: String,

  // Generated reports
  generations: [{
    generatedAt: { type: Date, default: Date.now },
    fileUrl: String,
    fileSize: Number,
    status: { type: String, enum: ['pending', 'generating', 'completed', 'failed'], default: 'pending' },
    error: String,
    metadata: mongoose.Schema.Types.Mixed
  }],

  // Status
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Saved Dashboard Configuration
const dashboardConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDefault: { type: Boolean, default: false },

  // Layout
  layout: [{
    widgetId: { type: String, required: true },
    type: { type: String, required: true, enum: [
      'stat_card', 'line_chart', 'bar_chart', 'pie_chart', 'table', 'calendar', 'list', 'gauge', 'heatmap'
    ]},
    title: String,
    position: { x: Number, y: Number, w: Number, h: Number },
    config: {
      metric: String,
      timeRange: { type: String, enum: ['today', 'week', 'month', 'quarter', 'year', 'custom'] },
      filters: mongoose.Schema.Types.Mixed,
      colors: [String],
      showLegend: Boolean,
      showLabels: Boolean
    }
  }],

  // Filters
  globalFilters: {
    dateRange: { start: Date, end: Date },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    compareWith: { type: String, enum: ['previous_period', 'previous_year', 'none'], default: 'none' }
  },

  // Sharing
  isShared: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Analytics Snapshot (for historical data)
const analyticsSnapshotSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },

  // Financial
  financial: {
    revenue: Number,
    expectedRevenue: Number,
    paymentRate: Number,
    overdueAmount: Number,
    averageTicket: Number
  },

  // Students
  students: {
    total: Number,
    active: Number,
    new: Number,
    churned: Number,
    churnRate: Number
  },

  // Classes
  classes: {
    total: Number,
    completed: Number,
    cancelled: Number,
    noShow: Number,
    totalHours: Number,
    occupancyRate: Number
  },

  // Engagement
  engagement: {
    averageAttendance: Number,
    averageRating: Number,
    homeworkCompletionRate: Number
  },

  // Predictions
  predictions: {
    nextMonthRevenue: Number,
    churnRisk: [{ studentId: mongoose.Schema.Types.ObjectId, riskScore: Number }],
    growthRate: Number
  }
}, { timestamps: true });

reportSchema.index({ teacher: 1 });
reportSchema.index({ type: 1 });
reportSchema.index({ 'schedule.enabled': 1 });
reportSchema.index({ 'schedule.nextRun': 1 });

dashboardConfigSchema.index({ teacher: 1 });
dashboardConfigSchema.index({ isDefault: 1 });

analyticsSnapshotSchema.index({ teacher: 1, date: -1 });
analyticsSnapshotSchema.index({ teacher: 1, type: 1 });

reportSchema.plugin(tenantAwarePlugin);
dashboardConfigSchema.plugin(tenantAwarePlugin);
analyticsSnapshotSchema.plugin(tenantAwarePlugin);

export const Report = mongoose.model('Report', reportSchema);
export const DashboardConfig = mongoose.model('DashboardConfig', dashboardConfigSchema);
export const AnalyticsSnapshot = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
