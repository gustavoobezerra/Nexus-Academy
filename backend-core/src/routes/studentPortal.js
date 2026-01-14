import express from 'express';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';
import Activity from '../models/Activity.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateStudent } from '../middleware/studentAuth.js';

const router = express.Router();

// Helper para obter JWT secret de forma segura
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return secret;
};

/**
 * @swagger
 * /api/portal/auth/login:
 *   post:
 *     summary: Login do aluno no portal
 *     tags: [Student Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
/**
 * @swagger
 * /api/portal/auth/register:
 *   post:
 *     summary: Registro de novo aluno no portal
 *     tags: [Student Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - age
 *               - grade
 *               - parentName
 *               - parentPhone
 *               - parentEmail
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               age:
 *                 type: integer
 *               grade:
 *                 type: string
 *               parentName:
 *                 type: string
 *               parentPhone:
 *                 type: string
 *               parentEmail:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Aluno registrado com sucesso
 *       400:
 *         description: Dados inválidos ou email já cadastrado
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, age, grade, parentName, parentPhone, parentEmail, teacherId } = req.body;

    // Validar idade primeiro para determinar se dados do responsável são necessários
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 3 || ageNum > 120) {
      return res.status(400).json({
        success: false,
        message: 'Idade deve estar entre 3 e 120 anos'
      });
    }

    const isMinor = ageNum < 18;

    // Validação de campos obrigatórios (responsável apenas para menores de 18)
    if (!name || !email || !password || !age || !grade) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, senha, idade e série são obrigatórios'
      });
    }

    // Para menores de 18, exigir dados do responsável
    if (isMinor && (!parentName || !parentPhone || !parentEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Dados do responsável são obrigatórios para menores de 18 anos'
      });
    }

    // Validação de tipos e formatos
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome deve ter entre 2 e 100 caracteres' 
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email inválido' 
      });
    }

    // Validar senha - mínimo 6 caracteres
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Senha deve ter entre 6 e 128 caracteres'
      });
    }

    // Validar telefone do responsável (apenas para menores de 18)
    if (isMinor && parentPhone) {
      const cleanPhone = parentPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        return res.status(400).json({
          success: false,
          message: 'Telefone do responsável inválido'
        });
      }
    }

    // Verificar se email já existe
    const existingStudent = await Student.findOne({ 
      'portalAccess.email': email.toLowerCase().trim() 
    });

    if (existingStudent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este email já está cadastrado' 
      });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar novo aluno
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
      performance: {
        overall: 0,
        trend: 'stable'
      },
      points: 0,
      level: 1,
      active: true,
      teacher: teacherId || null
    };

    // Adicionar dados do responsável apenas se fornecidos (obrigatório apenas para menores de 18)
    if (parentName) studentData.parentName = parentName;
    if (parentPhone) studentData.parentPhone = parentPhone;
    if (parentEmail) studentData.parentEmail = parentEmail.toLowerCase();

    const student = new Student(studentData);

    await student.save();

    // Gerar token JWT
    const token = jwt.sign(
      {
        studentId: student._id,
        type: 'student',
        teacherId: teacherId || null
      },
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
        performance: student.performance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar conta'
    });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }

    const student = await Student.findOne({ 
      'portalAccess.email': email.toLowerCase(),
      'portalAccess.enabled': true,
      active: true
    }).select('+portalAccess.password').populate('teacher', 'name email');

    if (!student) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas ou acesso não habilitado' 
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password, 
      student.portalAccess.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Atualizar último login
    student.portalAccess.lastLogin = new Date();
    await student.save();

    // Gerar token JWT
    const token = jwt.sign(
      { 
        studentId: student._id, 
        type: 'student',
        teacherId: student.teacher?._id || null 
      },
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
        teacher: student.teacher ? {
          name: student.teacher.name,
          email: student.teacher.email
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar login'
    });
  }
});

/**
 * @swagger
 * /api/portal/profile:
 *   get:
 *     summary: Obter perfil do aluno
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do aluno
 */
router.get('/profile', authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId)
      .populate('teacher', 'name email phone')
      .select('-portalAccess.password');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aluno não encontrado' 
      });
    }

    res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        age: student.age,
        grade: student.grade,
        subject: student.subject,
        performance: student.performance,
        points: student.points,
        level: student.level,
        badges: student.badges,
        streak: student.streak,
        teacher: student.teacher,
        profile: student.profile,
        goals: student.goals,
        onboarding: student.onboarding
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil'
    });
  }
});

