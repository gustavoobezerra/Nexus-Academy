import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import { sendWelcomeEmail } from '../config/resend.js';

export const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ teacher: req.user._id, active: true })
      .sort('-createdAt');

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar alunos', error: error.message });
  }
};

export const getStudent = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!student) {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }

    res.json({
      success: true,
      student
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar aluno', error: error.message });
  }
};

export const createStudent = async (req, res) => {
  try {
    const { name, age, grade, monthlyFee, parentName, parentEmail, parentPhone } = req.body;

    if (!name || !age || !grade || !monthlyFee || !parentName || !parentEmail || !parentPhone) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios (nome, idade, série, mensalidade, nome do responsável, email e telefone).'
      });
    }

    const studentData = {
      ...req.body,
      teacher: req.user.id
    };

    const student = await Student.create(studentData);

    const currentDate = new Date();
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 10);

    await Payment.create({
      student: student._id,
      teacher: req.user.id,
      amount: student.monthlyFee,
      month: currentDate.toLocaleString('pt-BR', { month: 'long' }),
      year: currentDate.getFullYear(),
      dueDate,
      status: 'pending'
    });

    // Enviar email de boas-vindas (não bloqueia o cadastro se falhar)
    try {
      if (student.email || student.parentEmail) {
        const emailResult = await sendWelcomeEmail({
          name: student.name,
          email: student.email || student.parentEmail
        });

        if (emailResult.success) {
          console.log('✅ Email de boas-vindas enviado para:', student.name);
        } else {
          console.warn('⚠️  Falha ao enviar email de boas-vindas:', emailResult.error);
        }
      }
    } catch (emailError) {
      // Email falhou mas não bloqueia o cadastro
      console.error('⚠️  Erro ao enviar email de boas-vindas:', emailError.message);
    }

    res.status(201).json({
      success: true,
      student
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar aluno', error: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }

    res.json({
      success: true,
      student
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar aluno', error: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      { active: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }

    res.json({
      success: true,
      message: 'Aluno removido com sucesso.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover aluno', error: error.message });
  }
};

export const getStudentStats = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const totalStudents = await Student.countDocuments({
      teacher: teacherId,
      active: true
    });

    const students = await Student.find({
      teacher: teacherId,
      active: true
    });

    const totalMonthlyRevenue = students.reduce((sum, student) => sum + student.monthlyFee, 0);

    const studentIds = students.map(s => s._id);

    const pendingPayments = await Payment.countDocuments({
      student: { $in: studentIds },
      status: 'pending'
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalMonthlyRevenue,
        pendingPayments
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
};
