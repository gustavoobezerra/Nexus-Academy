import { AutomationRule, AutomationSequence, AutomationLog } from '../models/Automation.js';
import { Notification, NotificationTemplate } from '../models/Notification.js';
import emailService from './emailService.js';
import whatsappService from './whatsappService.js';
import cacheService from './cacheService.js';

class AutomationEngine {
  constructor() {
    this.isRunning = false;
    this.scheduledJobs = new Map();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.info('🤖 Automation Engine started');

    // Start scheduled checks
    this.scheduleChecks();
  }

  stop() {
    this.isRunning = false;
    this.scheduledJobs.forEach((job, key) => clearInterval(job));
    this.scheduledJobs.clear();
    // DEBUG: console.log('🤖 Automation Engine stopped');
  }

  scheduleChecks() {
    // Check every minute for time-based triggers
    this.scheduledJobs.set('minuteCheck', setInterval(() => this.checkScheduledTriggers(), 60000));

    // Check every hour for daily triggers
    this.scheduledJobs.set('hourCheck', setInterval(() => this.checkDailyTriggers(), 3600000));
  }

  async checkScheduledTriggers() {
    if (!this.isRunning) return;

    try {
      const rules = await AutomationRule.find({
        enabled: true,
        'trigger.type': { $in: ['class_starting_soon', 'payment_due_soon', 'schedule'] }
      });

      for (const rule of rules) {
        await this.processScheduledRule(rule);
      }
    } catch (error) {
      console.error('Automation check error:', error);
    }
  }

  async checkDailyTriggers() {
    if (!this.isRunning) return;

    try {
      // Birthday check
      await this.checkBirthdays();

      // Inactive students check
      await this.checkInactiveStudents();

      // Overdue payments check
      await this.checkOverduePayments();
    } catch (error) {
      console.error('Daily automation check error:', error);
    }
  }

  async processScheduledRule(rule) {
    // Implementation for scheduled rule processing
  }

  async checkBirthdays() {
    // Find students with birthdays today and trigger notifications
  }

  async checkInactiveStudents() {
    // Find inactive students and trigger alerts
  }

  async checkOverduePayments() {
    // Find overdue payments and trigger reminders
  }

  // Main trigger fire method
  async fireTrigger(trigger, entityType, entityId, metadata = {}, teacherId) {
    try {
      // Find matching rules
      const rules = await AutomationRule.find({
        teacher: teacherId,
        enabled: true,
        'trigger.type': trigger
      });

      const results = [];

      for (const rule of rules) {
        // Check conditions
        if (!this.checkConditions(rule.conditions, metadata)) continue;

        // Execute actions
        const actionResults = await this.executeActions(rule.actions, metadata, teacherId);

        // Log execution
        await AutomationLog.create({
          rule: rule._id,
          teacher: teacherId,
          trigger,
          entityType,
          entityId,
          actions: actionResults,
          status: actionResults.every(r => r.status === 'success') ? 'success' : 'partial',
          metadata
        });

        // Update rule stats
        rule.lastTriggered = new Date();
        rule.triggerCount += 1;
        await rule.save();

        results.push({ ruleId: rule._id, ruleName: rule.name, actions: actionResults });
      }

      return results;
    } catch (error) {
      console.error('Trigger fire error:', error);
      throw error;
    }
  }

