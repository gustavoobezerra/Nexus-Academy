import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import request from 'supertest';
import axios from 'axios';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Activity from '../models/Activity.js';
import LearningSignal from '../models/LearningSignal.js';
import PronunciationTest from '../models/PronunciationTest.js';
import aiAssistantRoutes from '../routes/aiAssistant.js';
import portalProfileRoutes from '../routes/portal/profile.js';
import pronunciationRoutes from '../routes/pronunciation.js';
import classesRoutes from '../routes/classes.js';
import activitiesRoutes from '../routes/activities.js';
import notificationsRoutes from '../routes/notifications.js';
import hubRoutes from '../routes/hub.js';
import { recordActivitySubmissionSignals } from '../services/learningSignalsService.js';
import aiAssistantService from '../services/aiAssistantService.js';
import { analyzePronunciation } from '../services/pronunciationService.js';
import { ensureDevelopmentDemoData } from '../dev/ensureDemoData.js';
import { Notification, NotificationTemplate } from '../models/Notification.js';
import { authenticateOptional } from '../middleware/auth.js';
import { tenantContextMiddleware } from '../middleware/tenantAware.js';

const app = express();
app.use(express.json());
app.use('/api/ai', aiAssistantRoutes);
app.use('/api/portal', portalProfileRoutes);
app.use('/api/portal/pronunciation', pronunciationRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', hubRoutes);

const createTeacherToken = (teacherId) => global.generateAuthToken(jwt, teacherId);

const createPortalToken = (studentId, teacherId) => jwt.sign(
  {
    studentId: studentId.toString(),
    teacherId: teacherId.toString(),
    type: 'student'
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const createTeacher = async (overrides = {}) => global.createTestUser(User, {
  status: 'active',
  subscriptionStatus: 'active',
  onboardingCompletedAt: new Date(),
  ...overrides
});

const createStudent = async (teacherId, overrides = {}) => {
  const passwordHash = await bcrypt.hash('Portal123!', 12);

  return Student.create({
    name: 'Aluno de Teste',
    email: `student.${Date.now()}@test.com`,
    age: 15,
    grade: '9o Ano',
    subject: 'Matematica',
    monthlyFee: 500,
    paymentStatus: 'paid',
    parentName: 'Responsavel',
    parentEmail: `responsavel.${Date.now()}@test.com`,
    parentPhone: '(11) 99999-9999',
    teacher: teacherId,
    active: true,
    performance: {
      overall: 74,
      trend: 'down',
      strengths: ['Leitura de enunciado'],
      weaknesses: ['Frações', 'Equações lineares']
    },
    portalAccess: {
      enabled: true,
      email: `portal.${Date.now()}@test.com`,
      password: passwordHash
    },
    ...overrides
  });
};

const createTinyWavBuffer = (durationSeconds = 1) => {
  const sampleRate = 16000;
  const totalSamples = sampleRate * durationSeconds;
  const dataSize = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < totalSamples; index += 1) {
    const sample = Math.sin((2 * Math.PI * 440 * index) / sampleRate);
    buffer.writeInt16LE(Math.round(sample * 0x3fff), 44 + (index * 2));
  }

  return buffer;
};

const originalIsConfigured = aiAssistantService.isConfigured;

describe('AI Hub and learning signals integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    aiAssistantService.isConfigured = originalIsConfigured;
    aiAssistantService.providerHealth = aiAssistantService.isConfigured() ? 'degraded' : 'fallback-only';
    aiAssistantService.lastProviderCheckAt = null;
    aiAssistantService.lastSuccessfulModel = null;
    aiAssistantService.lastProviderFailure = null;
  });

  it('should hydrate workspace-data with live collections and learning snapshots', async () => {
    const teacher = await createTeacher({
      teacherWorkspace: {
        studentGroups: [
          {
            id: 'group-math',
            name: 'Matemática em foco',
            description: 'Grupo ativo para reforço.',
            color: '#4f46e5',
            studentIds: [],
            suggestedByAI: false
          }
        ]
      }
    });
    const student = await createStudent(teacher._id);

    await User.findByIdAndUpdate(teacher._id, {
      $set: {
        'teacherWorkspace.studentGroups.0.studentIds': [student._id.toString()]
      }
    });

    const classData = await Class.create({
      teacher: teacher._id,
      student: student._id,
      studentName: student.name,
      title: 'Matemática - revisão de frações',
      subject: 'Matematica',
      grade: student.grade,
      topic: 'Frações equivalentes',
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      duration: 60,
      status: 'completed',
      isLive: false
    });

    await Payment.create({
      teacher: teacher._id,
      student: student._id,
      amount: 500,
      month: 'marco',
      year: 2026,
      dueDate: new Date(),
      status: 'paid',
      paidAt: new Date(),
      type: 'manual',
      paymentMethod: 'pix',
      invoiceNumber: `INV-WORKSPACE-${Date.now()}`
    });

    const activity = await Activity.create({
      teacher: teacher._id,
      student: student._id,
      class: classData._id,
      title: 'Diagnóstico de frações',
      description: 'Atividade curta para medir domínio do tema.',
      type: 'exercise',
      status: 'published',
      questions: [
        {
          questionNumber: 1,
          type: 'multiple_choice',
          question: 'Qual alternativa representa 1/2?',
          points: 10,
          difficulty: 'easy',
          options: [
            { letter: 'A', text: '2/4', isCorrect: true },
            { letter: 'B', text: '3/4', isCorrect: false }
          ],
          explanation: '2/4 é equivalente a 1/2.',
          topics: ['Frações equivalentes']
        }
      ],
      aiMetadata: {
        topics: ['Matematica', 'Frações equivalentes'],
        providerMode: 'fallback',
        sourceType: 'manual',
        learningObjective: 'Consolidar frações equivalentes'
      }
    });

    activity.submissions.push({
      submittedAt: new Date(),
      answers: [{ questionNumber: 1, answer: 'B' }]
    });
    await activity.save();
    await activity.autoGradeSubmission(0);
    await recordActivitySubmissionSignals({
      activity,
      submission: activity.submissions[0]
    });

    const response = await request(app)
      .get('/api/ai/workspace-data')
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.counts.students).toBe(1);
    expect(response.body.counts.classes).toBe(1);
    expect(response.body.counts.payments).toBe(1);
    expect(response.body.counts.activities).toBe(1);
    expect(response.body.counts.studentGroups).toBe(1);
    expect(response.body.learningSnapshots).toHaveLength(1);
    expect(response.body.learningSnapshots[0].studentId).toBe(student._id.toString());
    expect(response.body.learningSnapshots[0].weakestSubjects[0].label).toBe('Matematica');
    expect(response.body.learningSnapshots[0].weakestTopics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: expect.stringMatching(/Diagnóstico de frações|Frações equivalentes/)
        })
      ])
    );
  });

  it('should return a pedagogical subject suggestion based on granular learning signals', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id, {
      name: 'Aluno English',
      subject: 'English',
      grade: '1o EM',
      performance: {
        overall: 71,
        trend: 'down',
        strengths: ['Vocabulary'],
        weaknesses: ['Pronunciation', 'Simple past']
      }
    });

    await Class.create({
      teacher: teacher._id,
      student: student._id,
      studentName: student.name,
      title: 'English - speaking lab',
      subject: 'English',
      grade: student.grade,
      topic: 'Final sounds',
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      duration: 60,
      status: 'completed',
      isLive: false
    });

    await LearningSignal.insertMany([
      {
        teacher: teacher._id,
        student: student._id,
        sourceType: 'pronunciation',
        eventType: 'pronunciation_word',
        subject: 'English',
        topic: 'Final sounds',
        difficulty: 'intermediate',
        correctness: false,
        score: 58,
        maxScore: 100,
        signalWeight: 1,
        metadata: {
          word: 'worked',
          sourceId: 'pronunciation-1'
        },
        capturedAt: new Date()
      },
      {
        teacher: teacher._id,
        student: student._id,
        sourceType: 'activity',
        eventType: 'question_response',
        subject: 'English',
        topic: 'Simple past',
        difficulty: 'medium',
        correctness: false,
        score: 64,
        maxScore: 100,
        signalWeight: 1,
        metadata: {
          questionNumber: 1,
          sourceId: 'activity-1'
        },
        capturedAt: new Date()
      }
    ]);

    const response = await request(app)
      .get(`/api/ai/students/${student._id}/subject-suggestion`)
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.providerMode).toBe('fallback');
    expect(response.body.suggestion.subject).toBe('English');
    expect(response.body.suggestion.topic).toBe('Final sounds');
    expect(response.body.suggestion.evidence).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Final sounds'),
        expect.stringContaining('Pronúncia')
      ])
    );
  });

  it('should hide answers before submission and store learning signals after portal submission', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id);

    const activity = await Activity.create({
      teacher: teacher._id,
      student: student._id,
      title: 'Prática de equações',
      description: 'Atividade objetiva do portal.',
      type: 'exercise',
      status: 'published',
      questions: [
        {
          questionNumber: 1,
          type: 'multiple_choice',
          question: 'Qual alternativa resolve x + 2 = 5?',
          points: 10,
          difficulty: 'easy',
          options: [
            { letter: 'A', text: 'x = 1', isCorrect: false },
            { letter: 'B', text: 'x = 3', isCorrect: true }
          ],
          explanation: 'Basta isolar o x.',
          topics: ['Equações lineares']
        },
        {
          questionNumber: 2,
          type: 'fill_blank',
          question: 'O valor de x em 2x = 8 é ____.',
          points: 10,
          difficulty: 'easy',
          correctAnswer: '4',
          explanation: 'Divida ambos os lados por 2.',
          topics: ['Equações lineares']
        }
      ]
    });

    const studentToken = createPortalToken(student._id, teacher._id);

    const detailBeforeSubmission = await request(app)
      .get(`/api/portal/activities/${activity._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(detailBeforeSubmission.status).toBe(200);
    expect(detailBeforeSubmission.body.activity.questions[0].options[0].isCorrect).toBeUndefined();
    expect(detailBeforeSubmission.body.activity.questions[1].correctAnswer).toBeUndefined();

    const submitResponse = await request(app)
      .post(`/api/portal/activities/${activity._id}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionNumber: 1, answer: 'B' },
          { questionNumber: 2, answer: '4' }
        ]
      });

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.success).toBe(true);
    expect(submitResponse.body.activity.latestSubmission).not.toBeNull();
    expect(submitResponse.body.activity.latestSubmission.percentage).toBe(100);

    const storedSignals = await LearningSignal.find({
      teacher: teacher._id,
      student: student._id,
      activity: activity._id
    }).lean();

    expect(storedSignals.length).toBeGreaterThanOrEqual(3);
    expect(storedSignals.some((signal) => signal.eventType === 'activity_submission')).toBe(true);

    const detailAfterSubmission = await request(app)
      .get(`/api/portal/activities/${activity._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(detailAfterSubmission.status).toBe(200);
    expect(detailAfterSubmission.body.activity.questions[0].options[1].isCorrect).toBe(true);
    expect(detailAfterSubmission.body.activity.questions[1].correctAnswer).toBe('4');
  });

  it('should rollback an activity submission if learning-signal persistence fails', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id);

    const activity = await Activity.create({
      teacher: teacher._id,
      student: student._id,
      title: 'Prática com rollback',
      description: 'Atividade para validar consistência transacional.',
      type: 'exercise',
      status: 'published',
      questions: [
        {
          questionNumber: 1,
          type: 'multiple_choice',
          question: 'Qual é o resultado correto?',
          points: 10,
          difficulty: 'easy',
          options: [
            { letter: 'A', text: 'Alternativa incorreta', isCorrect: false },
            { letter: 'B', text: 'Alternativa correta', isCorrect: true }
          ],
          explanation: 'A alternativa B é a correta.',
          topics: ['Rollback']
        }
      ]
    });

    jest.spyOn(LearningSignal, 'insertMany').mockRejectedValue(new Error('signal write failed'));

    const studentToken = createPortalToken(student._id, teacher._id);
    const submitResponse = await request(app)
      .post(`/api/portal/activities/${activity._id}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [{ questionNumber: 1, answer: 'B' }]
      });

    expect(submitResponse.status).toBe(500);

    const reloadedActivity = await Activity.findById(activity._id).lean();
    expect(reloadedActivity.submissions).toHaveLength(0);
    expect(reloadedActivity.status).toBe('published');
  });

  it('should keep essay activities pending review until the teacher grades them', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id, {
      subject: 'Redação'
    });
    const studentToken = createPortalToken(student._id, teacher._id);
    const teacherToken = createTeacherToken(teacher._id);

    const activity = await Activity.create({
      teacher: teacher._id,
      student: student._id,
      title: 'Resposta dissertativa',
      description: 'Explique o argumento principal do texto.',
      type: 'exercise',
      status: 'published',
      questions: [
        {
          questionNumber: 1,
          type: 'essay',
          question: 'Explique com suas palavras o argumento principal do texto-base.',
          points: 10,
          difficulty: 'medium',
          correctAnswer: 'A resposta deve identificar a tese central e sustentá-la com um exemplo coerente.',
          explanation: 'O aluno precisa retomar a tese e mostrar compreensão real do texto.',
          topics: ['Argumentação']
        }
      ]
    });

    const submitResponse = await request(app)
      .post(`/api/portal/activities/${activity._id}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [{ questionNumber: 1, answer: 'O texto defende uma tese e traz um exemplo para sustentá-la.' }]
      });

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.activity.status).toBe('completed');

    const signalsBeforeReview = await LearningSignal.find({
      teacher: teacher._id,
      student: student._id,
      activity: activity._id
    }).lean();
    expect(signalsBeforeReview).toHaveLength(0);

    const reviewResponse = await request(app)
      .put(`/api/activities/teacher/${activity._id}/submissions/0/review`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        reviewMode: 'manual',
        teacherFeedback: 'Boa síntese. Continue fortalecendo a justificativa final.',
        answers: [
          {
            questionNumber: 1,
            isCorrect: true,
            pointsEarned: 10,
            feedback: 'Você identificou corretamente a tese e conectou o exemplo principal.'
          }
        ]
      });

    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.activity.status).toBe('graded');
    expect(reviewResponse.body.activity.latestSubmission.teacherFeedback).toContain('Boa síntese');

    const signalsAfterReview = await LearningSignal.find({
      teacher: teacher._id,
      student: student._id,
      activity: activity._id
    }).lean();
    expect(signalsAfterReview.length).toBeGreaterThan(0);

    const studentNotifications = await Notification.find({
      teacher: teacher._id,
      recipientType: 'student',
      recipientId: student._id,
      channel: 'in_app'
    }).lean();

    expect(studentNotifications.some((notification) => notification.providerResponse?.type === 'activity_reviewed')).toBe(true);
  });

  it('should create message templates and schedule in-app messages for a teacher', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id);
    const teacherToken = createTeacherToken(teacher._id);

    const templateResponse = await request(app)
      .post('/api/notifications/templates')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Lembrete rápido',
        type: 'class_reminder',
        channel: 'in_app',
        subject: 'Aula amanhã',
        body: 'Não esqueça da aula de amanhã às 18h.'
      });

    expect(templateResponse.status).toBe(201);
    expect(templateResponse.body.template.name).toBe('Lembrete rápido');

    const sendResponse = await request(app)
      .post('/api/notifications/send')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        recipientId: student._id.toString(),
        type: 'class_reminder',
        channel: 'in_app',
        title: 'Aula confirmada',
        subject: 'Aula confirmada',
        message: 'Sua aula está confirmada para amanhã.'
      });

    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body.notification.status).toBe('delivered');

    const storedTemplate = await NotificationTemplate.findOne({
      teacher: teacher._id,
      name: 'Lembrete rápido'
    }).lean();
    const storedNotification = await Notification.findOne({
      teacher: teacher._id,
      recipientId: student._id,
      subject: 'Aula confirmada'
    }).lean();

    expect(storedTemplate).not.toBeNull();
    expect(storedNotification).not.toBeNull();
  });

  it('should expose a referral URL that points to a mounted public teacher route', async () => {
    const teacher = await createTeacher({
      referralCode: 'NEXUS123',
      slug: 'prof-demo'
    });

    const response = await request(app)
      .get('/api/referral')
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe('NEXUS123');
    expect(response.body.fullUrl).toMatch(/\/professor\/login\?ref=NEXUS123$/);
  });

  it('should keep /api/health public when mounted before protected generic hub routes', async () => {
    const healthApp = express();
    healthApp.use(express.json());
    healthApp.use('/api', authenticateOptional);
    healthApp.use('/api', tenantContextMiddleware);
    healthApp.get('/api/health', (_req, res) => {
      res.json({ status: 'ok' });
    });
    healthApp.use('/api', hubRoutes);

    const response = await request(healthApp).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should keep AssemblyAI beta pronunciation in history without creating canonical learning signals', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id, {
      subject: 'English',
      grade: '1o EM'
    });
    const studentToken = createPortalToken(student._id, teacher._id);

    const response = await request(app)
      .post('/api/portal/pronunciation/history')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        phrase: 'Practice every day.',
        difficulty: 'intermediate',
        accuracyScore: 0.81,
        fluencyScore: 0.79,
        pronunciationScore: 0.8,
        mock: false,
        source: 'assemblyai-beta',
        providerMode: 'beta',
        providerModel: 'universal-3-pro',
        feedback: 'Resultado beta.',
        wordScores: [
          {
            word: 'practice',
            score: 0.8,
            syllables: [{ text: 'prac', score: 0.8 }]
          }
        ],
        metadata: {
          service: 'assemblyai',
          recognizedText: 'Practice every day.',
          confidence: 0.84,
          scoringMethod: 'assemblyai-transcription-beta-v1'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.data.mock).toBe(false);
    expect(response.body.data.providerMode).toBe('beta');

    const savedTests = await PronunciationTest.find({
      teacher: teacher._id,
      student: student._id
    }).lean();
    const savedSignals = await LearningSignal.find({
      teacher: teacher._id,
      student: student._id,
      sourceType: 'pronunciation'
    }).lean();

    expect(savedTests).toHaveLength(1);
    expect(savedTests[0].providerMode).toBe('beta');
    expect(savedSignals).toHaveLength(0);
  });

  it('should rollback pronunciation history when signal persistence fails', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id, {
      subject: 'English',
      grade: '1o EM'
    });
    const studentToken = createPortalToken(student._id, teacher._id);

    jest.spyOn(LearningSignal, 'insertMany').mockRejectedValue(new Error('signal write failed'));

    const response = await request(app)
      .post('/api/portal/pronunciation/history')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        phrase: 'Speak with confidence.',
        difficulty: 'intermediate',
        accuracyScore: 0.74,
        fluencyScore: 0.71,
        pronunciationScore: 0.72,
        mock: false,
        source: 'canonical-pronunciation-provider',
        providerMode: 'live',
        providerModel: 'canonical-pronunciation-provider-v1',
        feedback: 'Precisa repetir o padrão.',
        wordScores: [
          {
            word: 'speak',
            score: 0.7,
            syllables: [{ text: 'speak', score: 0.7 }]
          }
        ]
      });

    expect(response.status).toBe(500);

    const savedTests = await PronunciationTest.find({
      teacher: teacher._id,
      student: student._id
    }).lean();

    expect(savedTests).toHaveLength(0);
  });

  it('should expose provider health states through the status endpoint', async () => {
    const teacher = await createTeacher();

    aiAssistantService.isConfigured = () => true;
    aiAssistantService.providerHealth = 'healthy';
    aiAssistantService.lastProviderCheckAt = new Date().toISOString();
    aiAssistantService.lastSuccessfulModel = 'gemini-2.5-flash';
    aiAssistantService.lastProviderFailure = null;

    const healthyResponse = await request(app)
      .get('/api/ai/provider-status')
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`);

    expect(healthyResponse.status).toBe(200);
    expect(healthyResponse.body.provider.health).toBe('healthy');
    expect(healthyResponse.body.provider.available).toBe(true);
    expect(healthyResponse.body.provider.mode).toBe('live');
    expect(healthyResponse.body.provider.primaryModel).toBe('gemini-2.5-flash');
    expect(healthyResponse.body.provider.fallbackModels).toEqual(
      expect.arrayContaining(['gemini-2.5-flash-lite', 'gemini-2.5-pro'])
    );

    aiAssistantService.providerHealth = 'degraded';
    aiAssistantService.lastProviderFailure = {
      model: 'gemini-2.5-flash',
      status: 503,
      code: 'ECONNABORTED',
      message: 'Provider timeout',
      capturedAt: new Date().toISOString()
    };

    const degradedResponse = await request(app)
      .get('/api/ai/provider-status')
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`);

    expect(degradedResponse.status).toBe(200);
    expect(degradedResponse.body.provider.health).toBe('degraded');
    expect(degradedResponse.body.provider.available).toBe(true);
    expect(degradedResponse.body.provider.mode).toBe('live');

    aiAssistantService.providerHealth = 'fallback-only';

    const fallbackResponse = await request(app)
      .get('/api/ai/provider-status')
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`);

    expect(fallbackResponse.status).toBe(200);
    expect(fallbackResponse.body.provider.health).toBe('fallback-only');
    expect(fallbackResponse.body.provider.available).toBe(false);
    expect(fallbackResponse.body.provider.mode).toBe('fallback');
  });

  it('should walk the external Gemini fallback chain before using local fallback on quota exhaustion', async () => {
    const quotaFailure = {
      response: {
        status: 429,
        data: {
          error: {
            message: 'Quota exceeded',
            status: 'RESOURCE_EXHAUSTED'
          }
        }
      },
      message: 'Quota exceeded'
    };
    const providerSpy = jest.spyOn(axios, 'post').mockRejectedValue(quotaFailure);

    aiAssistantService.isConfigured = () => true;
    aiAssistantService.providerHealth = 'degraded';
    aiAssistantService.lastProviderFailure = null;
    aiAssistantService.lastSuccessfulModel = null;

    const result = await aiAssistantService.generateActivity({
      lessonTopic: 'Frações equivalentes',
      lessonSubject: 'Matematica',
      lessonDescription: 'Revisão com exemplos guiados.'
    });

    expect(providerSpy).toHaveBeenCalledTimes(aiAssistantService.getProviderStatus().models.length);
    expect(result.providerMode).toBe('fallback');
    expect(result.providerModel).toBe('local-fallback');
    expect(aiAssistantService.getProviderStatus().health).toBe('fallback-only');
  });

  it('should move from flash to the next external model after timeouts and recover live mode', async () => {
    const providerSpy = jest.spyOn(axios, 'post')
      .mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout attempt 1' })
      .mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout attempt 2' })
      .mockResolvedValueOnce({
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Atividade: Equações lineares',
                      description: 'Sequência validada pelo provider externo.',
                      questions: [
                        {
                          type: 'multiple_choice',
                          question: 'Em equações lineares, qual alternativa isola corretamente a variável na equação x + 2 = 5?',
                          difficulty: 'easy',
                          points: 10,
                          options: [
                            { letter: 'A', text: 'Subtrair 2 dos dois lados e obter x igual a 3.', isCorrect: true },
                            { letter: 'B', text: 'Somar 2 aos dois lados e concluir que x vale 7.', isCorrect: false },
                            { letter: 'C', text: 'Multiplicar ambos os lados por 2 antes de isolar x.', isCorrect: false },
                            { letter: 'D', text: 'Trocar os termos de lado sem manter a equivalência.', isCorrect: false }
                          ],
                          explanation: 'Basta subtrair 2 dos dois lados.',
                          topics: ['Equações lineares']
                        },
                        {
                          type: 'multiple_choice',
                          question: 'Em equações lineares, qual passo confirma se a solução encontrada realmente resolve a equação proposta?',
                          difficulty: 'medium',
                          points: 15,
                          options: [
                            { letter: 'A', text: 'Substituir o valor de x na equação original e verificar a igualdade.', isCorrect: true },
                            { letter: 'B', text: 'Ignorar a equação inicial e apenas repetir o procedimento anterior.', isCorrect: false },
                            { letter: 'C', text: 'Trocar o sinal do termo independente ao final da resolução.', isCorrect: false },
                            { letter: 'D', text: 'Aplicar a mesma resposta em qualquer equação sem conferir o enunciado.', isCorrect: false }
                          ],
                          explanation: 'A verificação exige substituir a solução na equação original.',
                          topics: ['Equações lineares']
                        },
                        {
                          type: 'multiple_choice',
                          question: 'Nas equações lineares, qual afirmação descreve corretamente uma transformação válida durante a resolução?',
                          difficulty: 'easy',
                          points: 10,
                          options: [
                            { letter: 'A', text: 'A mesma operação deve ser aplicada aos dois lados da equação.', isCorrect: true },
                            { letter: 'B', text: 'Cada lado pode receber operações diferentes se o cálculo parecer mais rápido.', isCorrect: false },
                            { letter: 'C', text: 'O resultado pode ser estimado sem considerar o enunciado original.', isCorrect: false },
                            { letter: 'D', text: 'O termo incógnita pode ser removido sem justificar a etapa.', isCorrect: false }
                          ],
                          explanation: 'Toda transformação válida preserva a equivalência entre os dois lados.',
                          topics: ['Equações lineares']
                        },
                        {
                          type: 'essay',
                          question: 'Explique, no contexto de equações lineares, por que dividir ambos os lados por 2 resolve a equação 2x = 8.',
                          difficulty: 'medium',
                          points: 10,
                          correctAnswer: 'A resposta deve explicar que dividir os dois lados pelo mesmo número preserva a equivalência e isola a incógnita, mostrando que x vale 4.',
                          explanation: 'A justificativa precisa ligar equivalência e isolamento da incógnita.',
                          topics: ['Equações lineares']
                        }
                      ]
                    })
                  }
                ]
              }
            }
          ]
        }
      });

    aiAssistantService.isConfigured = () => true;
    aiAssistantService.providerHealth = 'degraded';
    aiAssistantService.lastProviderFailure = null;
    aiAssistantService.lastSuccessfulModel = null;

    const result = await aiAssistantService.generateActivity({
      lessonTopic: 'Equações lineares',
      lessonSubject: 'Matematica',
      lessonDescription: 'Exercícios com isolamento de variável.'
    });

    expect(providerSpy).toHaveBeenCalledTimes(3);
    expect(result.providerMode).toBe('live');
    expect(result.providerModel).toBe('gemini-2.5-pro');
    expect(aiAssistantService.getProviderStatus().health).toBe('degraded');
  });

  it('should generate class summaries through the unified AI service instead of the legacy localhost:5001 flow', async () => {
    const teacher = await createTeacher();
    const student = await createStudent(teacher._id, {
      name: 'Aluno Resumo',
      grade: '8o Ano',
      subject: 'Historia'
    });

    const classData = await Class.create({
      teacher: teacher._id,
      student: student._id,
      studentName: student.name,
      title: 'História - Revolução Francesa',
      subject: 'Historia',
      grade: student.grade,
      topic: 'Revolução Francesa',
      scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      duration: 60,
      status: 'completed',
      transcript: 'A aula revisou causas, principais eventos e consequências da Revolução Francesa.'
    });

    const providerSpy = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'A aula revisou as causas da Revolução Francesa, conectou os eventos centrais ao contexto social e terminou com um próximo passo de consolidação.'
                }
              ]
            }
          }
        ]
      }
    });

    aiAssistantService.isConfigured = () => true;

    const response = await request(app)
      .post(`/api/classes/${classData._id}/generate-summary`)
      .set('Authorization', `Bearer ${createTeacherToken(teacher._id)}`)
      .send({
        transcript: classData.transcript
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.providerMode).toBe('live');
    expect(response.body.providerModel).toBe('gemini-2.5-flash');
    expect(response.body.aiSummary).toMatch(/Revolução Francesa/i);
    expect(providerSpy.mock.calls[0][0]).toMatch(/generativelanguage\.googleapis\.com/);
  });

  it('should return an explicit local fallback when AssemblyAI is not configured', async () => {
    const previousAssemblyKey = process.env.ASSEMBLYAI_API_KEY;

    try {
      delete process.env.ASSEMBLYAI_API_KEY;

      const analysis = await analyzePronunciation({
        audioBuffer: createTinyWavBuffer(),
        originalPhrase: 'Practice makes perfect.'
      });

      expect(analysis.mock).toBe(true);
      expect(analysis.providerMode).toBe('fallback');
      expect(analysis.configurationPending).toBe(true);
      expect(analysis.source).toBe('local-fallback');
      expect(analysis.metadata.service).toBe('local-fallback');
    } finally {
      if (previousAssemblyKey === undefined) {
        delete process.env.ASSEMBLYAI_API_KEY;
      } else {
        process.env.ASSEMBLYAI_API_KEY = previousAssemblyKey;
      }
    }
  });

  it('should preserve manual demo data across boots unless explicit demo reset is enabled', async () => {
    const previousResetFlag = process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT;

    try {
      delete process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT;

      const firstSeed = await ensureDevelopmentDemoData();
      expect(firstSeed.resetApplied).toBe(false);

      const teacher = await User.findOne({ email: 'demo@nexus.com' });
      const student = await Student.findOne({
        teacher: teacher._id,
        email: 'aluno.demo@nexus.com'
      });

      await Activity.create({
        teacher: teacher._id,
        student: student._id,
        title: 'Atividade manual de QA',
        description: 'Persistência manual para validar reinicialização local.',
        type: 'exercise',
        status: 'draft',
        questions: []
      });

      const secondSeed = await ensureDevelopmentDemoData();
      expect(secondSeed.resetApplied).toBe(false);
      expect(await Activity.countDocuments({
        teacher: teacher._id,
        title: 'Atividade manual de QA'
      })).toBe(1);

      process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT = 'true';
      const thirdSeed = await ensureDevelopmentDemoData();
      expect(thirdSeed.resetApplied).toBe(true);
      expect(await Activity.countDocuments({
        teacher: teacher._id,
        title: 'Atividade manual de QA'
      })).toBe(0);
    } finally {
      if (previousResetFlag === undefined) {
        delete process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT;
      } else {
        process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT = previousResetFlag;
      }
    }
  });
});