/**
 * @swagger
 * /api/portal/profile:
 *   put:
 *     summary: Atualizar perfil do aluno
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', authenticateStudent, async (req, res) => {
  try {
    const { description, interests } = req.body;
    
    const updateData = {};
    
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 500) {
        return res.status(400).json({ 
          success: false, 
          message: 'Descrição deve ter no máximo 500 caracteres' 
        });
      }
      updateData['profile.description'] = description.trim();
    }
    
    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.length > 10) {
        return res.status(400).json({ 
          success: false, 
          message: 'Máximo de 10 interesses permitidos' 
        });
      }
      updateData['profile.interests'] = interests.map(i => String(i).trim().slice(0, 50));
    }

    const student = await Student.findByIdAndUpdate(
      req.studentId,
      { $set: updateData },
      { new: true }
    ).select('profile');

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      profile: student.profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });
  }
});

/**
 * @swagger
 * /api/portal/onboarding:
 *   post:
 *     summary: Salvar respostas do onboarding
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 */
router.post('/onboarding', authenticateStudent, async (req, res) => {
  try {
    const { 
      learningPurpose, 
      currentLevel, 
      targetTimeframe, 
      studyHoursPerWeek,
      preferredSchedule,
      learningStyle,
      previousExperience,
      mainChallenges,
      specificGoals,
      initialGoals 
    } = req.body;

    // Validações
    const validLevels = ['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced', 'fluent'];
    if (currentLevel && !validLevels.includes(currentLevel)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nível inválido' 
      });
    }

    const validSchedules = ['morning', 'afternoon', 'evening', 'flexible'];
    if (preferredSchedule && !validSchedules.includes(preferredSchedule)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Horário preferido inválido' 
      });
    }

    const validStyles = ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed'];
    if (learningStyle && !validStyles.includes(learningStyle)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Estilo de aprendizado inválido' 
      });
    }

    const updateData = {
      'onboarding.completed': true,
      'onboarding.completedAt': new Date(),
      'onboarding.answers': {
        learningPurpose: String(learningPurpose || '').slice(0, 500),
        currentLevel,
        targetTimeframe: String(targetTimeframe || '').slice(0, 100),
        studyHoursPerWeek: parseInt(studyHoursPerWeek) || 0,
        preferredSchedule,
        learningStyle,
        previousExperience: String(previousExperience || '').slice(0, 500),
        mainChallenges: Array.isArray(mainChallenges) ? mainChallenges.slice(0, 10).map(c => String(c).slice(0, 100)) : [],
        specificGoals: Array.isArray(specificGoals) ? specificGoals.slice(0, 10).map(g => String(g).slice(0, 100)) : []
      }
    };

    // Criar metas iniciais se fornecidas
    if (initialGoals && Array.isArray(initialGoals) && initialGoals.length > 0) {
      const goals = initialGoals.slice(0, 5).map(goal => ({
        title: String(goal.title || '').slice(0, 100),
        description: String(goal.description || '').slice(0, 300),
        targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
        progress: 0,
        status: 'active',
        createdAt: new Date()
      }));

      await Student.findByIdAndUpdate(
        req.studentId,
        { 
          $set: updateData,
          $push: { goals: { $each: goals } }
        }
      );
    } else {
      await Student.findByIdAndUpdate(req.studentId, { $set: updateData });
    }

    res.json({
      success: true,
      message: 'Onboarding concluído com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar onboarding'
    });
  }
});

/**
 * @swagger
 * /api/portal/goals:
 *   get:
 *     summary: Listar metas do aluno
 *     tags: [Student Portal]
 */
router.get('/goals', authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select('goals');
    
    res.json({
      success: true,
      goals: student?.goals || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter metas'
    });
  }
});

/**
 * @swagger
 * /api/portal/goals:
 *   post:
 *     summary: Adicionar nova meta
 *     tags: [Student Portal]
 */
router.post('/goals', authenticateStudent, async (req, res) => {
  try {
    const { title, description, targetDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Título da meta é obrigatório (mínimo 3 caracteres)' 
      });
    }

    // Verificar limite de metas
    const student = await Student.findById(req.studentId).select('goals');
    if (student.goals && student.goals.length >= 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Limite de 20 metas atingido' 
      });
    }

    const newGoal = {
      title: title.trim().slice(0, 100),
      description: description ? String(description).trim().slice(0, 300) : '',
      targetDate: targetDate ? new Date(targetDate) : null,
      progress: 0,
      status: 'active',
      createdAt: new Date()
    };

    await Student.findByIdAndUpdate(
      req.studentId,
      { $push: { goals: newGoal } }
    );

    res.status(201).json({
      success: true,
      message: 'Meta criada com sucesso!',
      goal: newGoal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar meta'
    });
  }
});