  checkConditions(conditions, data) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'equals': return value === condition.value;
        case 'not_equals': return value !== condition.value;
        case 'contains': return String(value).includes(condition.value);
        case 'greater_than': return value > condition.value;
        case 'less_than': return value < condition.value;
        case 'is_empty': return !value || value === '';
        case 'is_not_empty': return value && value !== '';
        default: return true;
      }
    });
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  async executeActions(actions, metadata, teacherId) {
    const results = [];

    for (const action of actions) {
      try {
        let result;

        switch (action.type) {
          case 'send_email':
            result = await this.sendEmailAction(action.config, metadata, teacherId);
            break;
          case 'send_whatsapp':
            result = await this.sendWhatsAppAction(action.config, metadata, teacherId);
            break;
          case 'send_sms':
            result = await this.sendSMSAction(action.config, metadata, teacherId);
            break;
          case 'send_push':
            result = await this.sendPushAction(action.config, metadata, teacherId);
            break;
          case 'send_in_app':
            result = await this.sendInAppAction(action.config, metadata, teacherId);
            break;
          case 'create_task':
            result = await this.createTaskAction(action.config, metadata, teacherId);
            break;
          case 'webhook':
            result = await this.webhookAction(action.config, metadata);
            break;
          case 'delay':
            await this.delay(action.config.delayMinutes * 60000);
            result = { delayed: action.config.delayMinutes };
            break;
          default:
            result = { skipped: true };
        }

        results.push({ type: action.type, status: 'success', result, executedAt: new Date() });
      } catch (error) {
        results.push({ type: action.type, status: 'failed', error: error.message, executedAt: new Date() });
      }
    }

    return results;
  }

  async sendEmailAction(config, metadata, teacherId) {
    const template = await NotificationTemplate.findById(config.template);
    const body = this.renderTemplate(template?.body || config.body, metadata);
    const subject = this.renderTemplate(template?.subject || config.subject, metadata);

    const recipient = this.getRecipient(config.recipient, metadata);

    await emailService.sendEmail({ to: recipient, subject, html: body });

    await this.logNotification(teacherId, 'email', recipient, subject, body, metadata);

    return { sent: true, to: recipient };
  }

  async sendWhatsAppAction(config, metadata, teacherId) {
    const template = await NotificationTemplate.findById(config.template);
    const body = this.renderTemplate(template?.body || config.body, metadata);

    const recipient = this.getRecipientPhone(config.recipient, metadata);

    await whatsappService.sendMessage(recipient, body);

    await this.logNotification(teacherId, 'whatsapp', recipient, null, body, metadata);

    return { sent: true, to: recipient };
  }

  async sendSMSAction(config, metadata, teacherId) {
    // SMS implementation
    // DEBUG: console.log('[SMS Mock]', config, metadata);
    return { sent: true, mock: true };
  }

  async sendPushAction(config, metadata, teacherId) {
    // Push notification implementation
    // DEBUG: console.log('[Push Mock]', config, metadata);
    return { sent: true, mock: true };
  }

  async sendInAppAction(config, metadata, teacherId) {
    const body = this.renderTemplate(config.body, metadata);

    await Notification.create({
      teacher: teacherId,
      recipientType: config.recipient,
      recipientId: metadata.studentId || metadata.recipientId,
      channel: 'in_app',
      body,
      status: 'sent',
      sentAt: new Date()
    });

    return { created: true };
  }

  async createTaskAction(config, metadata, teacherId) {
    // Task creation implementation
    return { created: true };
  }

  async webhookAction(config, metadata) {
    const axios = (await import('axios')).default;
    const response = await axios({
      method: config.webhookMethod || 'POST',
      url: config.webhookUrl,
      data: { ...metadata, ...config.customData },
      timeout: 10000
    });
    return { statusCode: response.status };
  }

  async logNotification(teacherId, channel, recipient, subject, body, metadata) {
    await Notification.create({
      teacher: teacherId,
      recipientType: metadata.recipientType || 'student',
      recipientId: metadata.studentId,
      recipientContact: recipient,
      channel,
      subject,
      body,
      status: 'sent',
      sentAt: new Date(),
      entityType: metadata.entityType,
      entityId: metadata.entityId
    });
  }

  renderTemplate(template, data) {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }

  getRecipient(type, metadata) {
    switch (type) {
      case 'student': return metadata.studentEmail;
      case 'parent': return metadata.parentEmail;
      case 'teacher': return metadata.teacherEmail;
      default: return metadata.email || metadata.parentEmail;
    }
  }

  getRecipientPhone(type, metadata) {
    switch (type) {
      case 'student': return metadata.studentPhone;
      case 'parent': return metadata.parentPhone;
      case 'teacher': return metadata.teacherPhone;
      default: return metadata.phone || metadata.parentPhone;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sequence management
  async enrollInSequence(sequenceId, studentId) {
    const sequence = await AutomationSequence.findById(sequenceId);
    if (!sequence || sequence.status !== 'active') return null;

    sequence.activeEnrollees.push({
      student: studentId,
      enrolledAt: new Date(),
      currentStep: 0,
      nextStepAt: new Date(),
      status: 'active'
    });

    sequence.totalEnrolled += 1;
    await sequence.save();

    return sequence;
  }

  async processSequenceStep(sequence, enrollee) {
    const step = sequence.steps[enrollee.currentStep];
    if (!step) {
      enrollee.status = 'completed';
      sequence.totalCompleted += 1;
      await sequence.save();
      return;
    }

    // Process based on step type
    // ... implementation
  }
}

export const automationEngine = new AutomationEngine();
export default automationEngine;
