import express from 'express';
import Activity from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import LearningSignal from '../models/LearningSignal.js';
import { protect, authorize } from '../middleware/auth.js';
import { recordActivitySubmissionSignals } from '../services/learningSignalsService.js';
import aiAssistantService from '../services/aiAssistantService.js';

const router = express.Router();

const OBJECTIVE_QUESTION_TYPES = new Set(['multiple_choice', 'true_false', 'fill_blank']);

const toId = (value) => value?._id?.toString?.() || value?.id || value?.toString?.() || '';
const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeLoose = (value) => normalizeText(value).toLowerCase();

const serializeAnswer = (answer) => ({
  questionNumber: Number(answer?.questionNumber) || 0,
  answer: String(answer?.answer || ''),
  isCorrect: typeof answer?.isCorrect === 'boolean' ? answer.isCorrect : null,
  pointsEarned: typeof answer?.pointsEarned === 'number' ? answer.pointsEarned : null,
  feedback: answer?.feedback || ''
});

const serializeSubmission = (submission, index) => ({
  submissionIndex: index,
  submittedAt: submission?.submittedAt,
  answers: Array.isArray(submission?.answers)
    ? submission.answers.map(serializeAnswer)
    : [],
  score: Number(submission?.score) || 0,
  percentage: Number(submission?.percentage) || 0,
  autoGraded: Boolean(submission?.autoGraded),
  gradedAt: submission?.gradedAt || null,
  teacherFeedback: submission?.teacherFeedback || ''
});

const serializeQuestion = (question) => ({
  questionNumber: Number(question?.questionNumber) || 0,
  type: question?.type,
  question: question?.question || '',
  difficulty: question?.difficulty || 'medium',
  points: Number(question?.points) || 0,
  options: Array.isArray(question?.options)
    ? question.options.map((option) => ({
      letter: option.letter,
      text: option.text,
      isCorrect: Boolean(option.isCorrect)
    }))
    : [],
  correctAnswer: question?.correctAnswer || '',
  explanation: question?.explanation || '',
  topics: Array.isArray(question?.topics) ? question.topics : []
});

const serializeTeacherActivity = (activity, includeQuestions = false) => {
  const latestSubmission = Array.isArray(activity.submissions) && activity.submissions.length > 0
    ? serializeSubmission(activity.submissions[activity.submissions.length - 1], activity.submissions.length - 1)
    : null;

  return {
    id: toId(activity),
    _id: toId(activity),
    title: activity.title,
    description: activity.description || '',
    type: activity.type,
    status: activity.status,
    dueDate: activity.dueDate,
    totalPoints: Number(activity.totalPoints) || 0,
    studentId: toId(activity.student),
    studentName: activity.student?.name || activity.studentName || '',
    classId: toId(activity.class),
    classTitle: activity.class?.title || activity.classTitle || '',
    aiMetadata: activity.aiMetadata || null,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
    submissionCount: Array.isArray(activity.submissions) ? activity.submissions.length : 0,
    latestSubmission,
    needsReview: Boolean(latestSubmission) && activity.status !== 'graded',
    submissions: Array.isArray(activity.submissions)
      ? activity.submissions.map((submission, index) => serializeSubmission(submission, index))
      : [],
    questions: includeQuestions ? (activity.questions || []).map(serializeQuestion) : undefined
  };
};

const buildPromptQuestionBlock = (question, answer) => {
  const optionsBlock = Array.isArray(question.options) && question.options.length > 0
    ? question.options.map((option) => `- ${option.letter}: ${option.text}${option.isCorrect ? ' [correta]' : ''}`).join('\n')
    : '';

  return [
    `Questão ${question.questionNumber}`,
    `Tipo: ${question.type}`,
    `Pergunta: ${question.question}`,
    optionsBlock ? `Opções:\n${optionsBlock}` : '',
    question.correctAnswer ? `Resposta esperada: ${question.correctAnswer}` : '',
    question.explanation ? `Explicação: ${question.explanation}` : '',
    `Resposta do aluno: ${answer?.answer || 'Sem resposta'}`
  ].filter(Boolean).join('\n');
};

