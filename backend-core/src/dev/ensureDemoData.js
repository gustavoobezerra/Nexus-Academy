import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Payment from '../models/Payment.js';
import Activity from '../models/Activity.js';
import PronunciationTest from '../models/PronunciationTest.js';
import LessonPreparation from '../models/LessonPreparation.js';
import LearningSignal from '../models/LearningSignal.js';
import HangmanGame from '../models/HangmanGame.js';
import { Notification, NotificationTemplate } from '../models/Notification.js';
import {
  recordActivitySubmissionSignals,
  recordPronunciationSignals
} from '../services/learningSignalsService.js';

const DEMO_TAG = 'DEV_DEMO_SEED';
const shouldResetDemoOnBoot = () => ['1', 'true', 'yes'].includes(
  String(process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT || '').toLowerCase()
);
const DEMO_TEACHER = {
  name: 'Professor Demo',
  email: 'demo@nexus.com',
  password: 'Nexus@123',
  phone: '(11) 99999-9999',
  slug: 'demo-nexus'
};
const DEMO_STUDENT = {
  name: 'Lia Demo',
  email: 'aluno.demo@nexus.com',
  password: 'Aluno@123',
  parentName: 'Marina Demo',
  parentEmail: 'marina.demo@nexus.com',
  parentPhone: '(11) 98888-7777',
  age: 14,
  grade: '9o Ano',
  subject: 'Matematica',
  monthlyFee: 520,
  paymentStatus: 'paid',
  performance: {
    overall: 89,
    trend: 'up',
    strengths: ['Algebra', 'Geometria'],
    weaknesses: ['Probabilidade', 'Modelagem']
  },
  preferredDays: ['monday', 'wednesday'],
  preferredTimes: ['14:00'],
  points: 1350,
  level: 6,
  focusTopic: 'Probabilidade básica',
  reinforcementTopic: 'Modelagem de problemas'
};

const EXTRA_DEMO_STUDENT_PASSWORD = 'Aluno@123';
const CURRENT_YEAR = new Date().getFullYear();

const now = () => new Date();

