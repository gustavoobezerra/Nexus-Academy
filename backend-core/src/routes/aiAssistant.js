import express from 'express';
import aiAssistantService from '../services/aiAssistantService.js';
import { authorize, protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';
import Activity from '../models/Activity.js';
import LessonPreparation from '../models/LessonPreparation.js';
import {
  buildLearningSnapshots,
  buildStudentSubjectSuggestion
} from '../services/learningSignalsService.js';

const router = express.Router();

const models = { User, Student, Class, Payment, Course, Activity, LessonPreparation };

const toId = (value) => value?._id?.toString?.() || value?.id || value?.toString?.() || '';

const serializeClass = (classData) => ({
  ...classData.toObject(),
  id: toId(classData),
  _id: toId(classData),
  studentId: toId(classData.student),
  studentName: classData.studentName || classData.student?.name || '',
  grade: classData.grade || classData.student?.grade || ''
});

const serializeActivity = (activity) => ({
  ...activity.toObject(),
  id: toId(activity),
  _id: toId(activity),
  class: toId(activity.class) || '',
  student: toId(activity.student),
  teacher: toId(activity.teacher),
  studentName: activity.student?.name || '',
  classTitle: activity.class?.title || ''
});

const serializePreparation = (preparation) => ({
  ...preparation.toObject(),
  id: toId(preparation),
  _id: toId(preparation),
  class: toId(preparation.class),
  student: toId(preparation.student),
  teacher: toId(preparation.teacher),
  classTitle: preparation.class?.title || '',
  studentName: preparation.student?.name || ''
});

const getStudentGroups = async (teacherId) => {
  const teacher = await User.findById(teacherId).select('teacherWorkspace.studentGroups').lean();
  return Array.isArray(teacher?.teacherWorkspace?.studentGroups)
    ? teacher.teacherWorkspace.studentGroups
    : [];
};

const resolveRecipients = async ({ teacherId, targetMode, studentIds = [], groupId }) => {
  if (targetMode === 'all') {
    return Student.find({ teacher: teacherId, active: true }).select('name grade subject');
  }

  if (targetMode === 'group') {
    const groups = await getStudentGroups(teacherId);
    const group = groups.find((item) => item.id === groupId);

    if (!group) {
      throw new Error('Grupo de alunos não encontrado.');
    }

    return Student.find({
      teacher: teacherId,
      active: true,
      _id: { $in: group.studentIds }
    }).select('name grade subject');
  }

  return Student.find({
    teacher: teacherId,
    active: true,
    _id: { $in: studentIds }
  }).select('name grade subject');
};

const buildWorkspaceData = async (teacherId) => {
  const [students, classes, payments, activities, lessonPreparations, studentGroups] = await Promise.all([
    Student.find({ teacher: teacherId, active: true }).sort({ createdAt: -1 }).lean(),
    Class.find({ teacher: teacherId })
      .sort({ scheduledAt: -1 })
      .populate('student', 'name grade')
      .lean(),
    Payment.find({ teacher: teacherId })
      .sort({ dueDate: -1 })
      .populate('student', 'name')
      .lean(),
    Activity.find({ teacher: teacherId })
      .sort({ createdAt: -1 })
      .populate('student', 'name')
      .populate('class', 'title')
      .lean(),
    LessonPreparation.find({ teacher: teacherId })
      .sort({ createdAt: -1 })
      .populate('student', 'name')
      .populate('class', 'title scheduledAt')
      .lean(),
    getStudentGroups(teacherId)
  ]);

  const serializedStudents = students.map((student) => ({
    ...student,
    id: toId(student),
    _id: toId(student)
  }));
  const learningSnapshots = await buildLearningSnapshots({
    teacherId,
    studentIds: serializedStudents.map((student) => student._id)
  });

  return {
    provider: aiAssistantService.getProviderStatus(),
    students: serializedStudents,
    classes: classes.map((classData) => ({
      ...classData,
      id: toId(classData),
      _id: toId(classData),
      studentId: toId(classData.student),
      studentName: classData.studentName || classData.student?.name || '',
      grade: classData.grade || classData.student?.grade || ''
    })),
    payments: payments.map((payment) => ({
      ...payment,
      id: toId(payment),
      _id: toId(payment),
      studentId: toId(payment.student),
      studentName: payment.student?.name || ''
    })),
    activities: activities.map((activity) => ({
      ...activity,
      id: toId(activity),
      _id: toId(activity),
      class: toId(activity.class) || '',
      student: toId(activity.student),
      teacher: toId(activity.teacher),
      studentName: activity.student?.name || '',
      classTitle: activity.class?.title || ''
    })),
    lessonPreparations: lessonPreparations.map((preparation) => ({
      ...preparation,
      id: toId(preparation),
      _id: toId(preparation),
      class: toId(preparation.class),
      student: toId(preparation.student),
      teacher: toId(preparation.teacher),
      classTitle: preparation.class?.title || '',
      studentName: preparation.student?.name || ''
    })),
    learningSnapshots,
    studentGroups,
    counts: {
      students: students.length,
      classes: classes.length,
      payments: payments.length,
      activities: activities.length,
      lessonPreparations: lessonPreparations.length,
      studentGroups: studentGroups.length
    }
  };
};

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.get('/provider-status', async (_req, res) => {
  res.json({ success: true, provider: aiAssistantService.getProviderStatus() });
});

router.get('/workspace-data', async (req, res) => {
  try {
    const data = await buildWorkspaceData(req.user._id);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[AI] workspace-data error:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar dados do AI Hub' });
  }
});

router.get('/students/:studentId/subject-suggestion', async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.studentId,
      teacher: req.user._id,
      active: true
    })
      .select('name subject grade performance')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Aluno não encontrado para sugestão pedagógica'
      });
    }

    const studentClasses = await Class.find({
      teacher: req.user._id,
      student: student._id
    })
      .sort({ scheduledAt: -1 })
      .limit(10)
      .select('title subject topic scheduledAt')
      .lean();

    const suggestion = await buildStudentSubjectSuggestion({
      teacherId: req.user._id,
      student,
      classes: studentClasses
    });

    res.json({
      success: true,
      ...suggestion
    });
  } catch (error) {
    console.error('[AI] subject-suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao montar sugestão pedagógica'
    });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mensagem é obrigatória'
      });
    }

    const response = await aiAssistantService.processMessage(req.user._id, String(message), models);
    res.json(response);
  } catch (error) {
    console.error('[AI] chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar mensagem'
    });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await aiAssistantService.getQuickSuggestions(req.user._id, models);
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('[AI] suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter sugestões'
    });
  }
});