const buildAiReviewPrompt = ({ activity, submission, studentName }) => {
  return `Você é um professor avaliando uma atividade do Nexus Academy.

ALUNO
- Nome: ${studentName || 'Aluno'}

ATIVIDADE
- Título: ${activity.title}
- Tipo: ${activity.type}
- Descrição: ${activity.description || 'Sem descrição'}

QUESTÕES E RESPOSTAS
${activity.questions.map((question) => {
    const answer = submission.answers.find((item) => Number(item.questionNumber) === Number(question.questionNumber));
    return buildPromptQuestionBlock(question, answer);
  }).join('\n\n')}

REGRAS
1. Retorne APENAS JSON válido.
2. Para cada questão, gere:
   - questionNumber
   - isCorrect (boolean)
   - pointsEarned (número entre 0 e os pontos da questão)
   - feedback (comentário curto, pedagógico e objetivo)
3. Gere teacherFeedback com um resumo curto para o aluno.
4. Não invente critérios fora do enunciado.

FORMATO
{
  "answers": [
    {
      "questionNumber": 1,
      "isCorrect": true,
      "pointsEarned": 10,
      "feedback": "string"
    }
  ],
  "teacherFeedback": "string"
}`;
};

const buildFallbackAiReview = ({ activity, submission }) => {
  const answers = (activity.questions || []).map((question) => {
    const submissionAnswer = submission.answers.find((item) => Number(item.questionNumber) === Number(question.questionNumber));
    const typedAnswer = normalizeLoose(submissionAnswer?.answer);
    const maxPoints = Number(question.points) || 0;

    if (!typedAnswer) {
      return {
        questionNumber: question.questionNumber,
        isCorrect: false,
        pointsEarned: 0,
        feedback: 'Resposta em branco. Revise o enunciado e tente justificar melhor na próxima tentativa.'
      };
    }

    if (OBJECTIVE_QUESTION_TYPES.has(question.type)) {
      const expected = question.type === 'multiple_choice'
        ? normalizeLoose(question.options?.find((option) => option.isCorrect)?.letter)
        : normalizeLoose(question.correctAnswer);
      const isCorrect = typedAnswer === expected;

      return {
        questionNumber: question.questionNumber,
        isCorrect,
        pointsEarned: isCorrect ? maxPoints : 0,
        feedback: isCorrect
          ? 'Resposta correta. Você aplicou o conceito esperado na atividade.'
          : `Resposta incorreta. ${question.explanation || 'Revise o conceito principal antes de tentar novamente.'}`
      };
    }

    const evidencePool = [
      normalizeText(question.correctAnswer),
      normalizeText(question.explanation),
      ...(Array.isArray(question.topics) ? question.topics.map(normalizeText) : [])
    ].filter(Boolean).join(' ');
    const expectedTerms = normalizeLoose(evidencePool).split(/[^a-z0-9]+/).filter((term) => term.length >= 4);
    const uniqueTerms = [...new Set(expectedTerms)];
    const hits = uniqueTerms.filter((term) => typedAnswer.includes(term)).length;
    const overlapRatio = uniqueTerms.length > 0 ? hits / uniqueTerms.length : 0;

    let pointsEarned = 0;
    let isCorrect = false;
    let feedback = 'A resposta precisa ficar mais específica e conectar melhor a ideia central da questão.';

    if (overlapRatio >= 0.5 || typedAnswer.length >= 80) {
      pointsEarned = maxPoints;
      isCorrect = true;
      feedback = 'Boa resposta. Você retomou bem a ideia principal e justificou com consistência.';
    } else if (overlapRatio >= 0.2 || typedAnswer.length >= 35) {
      pointsEarned = Math.max(1, Math.round(maxPoints * 0.6));
      feedback = 'A resposta está no caminho certo, mas ainda precisa de mais precisão ou exemplo concreto.';
    }

    return {
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned,
      feedback
    };
  });

  const average = answers.length > 0 && Number(activity.totalPoints) > 0
    ? Math.round((answers.reduce((sum, answer) => sum + Number(answer.pointsEarned || 0), 0) / activity.totalPoints) * 100)
    : 0;

  return {
    answers,
    teacherFeedback: average >= 70
      ? 'Bom trabalho. Continue praticando os pontos em que ainda houve pequena perda de precisão.'
      : 'Revise os comentários por questão e concentre o próximo estudo nos pontos com maior perda de nota.'
  };
};