const createRelativeDate = (dayOffset, hour, minute) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const studentBlueprints = [
  {
    name: 'Caio Demo',
    email: 'caio.demo@nexus.com',
    age: 13,
    grade: '8o Ano',
    subject: 'Fisica',
    monthlyFee: 480,
    paymentStatus: 'late',
    performance: { overall: 75, trend: 'stable', strengths: ['Experimentos'], weaknesses: ['Cinematica', 'Conversao de unidades'] },
    points: 980,
    level: 4,
    preferredDays: ['tuesday', 'thursday'],
    preferredTimes: ['16:00'],
    focusTopic: 'Cinematica básica',
    reinforcementTopic: 'Conversao de unidades'
  },
  {
    name: 'Sofia Demo',
    email: 'sofia.demo@nexus.com',
    age: 15,
    grade: '1o EM',
    subject: 'Quimica',
    monthlyFee: 560,
    paymentStatus: 'pending',
    performance: { overall: 84, trend: 'up', strengths: ['Ligacoes quimicas'], weaknesses: ['Balanceamento'] },
    points: 1210,
    level: 5,
    preferredDays: ['monday', 'friday'],
    preferredTimes: ['10:30'],
    focusTopic: 'Balanceamento químico',
    reinforcementTopic: 'Ligacoes químicas'
  },
  {
    name: 'Ana Demo',
    email: 'ana.demo@nexus.com',
    age: 12,
    grade: '7o Ano',
    subject: 'Matematica',
    monthlyFee: 430,
    paymentStatus: 'paid',
    performance: { overall: 71, trend: 'up', strengths: ['Leitura de problemas'], weaknesses: ['Fracoes', 'Divisao'] },
    points: 760,
    level: 3,
    preferredDays: ['monday', 'thursday'],
    preferredTimes: ['15:00'],
    focusTopic: 'Frações equivalentes',
    reinforcementTopic: 'Divisão com restos'
  },
  {
    name: 'Bruno Demo',
    email: 'bruno.demo@nexus.com',
    age: 14,
    grade: '8o Ano',
    subject: 'Matematica',
    monthlyFee: 470,
    paymentStatus: 'paid',
    performance: { overall: 67, trend: 'stable', strengths: ['Geometria plana'], weaknesses: ['Equacoes lineares', 'Porcentagem'] },
    points: 705,
    level: 3,
    preferredDays: ['tuesday', 'friday'],
    preferredTimes: ['17:00'],
    focusTopic: 'Equações lineares',
    reinforcementTopic: 'Porcentagem em situações reais'
  },
  {
    name: 'Clara Demo',
    email: 'clara.demo@nexus.com',
    age: 16,
    grade: '2o EM',
    subject: 'Fisica',
    monthlyFee: 590,
    paymentStatus: 'paid',
    performance: { overall: 79, trend: 'up', strengths: ['Vetores'], weaknesses: ['Dinamica'] },
    points: 1185,
    level: 5,
    preferredDays: ['wednesday'],
    preferredTimes: ['18:00'],
    focusTopic: 'Dinâmica e força resultante',
    reinforcementTopic: 'Vetores aplicados'
  },
  {
    name: 'Diego Demo',
    email: 'diego.demo@nexus.com',
    age: 15,
    grade: '1o EM',
    subject: 'Quimica',
    monthlyFee: 545,
    paymentStatus: 'late',
    performance: { overall: 69, trend: 'down', strengths: ['Tabela periódica'], weaknesses: ['Mol', 'Estequiometria'] },
    points: 890,
    level: 4,
    preferredDays: ['thursday'],
    preferredTimes: ['19:00'],
    focusTopic: 'Conceito de mol',
    reinforcementTopic: 'Estequiometria básica'
  },
  {
    name: 'Elisa Demo',
    email: 'elisa.demo@nexus.com',
    age: 17,
    grade: '3o EM',
    subject: 'Matematica',
    monthlyFee: 620,
    paymentStatus: 'pending',
    performance: { overall: 81, trend: 'up', strengths: ['Funções'], weaknesses: ['Trigonometria'] },
    points: 1400,
    level: 6,
    preferredDays: ['monday', 'wednesday'],
    preferredTimes: ['19:30'],
    focusTopic: 'Trigonometria no círculo',
    reinforcementTopic: 'Funções compostas'
  },
  {
    name: 'Felipe Demo',
    email: 'felipe.demo@nexus.com',
    age: 13,
    grade: '8o Ano',
    subject: 'Fisica',
    monthlyFee: 455,
    paymentStatus: 'paid',
    performance: { overall: 73, trend: 'stable', strengths: ['Leitura de gráficos'], weaknesses: ['Velocidade média'] },
    points: 810,
    level: 3,
    preferredDays: ['tuesday'],
    preferredTimes: ['14:30'],
    focusTopic: 'Velocidade média',
    reinforcementTopic: 'Leitura de gráficos'
  },
  {
    name: 'Gabriela Demo',
    email: 'gabriela.demo@nexus.com',
    age: 15,
    grade: '1o EM',
    subject: 'Quimica',
    monthlyFee: 570,
    paymentStatus: 'paid',
    performance: { overall: 88, trend: 'up', strengths: ['Organização'], weaknesses: ['Funcoes inorganicas'] },
    points: 1525,
    level: 6,
    preferredDays: ['wednesday', 'friday'],
    preferredTimes: ['09:00'],
    focusTopic: 'Funções inorgânicas',
    reinforcementTopic: 'Reações de neutralização'
  },
  {
    name: 'Heitor Demo',
    email: 'heitor.demo@nexus.com',
    age: 14,
    grade: '9o Ano',
    subject: 'Matematica',
    monthlyFee: 500,
    paymentStatus: 'late',
    performance: { overall: 64, trend: 'down', strengths: ['Interpretação'], weaknesses: ['Razoes e proporcoes'] },
    points: 640,
    level: 2,
    preferredDays: ['monday', 'thursday'],
    preferredTimes: ['13:30'],
    focusTopic: 'Razões e proporções',
    reinforcementTopic: 'Problemas percentuais'
  },
  {
    name: 'Isabela Demo',
    email: 'isabela.demo@nexus.com',
    age: 17,
    grade: '3o EM',
    subject: 'Matematica',
    monthlyFee: 640,
    paymentStatus: 'paid',
    performance: { overall: 92, trend: 'up', strengths: ['Geometria analitica'], weaknesses: ['Probabilidade condicional'] },
    points: 1740,
    level: 7,
    preferredDays: ['saturday'],
    preferredTimes: ['10:00'],
    focusTopic: 'Probabilidade condicional',
    reinforcementTopic: 'Geometria analítica'
  },
  {
    name: 'Joao Demo',
    email: 'joao.demo@nexus.com',
    age: 13,
    grade: '8o Ano',
    subject: 'English',
    monthlyFee: 490,
    paymentStatus: 'pending',
    performance: { overall: 76, trend: 'stable', strengths: ['Vocabulário'], weaknesses: ['Pronunciation', 'Simple past'] },
    points: 930,
    level: 4,
    preferredDays: ['wednesday'],
    preferredTimes: ['17:30'],
    focusTopic: 'Simple past in conversation',
    reinforcementTopic: 'Pronunciation of daily verbs'
  },
  {
    name: 'Larissa Demo',
    email: 'larissa.demo@nexus.com',
    age: 16,
    grade: '2o EM',
    subject: 'English',
    monthlyFee: 610,
    paymentStatus: 'paid',
    performance: { overall: 83, trend: 'up', strengths: ['Reading'], weaknesses: ['Connected speech'] },
    points: 1320,
    level: 5,
    preferredDays: ['friday'],
    preferredTimes: ['18:30'],
    focusTopic: 'Connected speech',
    reinforcementTopic: 'Listening for reductions'
  },
  {
    name: 'Marcos Demo',
    email: 'marcos.demo@nexus.com',
    age: 15,
    grade: '1o EM',
    subject: 'Fisica',
    monthlyFee: 535,
    paymentStatus: 'paid',
    performance: { overall: 78, trend: 'stable', strengths: ['Raciocínio lógico'], weaknesses: ['Pressao'] },
    points: 1015,
    level: 4,
    preferredDays: ['thursday'],
    preferredTimes: ['11:00'],
    focusTopic: 'Pressão e empuxo',
    reinforcementTopic: 'Densidade'
  },
  {
    name: 'Natalia Demo',
    email: 'natalia.demo@nexus.com',
    age: 12,
    grade: '7o Ano',
    subject: 'Matematica',
    monthlyFee: 425,
    paymentStatus: 'paid',
    performance: { overall: 74, trend: 'up', strengths: ['Operações básicas'], weaknesses: ['Interpretacao de tabelas'] },
    points: 720,
    level: 3,
    preferredDays: ['monday'],
    preferredTimes: ['08:30'],
    focusTopic: 'Interpretação de tabelas',
    reinforcementTopic: 'Leitura de gráficos simples'
  },
  {
    name: 'Pedro Demo',
    email: 'pedro.demo@nexus.com',
    age: 17,
    grade: '3o EM',
    subject: 'Quimica',
    monthlyFee: 650,
    paymentStatus: 'late',
    performance: { overall: 72, trend: 'stable', strengths: ['Estequiometria'], weaknesses: ['Eletroquimica'] },
    points: 1090,
    level: 4,
    preferredDays: ['tuesday', 'saturday'],
    preferredTimes: ['09:30'],
    focusTopic: 'Eletroquímica',
    reinforcementTopic: 'Pilhas e eletrólise'
  },
  {
    name: 'Rafaela Demo',
    email: 'rafaela.demo@nexus.com',
    age: 14,
    grade: '9o Ano',
    subject: 'English',
    monthlyFee: 505,
    paymentStatus: 'paid',
    performance: { overall: 79, trend: 'up', strengths: ['Writing'], weaknesses: ['Pronunciation of final sounds'] },
    points: 990,
    level: 4,
    preferredDays: ['wednesday', 'friday'],
    preferredTimes: ['16:30'],
    focusTopic: 'Pronunciation of final sounds',
    reinforcementTopic: 'Everyday speaking rhythm'
  }
];