/**
 * @swagger
 * /api/portal/goals/{goalId}:
 *   put:
 *     summary: Atualizar meta
 *     tags: [Student Portal]
 */
router.put('/goals/:goalId', authenticateStudent, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { title, description, targetDate, progress, status } = req.body;

    const updateFields = {};
    
    if (title !== undefined) {
      updateFields['goals.$.title'] = String(title).trim().slice(0, 100);
    }
    if (description !== undefined) {
      updateFields['goals.$.description'] = String(description).trim().slice(0, 300);
    }
    if (targetDate !== undefined) {
      updateFields['goals.$.targetDate'] = targetDate ? new Date(targetDate) : null;
    }
    if (progress !== undefined) {
      const prog = parseInt(progress);
      if (prog >= 0 && prog <= 100) {
        updateFields['goals.$.progress'] = prog;
      }
    }
    if (status !== undefined && ['active', 'completed', 'paused'].includes(status)) {
      updateFields['goals.$.status'] = status;
    }

    const result = await Student.findOneAndUpdate(
      { _id: req.studentId, 'goals._id': goalId },
      { $set: updateFields },
      { new: true }
    ).select('goals');

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meta não encontrada' 
      });
    }

    const updatedGoal = result.goals.find(g => g._id.toString() === goalId);

    res.json({
      success: true,
      message: 'Meta atualizada com sucesso!',
      goal: updatedGoal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar meta'
    });
  }
});

/**
 * @swagger
 * /api/portal/goals/{goalId}:
 *   delete:
 *     summary: Excluir meta
 *     tags: [Student Portal]
 */
router.delete('/goals/:goalId', authenticateStudent, async (req, res) => {
  try {
    const { goalId } = req.params;

    const result = await Student.findByIdAndUpdate(
      req.studentId,
      { $pull: { goals: { _id: goalId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meta não encontrada' 
      });
    }

    res.json({
      success: true,
      message: 'Meta excluída com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir meta'
    });
  }
});

/**
 * @swagger
 * /api/portal/classes:
 *   get:
 *     summary: Listar aulas do aluno
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de aulas
 */
router.get('/classes', authenticateStudent, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const query = { student: req.studentId };

    if (status) {
      query.status = status;
    }

    const classes = await Class.find(query)
      .sort({ scheduledAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('title subject scheduledAt duration status assessmentScore notes homework');

    const total = await Class.countDocuments(query);

    res.json({
      success: true,
      classes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter aulas'
    });
  }
});

/**
 * @swagger
 * /api/portal/payments:
 *   get:
 *     summary: Listar pagamentos do aluno
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagamentos
 */
router.get('/payments', authenticateStudent, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.studentId })
      .sort({ dueDate: -1 })
      .select('amount status dueDate paidAt month year paymentMethod');

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter pagamentos'
    });
  }
});

/**
 * @swagger
 * /api/portal/courses:
 *   get:
 *     summary: Listar cursos do aluno
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cursos
 */
router.get('/courses', authenticateStudent, async (req, res) => {
  try {
    const courses = await Course.find({
      'enrollments.student': req.studentId,
      'enrollments.status': 'active'
    })
      .select('title description thumbnail modules totalLessons totalDuration')
      .lean();

    const coursesWithProgress = courses.map(course => {
      const enrollment = course.enrollments.find(
        e => e.student.toString() === req.studentId.toString()
      );
      return {
        ...course,
        progress: enrollment?.progress || 0,
        currentModule: enrollment?.currentModule || 0,
        currentLesson: enrollment?.currentLesson || 0,
        completedLessons: enrollment?.completedLessons?.length || 0
      };
    });

    res.json({
      success: true,
      courses: coursesWithProgress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter cursos'
    });
  }
});

/**
 * @swagger
 * /api/portal/activities:
 *   get:
 *     summary: Listar atividades do aluno
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de atividades
 */
router.get('/activities', authenticateStudent, async (req, res) => {
  try {
    // Buscar atividades relacionadas às aulas do aluno
    const classes = await Class.find({ student: req.studentId })
      .select('homework title scheduledAt')
      .sort({ scheduledAt: -1 });

    const activities = classes.flatMap(cls => 
      cls.homework.map(hw => ({
        id: hw._id,
        title: hw.title,
        description: hw.description,
        dueDate: hw.dueDate,
        completed: hw.completed,
        classTitle: cls.title,
        classDate: cls.scheduledAt
      }))
    );

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter atividades'
    });
  }
});