const sanitizeAiReviewPayload = ({ activity, payload, fallback }) => {
  const fallbackAnswers = Array.isArray(fallback?.answers) ? fallback.answers : [];
  const answers = (activity.questions || []).map((question) => {
    const suggested = Array.isArray(payload?.answers)
      ? payload.answers.find((item) => Number(item.questionNumber) === Number(question.questionNumber))
      : null;
    const fallbackAnswer = fallbackAnswers.find((item) => Number(item.questionNumber) === Number(question.questionNumber));
    const maxPoints = Number(question.points) || 0;
    const isCorrect = typeof suggested?.isCorrect === 'boolean'
      ? suggested.isCorrect
      : (fallbackAnswer?.isCorrect ?? false);
    const rawPoints = Number.isFinite(Number(suggested?.pointsEarned))
      ? Number(suggested.pointsEarned)
      : Number(fallbackAnswer?.pointsEarned || 0);
    const pointsEarned = Math.max(0, Math.min(maxPoints, Math.round(rawPoints)));

    return {
      questionNumber: Number(question.questionNumber),
      isCorrect,
      pointsEarned,
      feedback: normalizeText(suggested?.feedback || fallbackAnswer?.feedback || 'Comentário gerado pela IA.')
    };
  });

  return {
    answers,
    teacherFeedback: normalizeText(payload?.teacherFeedback || fallback?.teacherFeedback || 'Correção revisada com apoio de IA.')
  };
};

const applyReviewToSubmission = ({ activity, submissionIndex, answers, teacherFeedback, reviewMode }) => {
  const submission = activity.submissions[submissionIndex];

  if (!submission) {
    throw new Error('Submissão não encontrada para revisão');
  }

  const reviewedAnswers = (activity.questions || []).map((question) => {
    const currentAnswer = submission.answers.find((item) => Number(item.questionNumber) === Number(question.questionNumber));
    const reviewedAnswer = answers.find((item) => Number(item.questionNumber) === Number(question.questionNumber));
    const maxPoints = Number(question.points) || 0;
    const isCorrect = typeof reviewedAnswer?.isCorrect === 'boolean'
      ? reviewedAnswer.isCorrect
      : (typeof currentAnswer?.isCorrect === 'boolean' ? currentAnswer.isCorrect : false);
    const pointsEarned = reviewedAnswer?.pointsEarned !== undefined && reviewedAnswer?.pointsEarned !== null
      ? Math.max(0, Math.min(maxPoints, Number(reviewedAnswer.pointsEarned)))
      : (isCorrect ? maxPoints : 0);

    return {
      questionNumber: Number(question.questionNumber),
      answer: currentAnswer?.answer || '',
      isCorrect,
      pointsEarned,
      feedback: normalizeText(reviewedAnswer?.feedback || currentAnswer?.feedback || '')
    };
  });

  const score = reviewedAnswers.reduce((sum, answer) => sum + (Number(answer.pointsEarned) || 0), 0);
  submission.answers = reviewedAnswers;
  submission.score = score;
  submission.percentage = activity.totalPoints > 0 ? Math.round((score / activity.totalPoints) * 100) : 0;
  submission.autoGraded = reviewMode === 'ai';
  submission.gradedAt = new Date();
  submission.teacherFeedback = normalizeText(teacherFeedback);
  activity.status = 'graded';

  return submission;
};

const rebuildActivitySignals = async ({ activity, submission }) => {
  await LearningSignal.deleteMany({ activity: activity._id });
  await recordActivitySubmissionSignals({
    activity,
    submission
  });
};