const createTeacher = async () => {
  let teacher = await User.findOne({ email: DEMO_TEACHER.email.toLowerCase() });

  if (!teacher) {
    teacher = await User.create({
      name: DEMO_TEACHER.name,
      email: DEMO_TEACHER.email,
      password: DEMO_TEACHER.password,
      phone: DEMO_TEACHER.phone,
      role: 'teacher',
      slug: DEMO_TEACHER.slug,
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro',
      onboardingCompletedAt: now(),
      trialEndsAt: createRelativeDate(15, 23, 59),
      subjects: ['Matematica', 'Fisica', 'Quimica', 'English'],
      bio: 'Conta de demonstracao criada automaticamente para desenvolvimento local.'
    });
  } else {
    teacher.name = DEMO_TEACHER.name;
    teacher.phone = DEMO_TEACHER.phone;
    teacher.slug = teacher.slug || DEMO_TEACHER.slug;
    teacher.role = 'teacher';
    teacher.status = 'active';
    teacher.subscriptionStatus = 'active';
    teacher.subscriptionPlan = 'pro';
    teacher.onboardingCompletedAt = teacher.onboardingCompletedAt || now();
    teacher.trialEndsAt = teacher.trialEndsAt || createRelativeDate(15, 23, 59);
    teacher.password = DEMO_TEACHER.password;
    teacher.subjects = Array.from(new Set([...(teacher.subjects || []), 'Matematica', 'Fisica', 'Quimica', 'English']));
    await teacher.save();
  }

  return teacher;
};

