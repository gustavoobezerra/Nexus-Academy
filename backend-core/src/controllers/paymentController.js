import Payment from '../models/Payment.js';
import Student from '../models/Student.js';

export const getPayments = async (req, res) => {
  try {
    const teacherId = req.user._id;
    // Get students of this teacher first
    const students = await Student.find({ teacher: teacherId }).select('_id');
    const studentIds = students.map(s => s._id);

    const payments = await Payment.find({ student: { $in: studentIds } })
      .populate('student', 'name parentName')
      .sort('-createdAt');

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar pagamentos', error: error.message });
  }
};

export const createPayment = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { student: studentId } = req.body;

    // Verify student belongs to teacher
    const student = await Student.findOne({ _id: studentId, teacher: teacherId });
    if (!student) {
      return res.status(403).json({ message: 'Não autorizado para este aluno.' });
    }

    const payment = await Payment.create(req.body);

    res.status(201).json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar pagamento', error: error.message });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // Find payment and check if it belongs to teacher's student
    const payment = await Payment.findById(req.params.id).populate('student');
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado.' });
    }

    if (payment.student.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Não autorizado para este pagamento.' });
    }

    Object.assign(payment, req.body);

    if (req.body.status === 'paid' && !payment.paidDate) {
      payment.paidDate = new Date();
    }
    
    await payment.save();

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar pagamento', error: error.message });
  }
};

export const getFinancialStats = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const students = await Student.find({ teacher: teacherId }).select('_id');
    const studentIds = students.map(s => s._id);

    const paidPayments = await Payment.find({
      student: { $in: studentIds },
      status: 'paid',
      year: currentYear
    });

    const pendingPayments = await Payment.find({
      student: { $in: studentIds },
      status: 'pending'
    }).populate('student', 'name monthlyFee');

    const latePayments = await Payment.find({
      student: { $in: studentIds },
      status: 'late'
    }).populate('student', 'name monthlyFee');

    const monthlyRevenue = paidPayments
      .filter(p => p.paidDate && new Date(p.paidDate).getMonth() === currentMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const yearlyRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lateAmount = latePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        monthlyRevenue,
        yearlyRevenue,
        pendingAmount,
        lateAmount,
        pendingCount: pendingPayments.length,
        lateCount: latePayments.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
};