// authenticateStudent agora vem do middleware compartilhado

// ===== NOVAS ROTAS DO DASHBOARD DO ALUNO =====

// GET /api/portal/me - Obter dados completos do aluno logado
router.get('/me', authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId)
      .populate('teacher', 'name email avatar')
      .select('-portalAccess.password')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Aluno não encontrado'
      });
    }

    // Calcular métricas de performance
    const classes = await Class.find({ student: req.studentId });
    const completedClasses = classes.filter(c => c.status === 'completed').length;
    const totalClasses = classes.length;
    const performance = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

    // Próxima aula agendada
    const nextClass = await Class.findOne({
      student: req.studentId,
      status: 'scheduled',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    res.json({
      success: true,
      _id: student._id,
      name: student.name,
      email: student.email,
      grade: student.grade,
      subject: student.subject,
      performance: {
        overall: performance,
        trend: 'stable'
      },
      points: student.points || 0,
      level: student.level || 1,
      nextClass: nextClass ? new Date(nextClass.date).toLocaleDateString('pt-BR') : null,
      teacher: student.teacher || null
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar dados do aluno'
    });
  }
});

// GET /api/portal/activities - Listar atividades do aluno
router.get('/activities', authenticateStudent, async (req, res) => {
  try {
    const activities = await Activity.find({
      student: req.studentId
    })
      .sort({ dueDate: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      activities: activities.map(a => ({
        _id: a._id,
        title: a.title || 'Atividade',
        type: a.type || 'exercise',
        dueDate: a.dueDate,
        status: a.status || 'pending'
      }))
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar atividades'
    });
  }
});

// GET /api/portal/classes - Listar aulas do aluno
router.get('/classes', authenticateStudent, async (req, res) => {
  try {
    const classes = await Class.find({
      student: req.studentId
    })
      .sort({ date: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      classes: classes.map(c => ({
        _id: c._id,
        title: c.title || 'Aula',
        date: c.date,
        duration: c.duration || 60,
        status: c.status || 'scheduled'
      }))
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar aulas'
    });
  }
});

// ===== ROTAS DE CHAT ALUNO-PROFESSOR =====

// GET /api/portal/chat/messages - Obter mensagens com o professor
router.get('/chat/messages', authenticateStudent, async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: 'teacherId é obrigatório'
      });
    }

    const Chat = (await import('../models/Chat.js')).default;
    const messages = await Chat.find({
      $or: [
        { sender: req.studentId, recipient: teacherId },
        { sender: teacherId, recipient: req.studentId }
      ]
    })
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      messages: messages.map(m => ({
        _id: m._id,
        sender: m.sender.toString() === req.studentId.toString() ? 'student' : 'teacher',
        senderName: m.senderName || 'Usuário',
        content: m.content,
        timestamp: m.timestamp,
        read: m.read || false,
        type: m.type || 'text',
        fileUrl: m.fileUrl,
        fileName: m.fileName
      }))
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar mensagens'
    });
  }
});

// POST /api/portal/chat/send - Enviar mensagem para o professor
router.post('/chat/send', authenticateStudent, async (req, res) => {
  try {
    const { teacherId, content, type = 'text' } = req.body;

    if (!teacherId || !content) {
      return res.status(400).json({
        success: false,
        message: 'teacherId e content são obrigatórios'
      });
    }

    const student = await Student.findById(req.studentId);
    const Chat = (await import('../models/Chat.js')).default;

    const message = new Chat({
      sender: req.studentId,
      senderName: student.name,
      recipient: teacherId,
      content,
      type,
      timestamp: new Date(),
      read: false
    });

    await message.save();

    res.json({
      success: true,
      message: {
        _id: message._id,
        sender: 'student',
        senderName: student.name,
        content: message.content,
        timestamp: message.timestamp,
        read: false,
        type: message.type
      }
    });
  } catch (error) {
    console.error('[StudentPortal] Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar mensagem'
    });
  }
});

// POST /api/portal/chat/mark-read/:messageId - Marcar mensagem como lida
router.post('/chat/mark-read/:messageId', authenticateStudent, async (req, res) => {
  try {
    const { messageId } = req.params;
    const Chat = (await import('../models/Chat.js')).default;

    await Chat.findByIdAndUpdate(messageId, { read: true });

    res.json({
      success: true,
      message: 'Mensagem marcada como lida'
    });
  } catch (error) {
    console.error('[StudentPortal] Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao marcar mensagem como lida'
    });
  }
});

export default router;
