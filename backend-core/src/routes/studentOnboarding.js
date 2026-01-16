import express from 'express';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { authenticateStudent } from '../middleware/studentAuth.js';
import {
  SUBJECT_LIST,
  SUBJECTS_BY_CATEGORY,
  getQuestionnaireForSubject,
  getSubjectList,
  getSubjectsByCategory
} from '../data/questionnaireTemplates.js';

const router = express.Router();

/**
 * @swagger
 * /api/student-onboarding/subjects:
 *   get:
 *     summary: Retorna lista de mat‚rias dispon¡veis para sele‡Æo
 *     tags: [Student Onboarding]
 *     responses:
 *       200:
 *         description: Lista de mat‚rias agrupadas por categoria
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
      message: 'Erro ao obter mat‚rias'
    });
  }
});

/**
 * @swagger
 * /api/student-onboarding/select-subject:
 *   post:
 *     summary: Seleciona mat‚ria principal e retorna question rio espec¡fico
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
 *                 description: Nome da mat‚ria selecionada
 *               customSubject:
 *                 type: string
 *                 description: Nome customizado se "Outros" foi selecionado
 *     responses:
 *       200:
 *         description: Question rio espec¡fico da mat‚ria
 */
router.post('/select-subject', authenticateStudent, async (req, res) => {
  try {
    const { subject, customSubject } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Mat‚ria ‚ obrigat¢ria'
      });
    }

    // Se for "Outros", usar o nome customizado
    const subjectName = subject === 'Outros' && customSubject
      ? customSubject.trim().slice(0, 100)
      : subject;

    // Buscar question rio espec¡fico
    const questionnaire = getQuestionnaireForSubject(subjectName);

    // Salvar a mat‚ria selecionada no aluno (parcialmente, antes de completar onboarding)
    await Student.findByIdAndUpdate(req.studentId, {
      $set: {
        'onboarding.subject': subjectName,
        subject: subjectName
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
      message: 'Erro ao selecionar mat‚ria'
    });
  }
});

/**
 * @swagger
 * /api/student-onboarding/get-questionnaire:
 *   post:
 *     summary: Obt‚m question rio para uma mat‚ria espec¡fica
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
 *         description: Question rio da mat‚ria
 */
router.post('/get-questionnaire', (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Mat‚ria ‚ obrigat¢ria'
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
      message: 'Erro ao obter question rio'
    });
  }
});

/**
 * @swagger
 * /api/student-onboarding/submit:
 *   post:
 *     summary: Submete respostas do question rio e completa onboarding
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
        message: 'Mat‚ria ‚ obrigat¢ria'
      });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Respostas sÆo obrigat¢rias'
      });
    }

    // Validar hor rio preferido
    const validSchedules = ['morning', 'afternoon', 'evening', 'flexible'];
    const schedule = validSchedules.includes(preferredSchedule) ? preferredSchedule : 'flexible';

    // Preparar dados do onboarding
    const updateData = {
      subject: String(subject).slice(0, 100),
      'onboarding.completed': true,
      'onboarding.completedAt': new Date(),
      'onboarding.subject': String(subject).slice(0, 100),
      'onboarding.questionnaire': answers,
      'onboarding.answers.studyHoursPerWeek': parseInt(studyHoursPerWeek) || 5,
      'onboarding.answers.preferredSchedule': schedule
    };

    // Extrair informa‡äes relevantes das respostas para campos espec¡ficos
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

    // Criar notifica‡Æo in-app para o professor (se houver professor atribu¡do)
    if (student?.teacher) {
      try {
        await Notification.create({
          teacher: student.teacher._id,
          recipientType: 'teacher',
          recipientId: student.teacher._id,
          recipientName: student.teacher.name,
          channel: 'in_app',
          subject: '?? Novo aluno completou o onboarding!',
          body: `O aluno ${student.name} completou o question rio inicial e est  pronto para come‡ar as aulas de ${subject}. N¡vel: ${answers.level || 'NÆo informado'}. Hor rio preferido: ${schedule === 'morning' ? 'ManhÆ' : schedule === 'afternoon' ? 'Tarde' : schedule === 'evening' ? 'Noite' : 'Flex¡vel'}.`,
          status: 'pending',
          entityType: 'student',
          entityId: student._id
        });
        // DEBUG: console.log(`[Onboarding] ? Notifica‡Æo criada para professor ${student.teacher.name}`);
      } catch (notifError) {
        console.error('[Onboarding] Erro ao criar notifica‡Æo:', notifError);
        // NÆo bloquear o onboarding por erro de notifica‡Æo
      }
    }

    // Criar notifica‡Æo gen‚rica para todos os professores (para alunos sem professor atribu¡do)
    if (!student?.teacher) {
      try {
        // Buscar todos os professores ativos para notificar sobre novo aluno dispon¡vel
        const teachers = await User.find({ role: 'teacher', status: 'active' }).select('_id name').limit(10);

        for (const teacher of teachers) {
          await Notification.create({
            teacher: teacher._id,
            recipientType: 'teacher',
            recipientId: teacher._id,
            recipientName: teacher.name,
            channel: 'in_app',
            subject: '?? Novo aluno dispon¡vel!',
            body: `Um novo aluno (${student.name}) se cadastrou e est  procurando aulas de ${subject}. Seja o primeiro a entrar em contato!`,
            status: 'pending',
            entityType: 'student',
            entityId: student._id
          });
        }
        // DEBUG: console.log(`[Onboarding] ? Notifica‡äes enviadas para ${teachers.length} professores`);
      } catch (notifError) {
        console.error('[Onboarding] Erro ao criar notifica‡äes:', notifError);
      }
    }

    res.json({
      success: true,
      message: 'Onboarding conclu¡do com sucesso! ??',
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
