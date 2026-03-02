import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import Class from '../models/Class.js';

export const getTeacherAnalytics = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const students = await Student.find({ teacher: teacherId, active: true });
    const studentIds = students.map(s => s._id);

    const revenueAgg = await Payment.aggregate([
      { $match: { student: { $in: studentIds }, status: 'paid' } },
      { $facet: {
        monthly: [
          { $match: { paidAt: { $gte: new Date(currentYear, currentMonth, 1), $lt: new Date(currentYear, currentMonth + 1, 1) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ],
        total: [
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]
      } }
    ]);

    const monthlyRevenue = revenueAgg[0]?.monthly[0]?.total || 0;
    const totalRevenue = revenueAgg[0]?.total[0]?.total || 0;

    const expectedMonthlyRevenue = students.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    const overduePayments = await Payment.countDocuments({
      student: { $in: studentIds },
      status: 'late'
    });

    const analytics = {
      lastUpdated: new Date(),
      financial: {
        monthlyRevenue,
        totalRevenue,
        expectedMonthlyRevenue,
        paymentRate: expectedMonthlyRevenue > 0 ? (monthlyRevenue / expectedMonthlyRevenue) * 100 : 0,
        activeStudents: students.length,
        inactiveStudents: await Student.countDocuments({ teacher: teacherId, active: false }),
        averageTicket: students.length > 0 ? expectedMonthlyRevenue / students.length : 0,
        overduePayments
      },
      retention: {
        activeStudents: students.length,
        totalChurn: 0,
        churnRate: 0,
        atRiskStudents: [] // Would need more complex logic based on attendance
      },
      timeManagement: {
        weeklyHours: 0,
        monthlyHours: 0,
        occupancyRate: 0,
        availableSlots: 0,
        suggestedSlots: []
      },
      pedagogical: {
        averagePerformance: 0,
        improvementRate: 0,
        topicsDifficulty: []
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    res.status(500).json({ message: 'Erro ao buscar analytics' });
  }
};

export const getStudentPaymentAnalytics = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const students = await Student.find({ teacher: teacherId, active: true });

    const studentIds = students.map(s => s._id);
    const latestPayments = await Payment.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $sort: { dueDate: -1 } },
      { $group: { _id: "$student", status: { $first: "$status" }, dueDate: { $first: "$dueDate" }, paidAt: { $first: "$paidAt" } } }
    ]);
    const paymentMap = {};
    latestPayments.forEach(p => { paymentMap[p._id.toString()] = p; });

    const status = students.map(student => {
      const latestPayment = paymentMap[student._id.toString()];
      return {
        studentId: student._id,
        studentName: student.name,
        monthlyFee: student.monthlyFee,
        currentStatus: latestPayment?.status || 'pending',
        daysOverdue: latestPayment?.status === 'late' && latestPayment?.dueDate
          ? Math.max(0, Math.floor((Date.now() - new Date(latestPayment.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 0,
        lastPaymentDate: latestPayment?.paidAt || null
      };
    });

    res.json(status);
  } catch (error) {
    console.error('Erro ao buscar analytics de pagamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar analytics de pagamentos' });
  }
};