const ensureStudent = async (teacher, blueprint, passwordHash) => {
  let student = await Student.findOne({
    teacher: teacher._id,
    'portalAccess.email': blueprint.email.toLowerCase()
  }).select('+portalAccess.password');

  if (!student) {
    student = await Student.create({
      teacher: teacher._id,
      name: blueprint.name,
      email: blueprint.email.toLowerCase(),
      age: blueprint.age,
      grade: blueprint.grade,
      subject: blueprint.subject,
      monthlyFee: blueprint.monthlyFee,
      paymentStatus: blueprint.paymentStatus,
      parentName: blueprint.parentName || `Responsavel ${blueprint.name}`,
      parentEmail: blueprint.parentEmail || `responsavel.${blueprint.email.toLowerCase()}`,
      parentPhone: blueprint.parentPhone || '(11) 97777-6666',
      preferredDays: blueprint.preferredDays || ['monday'],
      preferredTimes: blueprint.preferredTimes || ['14:00'],
      nextClass: createRelativeDate(2, 15, 0).toISOString(),
      performance: {
        overall: blueprint.performance.overall,
        trend: blueprint.performance.trend,
        strengths: blueprint.performance.strengths || [],
        weaknesses: blueprint.performance.weaknesses || []
      },
      profile: {
        description: `Aluno demo ${blueprint.name} com histórico curado para validar busca, insights e AI Hub.`,
        interests: [blueprint.focusTopic, blueprint.reinforcementTopic]
      },
      onboarding: {
        completed: true,
        completedAt: now(),
        subject: blueprint.subject,
        answers: {
          learningPurpose: 'Melhorar desempenho e consistência nos estudos.',
          currentLevel: blueprint.grade.includes('EM') ? 'medio' : 'fundamental',
          targetTimeframe: '90 dias',
          studyHoursPerWeek: 4,
          preferredSchedule: 'afternoon',
          learningStyle: 'exercises',
          previousExperience: 'Participa de reforço recorrente com foco em prática guiada.',
          mainChallenges: blueprint.performance.weaknesses || [],
          specificGoals: [blueprint.focusTopic]
        }
      },
      portalAccess: {
        enabled: true,
        email: blueprint.email.toLowerCase(),
        password: passwordHash,
        lastLogin: now()
      },
      points: blueprint.points,
      level: blueprint.level,
      active: true,
      tags: [DEMO_TAG],
      notes: DEMO_TAG
    });
  } else {
    student.name = blueprint.name;
    student.email = blueprint.email.toLowerCase();
    student.age = blueprint.age;
    student.grade = blueprint.grade;
    student.subject = blueprint.subject;
    student.monthlyFee = blueprint.monthlyFee;
    student.paymentStatus = blueprint.paymentStatus;
    student.active = true;
    student.performance = {
      overall: blueprint.performance.overall,
      trend: blueprint.performance.trend,
      strengths: blueprint.performance.strengths || [],
      weaknesses: blueprint.performance.weaknesses || []
    };
    student.preferredDays = blueprint.preferredDays || student.preferredDays;
    student.preferredTimes = blueprint.preferredTimes || student.preferredTimes;
    student.points = blueprint.points;
    student.level = blueprint.level;
    student.tags = Array.from(new Set([...(student.tags || []), DEMO_TAG]));
    student.notes = DEMO_TAG;
    student.portalAccess = {
      ...student.portalAccess,
      enabled: true,
      email: blueprint.email.toLowerCase(),
      password: passwordHash,
      lastLogin: student.portalAccess?.lastLogin || now()
    };
    student.onboarding = {
      ...student.onboarding,
      completed: true,
      completedAt: student.onboarding?.completedAt || now(),
      subject: blueprint.subject
    };
    await student.save();
  }

  return student;
};