const notifyStudentAboutReview = async ({ activity }) => {
  try {
    await Notification.create({
      teacher: activity.teacher,
      recipientType: 'student',
      recipientId: activity.student,
      recipientName: activity.student?.name || '',
      channel: 'in_app',
      subject: 'Atividade corrigida',
      body: `Sua atividade "${activity.title}" foi corrigida. Abra o portal para ver os comentários do professor.`,
      sentAt: new Date(),
      deliveredAt: new Date(),
      status: 'delivered',
      entityType: 'system',
      providerResponse: {
        type: 'activity_reviewed',
        route: '/portal/dashboard',
        activityId: toId(activity)
      }
    });
  } catch (error) {
    console.error('[Activities] Error notifying student about review:', error);
  }
};

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.get('/teacher', async (req, res) => {
  try {
    const activities = await Activity.find({ teacher: req.user._id })
      .sort({ createdAt: -1 })
      .limit(160)
      .populate('student', 'name')
      .populate('class', 'title')
      .lean();

    return res.json({
      success: true,
      activities: activities.map((activity) => serializeTeacherActivity(activity))
    });
  } catch (error) {
    console.error('[Activities] Error listing teacher activities:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar atividades do professor'
    });
  }
});

router.get('/teacher/:activityId', async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.activityId,
      teacher: req.user._id
    })
      .populate('student', 'name email')
      .populate('class', 'title subject scheduledAt');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Atividade não encontrada'
      });
    }

    return res.json({
      success: true,
      activity: serializeTeacherActivity(activity, true)
    });
  } catch (error) {
    console.error('[Activities] Error loading teacher activity detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar atividade'
    });
  }
});

router.post('/teacher/:activityId/submissions/:submissionIndex/review/ai', async (req, res) => {
  try {
    const submissionIndex = Math.max(0, Number(req.params.submissionIndex) || 0);
    const activity = await Activity.findOne({
      _id: req.params.activityId,
      teacher: req.user._id
    })
      .populate('student', 'name')
      .populate('class', 'title');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Atividade não encontrada'
      });
    }

    const submission = activity.submissions?.[submissionIndex];
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submissão não encontrada'
      });
    }

    const fallbackReview = buildFallbackAiReview({
      activity,
      submission
    });

    if (!aiAssistantService.isConfigured()) {
      return res.json({
        success: true,
        review: fallbackReview,
        providerMode: 'fallback',
        providerModel: 'local-fallback'
      });
    }

    try {
      const response = await aiAssistantService.requestJsonCompletion(
        buildAiReviewPrompt({
          activity,
          submission,
          studentName: activity.student?.name || 'Aluno'
        }),
        {
          temperature: 0.2,
          maxOutputTokens: 1600
        }
      );

      return res.json({
        success: true,
        review: sanitizeAiReviewPayload({
          activity,
          payload: response.json,
          fallback: fallbackReview
        }),
        providerMode: 'live',
        providerModel: response.model
      });
    } catch (error) {
      console.error('[Activities] AI review fallback:', error?.message || error);
      return res.json({
        success: true,
        review: fallbackReview,
        providerMode: 'fallback',
        providerModel: 'local-fallback'
      });
    }
  } catch (error) {
    console.error('[Activities] Error generating AI review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar sugestão de correção'
    });
  }
});

router.put('/teacher/:activityId/submissions/:submissionIndex/review', async (req, res) => {
  try {
    const submissionIndex = Math.max(0, Number(req.params.submissionIndex) || 0);
    const activity = await Activity.findOne({
      _id: req.params.activityId,
      teacher: req.user._id
    })
      .populate('student', 'name email')
      .populate('class', 'title');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Atividade não encontrada'
      });
    }

    if (!activity.submissions?.[submissionIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Submissão não encontrada'
      });
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const teacherFeedback = req.body?.teacherFeedback || '';
    const reviewMode = req.body?.reviewMode === 'ai' ? 'ai' : 'manual';

    const submission = applyReviewToSubmission({
      activity,
      submissionIndex,
      answers,
      teacherFeedback,
      reviewMode
    });

    await activity.save();
    await rebuildActivitySignals({
      activity,
      submission
    });
    await notifyStudentAboutReview({ activity });

    const populatedActivity = await Activity.findById(activity._id)
      .populate('student', 'name email')
      .populate('class', 'title');

    return res.json({
      success: true,
      activity: serializeTeacherActivity(populatedActivity, true)
    });
  } catch (error) {
    console.error('[Activities] Error saving teacher review:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao salvar correção da atividade'
    });
  }
});

export default router;