router.post('/generate-activity', async (req, res) => {
  try {
    const { lessonTopic, lessonSubject } = req.body;

    if (!lessonTopic || !lessonSubject) {
      return res.status(400).json({
        success: false,
        message: 'lessonTopic e lessonSubject são obrigatórios'
      });
    }

    const result = await aiAssistantService.generateActivity(req.body);

    res.json({
      success: true,
      activityTemplate: {
        title: result.title,
        description: result.description,
        questions: result.questions,
        batchId: result.batchId
      },
      providerMode: result.providerMode,
      providerModel: result.providerModel,
      qualityReport: result.qualityReport
    });
  } catch (error) {
    console.error('[AI] generate-activity error:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar atividade' });
  }
});

router.post('/publish-activity', async (req, res) => {
  try {
    const {
      title,
      description,
      type = 'exercise',
      questions,
      dueDate,
      classId,
      assignmentTarget = {},
      aiMetadata = {},
      batchId
    } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Título e questões são obrigatórios'
      });
    }

    const targetMode = assignmentTarget.mode || 'specific';
    const recipients = await resolveRecipients({
      teacherId: req.user._id,
      targetMode,
      studentIds: assignmentTarget.studentIds || [],
      groupId: assignmentTarget.groupId
    });

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum aluno foi encontrado para o destino selecionado'
      });
    }

    const activityBatchId = batchId || aiMetadata.batchId || `batch_${Date.now()}`;
    const dueAt = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const activities = await Promise.all(recipients.map(async (student) => {
      let linkedClass = null;

      if (classId) {
        linkedClass = await Class.findOne({ _id: classId, teacher: req.user._id }).select('_id');
      }

      if (!linkedClass) {
        linkedClass = await Class.findOne({
          teacher: req.user._id,
          student: student._id
        })
          .sort({ scheduledAt: -1 })
          .select('_id');
      }

      return Activity.create({
        class: linkedClass?._id || null,
        student: student._id,
        teacher: req.user._id,
        title,
        description,
        type,
        questions,
        dueDate: dueAt,
        status: 'published',
        generatedByAI: true,
        aiMetadata: {
          sourceTranscript: aiMetadata.sourceTranscript || description || '',
          topics: Array.isArray(aiMetadata.topics) && aiMetadata.topics.length > 0
            ? aiMetadata.topics
            : [aiMetadata.subject || 'Geral'],
          generatedAt: new Date(),
          providerMode: aiMetadata.providerMode || 'fallback',
          sourceType: aiMetadata.sourceType || 'manual',
          batchId: activityBatchId,
          targetMode,
          gradeLevel: aiMetadata.gradeLevel || student.grade || '',
          learningObjective: aiMetadata.learningObjective || '',
          reviewed: true,
          reviewedAt: new Date(),
          reviewedBy: req.user._id
        }
      });
    }));

    const populatedActivities = await Activity.find({
      _id: { $in: activities.map((activity) => activity._id) }
    })
      .populate('student', 'name')
      .populate('class', 'title');

    res.status(201).json({
      success: true,
      activities: populatedActivities.map(serializeActivity),
      recipients: recipients.map((student) => ({
        id: toId(student),
        name: student.name
      })),
      batchId: activityBatchId
    });
  } catch (error) {
    console.error('[AI] publish-activity error:', error);
    res.status(500).json({ success: false, message: error.message || 'Erro ao publicar atividade' });
  }
});