const createQuestionSet = (subject, topic) => ([
  {
    questionNumber: 1,
    type: 'multiple_choice',
    question: `Ao revisar ${topic}, qual atitude ajuda mais a acertar a questão?`,
    difficulty: 'medium',
    points: 10,
    options: [
      { letter: 'A', text: 'Identificar os dados relevantes e o conceito central antes de calcular.', isCorrect: true },
      { letter: 'B', text: 'Começar pelo resultado esperado sem ler o enunciado inteiro.', isCorrect: false },
      { letter: 'C', text: 'Ignorar unidades e condições iniciais do problema.', isCorrect: false },
      { letter: 'D', text: 'Escolher a alternativa mais longa por segurança.', isCorrect: false }
    ],
    explanation: `Em ${subject}, ler os dados e localizar o conceito central evita erros de interpretação.`,
    topics: [topic]
  },
  {
    questionNumber: 2,
    type: 'true_false',
    question: `Em ${topic}, conferir a coerência do resultado final ajuda a evitar erros de procedimento.`,
    difficulty: 'easy',
    points: 10,
    options: [
      { letter: 'A', text: 'Verdadeiro', isCorrect: true },
      { letter: 'B', text: 'Falso', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'A verificação final é uma etapa-chave para consolidar o raciocínio.',
    topics: [topic]
  },
  {
    questionNumber: 3,
    type: 'fill_blank',
    question: `Ao estudar ${topic}, o aluno precisa aplicar o conceito com raciocínio ____ e organizado.`,
    difficulty: 'medium',
    points: 10,
    correctAnswer: 'consistente',
    explanation: 'O foco da revisão é usar o conceito de modo consistente e justificável.',
    topics: [topic]
  },
  {
    questionNumber: 4,
    type: 'multiple_choice',
    question: `Qual é o objetivo principal da próxima aula de ${subject} sobre ${topic}?`,
    difficulty: 'medium',
    points: 10,
    options: [
      { letter: 'A', text: 'Resolver exemplos guiados e transferir o conceito para novos contextos.', isCorrect: true },
      { letter: 'B', text: 'Decorar respostas sem relacionar o conteúdo ao problema.', isCorrect: false },
      { letter: 'C', text: 'Pular a revisão e avançar sem consolidar o básico.', isCorrect: false },
      { letter: 'D', text: 'Treinar apenas velocidade sem compreender o processo.', isCorrect: false }
    ],
    explanation: 'A prática guiada prepara o aluno para aplicar o conteúdo em situações novas.',
    topics: [topic]
  }
]);

const getLessonTitles = (student, blueprint) => {
  if (student.email === DEMO_STUDENT.email.toLowerCase()) {
    return {
      completedTitle: 'Reforco de Algebra',
      completedTopic: 'Equacoes do 2o grau',
      scheduledTitle: 'Matematica - probabilidade aplicada',
      scheduledTopic: blueprint.reinforcementTopic
    };
  }

  return {
    completedTitle: `${blueprint.subject} - revisão de ${blueprint.focusTopic}`,
    completedTopic: blueprint.focusTopic,
    scheduledTitle: `${blueprint.subject} - prática de ${blueprint.reinforcementTopic}`,
    scheduledTopic: blueprint.reinforcementTopic
  };
};

const ensureClassesForStudent = async (teacher, student, blueprint, index) => {
  const titles = getLessonTitles(student, blueprint);
  const completedTitle = titles.completedTitle;
  const scheduledTitle = titles.scheduledTitle;

  const completedClass = await Class.findOne({
    teacher: teacher._id,
    student: student._id,
    title: completedTitle
  });

  if (!completedClass) {
    await Class.create({
      teacher: teacher._id,
      student: student._id,
      studentName: student.name,
      title: completedTitle,
      subject: blueprint.subject,
      grade: blueprint.grade,
      topic: titles.completedTopic,
      scheduledAt: createRelativeDate(-Math.max(1, index + 1), 14 + (index % 4), 0),
      duration: 60,
      status: 'completed',
      isLive: false,
      notes: DEMO_TAG
    });
  }

  const scheduledClass = await Class.findOne({
    teacher: teacher._id,
    student: student._id,
    title: scheduledTitle
  });

  if (!scheduledClass) {
    await Class.create({
      teacher: teacher._id,
      student: student._id,
      studentName: student.name,
      title: scheduledTitle,
      subject: blueprint.subject,
      grade: blueprint.grade,
      topic: titles.scheduledTopic,
      scheduledAt: createRelativeDate((index % 5) + 1, 9 + (index % 6), 30),
      duration: 60,
      status: 'scheduled',
      isLive: false,
      notes: DEMO_TAG
    });
  }
};

const ensureLessonPreparationForStudent = async (teacher, student, blueprint) => {
  const titles = getLessonTitles(student, blueprint);
  const targetClass = await Class.findOne({
    teacher: teacher._id,
    student: student._id,
    title: titles.completedTitle
  }).sort({ scheduledAt: -1 });

  if (!targetClass) {
    return;
  }

  const existingPreparation = await LessonPreparation.findOne({
    teacher: teacher._id,
    class: targetClass._id
  });

  if (existingPreparation) {
    return;
  }

  const generatedPreparation = await LessonPreparation.generatePreparation(
    targetClass.toObject(),
    student.toObject(),
    []
  );

  const status = student.email === DEMO_STUDENT.email.toLowerCase() ? 'ready' : 'draft';

  const preparation = await LessonPreparation.create({
    class: targetClass._id,
    student: student._id,
    teacher: teacher._id,
    ...generatedPreparation,
    topic: titles.completedTopic,
    generatedByAI: true,
    status,
    aiMetadata: {
      ...(generatedPreparation.aiMetadata || {}),
      generatedAt: now(),
      providerMode: 'fallback',
      confidence: generatedPreparation.aiMetadata?.confidence || 78
    },
    teacherReview: {
      reviewed: status === 'ready',
      reviewedAt: status === 'ready' ? now() : null,
      modifications: [],
      approved: status === 'ready',
      notes: status === 'ready' ? 'Plano demo curado para validacao local.' : 'Plano demo pendente para revisao no AI Hub.'
    }
  });

  await Class.findByIdAndUpdate(targetClass._id, {
    $set: {
      lessonPlan: preparation._id
    }
  });
};

const ensurePaymentForStudent = async (teacher, student) => {
  const monthLabel = now().toLocaleString('pt-BR', { month: 'long' });

  const existingPayment = await Payment.findOne({
    teacher: teacher._id,
    student: student._id,
    month: monthLabel,
    year: CURRENT_YEAR
  });

  if (existingPayment) {
    return;
  }

  await Payment.create({
    teacher: teacher._id,
    student: student._id,
    amount: student.monthlyFee || 500,
    month: monthLabel,
    year: CURRENT_YEAR,
    dueDate: createRelativeDate(student.paymentStatus === 'pending' ? 4 : -4, 8, 0),
    paidAt: student.paymentStatus === 'paid' ? createRelativeDate(-2, 9, 0) : null,
    status: student.paymentStatus,
    type: 'manual',
    paymentMethod: 'pix',
    invoiceNumber: `DEMO-${toCompactId(student.email)}-${CURRENT_YEAR}`,
    notes: DEMO_TAG
  });
};

const ensureDiagnosticActivity = async (teacher, student, blueprint) => {
  const activityTitle = `Diagnostico ${blueprint.subject} - ${blueprint.focusTopic}`;
  let activity = await Activity.findOne({
    teacher: teacher._id,
    student: student._id,
    title: activityTitle
  });

  if (!activity) {
    const linkedClass = await Class.findOne({
      teacher: teacher._id,
      student: student._id,
      topic: blueprint.focusTopic
    }).sort({ scheduledAt: -1 });

    activity = await Activity.create({
      class: linkedClass?._id || null,
      student: student._id,
      teacher: teacher._id,
      title: activityTitle,
      description: `Atividade diagnóstica para medir segurança em ${blueprint.focusTopic}.`,
      type: 'exercise',
      questions: createQuestionSet(blueprint.subject, blueprint.focusTopic),
      dueDate: createRelativeDate(-1, 23, 59),
      status: 'published',
      generatedByAI: false,
      aiMetadata: {
        sourceTranscript: `Seed demo para ${blueprint.focusTopic}`,
        topics: [blueprint.subject, blueprint.focusTopic],
        generatedAt: now(),
        providerMode: 'fallback',
        sourceType: 'manual',
        batchId: `seed_${toCompactId(student.email)}_${blueprint.focusTopic.replace(/\s+/g, '_').toLowerCase()}`,
        targetMode: 'specific',
        gradeLevel: blueprint.grade,
        learningObjective: `Consolidar ${blueprint.focusTopic}`,
        reviewed: true,
        reviewedAt: now(),
        reviewedBy: teacher._id
      }
    });
  }

  if ((activity.submissions || []).length > 0) {
    return;
  }

  const weakPerformance = blueprint.performance.overall < 75;
  activity.submissions.push({
    submittedAt: createRelativeDate(-1, 20, 0),
    answers: [
      { questionNumber: 1, answer: weakPerformance ? 'B' : 'A' },
      { questionNumber: 2, answer: weakPerformance ? 'B' : 'A' },
      { questionNumber: 3, answer: weakPerformance ? 'parcial' : 'consistente' },
      { questionNumber: 4, answer: weakPerformance ? 'C' : 'A' }
    ]
  });

  await activity.save();
  await activity.autoGradeSubmission(activity.submissions.length - 1);
  activity.status = 'graded';
  await activity.save();

  await recordActivitySubmissionSignals({
    activity,
    submission: activity.submissions[activity.submissions.length - 1]
  });
};

const ensurePendingActivityForStudent = async (teacher, student, blueprint) => {
  const activityTitle = `Pratica guiada ${blueprint.subject} - ${blueprint.reinforcementTopic}`;
  const existingActivity = await Activity.findOne({
    teacher: teacher._id,
    student: student._id,
    title: activityTitle
  });

  if (existingActivity) {
    return;
  }

  await Activity.create({
    student: student._id,
    teacher: teacher._id,
    title: activityTitle,
    description: `Lista curta para preparar a próxima aula sobre ${blueprint.reinforcementTopic}.`,
    type: 'homework',
    questions: createQuestionSet(blueprint.subject, blueprint.reinforcementTopic),
    dueDate: createRelativeDate(2, 23, 0),
    status: 'published',
    generatedByAI: false,
    aiMetadata: {
      sourceTranscript: `Lista de preparação sobre ${blueprint.reinforcementTopic}`,
      topics: [blueprint.subject, blueprint.reinforcementTopic],
      generatedAt: now(),
      providerMode: 'fallback',
      sourceType: 'manual',
      batchId: `seed_pending_${toCompactId(student.email)}`,
      targetMode: 'specific',
      gradeLevel: blueprint.grade,
      learningObjective: `Reforçar ${blueprint.reinforcementTopic}`,
      reviewed: true,
      reviewedAt: now(),
      reviewedBy: teacher._id
    }
  });
};

const ensurePronunciationHistory = async (teacher, student, blueprint) => {
  if (!/english/i.test(blueprint.subject)) {
    return;
  }

  const phrase = `Practice ${blueprint.reinforcementTopic.toLowerCase()} every day.`;
  const existingTest = await PronunciationTest.findOne({
    teacher: teacher._id,
    student: student._id,
    phrase
  });

  if (existingTest) {
    return;
  }

  const pronunciationTest = await PronunciationTest.create({
    student: student._id,
    teacher: teacher._id,
    phrase,
    difficulty: 'intermediate',
    accuracyScore: 0.76,
    fluencyScore: 0.74,
    pronunciationScore: 0.72,
    feedback: `O aluno ainda hesita em ${blueprint.reinforcementTopic.toLowerCase()} e precisa repetir o padrão com mais clareza.`,
    wordScores: [
      {
        word: 'practice',
        score: 0.7,
        phonetic: '/ˈpræk.tɪs/',
        phonemes: ['pr', 'ac', 'tice'],
        syllables: [
          { text: 'prac', score: 0.68 },
          { text: 'tice', score: 0.72 }
        ]
      },
      {
        word: blueprint.reinforcementTopic.split(' ')[0].toLowerCase(),
        score: 0.66,
        phonetic: '/ˈsɔːnd/',
        phonemes: ['sound'],
        syllables: [
          { text: 'sound', score: 0.66 }
        ]
      }
    ]
  });

  await recordPronunciationSignals({
    pronunciationTest,
    studentSubject: blueprint.subject
  });
};

const ensureTeacherGroups = async (teacher, demoStudents) => {
  const mathIds = demoStudents
    .filter((student) => /matematica/i.test(student.subject || ''))
    .slice(0, 5)
    .map((student) => student._id.toString());
  const languageIds = demoStudents
    .filter((student) => /english/i.test(student.subject || ''))
    .slice(0, 4)
    .map((student) => student._id.toString());

  teacher.teacherWorkspace = {
    ...(teacher.teacherWorkspace || {}),
    studentGroups: [
      {
        id: `group_demo_math_${teacher._id}`,
        name: 'Matemática em reforço',
        description: 'Grupo demo com foco em frações, porcentagem e modelagem.',
        color: '#4f46e5',
        studentIds: mathIds,
        suggestedByAI: false,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: `group_demo_language_${teacher._id}`,
        name: 'Speaking Lab',
        description: 'Alunos demo de English com sinais de pronúncia e fluidez.',
        color: '#06b6d4',
        studentIds: languageIds,
        suggestedByAI: true,
        createdAt: now(),
        updatedAt: now()
      }
    ].filter((group) => group.studentIds.length > 0)
  };

  await teacher.save();
};

const resetDemoDomain = async (teacher) => {
  await Promise.all([
    LearningSignal.deleteMany({ teacher: teacher._id }),
    PronunciationTest.deleteMany({ teacher: teacher._id }),
    LessonPreparation.deleteMany({ teacher: teacher._id }),
    Activity.deleteMany({ teacher: teacher._id }),
    Payment.deleteMany({ teacher: teacher._id }),
    Class.deleteMany({ teacher: teacher._id }),
    HangmanGame.deleteMany({ teacher: teacher._id }),
    Notification.deleteMany({ teacher: teacher._id }),
    NotificationTemplate.deleteMany({ teacher: teacher._id })
  ]);

  await Student.deleteMany({ teacher: teacher._id });

  teacher.teacherWorkspace = {
    ...(teacher.teacherWorkspace || {}),
    studentGroups: []
  };
  await teacher.save();
};

const toCompactId = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 18);

/**
 * Garante um conjunto robusto de dados locais para login, dashboard, AI Hub,
 * insights e portal do aluno funcionarem imediatamente em desenvolvimento.
 * Nunca roda em producao.
 */
export const ensureDevelopmentDemoData = async (options = {}) => {
  const { forceReset = false } = options;

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const resetApplied = forceReset || shouldResetDemoOnBoot();
  const teacher = await createTeacher();
  if (resetApplied) {
    await resetDemoDomain(teacher);
  }
  const demoStudentPasswordHash = await bcrypt.hash(DEMO_STUDENT.password, 12);
  const sharedStudentPasswordHash = await bcrypt.hash(EXTRA_DEMO_STUDENT_PASSWORD, 12);

  const primaryStudent = await ensureStudent(teacher, DEMO_STUDENT, demoStudentPasswordHash);
  const extraStudents = [];

  for (const blueprint of studentBlueprints) {
    const student = await ensureStudent(teacher, blueprint, sharedStudentPasswordHash);
    extraStudents.push(student);
  }

  const demoStudents = [primaryStudent, ...extraStudents];

  for (const [index, student] of demoStudents.entries()) {
    const blueprint = student.email === DEMO_STUDENT.email.toLowerCase()
      ? DEMO_STUDENT
      : studentBlueprints.find((item) => item.email.toLowerCase() === student.email);

    if (!blueprint) {
      continue;
    }

    await ensureClassesForStudent(teacher, student, blueprint, index);
    await ensurePaymentForStudent(teacher, student);
    await ensureDiagnosticActivity(teacher, student, blueprint);
    await ensurePronunciationHistory(teacher, student, blueprint);
    await ensureLessonPreparationForStudent(teacher, student, blueprint);
  }

  await ensurePendingActivityForStudent(teacher, primaryStudent, DEMO_STUDENT);
  await ensureTeacherGroups(teacher, demoStudents);

  return {
    resetApplied,
    teacherEmail: DEMO_TEACHER.email,
    teacherPassword: DEMO_TEACHER.password,
    studentEmail: DEMO_STUDENT.email,
    studentPassword: DEMO_STUDENT.password
  };
};

export default ensureDevelopmentDemoData;
