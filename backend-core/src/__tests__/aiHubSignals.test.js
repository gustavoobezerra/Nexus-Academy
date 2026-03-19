import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Activity from '../models/Activity.js';
import LearningSignal from '../models/LearningSignal.js';
import aiAssistantRoutes from '../routes/aiAssistant.js';
import portalProfileRoutes from '../routes/portal/profile.js';
import { recordActivitySubmissionSignals } from '../services/learningSignalsService.js';

const app = express();
app.use(express.json());
app.use('/api/ai', aiAssistantRoutes);
app.use('/api/portal', portalProfileRoutes);

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

describe('AI Hub and learning signals integration', () => {
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
});
