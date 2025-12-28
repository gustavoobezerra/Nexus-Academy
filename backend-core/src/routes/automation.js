import express from 'express';
import { AutomationRule, AutomationSequence, AutomationLog } from '../models/Automation.js';
import { NotificationTemplate } from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import automationEngine from '../services/automationEngine.js';

const router = express.Router();

// ========== AUTOMATION RULES ==========

// Get all rules
router.get('/rules', protect, async (req, res) => {
  try {
    const rules = await AutomationRule.find({ teacher: req.user._id });
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single rule
router.get('/rules/:id', protect, async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Regra não encontrada' });
    res.json({ success: true, rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create rule
router.post('/rules', protect, async (req, res) => {
  try {
    const rule = await AutomationRule.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update rule
router.put('/rules/:id', protect, async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Regra não encontrada' });
    res.json({ success: true, rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete rule
router.delete('/rules/:id', protect, async (req, res) => {
  try {
    await AutomationRule.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Regra removida' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle rule
router.put('/rules/:id/toggle', protect, async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Regra não encontrada' });
    rule.enabled = !rule.enabled;
    await rule.save();
    res.json({ success: true, rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test rule
router.post('/rules/:id/test', protect, async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!rule) return res.status(404).json({ success: false, message: 'Regra não encontrada' });

    const result = await automationEngine.fireTrigger(
      rule.trigger.type,
      'test',
      null,
      req.body.testData || {},
      req.user._id
    );

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== AUTOMATION SEQUENCES ==========

router.get('/sequences', protect, async (req, res) => {
  try {
    const sequences = await AutomationSequence.find({ teacher: req.user._id });
    res.json({ success: true, sequences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sequences', protect, async (req, res) => {
  try {
    const sequence = await AutomationSequence.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, sequence });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/sequences/:id', protect, async (req, res) => {
  try {
    const sequence = await AutomationSequence.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    res.json({ success: true, sequence });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/sequences/:id', protect, async (req, res) => {
  try {
    await AutomationSequence.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Sequência removida' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== TEMPLATES ==========

router.get('/templates', protect, async (req, res) => {
  try {
    const templates = await NotificationTemplate.find({ teacher: req.user._id });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/templates', protect, async (req, res) => {
  try {
    const template = await NotificationTemplate.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/templates/:id', protect, async (req, res) => {
  try {
    const template = await NotificationTemplate.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/templates/:id', protect, async (req, res) => {
  try {
    await NotificationTemplate.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Template removido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== LOGS ==========

router.get('/logs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await AutomationLog.find({ teacher: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('rule', 'name');
    const total = await AutomationLog.countDocuments({ teacher: req.user._id });
    res.json({ success: true, logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATS ==========

router.get('/stats', protect, async (req, res) => {
  try {
    const [totalRules, activeRules, totalSequences, activeSequences, recentLogs] = await Promise.all([
      AutomationRule.countDocuments({ teacher: req.user._id }),
      AutomationRule.countDocuments({ teacher: req.user._id, enabled: true }),
      AutomationSequence.countDocuments({ teacher: req.user._id }),
      AutomationSequence.countDocuments({ teacher: req.user._id, status: 'active' }),
      AutomationLog.find({ teacher: req.user._id }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      stats: { totalRules, activeRules, totalSequences, activeSequences },
      recentActivity: recentLogs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manual trigger
router.post('/trigger', protect, async (req, res) => {
  try {
    const { trigger, entityType, entityId, metadata } = req.body;
    const results = await automationEngine.fireTrigger(trigger, entityType, entityId, metadata, req.user._id);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
