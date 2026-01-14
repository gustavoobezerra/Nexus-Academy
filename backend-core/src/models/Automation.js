import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

// Automation Rule Schema
const automationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Trigger
  trigger: {
    type: { type: String, required: true, enum: [
      'class_scheduled', 'class_starting_soon', 'class_started', 'class_ended', 'class_cancelled', 'class_no_show',
      'payment_created', 'payment_due_soon', 'payment_overdue', 'payment_received', 'payment_failed',
      'student_created', 'student_birthday', 'student_inactive', 'student_milestone',
      'course_enrolled', 'course_progress', 'course_completed',
      'homework_assigned', 'homework_due', 'homework_submitted',
      'schedule', 'manual'
    ]},
    config: {
      minutesBefore: Number,
      minutesAfter: Number,
      daysBefore: Number,
      daysAfter: Number,
      inactiveDays: Number,
      progressThreshold: Number,
      schedule: String, // cron expression
      timezone: { type: String, default: 'America/Sao_Paulo' }
    }
  },

  // Conditions
  conditions: [{
    field: String,
    operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'] },
    value: mongoose.Schema.Types.Mixed
  }],

  // Actions
  actions: [{
    type: { type: String, required: true, enum: [
      'send_email', 'send_whatsapp', 'send_sms', 'send_push', 'send_in_app',
      'create_task', 'update_student', 'update_payment', 'create_invoice',
      'generate_lesson_plan', 'generate_summary', 'generate_exercises',
      'sync_calendar', 'create_zoom_meeting',
      'webhook', 'delay'
    ]},
    config: {
      template: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate' },
      templateId: String,
      recipient: { type: String, enum: ['student', 'parent', 'teacher', 'custom'] },
      customRecipient: String,
      delayMinutes: Number,
      webhookUrl: String,
      webhookMethod: { type: String, enum: ['GET', 'POST', 'PUT'], default: 'POST' },
      customData: mongoose.Schema.Types.Mixed
    }
  }],

  // Status
  enabled: { type: Boolean, default: true },
  lastTriggered: Date,
  triggerCount: { type: Number, default: 0 },
  lastError: String,
  errorCount: { type: Number, default: 0 }
}, { timestamps: true });

// Automation Sequence Schema (for multi-step campaigns)
const automationSequenceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Entry trigger
  entryTrigger: {
    type: { type: String, required: true, enum: ['student_created', 'course_enrolled', 'manual', 'tag_added'] },
    config: mongoose.Schema.Types.Mixed
  },

  // Steps
  steps: [{
    order: { type: Number, required: true },
    type: { type: String, enum: ['action', 'delay', 'condition', 'split'] },
    delayAmount: Number,
    delayUnit: { type: String, enum: ['minutes', 'hours', 'days'] },
    action: {
      type: { type: String, enum: ['send_email', 'send_whatsapp', 'send_sms', 'send_push', 'update_tag', 'assign_to_course'] },
      template: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate' },
      config: mongoose.Schema.Types.Mixed
    },
    condition: {
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
      trueNextStep: Number,
      falseNextStep: Number
    }
  }],

  // Exit conditions
  exitConditions: [{
    type: { type: String, enum: ['completed_course', 'tag_removed', 'unsubscribed', 'manual'] },
    config: mongoose.Schema.Types.Mixed
  }],

  // Enrollees
  activeEnrollees: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    enrolledAt: Date,
    currentStep: { type: Number, default: 0 },
    nextStepAt: Date,
    status: { type: String, enum: ['active', 'completed', 'paused', 'exited'], default: 'active' },
    history: [{ step: Number, executedAt: Date, result: String }]
  }],

  // Status
  status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
  totalEnrolled: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 }
}, { timestamps: true });

// Automation Log Schema
const automationLogSchema = new mongoose.Schema({
  rule: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule' },
  sequence: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationSequence' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trigger: { type: String, required: true },
  entityType: { type: String, enum: ['student', 'class', 'payment', 'course'] },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  actions: [{ type: String, status: { type: String, enum: ['success', 'failed', 'pending'] }, error: String, executedAt: Date }],
  status: { type: String, enum: ['success', 'partial', 'failed'], default: 'success' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

automationRuleSchema.index({ teacher: 1 });
automationRuleSchema.index({ enabled: 1 });
automationRuleSchema.index({ 'trigger.type': 1 });

automationSequenceSchema.index({ teacher: 1 });
automationSequenceSchema.index({ status: 1 });

automationLogSchema.index({ teacher: 1 });
automationLogSchema.index({ createdAt: -1 });
automationLogSchema.index({ rule: 1 });

automationRuleSchema.plugin(tenantAwarePlugin);
automationSequenceSchema.plugin(tenantAwarePlugin);
automationLogSchema.plugin(tenantAwarePlugin);

export const AutomationRule = mongoose.model('AutomationRule', automationRuleSchema);
export const AutomationSequence = mongoose.model('AutomationSequence', automationSequenceSchema);
export const AutomationLog = mongoose.model('AutomationLog', automationLogSchema);
