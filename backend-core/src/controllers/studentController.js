import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import { sendWelcomeEmail } from '../config/resend.js';
import cacheService from '../services/cacheService.js';

export const getStudents = async (req, res) => {
  try {
    const query = { teacher: req.user._id, active: true };

    // Filtros opcionais
    if (req.query.grade) {
      query.grade = req.query.grade;
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.performance) {
      // Filtrar por performance (ex: 'high', 'medium', 'low')
      const performanceValue = parseFloat(req.query.performance);
      if (!isNaN(performanceValue)) {
        if (req.query.performanceType === 'min') {
          query['performance.overall'] = { $gte: performanceValue };
        } else if (req.query.performanceType === 'max') {
          query['performance.overall'] = { $lte: performanceValue };
        } else {
          query['performance.overall'] = performanceValue;
        }
      }
    }
    if (req.query.search) {
      // Busca por nome, email ou telefone
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Criar chave de cache baseada nos filtros
    const cacheKey = `students:${req.user._id}:${JSON.stringify(query)}`;
    
    // Tentar buscar do cache primeiro (TTL de 5 minutos)
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        count: cached.count,
        students: cached.students,
        cached: true
      });
    }

    const students = await Student.find(query)
      .sort('-createdAt');

    // Salvar no cache
    await cacheService.set(cacheKey, {
      count: students.length,
      students
    }, 300); // 5 minutos

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

// Sanitização de inputs para prevenir XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove tags HTML
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Prevenir NoSQL injection
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const createStudent = async (req, res) => {
  try {
    // Sanitizar inputs
    const sanitizedBody = sanitizeObject(req.body);
    const { name, age, grade, monthlyFee, parentName, parentEmail, parentPhone } = sanitizedBody;

    if (!name || !age || !grade || !monthlyFee || !parentName || !parentEmail || !parentPhone) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios (nome, idade, série, mensalidade, nome do responsável, email e telefone).'
      });
    }

    const studentData = {
      ...sanitizedBody,
      teacher: req.user.id
    };

    const student = await Student.create(studentData);

    // Invalidar cache de alunos do professor
    await cacheService.delPattern(`students:${req.user.id}:*`);

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
    // Sanitizar inputs
    const sanitizedBody = sanitizeObject(req.body);
    
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      sanitizedBody,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }

    // Invalidar cache de alunos do professor
    await cacheService.delPattern(`students:${req.user.id}:*`);

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

    // Invalidar cache de alunos do professor
    await cacheService.delPattern(`students:${req.user.id}:*`);

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
