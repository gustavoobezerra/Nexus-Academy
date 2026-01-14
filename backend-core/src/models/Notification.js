import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

// Notification Template Schema
const notificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Type
  type: { type: String, required: true, enum: ['class_reminder', 'payment_reminder', 'payment_overdue', 'birthday', 'welcome', 'feedback', 'report', 'custom'] },
  channel: { type: String, required: true, enum: ['email', 'whatsapp', 'sms', 'push', 'in_app'] },

  // Content
  subject: { type: String, trim: true }, // For email
  body: { type: String, required: true },
  htmlBody: String, // For email
  mediaUrl: String, // For WhatsApp/SMS

  // Variables
  variables: [{ name: String, description: String, example: String }],

  // Settings
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  category: String,
  tags: [String]
}, { timestamps: true });

// Notification Schema
const notificationSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate' },

  // Recipient
  recipientType: { type: String, enum: ['student', 'parent', 'teacher'], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId },
  recipientName: String,
  recipientContact: String, // email, phone, etc.

  // Content
  channel: { type: String, required: true, enum: ['email', 'whatsapp', 'sms', 'push', 'in_app'] },
  subject: String,
  body: { type: String, required: true },
  htmlBody: String,
  mediaUrl: String,

  // Scheduling
  scheduledFor: Date,
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,

  // Status
  status: { type: String, enum: ['pending', 'scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled'], default: 'pending' },
  errorMessage: String,
  retryCount: { type: Number, default: 0 },

  // Provider response
  providerMessageId: String,
  providerResponse: mongoose.Schema.Types.Mixed,

  // Related entity
  entityType: { type: String, enum: ['class', 'payment', 'student', 'course', 'system'] },
  entityId: { type: mongoose.Schema.Types.ObjectId },

  // Automation
  automationRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule' },
  automationSequenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationSequence' }
}, { timestamps: true });

// User Notification Preferences
const notificationPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  email: {
    enabled: { type: Boolean, default: true },
    classReminders: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false }
  },
  whatsapp: {
    enabled: { type: Boolean, default: true },
    classReminders: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true }
  },
  sms: {
    enabled: { type: Boolean, default: false },
    urgentOnly: { type: Boolean, default: true }
  },
  push: {
    enabled: { type: Boolean, default: true },
    all: { type: Boolean, default: true }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' },
    end: { type: String, default: '08:00' }
  }
}, { timestamps: true });

notificationTemplateSchema.index({ teacher: 1 });
notificationTemplateSchema.index({ type: 1 });
notificationTemplateSchema.index({ channel: 1 });

notificationSchema.index({ teacher: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipientId: 1 });

notificationTemplateSchema.plugin(tenantAwarePlugin);
notificationSchema.plugin(tenantAwarePlugin);
notificationPreferenceSchema.plugin(tenantAwarePlugin);

export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);
