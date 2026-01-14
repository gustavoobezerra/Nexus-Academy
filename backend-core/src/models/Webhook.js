import mongoose from 'mongoose';
import crypto from 'crypto';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const webhookSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Endpoint
  url: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH'], default: 'POST' },
  headers: mongoose.Schema.Types.Mixed,

  // Authentication
  secret: { type: String, select: false },
  authType: { type: String, enum: ['none', 'basic', 'bearer', 'hmac'], default: 'hmac' },
  authCredentials: { type: mongoose.Schema.Types.Mixed, select: false },

  // Events
  events: [{ type: String, enum: [
    'student.created', 'student.updated', 'student.deleted',
    'class.created', 'class.started', 'class.ended', 'class.cancelled',
    'payment.created', 'payment.received', 'payment.failed', 'payment.overdue',
    'course.enrolled', 'course.completed',
    'automation.triggered', 'report.generated'
  ]}],

  // Status
  enabled: { type: Boolean, default: true },
  lastTriggered: Date,
  lastResponse: { statusCode: Number, body: String, headers: mongoose.Schema.Types.Mixed },
  lastError: String,

  // Statistics
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },

  // Retry config
  retryEnabled: { type: Boolean, default: true },
  maxRetries: { type: Number, default: 3 },
  retryDelay: { type: Number, default: 60 } // seconds
}, { timestamps: true });

// Webhook Delivery Log
const webhookDeliverySchema = new mongoose.Schema({
  webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true },
  event: { type: String, required: true },
  payload: mongoose.Schema.Types.Mixed,

  // Request
  requestUrl: String,
  requestHeaders: mongoose.Schema.Types.Mixed,
  requestBody: String,

  // Response
  responseStatusCode: Number,
  responseHeaders: mongoose.Schema.Types.Mixed,
  responseBody: String,
  responseTime: Number, // ms

  // Status
  status: { type: String, enum: ['pending', 'success', 'failed', 'retrying'], default: 'pending' },
  attempt: { type: Number, default: 1 },
  error: String,
  nextRetryAt: Date
}, { timestamps: true });

webhookSchema.index({ teacher: 1 });
webhookSchema.index({ enabled: 1 });
webhookSchema.index({ events: 1 });

webhookDeliverySchema.index({ webhook: 1 });
webhookDeliverySchema.index({ status: 1 });
webhookDeliverySchema.index({ createdAt: -1 });

// Generate secret on creation
webhookSchema.pre('save', function(next) {
  if (!this.secret) {
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Method to sign payload
webhookSchema.methods.signPayload = function(payload) {
  const signature = crypto
    .createHmac('sha256', this.secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return `sha256=${signature}`;
};

webhookSchema.plugin(tenantAwarePlugin);
webhookDeliverySchema.plugin(tenantAwarePlugin);

export const Webhook = mongoose.model('Webhook', webhookSchema);
export const WebhookDelivery = mongoose.model('WebhookDelivery', webhookDeliverySchema);
