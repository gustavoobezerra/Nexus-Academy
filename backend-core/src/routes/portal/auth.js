import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Student from '../../models/Student.js';
import User from '../../models/User.js';
import { getJWTSecret, isValidObjectId } from './helpers.js';

const router = express.Router();
const allowedTeacherSubscriptionStatuses = ['active', 'trialing', 'incomplete', null, undefined];

// POST /api/portal/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, age, grade, parentName, parentPhone, parentEmail, teacherId } = req.body;

    if (teacherId && !isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, message: 'Teacher ID invalido' });
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 3 || ageNum > 120) {
      return res.status(400).json({ success: false, message: 'Idade deve estar entre 3 e 120 anos' });
    }

    const isMinor = ageNum < 18;

    if (!name || !email || !password || !age || !grade) {
      return res.status(400).json({ success: false, message: 'Nome, email, senha, idade e série são obrigatórios' });
    }

    if (isMinor && (!parentName || !parentPhone || !parentEmail)) {
      return res.status(400).json({ success: false, message: 'Dados do responsável são obrigatórios para menores de 18 anos' });
    }

    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, message: 'Nome deve ter entre 2 e 100 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Senha deve ter entre 6 e 128 caracteres' });
    }

    if (isMinor && parentPhone) {
      const cleanPhone = parentPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        return res.status(400).json({ success: false, message: 'Telefone do responsável inválido' });
      }
    }

    let teacher = null;
    if (teacherId) {
      teacher = await User.findOne({ _id: teacherId, role: 'teacher' })
        .select('name subscriptionStatus');

      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Professor não encontrado' });
      }

      if (!allowedTeacherSubscriptionStatuses.includes(teacher.subscriptionStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Este professor não está aceitando novos alunos no momento'
        });
      }
    }

    const existingStudent = await Student.findOne({ 'portalAccess.email': email.toLowerCase().trim() });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Este email já está cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const studentData = {
      name,
      email: email.toLowerCase(),
      age: ageNum,
      grade,
      subject: 'Geral',
      monthlyFee: 0,
      paymentStatus: 'pending',
      portalAccess: {
        enabled: true,
        email: email.toLowerCase(),
        password: hashedPassword,
        lastLogin: new Date()
      },
      performance: { overall: 0, trend: 'stable' },
      points: 0,
      level: 1,
      active: true,
      teacher: teacher?._id || null
    };

    if (parentName) studentData.parentName = parentName;
    if (parentPhone) studentData.parentPhone = parentPhone;
    if (parentEmail) studentData.parentEmail = parentEmail.toLowerCase();

    const student = new Student(studentData);
    await student.save();

    const token = jwt.sign(
      { studentId: student._id, type: 'student', teacherId: teacher?._id?.toString() || null },
      getJWTSecret(),
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        subject: student.subject,
        points: student.points,
        level: student.level,
        performance: student.performance,
        onboardingCompleted: student.onboarding?.completed || false,
        teacher: teacher ? { id: teacher._id, name: teacher.name } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar conta' });
  }
});

// POST /api/portal/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    const student = await Student.findOne({
      'portalAccess.email': email.toLowerCase(),
      'portalAccess.enabled': true,
      active: true
    }).select('+portalAccess.password').populate('teacher', 'name email');

    if (!student) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas ou acesso não habilitado' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.portalAccess.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    student.portalAccess.lastLogin = new Date();
    await student.save();

    const token = jwt.sign(
      { studentId: student._id, type: 'student', teacherId: student.teacher?._id || null },
      getJWTSecret(),
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        subject: student.subject,
        points: student.points,
        level: student.level,
        performance: student.performance,
        profile: student.profile,
        onboardingCompleted: student.onboarding?.completed || false,
        teacher: student.teacher ? { name: student.teacher.name, email: student.teacher.email } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao realizar login' });
  }
});

export default router;
