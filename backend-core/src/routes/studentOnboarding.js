import express from 'express';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { Notification } from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import {
  SUBJECT_LIST,
  SUBJECTS_BY_CATEGORY,
  getQuestionnaireForSubject,
  getSubjectList,
  getSubjectsByCategory
} from '../data/questionnaireTemplates.js';

const router = express.Router();

// Helper para obter JWT secret
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      return 'DEV-ONLY-SECRET-CHANGE-IN-PRODUCTION';
    }
    throw new Error('JWT_SECRET must be defined');
  }
  return secret;
};

// Middleware de autenticação para alunos
function authenticateStudent(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    console.log('[StudentOnboarding Auth] Header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
      console.log('[StudentOnboarding Auth] Decoded token:', {
        type: decoded.type,
        studentId: decoded.studentId ? 'present' : 'missing',
        teacherId: decoded.teacherId || 'none'
      });
    } catch (jwtError) {
      console.error('[StudentOnboarding Auth] JWT Error:', jwtError.name, jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Sessão expirada. Faça login novamente.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (decoded.type !== 'student') {
      console.log('[StudentOnboarding Auth] Access denied - type:', decoded.type, 'expected: student');
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Tipo de token inválido.'
      });
    }

    req.studentId = decoded.studentId;
    req.teacherId = decoded.teacherId;
    next();
  } catch (error) {
    console.error('[StudentOnboarding Auth] Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Erro de autenticação'
    });
  }
}

/**
 * @swagger
 * /api/student-onboarding/subjects:
 *   get:
 *     summary: Retorna lista de matérias disponíveis para seleção
 *     tags: [Student Onboarding]
 *     responses:
 *       200:
 *         description: Lista de matérias agrupadas por categoria
 */
router.get('/subjects', (req, res) => {
  try {
    res.json({
      success: true,
      subjects: getSubjectList(),
      byCategory: getSubjectsByCategory()
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter matérias'
    });
  }
});

/**
 * @swagger
 * /api/student-onboarding/select-subject:
 *   post:
 *     summary: Seleciona matéria principal e retorna questionário específico
 *     tags: [Student Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Nome da matéria selecionada
 *               customSubject:
 *                 type: string
 *                 description: Nome customizado se "Outros" foi selecionado
 *     responses:
 *       200:
 *         description: Questionário específico da matéria
 */
router.post('/select-subject', authenticateStudent, async (req, res) => {
  try {
    const { subject, customSubject } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Matéria é obrigatória'
      });
    }

    // Se for "Outros", usar o nome customizado
    const subjectName = subject === 'Outros' && customSubject 
      ? customSubject.trim().slice(0, 100) 
      : subject;

    // Buscar questionário específico
    const questionnaire = getQuestionnaireForSubject(subjectName);

    // Salvar a matéria selecionada no aluno (parcialmente, antes de completar onboarding)
    await Student.findByIdAndUpdate(req.studentId, {
      $set: {
        'onboarding.subject': subjectName,
        'subject': subjectName
      }
    });

    res.json({
      success: true,
      subject: subjectName,
      questionnaire
    });
  } catch (error) {
    console.error('Select subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao selecionar matéria'
    });
  }
});

/**
 * @swagger
 * /api/student-onboarding/get-questionnaire:
 *   post:
 *     summary: Obtém questionário para uma matéria específica
 *     tags: [Student Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *             properties:
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Questionário da matéria
 */
router.post('/get-questionnaire', (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Matéria é obrigatória'
      });
    }

    const questionnaire = getQuestionnaireForSubject(subject);

    res.json({
      success: true,
      questionnaire
    });
  } catch (error) {
    console.error('Get questionnaire error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter questionário'
    });
  }
});

/**
 * @swagger
 * /api/student-onboarding/submit:
 *   post:
 *     summary: Submete respostas do questionário e completa onboarding
 *     tags: [Student Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - answers
 *             properties:
 *               subject:
 *                 type: string
 *               answers:
 *                 type: object
 *               goals:
 *                 type: array
 *               studyHoursPerWeek:
 *                 type: number
 *               preferredSchedule:
 *                 type: string
 *     responses:
 *       200:
 *         description: Onboarding completo
 */
