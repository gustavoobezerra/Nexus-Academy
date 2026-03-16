import express from 'express';
import Student from '../../models/Student.js';
import Class from '../../models/Class.js';
import Activity from '../../models/Activity.js';
import User from '../../models/User.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';
import emailService from '../../services/emailService.js';
import cacheService from '../../services/cacheService.js';

const router = express.Router();

// GET /api/portal/profile
router.get('/profile', authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId)
      .populate('teacher', 'name email phone')
      .select('-portalAccess.password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
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
    res.status(500).json({ success: false, message: 'Erro ao obter perfil' });
  }
});

// PUT /api/portal/profile
router.put('/profile', authenticateStudent, async (req, res) => {
  try {
    const { description, interests } = req.body;

    const allowedFields = ['description', 'interests'];
    const extraFields = Object.keys(req.body || {}).filter(k => !allowedFields.includes(k));
    if (extraFields.length > 0) {
      return res.status(400).json({ success: false, message: `Campos nao permitidos: ${extraFields.join(', ')}` });
    }

    if (description === undefined && interests === undefined) {
      return res.status(400).json({ success: false, message: 'Nada para atualizar' });
    }

    const updateData = {};

    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 500) {
        return res.status(400).json({ success: false, message: 'Descrição deve ter no máximo 500 caracteres' });
      }
      updateData['profile.description'] = description.trim();
    }

    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.length > 10) {
        return res.status(400).json({ success: false, message: 'Máximo de 10 interesses permitidos' });
      }
      updateData['profile.interests'] = interests.map(i => String(i).trim().slice(0, 50));
    }

    const student = await Student.findByIdAndUpdate(
      req.studentId,
      { $set: updateData },
      { new: true }
    ).select('profile');

    res.json({ success: true, message: 'Perfil atualizado com sucesso', profile: student.profile });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
  }
});

// POST /api/portal/onboarding
router.post('/onboarding', authenticateStudent, async (req, res) => {
  try {
    const {
      learningPurpose, currentLevel, targetTimeframe, studyHoursPerWeek,
      preferredSchedule, learningStyle, previousExperience, mainChallenges,
      specificGoals, initialGoals
    } = req.body;

    const validLevels = ['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced', 'fluent'];
    if (currentLevel && !validLevels.includes(currentLevel)) {
      return res.status(400).json({ success: false, message: 'Nível inválido' });
    }

    const validSchedules = ['morning', 'afternoon', 'evening', 'flexible'];
    if (preferredSchedule && !validSchedules.includes(preferredSchedule)) {
      return res.status(400).json({ success: false, message: 'Horário preferido inválido' });
    }

    const validStyles = ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed'];
    if (learningStyle && !validStyles.includes(learningStyle)) {
      return res.status(400).json({ success: false, message: 'Estilo de aprendizado inválido' });
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

    if (initialGoals && Array.isArray(initialGoals) && initialGoals.length > 0) {
      const goals = initialGoals.slice(0, 5).map(goal => ({
        title: String(goal.title || '').slice(0, 100),
        description: String(goal.description || '').slice(0, 300),
        targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
        progress: 0,
        status: 'active',
        createdAt: new Date()
      }));
      await Student.findByIdAndUpdate(req.studentId, { $set: updateData, $push: { goals: { $each: goals } } });
    } else {
      await Student.findByIdAndUpdate(req.studentId, { $set: updateData });
    }

    res.json({ success: true, message: 'Onboarding concluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao salvar onboarding' });
  }
});

// GET /api/portal/me
router.get('/me', authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId)
      .populate('teacher', 'name email avatar')
      .select('-portalAccess.password')
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const classes = await Class.find({ student: req.studentId });
    const completedClasses = classes.filter(c => c.status === 'completed').length;
    const totalClasses = classes.length;
    const performance = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

    const nextClass = await Class.findOne({
      student: req.studentId,
      status: 'scheduled',
      scheduledAt: { $gte: new Date() }
    }).sort({ scheduledAt: 1 });

    res.json({
      success: true,
      _id: student._id,
      name: student.name,
      email: student.email,
      grade: student.grade,
      subject: student.subject,
      performance: { overall: performance, trend: 'stable' },
      points: student.points || 0,
      level: student.level || 1,
      nextClass: nextClass ? new Date(nextClass.scheduledAt).toLocaleDateString('pt-BR') : null,
      teacher: student.teacher || null
    });
  } catch (error) {
    console.error('[StudentPortal] Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar dados do aluno' });
  }
});

// GET /api/portal/activities
router.get('/activities', authenticateStudent, async (req, res) => {
  try {
    const activities = await Activity.find({ student: req.studentId })
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
    res.status(500).json({ success: false, message: 'Erro ao carregar atividades' });
  }
});

// POST /api/portal/join-teacher
// Vincula um aluno existente a um professor via slug do link único
router.post('/join-teacher', authenticateStudent, async (req, res) => {
  try {
    const { slug } = req.body;

    if (!slug || typeof slug !== 'string' || slug.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Slug do professor é obrigatório' });
    }

    const cleanSlug = slug.trim().toLowerCase();

    const teacher = await User.findOne({ slug: cleanSlug, role: 'teacher' })
      .select('name email subscriptionStatus status');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Professor não encontrado. Verifique o link.' });
    }

    const allowedStatuses = ['active', 'trialing', 'incomplete', null, undefined];
    if (!allowedStatuses.includes(teacher.subscriptionStatus)) {
      return res.status(403).json({ success: false, message: 'Este professor não está aceitando novos alunos no momento.' });
    }

    const student = await Student.findById(req.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    if (student.teacher?.toString() === teacher._id.toString()) {
      return res.status(400).json({ success: false, message: 'Você já está vinculado a este professor.' });
    }

    await Student.findByIdAndUpdate(req.studentId, { teacher: teacher._id });
    await cacheService.delPattern(`students:${teacher._id}:*`);

    // Notificar professor por email (fire-and-forget)
    emailService.sendEmail({
      to: teacher.email,
      subject: `Novo aluno vinculado: ${student.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Novo Aluno na Sua Turma!</h2>
          <p>O aluno <strong>${student.name}</strong> acabou de se vincular à sua conta pelo link de cadastro.</p>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nome:</strong> ${student.name}</p>
            ${student.email ? `<p><strong>Email:</strong> ${student.email}</p>` : ''}
          </div>
          <p>Acesse a plataforma para gerenciar o novo aluno.</p>
        </div>
      `
    }).catch(err => console.error('Error notifying teacher:', err));

    res.json({
      success: true,
      message: `Vinculado ao professor ${teacher.name} com sucesso!`,
      teacher: { name: teacher.name, email: teacher.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao vincular ao professor' });
  }
});

export default router;