router.post('/lesson-preparations/generate', async (req, res) => {
  try {
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId é obrigatório' });
    }

    const classData = await Class.findOne({
      _id: classId,
      teacher: req.user._id
    }).populate('student', 'name grade subject performance');

    if (!classData || !classData.student) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada' });
    }

    const previousClasses = await Class.find({
      teacher: req.user._id,
      student: classData.student._id,
      _id: { $ne: classData._id }
    })
      .sort({ scheduledAt: -1 })
      .limit(5)
      .lean();

    const generatedFallback = await LessonPreparation.generatePreparation(
      classData.toObject(),
      classData.student.toObject(),
      previousClasses
    );

    const fallbackPreparation = {
      class: classData._id,
      student: classData.student._id,
      teacher: req.user._id,
      ...generatedFallback,
      generatedByAI: true,
      aiMetadata: {
        ...(generatedFallback.aiMetadata || {}),
        generatedAt: new Date(),
        providerMode: 'fallback'
      }
    };

    const generated = await aiAssistantService.generateLessonPreparationDraft({
      classData: classData.toObject(),
      studentData: classData.student.toObject(),
      previousClasses,
      fallbackPreparation
    });

    const preparation = await LessonPreparation.create(generated.preparation);
    classData.lessonPlan = preparation._id;
    await classData.save();

    const populatedPreparation = await LessonPreparation.findById(preparation._id)
      .populate('student', 'name')
      .populate('class', 'title scheduledAt');

    res.status(201).json({
      success: true,
      preparation: serializePreparation(populatedPreparation),
      providerMode: generated.providerMode,
      providerModel: generated.providerModel
    });
  } catch (error) {
    console.error('[AI] lesson-preparations generate error:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar preparação de aula' });
  }
});

router.put('/lesson-preparations/:id/review', async (req, res) => {
  try {
    const { approved = true, notes = '', modifications = [] } = req.body;

    const preparation = await LessonPreparation.findOne({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Preparação não encontrada' });
    }

    preparation.teacherReview = {
      reviewed: true,
      reviewedAt: new Date(),
      modifications: Array.isArray(modifications) ? modifications.map((item) => String(item)) : [],
      approved: Boolean(approved),
      notes: String(notes || '')
    };
    preparation.status = approved ? 'ready' : 'draft';

    await preparation.save();
    await Class.findOneAndUpdate(
      { _id: preparation.class, teacher: req.user._id },
      { lessonPlan: preparation._id }
    );

    const populatedPreparation = await LessonPreparation.findById(preparation._id)
      .populate('student', 'name')
      .populate('class', 'title scheduledAt');

    res.json({
      success: true,
      preparation: serializePreparation(populatedPreparation)
    });
  } catch (error) {
    console.error('[AI] lesson-preparations review error:', error);
    res.status(500).json({ success: false, message: 'Erro ao revisar preparação de aula' });
  }
});

router.get('/student-groups', async (req, res) => {
  try {
    const studentGroups = await getStudentGroups(req.user._id);
    res.json({ success: true, studentGroups });
  } catch (error) {
    console.error('[AI] student-groups error:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar grupos' });
  }
});

router.post('/student-groups', async (req, res) => {
  try {
    const group = {
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      color: String(req.body.color || '#4f46e5'),
      studentIds: Array.isArray(req.body.studentIds) ? req.body.studentIds.map((item) => String(item)) : [],
      suggestedByAI: Boolean(req.body.suggestedByAI),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!group.name || group.studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nome e alunos do grupo são obrigatórios'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: { 'teacherWorkspace.studentGroups': group }
    });

    res.status(201).json({ success: true, studentGroup: group });
  } catch (error) {
    console.error('[AI] create student-group error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar grupo' });
  }
});

router.put('/student-groups/:id', async (req, res) => {
  try {
    const existingGroups = await getStudentGroups(req.user._id);
    const currentGroup = existingGroups.find((group) => group.id === req.params.id);

    if (!currentGroup) {
      return res.status(404).json({ success: false, message: 'Grupo não encontrado' });
    }

    const nextGroup = {
      ...currentGroup,
      name: String(req.body.name || currentGroup.name).trim(),
      description: String(req.body.description || currentGroup.description || '').trim(),
      color: String(req.body.color || currentGroup.color || '#4f46e5'),
      studentIds: Array.isArray(req.body.studentIds)
        ? req.body.studentIds.map((item) => String(item))
        : currentGroup.studentIds,
      updatedAt: new Date()
    };

    await User.findOneAndUpdate(
      { _id: req.user._id, 'teacherWorkspace.studentGroups.id': req.params.id },
      { $set: { 'teacherWorkspace.studentGroups.$': nextGroup } }
    );

    res.json({ success: true, studentGroup: nextGroup });
  } catch (error) {
    console.error('[AI] update student-group error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar grupo' });
  }
});

router.delete('/student-groups/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { 'teacherWorkspace.studentGroups': { id: req.params.id } }
    });

    res.json({ success: true, message: 'Grupo removido com sucesso' });
  } catch (error) {
    console.error('[AI] delete student-group error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover grupo' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const history = aiAssistantService.getHistory(req.user._id.toString());
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

router.delete('/history', async (req, res) => {
  try {
    aiAssistantService.clearHistory(req.user._id.toString());
    res.json({ success: true, message: 'Histórico limpo' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

export default router;