router.post('/submit', authenticateStudent, async (req, res) => {
  try {
    const { 
      subject, 
      answers, 
      goals,
      studyHoursPerWeek,
      preferredSchedule
    } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Matéria é obrigatória'
      });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Respostas são obrigatórias'
      });
    }

    // Validar horário preferido
    const validSchedules = ['morning', 'afternoon', 'evening', 'flexible'];
    const schedule = validSchedules.includes(preferredSchedule) ? preferredSchedule : 'flexible';

    // Preparar dados do onboarding
    const updateData = {
      'subject': String(subject).slice(0, 100),
      'onboarding.completed': true,
      'onboarding.completedAt': new Date(),
      'onboarding.subject': String(subject).slice(0, 100),
      'onboarding.questionnaire': answers,
      'onboarding.answers.studyHoursPerWeek': parseInt(studyHoursPerWeek) || 5,
      'onboarding.answers.preferredSchedule': schedule
    };

    // Extrair informações relevantes das respostas para campos específicos
    if (answers.level) {
      updateData['onboarding.answers.currentLevel'] = answers.level;
    }
    if (answers.objectives || answers.goal) {
      const objectives = answers.objectives || [answers.goal];
      updateData['onboarding.answers.specificGoals'] = Array.isArray(objectives) 
        ? objectives.slice(0, 10).map(g => String(g).slice(0, 100))
        : [String(objectives).slice(0, 100)];
    }
    if (answers.difficulties || answers.topics) {
      const challenges = answers.difficulties || answers.topics;
      updateData['onboarding.answers.mainChallenges'] = Array.isArray(challenges)
        ? challenges.slice(0, 10).map(c => String(c).slice(0, 100))
        : [String(challenges).slice(0, 100)];
    }
    if (answers.learning_style || answers.learning_preference) {
      updateData['onboarding.answers.learningStyle'] = answers.learning_style || 'mixed';
    }
    if (answers.previous_study || answers.experience) {
      updateData['onboarding.answers.previousExperience'] = String(answers.previous_study || answers.experience || '').slice(0, 500);
    }

    // Processar metas iniciais
    if (goals && Array.isArray(goals) && goals.length > 0) {
      const processedGoals = goals.slice(0, 5).map(goal => ({
        title: String(goal.title || goal).slice(0, 100),
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
          $push: { goals: { $each: processedGoals } }
        }
      );
    } else {
      await Student.findByIdAndUpdate(req.studentId, { $set: updateData });
    }

    // Buscar aluno atualizado para notificar professor
    const student = await Student.findById(req.studentId).populate('teacher', 'name email');

    // Criar notificação in-app para o professor (se houver professor atribuído)
    if (student?.teacher) {
      try {
        await Notification.create({
          teacher: student.teacher._id,
          recipientType: 'teacher',
          recipientId: student.teacher._id,
          recipientName: student.teacher.name,
          channel: 'in_app',
          subject: '🎓 Novo aluno completou o onboarding!',
          body: `O aluno ${student.name} completou o questionário inicial e está pronto para começar as aulas de ${subject}. Nível: ${answers.level || 'Não informado'}. Horário preferido: ${schedule === 'morning' ? 'Manhã' : schedule === 'afternoon' ? 'Tarde' : schedule === 'evening' ? 'Noite' : 'Flexível'}.`,
          status: 'pending',
          entityType: 'student',
          entityId: student._id
        });
        console.log(`[Onboarding] ✅ Notificação criada para professor ${student.teacher.name}`);
      } catch (notifError) {
        console.error('[Onboarding] Erro ao criar notificação:', notifError);
        // Não bloquear o onboarding por erro de notificação
      }
    }

    // Criar notificação genérica para todos os professores (para alunos sem professor atribuído)
    if (!student?.teacher) {
      try {
        // Buscar todos os professores ativos para notificar sobre novo aluno disponível
        const teachers = await User.find({ role: 'teacher', status: 'active' }).select('_id name').limit(10);
        
        for (const teacher of teachers) {
          await Notification.create({
            teacher: teacher._id,
            recipientType: 'teacher',
            recipientId: teacher._id,
            recipientName: teacher.name,
            channel: 'in_app',
            subject: '👋 Novo aluno disponível!',
            body: `Um novo aluno (${student.name}) se cadastrou e está procurando aulas de ${subject}. Seja o primeiro a entrar em contato!`,
            status: 'pending',
            entityType: 'student',
            entityId: student._id
          });
        }
        console.log(`[Onboarding] ✅ Notificações enviadas para ${teachers.length} professores`);
      } catch (notifError) {
        console.error('[Onboarding] Erro ao criar notificações:', notifError);
      }
    }

    res.json({
      success: true,
      message: 'Onboarding concluído com sucesso! 🎉',
      data: {
        subject,
        completedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Submit onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar onboarding. Tente novamente.'
    });
  }
});

export default router;

