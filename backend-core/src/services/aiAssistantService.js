/**
 * Serviço central do AI Hub.
 */

import axios from 'axios';

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const PRIMARY_GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const FALLBACK_GEMINI_MODELS = String(
  process.env.GEMINI_MODEL_FALLBACKS || 'gemini-2.5-flash-lite,gemini-2.5-pro,gemini-2.0-flash'
)
  .split(',')
  .map((model) => String(model || '').trim())
  .filter(Boolean);
const GEMINI_MODELS = [
  PRIMARY_GEMINI_MODEL,
  ...FALLBACK_GEMINI_MODELS
].filter(Boolean).filter((model, index, models) => models.indexOf(model) === index);
const LOCAL_FALLBACK_MODEL = 'local-fallback';
const LIVE_PROVIDER_HEALTH = ['healthy', 'degraded'];

const PLACEHOLDER_PATTERN = /op(c|ç)(a|ã)o\s+[a-d]|placeholder|alternativa correta|conceito principal/i;
const STOPWORDS = new Set([
  'para', 'como', 'mais', 'menos', 'com', 'sem', 'uma', 'uns', 'das', 'dos', 'que',
  'isso', 'essa', 'esse', 'aula', 'sobre', 'tema', 'foi', 'sao', 'são', 'por',
  'entre', 'depois', 'antes', 'durante', 'quando', 'onde', 'qual', 'quais', 'porque',
  'objetivo', 'objetivos', 'conteudo', 'conteúdo', 'matéria', 'materia'
]);

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeRichText = (value) => String(value || '')
  .replace(/\r/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const createBatchId = () => `aih_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const uniqueNonEmpty = (values) => {
  const normalizedValues = values
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);

  return [...new Set(normalizedValues)];
};

const firstSentence = (text) => {
  const normalizedText = normalizeWhitespace(text);
  if (!normalizedText) {
    return '';
  }

  const sentence = normalizedText.split(/[.!?]/).map((item) => item.trim()).find(Boolean);
  return sentence ? `${sentence}.` : normalizedText;
};

const capitalize = (value) => {
  const normalizedValue = normalizeWhitespace(value);
  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
};

const extractConcepts = (text) => {
  const terms = normalizeWhitespace(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4 && !STOPWORDS.has(term));

  return uniqueNonEmpty(terms).slice(0, 8);
};

const buildQuestionMix = (questionCount, questionMix = {}) => {
  const safeCount = Math.max(4, Math.min(8, Number(questionCount) || 6));
  const normalizedMix = {
    multiple_choice: Math.max(0, Number(questionMix.multiple_choice) || 3),
    true_false: Math.max(0, Number(questionMix.true_false) || 1),
    essay: Math.max(0, Number(questionMix.essay) || 1),
    fill_blank: Math.max(0, Number(questionMix.fill_blank) || 1)
  };

  const total = Object.values(normalizedMix).reduce((sum, value) => sum + value, 0);

  if (total === safeCount) {
    return normalizedMix;
  }

  const result = {
    multiple_choice: 0,
    true_false: 0,
    essay: 0,
    fill_blank: 0
  };

  const orderedTypes = ['multiple_choice', 'essay', 'true_false', 'fill_blank'];
  let remaining = safeCount;
  let index = 0;

  while (remaining > 0) {
    result[orderedTypes[index % orderedTypes.length]] += 1;
    remaining -= 1;
    index += 1;
  }

  return result;
};

const isRetriableProviderError = (error) => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || '').toUpperCase();

  if (status >= 500) {
    return true;
  }

  return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
};

const isProviderModelFallbackError = (error) => {
  const status = Number(error?.response?.status || 0);
  const providerCode = String(error?.response?.data?.error?.status || '').toUpperCase();
  const providerMessage = String(
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || ''
  ).toLowerCase();

  if (isRetriableProviderError(error)) {
    return true;
  }

  if ([400, 404, 408, 409, 425, 429].includes(status)) {
    return true;
  }

  return providerCode === 'RESOURCE_EXHAUSTED'
    || providerCode === 'NOT_FOUND'
    || providerCode === 'FAILED_PRECONDITION'
    || /quota|resource exhausted|rate limit|model|not found|unsupported/.test(providerMessage);
};

const isFatalProviderConfigurationError = (error) => {
  const status = Number(error?.response?.status || 0);
  return [401, 403].includes(status);
};

const isRetriableProviderFailure = (failure) => {
  const status = Number(failure?.status || 0);
  const code = String(failure?.code || '').toUpperCase();

  if (status >= 500 || [404, 408, 409, 425, 429].includes(status)) {
    return true;
  }

  return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'RESOURCE_EXHAUSTED', 'NOT_FOUND'].includes(code);
};

const serializeProviderFailure = (error, model) => {
  const status = Number(error?.response?.status || 0) || null;
  const providerMessage = error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || 'Provider request failed';

  return {
    model,
    status,
    code: String(error?.code || error?.response?.data?.error?.status || 'UNKNOWN_ERROR'),
    message: String(providerMessage),
    capturedAt: new Date().toISOString()
  };
};

const sanitizeQuestion = (question, index, input) => {
  const type = ['multiple_choice', 'essay', 'true_false', 'fill_blank'].includes(question?.type)
    ? question.type
    : 'multiple_choice';

  const baseQuestion = {
    questionNumber: index + 1,
    type,
    question: normalizeWhitespace(question?.question),
    difficulty: ['easy', 'medium', 'hard'].includes(question?.difficulty) ? question.difficulty : 'medium',
    points: Number(question?.points) > 0 ? Number(question.points) : (type === 'hard' ? 25 : type === 'essay' ? 15 : 10),
    explanation: normalizeWhitespace(question?.explanation),
    topics: uniqueNonEmpty([
      input.lessonSubject,
      input.lessonTopic,
      ...(Array.isArray(question?.topics) ? question.topics : [])
    ])
  };

  if (type === 'multiple_choice' || type === 'true_false') {
    const options = Array.isArray(question?.options) ? question.options : [];
    const normalizedOptions = options
      .map((option) => ({
        letter: String(option?.letter || '').trim().toUpperCase().slice(0, 1),
        text: normalizeWhitespace(option?.text),
        isCorrect: Boolean(option?.isCorrect)
      }))
      .filter((option) => option.letter && option.text);

    return {
      ...baseQuestion,
      options: normalizedOptions
    };
  }

  return {
    ...baseQuestion,
    correctAnswer: normalizeWhitespace(question?.correctAnswer)
  };
};

const isHighQualityQuestionSet = (questions, input) => {
  if (!Array.isArray(questions) || questions.length < 4) {
    return false;
  }

  const topicTokens = extractConcepts(`${input.lessonTopic} ${input.lessonDescription} ${input.learningObjective}`);

  return questions.every((question) => {
    if (!question.question || question.question.length < 18) {
      return false;
    }

    const questionText = normalizeWhitespace(question.question).toLowerCase();
    const mentionsTopic = topicTokens.length === 0 || topicTokens.some((token) => questionText.includes(token));

    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        return false;
      }

      const correctOptions = question.options.filter((option) => option.isCorrect);

      if (correctOptions.length !== 1) {
        return false;
      }

      const invalidOption = question.options.some((option) => !option.text || option.text.length < 8 || PLACEHOLDER_PATTERN.test(option.text));

      return !invalidOption && mentionsTopic;
    }

    if (!question.correctAnswer || question.correctAnswer.length < 8) {
      return false;
    }

    return mentionsTopic;
  });
};

class AIAssistantService {
  constructor() {
    this.conversationHistory = new Map();
    this.maxHistoryLength = 20;
    this.providerHealth = this.isConfigured() ? 'degraded' : 'fallback-only';
    this.lastProviderCheckAt = null;
    this.lastSuccessfulModel = null;
    this.lastProviderFailure = null;
  }

  isConfigured() {
    return Boolean(GEMINI_API_KEY);
  }

  getProviderStatus() {
    const configured = this.isConfigured();
    const health = configured ? this.providerHealth : 'fallback-only';

    return {
      provider: 'gemini',
      configured,
      available: configured && LIVE_PROVIDER_HEALTH.includes(health),
      mode: configured && LIVE_PROVIDER_HEALTH.includes(health) ? 'live' : 'fallback',
      health,
      primaryModel: PRIMARY_GEMINI_MODEL,
      fallbackModels: GEMINI_MODELS.filter((model) => model !== PRIMARY_GEMINI_MODEL),
      models: GEMINI_MODELS,
      lastCheckedAt: this.lastProviderCheckAt,
      providerModel: this.lastSuccessfulModel,
      lastError: this.lastProviderFailure
    };
  }

  getConversationKey(actorId, scope = 'teacher') {
    return `${scope}:${actorId}`;
  }

  async requestTextCompletion(prompt, options = {}) {
    if (!this.isConfigured()) {
      this.registerProviderFallback({
        code: 'NOT_CONFIGURED',
        message: 'Provider not configured'
      });
      throw new Error('Provider not configured');
    }

    let lastError = null;
    const failures = [];

    for (const [index, model] of GEMINI_MODELS.entries()) {
      try {
        const response = await axios.post(
          `${GEMINI_API_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.65,
              topK: 32,
              topP: 0.92,
              maxOutputTokens: options.maxOutputTokens ?? 2048
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: options.timeoutMs ?? 15000
          }
        );

        const text = response?.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();

        if (text) {
          this.registerProviderSuccess(model, {
            degraded: index > 0,
            previousFailure: failures[0] || null
          });
          return {
            text,
            model
          };
        }

        const emptyResponseError = new Error('Provider returned empty content');
        const failure = serializeProviderFailure(emptyResponseError, model);
        failures.push(failure);
        this.registerProviderFailure(failure);
        lastError = emptyResponseError;
      } catch (error) {
        const failure = serializeProviderFailure(error, model);
        failures.push(failure);
        this.registerProviderFailure(failure);
        lastError = error;

        if (isFatalProviderConfigurationError(error)) {
          break;
        }

        if (isProviderModelFallbackError(error)) {
          continue;
        }

        break;
      }
    }

    this.registerProviderFallback({
      code: failures[failures.length - 1]?.code || 'PROVIDER_CHAIN_FAILED',
      message: failures[failures.length - 1]?.message || lastError?.message || 'Provider chain exhausted'
    });

    throw lastError || new Error('No provider response');
  }

  async requestJsonCompletion(prompt, options = {}) {
    const response = await this.requestTextCompletion(prompt, options);
    const rawText = response.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return {
      model: response.model,
      json: JSON.parse(rawText)
    };
  }

  registerProviderSuccess(model, options = {}) {
    this.providerHealth = options.degraded ? 'degraded' : 'healthy';
    this.lastProviderCheckAt = new Date().toISOString();
    this.lastSuccessfulModel = model;
    this.lastProviderFailure = options.degraded ? options.previousFailure || null : null;
  }

  registerProviderFailure(failure) {
    this.providerHealth = isRetriableProviderFailure(failure)
      ? 'degraded'
      : 'fallback-only';
    this.lastProviderCheckAt = new Date().toISOString();
    this.lastProviderFailure = failure;
  }

  registerProviderFallback(failure) {
    this.providerHealth = 'fallback-only';
    this.lastProviderCheckAt = new Date().toISOString();
    this.lastProviderFailure = {
      model: LOCAL_FALLBACK_MODEL,
      status: null,
      code: failure.code || 'FALLBACK_ONLY',
      message: failure.message || 'Fallback local em uso',
      capturedAt: new Date().toISOString()
    };
  }

  async getTeacherContext(teacherId, models) {
    const { User, Student, Class, Payment, Course, Activity, LessonPreparation } = models;

    try {
      const [teacher, students, recentClasses, recentPayments, courses, activities, lessonPreparations] = await Promise.all([
        User.findById(teacherId).select('name email teacherWorkspace.studentGroups'),
        Student.find({ teacher: teacherId, active: true })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('name email grade subject performance points paymentStatus'),
        Class.find({ teacher: teacherId })
          .sort({ scheduledAt: -1 })
          .limit(12)
          .populate('student', 'name grade')
          .select('title subject scheduledAt status duration student studentName grade'),
        Payment.find({ teacher: teacherId })
          .sort({ dueDate: -1 })
          .limit(12)
          .populate('student', 'name')
          .select('amount status dueDate student'),
        Course.find({ teacher: teacherId }).limit(5).select('title enrollments'),
        Activity.find({ teacher: teacherId })
          .sort({ createdAt: -1 })
          .limit(12)
          .populate('student', 'name')
          .select('title status student dueDate totalPoints aiMetadata'),
        LessonPreparation
          ? LessonPreparation.find({ teacher: teacherId })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate('student', 'name')
            .populate('class', 'title scheduledAt')
          : Promise.resolve([])
      ]);

      return {
        teacher: {
          name: teacher?.name,
          email: teacher?.email
        },
        students: {
          total: students.length,
          list: students.map((student) => ({
            id: student._id?.toString(),
            name: student.name,
            grade: student.grade,
            subject: student.subject,
            paymentStatus: student.paymentStatus,
            performance: student.performance?.overall || 0,
            points: student.points || 0
          }))
        },
        recentClasses: recentClasses.map((item) => ({
          id: item._id?.toString(),
          title: item.title,
          subject: item.subject,
          scheduledAt: item.scheduledAt,
          status: item.status,
          studentName: item.studentName || item.student?.name || ''
        })),
        recentPayments: recentPayments.map((item) => ({
          amount: item.amount,
          status: item.status,
          dueDate: item.dueDate,
          studentName: item.student?.name || ''
        })),
        courses: {
          total: courses.length,
          totalEnrollments: courses.reduce((sum, course) => sum + (course.enrollments?.length || 0), 0)
        },
        activities: activities.map((activity) => ({
          title: activity.title,
          status: activity.status,
          studentName: activity.student?.name || '',
          dueDate: activity.dueDate,
          totalPoints: activity.totalPoints || 0
        })),
        lessonPreparations: lessonPreparations.map((preparation) => ({
          topic: preparation.topic,
          status: preparation.status,
          studentName: preparation.student?.name || '',
          classTitle: preparation.class?.title || ''
        })),
        studentGroups: Array.isArray(teacher?.teacherWorkspace?.studentGroups)
          ? teacher.teacherWorkspace.studentGroups
          : []
      };
    } catch (error) {
      console.error('[AI] Error getting teacher context:', error);
      return null;
    }
  }

  async getStudentContext(studentId, models) {
    const { Student, Class, Payment, Activity, User } = models;

    try {
      const student = await Student.findById(studentId)
        .populate('teacher', 'name email subjects')
        .lean();

      if (!student) {
        return null;
      }

      const [upcomingClasses, recentActivities, payments] = await Promise.all([
        Class.find({ student: studentId })
          .sort({ scheduledAt: 1 })
          .limit(5)
          .select('title subject scheduledAt status duration'),
        Activity.find({ student: studentId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title type status dueDate'),
        Payment.find({ student: studentId })
          .sort({ dueDate: -1 })
          .limit(5)
          .select('amount status dueDate paidAt month year')
      ]);

      let teacher = student.teacher;

      if (!teacher && student.teacher) {
        teacher = await User.findById(student.teacher).select('name email subjects').lean();
      }

      return {
        student: {
          name: student.name,
          grade: student.grade,
          subject: student.subject,
          points: student.points || 0,
          level: student.level || 1,
          performance: student.performance?.overall || 0,
          onboardingCompleted: student.onboarding?.completed || false
        },
        teacher: {
          name: teacher?.name || 'Professor',
          email: teacher?.email || '',
          subjects: teacher?.subjects || []
        },
        upcomingClasses: upcomingClasses.map((item) => ({
          title: item.title,
          subject: item.subject,
          scheduledAt: item.scheduledAt,
          status: item.status,
          duration: item.duration
        })),
        recentActivities: recentActivities.map((item) => ({
          title: item.title,
          type: item.type,
          status: item.status,
          dueDate: item.dueDate
        })),
        payments: payments.map((item) => ({
          amount: item.amount,
          status: item.status,
          dueDate: item.dueDate
        }))
      };
    } catch (error) {
      console.error('[AI] Error getting student context:', error);
      return null;
    }
  }

  async processMessage(teacherId, message, models) {
    return this.processTeacherMessage(teacherId, message, models);
  }

  async processTeacherMessage(teacherId, message, models) {
    return this.processActorMessage({
      actorType: 'teacher',
      actorId: teacherId,
      message,
      models
    });
  }

  async processStudentMessage(studentId, message, models) {
    return this.processActorMessage({
      actorType: 'student',
      actorId: studentId,
      message,
      models
    });
  }

  async processActorMessage({ actorType, actorId, message, models }) {
    const context = actorType === 'teacher'
      ? await this.getTeacherContext(actorId, models)
      : await this.getStudentContext(actorId, models);

    const history = this.getHistory(actorId, actorType);
    const safeMessage = normalizeWhitespace(message);
    const systemPrompt = actorType === 'teacher'
      ? this.buildSystemPrompt(context)
      : this.buildStudentSystemPrompt(context);

    if (!safeMessage) {
      return {
        success: false,
        message: 'Mensagem é obrigatória'
      };
    }

    if (!this.isConfigured()) {
      const fallbackMessage = this.generateOfflineResponse({
        actorType,
        context,
        message: safeMessage
      });

      this.updateHistory(actorId, safeMessage, fallbackMessage, actorType);

      return {
        success: true,
        message: fallbackMessage,
        timestamp: new Date().toISOString(),
        providerMode: 'fallback',
        providerModel: LOCAL_FALLBACK_MODEL,
        mock: true
      };
    }

    try {
      const historyText = history
        .slice(-this.maxHistoryLength)
        .map((item) => `${item.role === 'assistant' ? 'Assistente' : 'Usuário'}: ${item.content}`)
        .join('\n');

      const prompt = [
        systemPrompt,
        historyText ? `HISTÓRICO RECENTE:\n${historyText}` : '',
        `MENSAGEM ATUAL:\n${safeMessage}`,
        'Responda em português brasileiro, de forma clara, prática e curta quando possível.'
      ].filter(Boolean).join('\n\n');

      const response = await this.requestTextCompletion(prompt, {
        temperature: 0.55,
        maxOutputTokens: 1024
      });

      const aiMessage = normalizeWhitespace(response.text);
      this.updateHistory(actorId, safeMessage, aiMessage, actorType);

      return {
        success: true,
        message: aiMessage,
        timestamp: new Date().toISOString(),
        providerMode: 'live',
        providerModel: response.model
      };
    } catch (error) {
      console.error('[AI] Chat provider error:', error?.response?.data || error?.message || error);

      const fallbackMessage = this.generateOfflineResponse({
        actorType,
        context,
        message: safeMessage
      });

      this.updateHistory(actorId, safeMessage, fallbackMessage, actorType);

      return {
        success: true,
        message: fallbackMessage,
        timestamp: new Date().toISOString(),
        providerMode: 'fallback',
        providerModel: LOCAL_FALLBACK_MODEL,
        mock: true
      };
    }
  }

  buildSystemPrompt(context) {
    if (!context) {
      return 'Você é um assistente pedagógico e operacional do Nexus Academy. Responda em português brasileiro com foco prático.';
    }

    return `Você é o assistente canônico do AI Hub do Nexus Academy para professores.

CONTEXTO DO PROFESSOR
- Nome: ${context.teacher?.name || 'Professor'}
- Alunos ativos: ${context.students?.total || 0}
- Aulas recentes: ${context.recentClasses?.length || 0}
- Atividades recentes: ${context.activities?.length || 0}
- Pagamentos recentes: ${context.recentPayments?.length || 0}
- Grupos de alunos: ${context.studentGroups?.length || 0}

SINAIS IMPORTANTES
- Alunos: ${(context.students?.list || []).map((student) => `${student.name} (${student.grade}, desempenho ${student.performance}%)`).join('; ') || 'nenhum'}
- Pagamentos: ${(context.recentPayments || []).map((payment) => `${payment.studentName || 'Aluno'}: ${payment.status}`).join('; ') || 'nenhum'}

SEU PAPEL
1. Priorizar o que o professor deve fazer agora.
2. Explicar como usar os módulos do AI Hub.
3. Sugerir ações pedagógicas, operacionais e de relacionamento.
4. Nunca inventar dados fora do contexto.
5. Quando faltar contexto, deixar isso explícito e sugerir o próximo passo no sistema.`;
  }

  buildStudentSystemPrompt(context) {
    if (!context) {
      return 'Você é um tutor educacional do Nexus Academy. Responda em português brasileiro com orientação prática e objetiva.';
    }

    return `Você é um tutor educacional do Nexus Academy ajudando um aluno.

CONTEXTO DO ALUNO
- Nome: ${context.student?.name || 'Aluno'}
- Matéria principal: ${context.student?.subject || 'não definida'}
- Série/Nível: ${context.student?.grade || 'não definido'}
- Pontos: ${context.student?.points || 0}
- Nível: ${context.student?.level || 1}
- Desempenho atual: ${context.student?.performance || 0}%
- Professor: ${context.teacher?.name || 'Professor'}

PRÓXIMAS AULAS
${(context.upcomingClasses || []).map((item) => `- ${item.title} em ${item.scheduledAt}`).join('\n') || '- Nenhuma aula agendada'}

ATIVIDADES RECENTES
${(context.recentActivities || []).map((item) => `- ${item.title} (${item.status})`).join('\n') || '- Nenhuma atividade recente'}

INSTRUÇÕES
- Ajude com organização, revisão e entendimento de atividades.
- Sugira passos curtos.
- Se houver algo pendente, deixe claro o que fazer primeiro.`;
  }

  generateOfflineResponse({ actorType, context, message }) {
    const lowerMessage = normalizeWhitespace(message).toLowerCase();

    if (actorType === 'student') {
      const nextClass = context?.upcomingClasses?.[0];
      const pendingActivity = context?.recentActivities?.find((activity) => activity.status === 'published' || activity.status === 'pending');
      const pendingPayment = context?.payments?.find((payment) => ['pending', 'late', 'overdue'].includes(payment.status));

      if (lowerMessage.includes('atividade') && pendingActivity) {
        return `Sua prioridade agora é a atividade "${pendingActivity.title}". Reserve 25 minutos, leia todo o enunciado antes de responder e anote uma dúvida para levar ao professor se travar em algum ponto.`;
      }

      if (lowerMessage.includes('aula') && nextClass) {
        return `Sua próxima aula é "${nextClass.title}" em ${new Date(nextClass.scheduledAt).toLocaleString('pt-BR')}. Faça uma revisão curta de ${nextClass.subject || 'seu conteúdo principal'} e leve uma pergunta específica para aproveitar melhor o encontro.`;
      }

      if ((lowerMessage.includes('pagamento') || lowerMessage.includes('mensalidade')) && pendingPayment) {
        return `Existe um pagamento com status ${pendingPayment.status}. Abra a área de pagamentos do portal e confirme o vencimento para regularizar isso com o professor.`;
      }

      return `Estou em modo local no momento, mas consigo te orientar com base no seu portal. Você está no nível ${context?.student?.level || 1}, com ${context?.student?.points || 0} pontos e desempenho de ${context?.student?.performance || 0}%. Foque em concluir a próxima atividade e chegar à aula com uma dúvida bem definida.`;
    }

    const lowPerformance = context?.students?.list?.filter((student) => student.performance < 70) || [];
    const pendingPayments = context?.recentPayments?.filter((payment) => ['pending', 'late', 'overdue'].includes(payment.status)) || [];
    const nextPreparation = context?.lessonPreparations?.find((preparation) => preparation.status === 'draft');

    if ((lowerMessage.includes('atividade') || lowerMessage.includes('exercicio')) && context?.students?.total) {
      return `Para gerar atividade com boa taxa de acerto, escolha primeiro o aluno ou grupo, depois informe matéria, objetivo e o que foi trabalhado na aula. O AI Hub já consegue publicar direto para ${context.students.total} aluno(s) ativos.`;
    }

    if (lowerMessage.includes('pagamento') && pendingPayments.length > 0) {
      return `Você tem ${pendingPayments.length} pagamento(s) pendente(s) ou atrasado(s). A ação mais segura é revisar o financeiro e disparar uma régua curta: lembrete amigável, confirmação em 48 horas e follow-up final.`;
    }

    if ((lowerMessage.includes('desempenho') || lowerMessage.includes('aluno')) && lowPerformance.length > 0) {
      return `Os alunos que merecem atenção imediata são ${lowPerformance.map((student) => student.name).join(', ')}. Vale cruzar frequência, atividade publicada e clareza do objetivo da próxima aula antes de agir.`;
    }

    if (lowerMessage.includes('prepar') && nextPreparation) {
      return `Existe um plano de aula em rascunho para ${nextPreparation.studentName || 'um aluno'}. Revise a estrutura, aprove e vincule à aula para manter o fluxo completo do AI Hub.`;
    }

    return `Estou em modo local, mas consigo resumir seu contexto: ${context?.students?.total || 0} aluno(s) ativos, ${context?.recentClasses?.length || 0} aula(s) recente(s), ${pendingPayments.length} pagamento(s) sensíveis e ${context?.activities?.length || 0} atividade(s) recente(s). Posso te ajudar a priorizar agenda, atividades e reengajamento.`;
  }

  updateHistory(actorId, userMessage, aiResponse, scope = 'teacher') {
    const historyKey = this.getConversationKey(actorId, scope);

    if (!this.conversationHistory.has(historyKey)) {
      this.conversationHistory.set(historyKey, []);
    }

    const history = this.conversationHistory.get(historyKey);
    history.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: aiResponse, timestamp: new Date() }
    );

    if (history.length > this.maxHistoryLength * 2) {
      history.splice(0, history.length - this.maxHistoryLength * 2);
    }

    this.conversationHistory.set(historyKey, history);
  }

  normalizeActivityInput(inputOrTopic, lessonSubject, lessonDescription) {
    if (typeof inputOrTopic === 'object' && inputOrTopic !== null) {
      return {
        mode: inputOrTopic.mode === 'class' ? 'class' : 'manual',
        lessonTopic: normalizeWhitespace(inputOrTopic.lessonTopic),
        lessonSubject: normalizeWhitespace(inputOrTopic.lessonSubject),
        lessonDescription: normalizeWhitespace(inputOrTopic.lessonDescription),
        classId: normalizeWhitespace(inputOrTopic.classId),
        gradeLevel: normalizeWhitespace(inputOrTopic.gradeLevel),
        learningObjective: normalizeWhitespace(inputOrTopic.learningObjective),
        questionCount: Math.max(4, Math.min(8, Number(inputOrTopic.questionCount) || 6)),
        questionMix: inputOrTopic.questionMix || {},
        assignmentTarget: inputOrTopic.assignmentTarget || { mode: 'specific' }
      };
    }

    return {
      mode: 'manual',
      lessonTopic: normalizeWhitespace(inputOrTopic),
      lessonSubject: normalizeWhitespace(lessonSubject),
      lessonDescription: normalizeWhitespace(lessonDescription),
      classId: '',
      gradeLevel: '',
      learningObjective: '',
      questionCount: 6,
      questionMix: {},
      assignmentTarget: { mode: 'specific' }
    };
  }

  buildActivityPrompt(input) {
    return `Você é um especialista em desenho de atividades pedagógicas.

Gere uma atividade em JSON para o Nexus Academy com base no contexto abaixo:
- Modo: ${input.mode}
- Tópico: ${input.lessonTopic}
- Matéria: ${input.lessonSubject}
- Série/Nível: ${input.gradeLevel || 'não informado'}
- Objetivo: ${input.learningObjective || 'reforçar o conteúdo principal'}
- Descrição detalhada: ${input.lessonDescription || 'não informada'}
- Quantidade de questões: ${input.questionCount}

RETORNE APENAS JSON VÁLIDO no formato:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "type": "multiple_choice|true_false|essay|fill_blank",
      "question": "string",
      "difficulty": "easy|medium|hard",
      "points": 10,
      "options": [{"letter":"A","text":"...", "isCorrect": false}],
      "correctAnswer": "string",
      "explanation": "string",
      "topics": ["..."]
    }
  ]
}

REGRAS:
1. As perguntas precisam ser específicas para o tópico informado.
2. Alternativas nunca podem usar placeholders ou textos genéricos.
3. O gabarito deve ser consistente com a pergunta.
4. Inclua explicações curtas, mas úteis.
5. Misture compreensão, aplicação e revisão.`;
  }

  buildFallbackActivity(input) {
    const concepts = extractConcepts(`${input.lessonTopic} ${input.lessonDescription} ${input.learningObjective}`);
    const primaryConcept = concepts[0] ? capitalize(concepts[0]) : capitalize(input.lessonTopic);
    const secondaryConcept = concepts[1] ? capitalize(concepts[1]) : capitalize(input.lessonSubject);
    const objectiveText = capitalize(input.learningObjective || `aplicar ${input.lessonTopic} com segurança`);
    const summaryText = firstSentence(input.lessonDescription) || `A aula teve foco em ${normalizeWhitespace(input.lessonTopic)} dentro de ${normalizeWhitespace(input.lessonSubject)}.`;
    const questionMix = buildQuestionMix(input.questionCount, input.questionMix);
    const questions = [];

    const pushMultipleChoice = (variant) => {
      if (variant === 1) {
        questions.push({
          type: 'multiple_choice',
          question: `Qual alternativa resume melhor o foco central da aula sobre ${input.lessonTopic}?`,
          difficulty: 'easy',
          points: 10,
          explanation: 'A alternativa correta retoma o objetivo principal da aula e respeita o conteúdo informado pelo professor.',
          options: [
            { letter: 'A', text: `${objectiveText} a partir de exemplos guiados e prática orientada.`, isCorrect: true },
            { letter: 'B', text: `Trocar o tema principal por um conteúdo paralelo sem relação direta com ${input.lessonTopic}.`, isCorrect: false },
            { letter: 'C', text: 'Memorizar definições isoladas sem conectar conceitos nem resolver situações de uso.', isCorrect: false },
            { letter: 'D', text: 'Encerrar o estudo antes de revisar as ideias centrais trabalhadas em aula.', isCorrect: false }
          ]
        });
        return;
      }

      if (variant === 2) {
        questions.push({
          type: 'multiple_choice',
          question: `Em ${input.lessonSubject}, qual ação mostra que o estudante realmente compreendeu ${primaryConcept}?`,
          difficulty: 'medium',
          points: 15,
          explanation: 'Compreensão real aparece quando o aluno consegue aplicar a ideia a uma situação concreta, e não apenas repetir palavras-chave.',
          options: [
            { letter: 'A', text: `Relacionar ${primaryConcept} a um exemplo concreto e justificar a escolha com clareza.`, isCorrect: true },
            { letter: 'B', text: 'Ignorar a explicação e responder com uma frase genérica sem ligação com o tema.', isCorrect: false },
            { letter: 'C', text: 'Mudar de assunto sempre que a atividade exigir aplicar o conceito estudado.', isCorrect: false },
            { letter: 'D', text: 'Copiar um procedimento sem explicar por que ele funciona no contexto da questão.', isCorrect: false }
          ]
        });
        return;
      }

      questions.push({
        type: 'multiple_choice',
        question: `Qual alternativa conecta ${primaryConcept} e ${secondaryConcept} de forma coerente com a aula descrita?`,
        difficulty: 'hard',
        points: 25,
        explanation: 'A resposta correta cruza o conceito principal com o objetivo da aula e mantém consistência com a descrição fornecida.',
        options: [
          { letter: 'A', text: `Aplicar ${primaryConcept} para resolver uma situação alinhada ao objetivo de ${objectiveText.toLowerCase()}.`, isCorrect: true },
          { letter: 'B', text: `Eliminar ${secondaryConcept} do estudo para evitar qualquer relação entre os conceitos.`, isCorrect: false },
          { letter: 'C', text: `Usar ${primaryConcept} apenas como palavra decorada, sem ligação com o problema proposto.`, isCorrect: false },
          { letter: 'D', text: 'Substituir a análise do conteúdo por opiniões sem evidência retirada da aula.', isCorrect: false }
        ]
      });
    };

    const pushTrueFalse = () => {
      questions.push({
        type: 'true_false',
        question: `A seguinte afirmação está correta? "Em ${input.lessonTopic}, compreender o conceito principal também exige saber quando aplicá-lo em contexto."`,
        difficulty: 'medium',
        points: 15,
        explanation: 'O domínio do conteúdo aparece quando o estudante entende o conceito e reconhece quando ele deve ser usado.',
        options: [
          { letter: 'A', text: 'Verdadeiro', isCorrect: true },
          { letter: 'B', text: 'Falso', isCorrect: false }
        ]
      });
    };

    const pushEssay = () => {
      questions.push({
        type: 'essay',
        question: `Explique com suas palavras como ${input.lessonTopic} foi trabalhado na aula e cite um exemplo de aplicação prática ligado a ${input.lessonSubject}.`,
        difficulty: 'medium',
        points: 15,
        correctAnswer: `A resposta ideal deve explicar o conceito central de ${input.lessonTopic}, retomar o objetivo "${objectiveText}" e apresentar ao menos um exemplo coerente com a aula.`,
        explanation: 'A questão avalia compreensão conceitual e capacidade de transferir o conteúdo para uma aplicação concreta.'
      });
    };

    const pushFillBlank = () => {
      questions.push({
        type: 'fill_blank',
        question: `Complete a frase: "Durante a aula, o foco principal foi ${summaryText.replace(/\.$/, '')} e o estudante precisou aplicar ____ para consolidar o aprendizado."`,
        difficulty: 'easy',
        points: 10,
        correctAnswer: primaryConcept,
        explanation: 'A lacuna recupera o conceito-chave que organiza a aula e sustenta a prática proposta.'
      });
    };

    for (let index = 0; index < questionMix.multiple_choice; index += 1) {
      pushMultipleChoice(index + 1);
    }

    for (let index = 0; index < questionMix.true_false; index += 1) {
      pushTrueFalse();
    }

    for (let index = 0; index < questionMix.essay; index += 1) {
      pushEssay();
    }

    for (let index = 0; index < questionMix.fill_blank; index += 1) {
      pushFillBlank();
    }

    const normalizedQuestions = questions.slice(0, input.questionCount).map((question, index) =>
      sanitizeQuestion(question, index, input)
    );

    return {
      title: `Atividade: ${capitalize(input.lessonTopic)}`,
      description: summaryText,
      questions: normalizedQuestions,
      providerMode: 'fallback',
      providerModel: LOCAL_FALLBACK_MODEL,
      qualityReport: {
        source: 'fallback',
        validated: true,
        issues: []
      },
      batchId: createBatchId()
    };
  }

  async generateActivity(inputOrTopic, lessonSubject, lessonDescription) {
    const input = this.normalizeActivityInput(inputOrTopic, lessonSubject, lessonDescription);
    const fallbackActivity = this.buildFallbackActivity(input);

    if (!input.lessonTopic || !input.lessonSubject) {
      return {
        ...fallbackActivity,
        qualityReport: {
          source: 'fallback',
          validated: false,
          issues: ['lessonTopic e lessonSubject são obrigatórios']
        }
      };
    }

    if (!this.isConfigured()) {
      return fallbackActivity;
    }

    try {
      const response = await this.requestJsonCompletion(this.buildActivityPrompt(input), {
        temperature: 0.55,
        maxOutputTokens: 4096
      });

      const normalizedQuestions = Array.isArray(response.json?.questions)
        ? response.json.questions.map((question, index) => sanitizeQuestion(question, index, input))
        : [];

      if (!isHighQualityQuestionSet(normalizedQuestions, input)) {
        throw new Error('Provider returned low-quality activity payload');
      }

      return {
        title: normalizeWhitespace(response.json?.title) || fallbackActivity.title,
        description: normalizeWhitespace(response.json?.description) || fallbackActivity.description,
        questions: normalizedQuestions,
        providerMode: 'live',
        providerModel: response.model,
        qualityReport: {
          source: 'live',
          validated: true,
          issues: []
        },
        batchId: createBatchId()
      };
    } catch (error) {
      console.error('[AI] generateActivity provider error:', error?.response?.data || error?.message || error);
      return fallbackActivity;
    }
  }

  buildLessonPreparationPrompt({ classData, studentData, previousClasses }) {
    return `Você é um planejador pedagógico. Gere um JSON de preparação de aula para o Nexus Academy.

CONTEXTO DA AULA
- Título: ${classData.title}
- Matéria: ${classData.subject || 'não informada'}
- Série/Nível: ${classData.grade || studentData.grade || 'não informado'}
- Duração: ${classData.duration || 60} minutos
- Aluno: ${studentData.name}
- Desempenho atual: ${studentData.performance?.overall || 0}%
- Aulas anteriores: ${(previousClasses || []).map((item) => item.title || item.subject).filter(Boolean).join(', ') || 'nenhuma'}
- Observações do professor: ${classData.notes || classData.description || 'nenhuma'}

RETORNE APENAS JSON VÁLIDO com:
{
  "topic": "string",
  "subtopics": ["string"],
  "objectives": [{"objective":"string","priority":"primary|secondary|optional"}],
  "structure": {
    "warmup": {"duration": 10, "description":"string", "activities":["string"]},
    "mainContent": {"duration": 25, "keyPoints":["string"], "teachingMethod":"mixed", "materials":["string"]},
    "practice": {"duration": 15, "exercises":[{"difficulty":"easy","description":"string","estimatedTime":5}]},
    "review": {"duration": 10, "keyTakeaways":["string"], "questionsToAsk":["string"]},
    "homework": {"assigned": true, "description":"string", "estimatedTime": 20}
  },
  "materials": [{"type":"presentation","title":"string","description":"string"}],
  "prerequisites": ["string"],
  "anticipatedDifficulties": [{"concept":"string","strategy":"string","examples":["string"]}],
  "differentiation": {
    "forStruggling": ["string"],
    "forAdvanced": ["string"],
    "visualLearners": ["string"],
    "auditoryLearners": ["string"],
    "kinestheticLearners": ["string"]
  },
  "assessmentPlan": {"formative":["string"], "summative":"string", "selfAssessment": true},
  "confidence": 80
}`;
  }

  async generateLessonPreparationDraft({ classData, studentData, previousClasses, fallbackPreparation }) {
    if (!this.isConfigured()) {
      return {
        preparation: {
          ...fallbackPreparation,
          aiMetadata: {
            ...(fallbackPreparation.aiMetadata || {}),
            providerMode: 'fallback'
          }
        },
        providerMode: 'fallback',
        providerModel: LOCAL_FALLBACK_MODEL
      };
    }

    try {
      const response = await this.requestJsonCompletion(
        this.buildLessonPreparationPrompt({ classData, studentData, previousClasses }),
        {
          temperature: 0.45,
          maxOutputTokens: 4096
        }
      );

      const payload = response.json || {};
      const preparation = {
        ...fallbackPreparation,
        topic: normalizeWhitespace(payload.topic) || fallbackPreparation.topic,
        subtopics: uniqueNonEmpty(payload.subtopics || fallbackPreparation.subtopics),
        objectives: Array.isArray(payload.objectives) && payload.objectives.length > 0
          ? payload.objectives
          : fallbackPreparation.objectives,
        structure: {
          ...fallbackPreparation.structure,
          ...payload.structure,
          warmup: { ...fallbackPreparation.structure.warmup, ...(payload.structure?.warmup || {}) },
          mainContent: { ...fallbackPreparation.structure.mainContent, ...(payload.structure?.mainContent || {}) },
          practice: { ...fallbackPreparation.structure.practice, ...(payload.structure?.practice || {}) },
          review: { ...fallbackPreparation.structure.review, ...(payload.structure?.review || {}) },
          homework: { ...fallbackPreparation.structure.homework, ...(payload.structure?.homework || {}) }
        },
        materials: Array.isArray(payload.materials) && payload.materials.length > 0
          ? payload.materials
          : fallbackPreparation.materials,
        prerequisites: uniqueNonEmpty(payload.prerequisites || fallbackPreparation.prerequisites),
        anticipatedDifficulties: Array.isArray(payload.anticipatedDifficulties) && payload.anticipatedDifficulties.length > 0
          ? payload.anticipatedDifficulties
          : fallbackPreparation.anticipatedDifficulties,
        differentiation: {
          ...fallbackPreparation.differentiation,
          ...(payload.differentiation || {})
        },
        assessmentPlan: {
          ...fallbackPreparation.assessmentPlan,
          ...(payload.assessmentPlan || {})
        },
        aiMetadata: {
          ...(fallbackPreparation.aiMetadata || {}),
          providerMode: 'live',
          confidence: Number(payload.confidence) || fallbackPreparation.aiMetadata?.confidence || 80
        }
      };

      return {
        preparation,
        providerMode: 'live',
        providerModel: response.model
      };
    } catch (error) {
      console.error('[AI] lesson preparation provider error:', error?.response?.data || error?.message || error);
      return {
        preparation: {
          ...fallbackPreparation,
          aiMetadata: {
            ...(fallbackPreparation.aiMetadata || {}),
            providerMode: 'fallback'
          }
        },
        providerMode: 'fallback',
        providerModel: LOCAL_FALLBACK_MODEL
      };
    }
  }

  buildClassSummaryPrompt({ classData, transcript }) {
    return `Você é um coordenador pedagógico do Nexus Academy.

Gere um resumo de aula em português brasileiro, claro e pronto para compartilhar com professor ou responsável.

CONTEXTO DA AULA
- Título: ${classData.title || 'Aula sem título'}
- Matéria: ${classData.subject || 'Não informada'}
- Série/Nível: ${classData.grade || 'Não informado'}
- Tópico: ${classData.topic || 'Não informado'}
- Duração prevista: ${classData.duration || 60} minutos
- Status: ${classData.status || 'completed'}
- Aluno: ${classData.studentName || 'Aluno'}

TRANSCRIÇÃO / ANOTAÇÕES
${normalizeRichText(transcript || classData.transcript || classData.notes || classData.description || 'Sem transcrição detalhada disponível.')}

INSTRUÇÕES
1. Entregue um texto corrido com 3 a 5 parágrafos curtos.
2. Explique objetivo da aula, principais tópicos, sinais de entendimento ou dificuldade e próximo passo recomendado.
3. Não invente fatos fora do contexto fornecido.
4. Se a transcrição estiver curta, assuma postura conservadora e diga que o resumo foi feito com contexto parcial.
5. Não use markdown, tabelas ou listas.`;
  }

  buildFallbackClassSummary({ classData, transcript }) {
    const cleanTranscript = normalizeRichText(transcript || classData.transcript || '');
    const firstTranscriptSentence = firstSentence(cleanTranscript);
    const topic = capitalize(classData.topic || classData.subject || classData.title || 'o conteúdo principal');
    const studentName = classData.studentName || 'o aluno';
    const subject = classData.subject || 'a matéria';
    const grade = classData.grade || 'nível não informado';
    const contextWasPartial = cleanTranscript.length < 80;

    const paragraphs = [
      `A aula "${classData.title || 'Sem título'}" trabalhou ${topic} com ${studentName}, dentro de ${subject}, para a faixa ${grade}. ${contextWasPartial ? 'O resumo foi montado com contexto parcial, então prioriza os dados estruturados da aula e os trechos disponíveis da transcrição.' : 'O resumo considera a transcrição e os dados estruturados da aula para sintetizar o encontro de forma objetiva.'}`,
      firstTranscriptSentence
        ? `Pelo registro disponível, o encontro passou por este eixo principal: ${firstTranscriptSentence}`
        : `O foco aparente foi consolidar o tema principal da aula, revisar o conteúdo essencial e observar como o aluno responde quando precisa aplicar o conceito em contexto.`,
      `Como próximo passo, vale revisar rapidamente ${topic.toLowerCase()} no início da próxima aula, retomar qualquer ponto em que ${studentName} tenha demonstrado insegurança e fechar o encontro seguinte com uma checagem curta de aplicação prática.`,
    ];

    return paragraphs.join('\n\n');
  }

  async generateClassSummary({ classData, transcript }) {
    const fallbackSummary = this.buildFallbackClassSummary({ classData, transcript });

    if (!this.isConfigured()) {
      return {
        summary: fallbackSummary,
        providerMode: 'fallback',
        providerModel: LOCAL_FALLBACK_MODEL,
        fallbackReason: 'provider_not_configured'
      };
    }

    try {
      const response = await this.requestTextCompletion(
        this.buildClassSummaryPrompt({ classData, transcript }),
        {
          temperature: 0.35,
          maxOutputTokens: 900
        }
      );

      const summary = normalizeRichText(response.text) || fallbackSummary;

      return {
        summary,
        providerMode: 'live',
        providerModel: response.model,
        fallbackReason: null
      };
    } catch (error) {
      console.error('[AI] class summary provider error:', error?.response?.data || error?.message || error);
      return {
        summary: fallbackSummary,
        providerMode: 'fallback',
        providerModel: LOCAL_FALLBACK_MODEL,
        fallbackReason: this.lastProviderFailure?.code || 'provider_error'
      };
    }
  }

  clearHistory(actorId, scope = 'teacher') {
    this.conversationHistory.delete(this.getConversationKey(actorId, scope));
  }

  getHistory(actorId, scope = 'teacher') {
    return this.conversationHistory.get(this.getConversationKey(actorId, scope)) || [];
  }

  async getQuickSuggestions(actorId, models, actorType = 'teacher') {
    if (actorType === 'student') {
      return this.getStudentQuickSuggestions(actorId, models);
    }

    const context = await this.getTeacherContext(actorId, models);

    if (!context) {
      return [];
    }

    const suggestions = [];
    const lowPerformance = context.students.list.filter((student) => student.performance < 70);
    const pendingPayments = context.recentPayments.filter((payment) => ['pending', 'late', 'overdue'].includes(payment.status));
    const pendingPreparation = context.lessonPreparations.find((preparation) => preparation.status === 'draft');
    const publishedActivities = context.activities.filter((activity) => activity.status === 'published');

    if (lowPerformance.length > 0) {
      suggestions.push({
        type: 'warning',
        title: `${lowPerformance.length} aluno(s) com desempenho abaixo de 70%`,
        message: `Cruze desempenho com frequência e gere uma atividade de reforço para ${lowPerformance.slice(0, 3).map((student) => student.name).join(', ')}.`,
        action: 'students'
      });
    }

    if (pendingPayments.length > 0) {
      suggestions.push({
        type: 'payment',
        title: `${pendingPayments.length} pagamento(s) sensíveis`,
        message: 'Use o AI Hub para priorizar contatos e revisar quem está em atraso.',
        action: 'finance'
      });
    }

    if (pendingPreparation) {
      suggestions.push({
        type: 'planning',
        title: 'Existe um plano de aula aguardando revisão',
        message: `Revise o plano de "${pendingPreparation.classTitle || pendingPreparation.topic}" antes da próxima aula.`,
        action: 'lesson-prep'
      });
    }

    if (publishedActivities.length > 0) {
      suggestions.push({
        type: 'activity',
        title: `${publishedActivities.length} atividade(s) publicada(s) recentemente`,
        message: 'Confira se o portal do aluno está exibindo as entregas como esperado.',
        action: 'ai-activities'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'info',
        title: 'Seu AI Hub está pronto para operar',
        message: 'Comece gerando uma atividade, um plano de aula ou uma sugestão de agenda.',
        action: 'ai-hub'
      });
    }

    return suggestions;
  }

  async getStudentQuickSuggestions(studentId, models) {
    const context = await this.getStudentContext(studentId, models);

    if (!context) {
      return [];
    }

    const suggestions = [];
    const nextClass = context.upcomingClasses[0];
    const pendingActivity = context.recentActivities.find((activity) => activity.status === 'published' || activity.status === 'pending');
    const pendingPayment = context.payments.find((payment) => ['pending', 'late', 'overdue'].includes(payment.status));

    if (nextClass) {
      suggestions.push({
        type: 'class',
        title: 'Preparar próxima aula',
        message: `Como posso me preparar para a aula "${nextClass.title}"?`,
        action: 'classes'
      });
    }

    if (pendingActivity) {
      suggestions.push({
        type: 'activity',
        title: 'Concluir atividade pendente',
        message: `Me ajude a organizar a atividade "${pendingActivity.title}"`,
        action: 'activities'
      });
    }

    if (pendingPayment) {
      suggestions.push({
        type: 'payment',
        title: 'Entender meu pagamento',
        message: 'Explique meu status de pagamentos e o que eu devo fazer agora',
        action: 'payments'
      });
    }

    suggestions.push({
      type: 'study',
      title: 'Plano de estudo curto',
      message: 'Monte um plano de estudo para esta semana',
      action: 'study_plan'
    });

    return suggestions;
  }
}

export default new AIAssistantService();
