import express from 'express';
import { Webhook, WebhookDelivery } from '../models/Webhook.js';
import { protect } from '../middleware/auth.js';
import { handleStripeWebhook } from '../controllers/webhookController.js';
import axios from 'axios';

const router = express.Router();

// ===== STRIPE WEBHOOK =====
// IMPORTANTE: Esta rota NÃO usa middleware de autenticação
// O Stripe envia requests diretamente, sem token
// A verificação é feita pela assinatura do webhook
// O express.raw já está configurado no server.js para esta rota
router.post('/stripe', handleStripeWebhook);

// Get all webhooks
router.get('/', protect, async (req, res) => {
  try {
    const webhooks = await Webhook.find({ teacher: req.user._id });
    res.json({ success: true, webhooks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single webhook
router.get('/:id', protect, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, teacher: req.user._id }).select('+secret');
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });
    res.json({ success: true, webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create webhook
router.post('/', protect, async (req, res) => {
  try {
    const webhook = await Webhook.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update webhook
router.put('/:id', protect, async (req, res) => {
  try {
    const webhook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });
    res.json({ success: true, webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete webhook
router.delete('/:id', protect, async (req, res) => {
  try {
    await Webhook.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Webhook removido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle webhook
router.put('/:id/toggle', protect, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });
    webhook.enabled = !webhook.enabled;
    await webhook.save();
    res.json({ success: true, webhook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test webhook
router.post('/:id/test', protect, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, teacher: req.user._id }).select('+secret');
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: req.body.testData || { message: 'Test webhook from Nexus Academy' }
    };

    const signature = webhook.signPayload(testPayload);
    const startTime = Date.now();

    try {
      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        data: testPayload,
        headers: {
          'Content-Type': 'application/json',
          'X-Nexus-Signature': signature,
          ...webhook.headers
        },
        timeout: 10000
      });

      webhook.lastTriggered = new Date();
      webhook.lastResponse = {
        statusCode: response.status,
        body: JSON.stringify(response.data).substring(0, 1000),
        headers: response.headers
      };
      webhook.successCount += 1;
      webhook.consecutiveFailures = 0;
      await webhook.save();

      await WebhookDelivery.create({
        webhook: webhook._id,
        event: 'test',
        payload: testPayload,
        requestUrl: webhook.url,
        responseStatusCode: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 5000),
        responseTime: Date.now() - startTime,
        status: 'success'
      });

      res.json({ success: true, statusCode: response.status, responseTime: Date.now() - startTime });
    } catch (error) {
      webhook.lastError = error.message;
      webhook.failureCount += 1;
      webhook.consecutiveFailures += 1;
      await webhook.save();

      await WebhookDelivery.create({
        webhook: webhook._id,
        event: 'test',
        payload: testPayload,
        requestUrl: webhook.url,
        status: 'failed',
        error: error.message,
        responseTime: Date.now() - startTime
      });

      res.status(400).json({ success: false, message: 'Webhook test failed', error: error.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get webhook deliveries
router.get('/:id/deliveries', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const webhook = await Webhook.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });

    const deliveries = await WebhookDelivery.find({ webhook: webhook._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WebhookDelivery.countDocuments({ webhook: webhook._id });

    res.json({ success: true, deliveries, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Retry delivery
router.post('/deliveries/:id/retry', protect, async (req, res) => {
  try {
    const delivery = await WebhookDelivery.findById(req.params.id).populate('webhook');
    if (!delivery) return res.status(404).json({ success: false, message: 'Entrega não encontrada' });

    const webhook = delivery.webhook;
    const signature = webhook.signPayload(delivery.payload);
    const startTime = Date.now();

    try {
      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        data: delivery.payload,
        headers: { 'Content-Type': 'application/json', 'X-Nexus-Signature': signature, ...webhook.headers },
        timeout: 10000
      });

      delivery.status = 'success';
      delivery.responseStatusCode = response.status;
      delivery.responseBody = JSON.stringify(response.data).substring(0, 5000);
      delivery.responseTime = Date.now() - startTime;
      delivery.attempt += 1;
      await delivery.save();

      res.json({ success: true, delivery });
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error.message;
      delivery.attempt += 1;
      await delivery.save();

      res.status(400).json({ success: false, message: 'Retry failed', error: error.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Regenerate secret
router.post('/:id/regenerate-secret', protect, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, teacher: req.user._id }).select('+secret');
    if (!webhook) return res.status(404).json({ success: false, message: 'Webhook não encontrado' });

    const crypto = await import('crypto');
    webhook.secret = crypto.default.randomBytes(32).toString('hex');
    await webhook.save();

    res.json({ success: true, secret: webhook.secret });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
