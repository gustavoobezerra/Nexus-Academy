import express from 'express';
import { Report, DashboardConfig, AnalyticsSnapshot } from '../models/Report.js';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import Class from '../models/Class.js';
import { authorize, protect } from '../middleware/auth.js';
import reportGeneratorService from '../services/reportGeneratorService.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

// ========== REPORTS ==========

router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Relatório não encontrado' });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const report = await Report.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const report = await Report.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Report.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Relatório removido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate report
router.post('/:id/generate', async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Relatório não encontrado' });

    const generation = { generatedAt: new Date(), status: 'generating' };
    report.generations.push(generation);
    await report.save();

    // Generate report data based on type
    const data = await generateReportData(report, req.user._id);

    // Update generation status
    const genIndex = report.generations.length - 1;
    report.generations[genIndex].status = 'completed';
    report.generations[genIndex].metadata = data;
    await report.save();

    res.json({ success: true, data, generation: report.generations[genIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

async function generateReportData(report, teacherId) {
  const { dateRange } = report.filters;
  const startDate = dateRange?.start || new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate = dateRange?.end || new Date();

  switch (report.type) {
    case 'financial_summary':
    case 'financial_detailed': {
      const payments = await Payment.find({
        teacher: teacherId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('student', 'name');

      const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
      const totalOverdue = payments.filter(p => p.status === 'late' || p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

      return {
        totalRevenue, totalPending, totalOverdue,
        paymentCount: payments.length,
        paidCount: payments.filter(p => p.status === 'paid').length,
        paymentRate: payments.length > 0 ? (payments.filter(p => p.status === 'paid').length / payments.length * 100).toFixed(1) : 0,
        byMonth: groupByMonth(payments),
        payments: report.type === 'financial_detailed' ? payments : undefined
      };
    }

    case 'student_performance': {
      const students = await Student.find({ teacher: teacherId, active: true });
      return {
        totalStudents: students.length,
        averagePerformance: students.reduce((sum, s) => sum + (s.performance?.overall || 0), 0) / students.length,
        byPerformance: students.map(s => ({ name: s.name, score: s.performance?.overall || 0, trend: s.performance?.trend }))
      };
    }

    case 'class_summary': {
      const classes = await Class.find({
        teacher: teacherId,
        scheduledAt: { $gte: startDate, $lte: endDate }
      }).populate('student', 'name');

      return {
        totalClasses: classes.length,
        completed: classes.filter(c => c.status === 'completed').length,
        cancelled: classes.filter(c => c.status === 'cancelled').length,
        noShow: classes.filter(c => c.status === 'no_show').length,
        totalHours: classes.reduce((sum, c) => sum + (c.duration || 0), 0) / 60,
        byStudent: groupByStudent(classes)
      };
    }

    default:
      return { message: 'Report type not implemented' };
  }
}

function groupByMonth(payments) {
  const groups = {};
  payments.forEach(p => {
    const key = `${p.year}-${p.month}`;
    if (!groups[key]) groups[key] = { month: p.month, year: p.year, total: 0, count: 0 };
    if (p.status === 'paid') {
      groups[key].total += p.amount;
      groups[key].count += 1;
    }
  });
  return Object.values(groups);
}

function groupByStudent(classes) {
  const groups = {};
  classes.forEach(c => {
    const key = c.student?._id?.toString() || 'unknown';
    if (!groups[key]) groups[key] = { name: c.student?.name || 'Unknown', count: 0, hours: 0 };
    groups[key].count += 1;
    groups[key].hours += (c.duration || 0) / 60;
  });
  return Object.values(groups);
}

// ========== DASHBOARD CONFIGS ==========

router.get('/dashboards', async (req, res) => {
  try {
    const dashboards = await DashboardConfig.find({ teacher: req.user._id });
    res.json({ success: true, dashboards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/dashboards', async (req, res) => {
  try {
    const dashboard = await DashboardConfig.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, dashboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/dashboards/:id', async (req, res) => {
  try {
    const dashboard = await DashboardConfig.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true }
    );
    res.json({ success: true, dashboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/dashboards/:id', async (req, res) => {
  try {
    await DashboardConfig.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    res.json({ success: true, message: 'Dashboard removido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ANALYTICS SNAPSHOTS ==========

router.get('/snapshots', async (req, res) => {
  try {
    const { type = 'daily', limit = 30 } = req.query;
    const snapshots = await AnalyticsSnapshot.find({ teacher: req.user._id, type })
      .sort({ date: -1 })
      .limit(parseInt(limit));
    res.json({ success: true, snapshots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate snapshot
router.post('/snapshots/generate', async (req, res) => {
  try {
    const { type = 'daily' } = req.body;
    const teacherId = req.user._id;

    const [students, payments, classes] = await Promise.all([
      Student.find({ teacher: teacherId }),
      Payment.find({ teacher: teacherId }),
      Class.find({ teacher: teacherId })
    ]);

    const snapshot = await AnalyticsSnapshot.create({
      teacher: teacherId,
      date: new Date(),
      type,
      financial: {
        revenue: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
        expectedRevenue: students.filter(s => s.active).reduce((sum, s) => sum + s.monthlyFee, 0),
        paymentRate: payments.length > 0 ? (payments.filter(p => p.status === 'paid').length / payments.length * 100) : 0,
        overdueAmount: payments.filter(p => ['late', 'overdue'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0),
        averageTicket: students.length > 0 ? students.reduce((sum, s) => sum + s.monthlyFee, 0) / students.length : 0
      },
      students: {
        total: students.length,
        active: students.filter(s => s.active).length,
        new: students.filter(s => new Date(s.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        churned: students.filter(s => !s.active).length,
        churnRate: students.length > 0 ? (students.filter(s => !s.active).length / students.length * 100) : 0
      },
      classes: {
        total: classes.length,
        completed: classes.filter(c => c.status === 'completed').length,
        cancelled: classes.filter(c => c.status === 'cancelled').length,
        noShow: classes.filter(c => c.status === 'no_show').length,
        totalHours: classes.reduce((sum, c) => sum + (c.duration || 0), 0) / 60,
        occupancyRate: 0
      }
    });

    res.json({ success: true, snapshot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export report
router.get('/:id/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const report = await Report.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Relatório não encontrado' });

    const data = await generateReportData(report, req.user._id);

    if (format === 'json') {
      res.json({ success: true, data });
    } else if (format === 'csv') {
      // Generate CSV
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${report.name}.csv`);
      res.send(csv);
    } else {
      res.status(400).json({ success: false, message: 'Formato não suportado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function convertToCSV(data) {
  if (!data || typeof data !== 'object') return '';
  const rows = [];
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        rows.push(Object.keys(value[0]).join(','));
        value.forEach(item => rows.push(Object.values(item).join(',')));
      }
    } else {
      rows.push(`${key},${value}`);
    }
  });
  return rows.join('\n');
}

// ========== AUTOMATIC REPORTS FOR PARENTS ==========

/**
 * @swagger
 * /api/reports/parents/monthly:
 *   post:
 *     summary: Gerar relatório mensal para pais
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.post('/parents/monthly', async (req, res) => {
  try {
    const { studentId, month, year, sendEmail } = req.body;

    if (!studentId || !month || !year) {
      return res.status(400).json({ 
        success: false, 
        message: 'studentId, month e year são obrigatórios' 
      });
    }

    const report = await reportGeneratorService.generateMonthlyReport(
      req.user._id,
      studentId,
      month,
      year
    );

    if (!report.success) {
      return res.status(500).json(report);
    }

    // Enviar por email se solicitado
    if (sendEmail) {
      const student = await Student.findById(studentId);
      const emailResult = await reportGeneratorService.sendReportByEmail(
        req.user._id,
        studentId,
        month,
        year,
        student?.parentEmail || student?.email
      );
      
      if (emailResult.success) {
        return res.json({
          success: true,
          message: 'Relatório gerado e enviado por email',
          report: report.report
        });
      }
    }

    res.json({
      success: true,
      report: report.report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/reports/parents/preview:
 *   get:
 *     summary: Preview do relatório mensal
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/parents/preview', async (req, res) => {
  try {
    const { studentId, month, year } = req.query;

    if (!studentId || !month || !year) {
      return res.status(400).json({ 
        success: false, 
        message: 'studentId, month e year são obrigatórios' 
      });
    }

    const report = await reportGeneratorService.generateMonthlyReport(
      req.user._id,
      studentId,
      parseInt(month),
      parseInt(year)
    );

    if (!report.success) {
      return res.status(500).json(report);
    }

    // Retornar HTML para preview
    res.setHeader('Content-Type', 'text/html');
    res.send(report.report.html);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
