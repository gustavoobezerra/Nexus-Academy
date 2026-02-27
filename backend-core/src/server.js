import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupHangmanSocket } from './socket/hangmanSocket.js';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  const message = 'JWT_SECRET deve estar definido nas variÃ¡veis de ambiente';
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(`[AVISO] ${message}. Usando valor inseguro apenas para desenvolvimento.`);
}

// Permitir uso em produÃ§Ã£o para deploy inicial
// if (isProduction) {
//   throw new Error('server-simple nÃ£o deve ser usado em produÃ§Ã£o. Utilize server.js com MongoDB.');
// }

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== BANCO DE DADOS EM MEMÃ“RIA ======
// Usuario demo pre-cadastrado (senha: 123456)
// Hash sera gerado dinamicamente na inicializacao
let senhaDemoHash = null;

let users = [
  {
    id: 'user_demo',
    name: 'Professor Demo',
    email: 'demo@nexus.com',
    password: null, // Sera definido na inicializacao
    phone: '(11) 99999-9999',
    role: 'teacher',
    createdAt: new Date()
  }
];

// 10 alunos demo com dados variados
let students = [
  {
    id: 'student_1', _id: 'student_1',
    name: 'Maria Silva', age: 12, grade: '7o Ano', monthlyFee: 450.00,
    guardian: 'Ana Silva', parentName: 'Ana Silva',
    email: 'ana.silva@email.com', parentEmail: 'ana.silva@email.com',
    phone: '(11) 98888-1111', parentPhone: '(11) 98888-1111',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'paid',
    subject: 'Matematica', nextClass: 'Segunda 14:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_2', _id: 'student_2',
    name: 'Joao Santos', age: 10, grade: '5o Ano', monthlyFee: 400.00,
    guardian: 'Carlos Santos', parentName: 'Carlos Santos',
    email: 'carlos.santos@email.com', parentEmail: 'carlos.santos@email.com',
    phone: '(11) 97777-2222', parentPhone: '(11) 97777-2222',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'pending',
    subject: 'Portugues', nextClass: 'Terca 15:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_3', _id: 'student_3',
    name: 'Pedro Oliveira', age: 14, grade: '9o Ano', monthlyFee: 500.00,
    guardian: 'Lucia Oliveira', parentName: 'Lucia Oliveira',
    email: 'lucia.oliveira@email.com', parentEmail: 'lucia.oliveira@email.com',
    phone: '(11) 96666-3333', parentPhone: '(11) 96666-3333',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'late',
    subject: 'Matematica', nextClass: 'Quarta 16:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_4', _id: 'student_4',
    name: 'Ana Carolina Mendes', age: 11, grade: '6o Ano', monthlyFee: 420.00,
    guardian: 'Roberto Mendes', parentName: 'Roberto Mendes',
    email: 'roberto.mendes@email.com', parentEmail: 'roberto.mendes@email.com',
    phone: '(11) 95555-4444', parentPhone: '(11) 95555-4444',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'paid',
    subject: 'Ingles', nextClass: 'Segunda 16:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_5', _id: 'student_5',
    name: 'Lucas Ferreira', age: 15, grade: '1o EM', monthlyFee: 550.00,
    guardian: 'Patricia Ferreira', parentName: 'Patricia Ferreira',
    email: 'patricia.ferreira@email.com', parentEmail: 'patricia.ferreira@email.com',
    phone: '(11) 94444-5555', parentPhone: '(11) 94444-5555',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'paid',
    subject: 'Fisica', nextClass: 'Quinta 14:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_6', _id: 'student_6',
    name: 'Beatriz Costa', age: 13, grade: '8o Ano', monthlyFee: 480.00,
    guardian: 'Marcelo Costa', parentName: 'Marcelo Costa',
    email: 'marcelo.costa@email.com', parentEmail: 'marcelo.costa@email.com',
    phone: '(11) 93333-6666', parentPhone: '(11) 93333-6666',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'pending',
    subject: 'Quimica', nextClass: 'Sexta 15:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_7', _id: 'student_7',
    name: 'Gabriel Souza', age: 9, grade: '4o Ano', monthlyFee: 380.00,
    guardian: 'Fernanda Souza', parentName: 'Fernanda Souza',
    email: 'fernanda.souza@email.com', parentEmail: 'fernanda.souza@email.com',
    phone: '(11) 92222-7777', parentPhone: '(11) 92222-7777',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'paid',
    subject: 'Matematica', nextClass: 'Terca 14:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_8', _id: 'student_8',
    name: 'Isabela Rodrigues', age: 16, grade: '2o EM', monthlyFee: 580.00,
    guardian: 'Antonio Rodrigues', parentName: 'Antonio Rodrigues',
    email: 'antonio.rodrigues@email.com', parentEmail: 'antonio.rodrigues@email.com',
    phone: '(11) 91111-8888', parentPhone: '(11) 91111-8888',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'late',
    subject: 'Biologia', nextClass: 'Quarta 14:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_9', _id: 'student_9',
    name: 'Rafael Lima', age: 12, grade: '7o Ano', monthlyFee: 450.00,
    guardian: 'Sandra Lima', parentName: 'Sandra Lima',
    email: 'sandra.lima@email.com', parentEmail: 'sandra.lima@email.com',
    phone: '(11) 90000-9999', parentPhone: '(11) 90000-9999',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'paid',
    subject: 'Historia', nextClass: 'Segunda 15:00',
    deleted: false, createdAt: new Date()
  },
  {
    id: 'student_10', _id: 'student_10',
    name: 'Camila Almeida', age: 14, grade: '9o Ano', monthlyFee: 500.00,
    guardian: 'Ricardo Almeida', parentName: 'Ricardo Almeida',
    email: 'ricardo.almeida@email.com', parentEmail: 'ricardo.almeida@email.com',
    phone: '(11) 98765-4321', parentPhone: '(11) 98765-4321',
    teacherId: 'user_demo', status: 'active', paymentStatus: 'pending',
    subject: 'Geografia', nextClass: 'Quinta 16:00',
    deleted: false, createdAt: new Date()
  }
];

const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
const anoAtual = new Date().getFullYear();

// Pagamentos para todos os 10 alunos
let payments = [
  { id: 'payment_1', _id: 'payment_1', studentId: 'student_1', amount: 450.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'paid', paidAt: new Date(), createdAt: new Date() },
  { id: 'payment_2', _id: 'payment_2', studentId: 'student_2', amount: 400.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'pending', createdAt: new Date() },
  { id: 'payment_3', _id: 'payment_3', studentId: 'student_3', amount: 500.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth() - 1, 10), status: 'late', createdAt: new Date() },
  { id: 'payment_4', _id: 'payment_4', studentId: 'student_4', amount: 420.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'paid', paidAt: new Date(), createdAt: new Date() },
  { id: 'payment_5', _id: 'payment_5', studentId: 'student_5', amount: 550.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'paid', paidAt: new Date(), createdAt: new Date() },
  { id: 'payment_6', _id: 'payment_6', studentId: 'student_6', amount: 480.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'pending', createdAt: new Date() },
  { id: 'payment_7', _id: 'payment_7', studentId: 'student_7', amount: 380.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'paid', paidAt: new Date(), createdAt: new Date() },
  { id: 'payment_8', _id: 'payment_8', studentId: 'student_8', amount: 580.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth() - 1, 10), status: 'late', createdAt: new Date() },
  { id: 'payment_9', _id: 'payment_9', studentId: 'student_9', amount: 450.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'paid', paidAt: new Date(), createdAt: new Date() },
  { id: 'payment_10', _id: 'payment_10', studentId: 'student_10', amount: 500.00, month: mesAtual, year: anoAtual, dueDate: new Date(anoAtual, new Date().getMonth(), 10), status: 'pending', createdAt: new Date() }
];

// Aulas agendadas demo
const hoje = new Date();
const gerarDataAula = (diasAFrente, hora, minuto) => {
  const data = new Date(hoje);
  data.setDate(data.getDate() + diasAFrente);
  data.setHours(hora, minuto, 0, 0);
  return data;
};

let classes = [
  // Aulas passadas (historico completo)
  {
    id: 'class_h1', _id: 'class_h1',
    title: 'Matematica - Revisao Algebra',
    studentId: 'student_1', studentName: 'Maria Silva',
    subject: 'Matematica', grade: '7o Ano',
    scheduledAt: gerarDataAula(-30, 14, 0),
    duration: 60, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-maria',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Aula focada em revisao de algebra basica. Aluna demonstrou excelente compreensao dos conceitos.',
    attendance: 'present', notes: 'Aluna muito participativa'
  },
  {
    id: 'class_h2', _id: 'class_h2',
    title: 'Matematica - Equacoes 1o Grau',
    studentId: 'student_1', studentName: 'Maria Silva',
    subject: 'Matematica', grade: '7o Ano',
    scheduledAt: gerarDataAula(-23, 14, 0),
    duration: 60, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-maria',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Introducao a equacoes de primeiro grau. Resolveu 15 exercicios com 90% de acerto.',
    attendance: 'present', notes: 'Progresso excelente'
  },
  {
    id: 'class_h3', _id: 'class_h3',
    title: 'Portugues - Verbos e Conjugacao',
    studentId: 'student_2', studentName: 'Joao Santos',
    subject: 'Portugues', grade: '5o Ano',
    scheduledAt: gerarDataAula(-20, 15, 0),
    duration: 60, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-joao',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Estudo de verbos regulares e irregulares. Aluno precisa praticar mais conjugacao.',
    attendance: 'present', notes: 'Reforcar exercicios de conjugacao'
  },
  {
    id: 'class_h4', _id: 'class_h4',
    title: 'Matematica - Funcoes Lineares',
    studentId: 'student_3', studentName: 'Pedro Oliveira',
    subject: 'Matematica', grade: '9o Ano',
    scheduledAt: gerarDataAula(-15, 16, 0),
    duration: 90, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-pedro',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Introducao a funcoes lineares e graficos. Aluno dominou o conteudo rapidamente.',
    attendance: 'present', notes: 'Aluno avancado, pode receber desafios extras'
  },
  {
    id: 'class_h5', _id: 'class_h5',
    title: 'Fisica - Movimento Retilineo',
    studentId: 'student_5', studentName: 'Lucas Ferreira',
    subject: 'Fisica', grade: '1o EM',
    scheduledAt: gerarDataAula(-12, 14, 0),
    duration: 90, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-lucas',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Estudo de MRU e MRUV. Resolveu problemas praticos com boa performance.',
    attendance: 'present', notes: 'Aluno interessado em experimentos'
  },
  {
    id: 'class_h6', _id: 'class_h6',
    title: 'Biologia - Sistema Digestorio',
    studentId: 'student_8', studentName: 'Isabela Rodrigues',
    subject: 'Biologia', grade: '2o EM',
    scheduledAt: gerarDataAula(-10, 14, 0),
    duration: 90, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-isabela',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Anatomia e fisiologia do sistema digestorio. Aluna participou ativamente.',
    attendance: 'present', notes: 'Interessada em medicina'
  },
  {
    id: 'class_h7', _id: 'class_h7',
    title: 'Matematica - Geometria Plana',
    studentId: 'student_7', studentName: 'Gabriel Souza',
    subject: 'Matematica', grade: '4o Ano',
    scheduledAt: gerarDataAula(-7, 14, 0),
    duration: 45, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-gabriel',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Estudo de formas geometricas basicas. Aluno precisa revisar triangulos.',
    attendance: 'present', notes: 'Trazer materiais visuais na proxima aula'
  },
  {
    id: 'class_h8', _id: 'class_h8',
    title: 'Quimica - Ligacoes Quimicas',
    studentId: 'student_6', studentName: 'Beatriz Costa',
    subject: 'Quimica', grade: '8o Ano',
    scheduledAt: gerarDataAula(-5, 15, 0),
    duration: 60, status: 'completed', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-beatriz',
    teacherId: 'user_demo', createdAt: new Date(),
    summary: 'Estudo de ligacoes ionicas e covalentes. Aluna teve dificuldade inicial mas compreendeu.',
    attendance: 'present', notes: 'Enviar material complementar'
  },
  // Aulas de hoje
  {
    id: 'class_1', _id: 'class_1',
    title: 'Matematica - Equacoes 2o Grau',
    studentId: 'student_1', studentName: 'Maria Silva',
    subject: 'Matematica', grade: '7o Ano',
    scheduledAt: gerarDataAula(0, 14, 0),
    duration: 60, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-maria',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_4', _id: 'class_4',
    title: 'Ingles - Conversation Practice',
    studentId: 'student_4', studentName: 'Ana Carolina Mendes',
    subject: 'Ingles', grade: '6o Ano',
    scheduledAt: gerarDataAula(0, 16, 0),
    duration: 60, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-ana',
    teacherId: 'user_demo', createdAt: new Date()
  },
  // Aulas futuras
  {
    id: 'class_2', _id: 'class_2',
    title: 'Portugues - Interpretacao de Texto',
    studentId: 'student_2', studentName: 'Joao Santos',
    subject: 'Portugues', grade: '5o Ano',
    scheduledAt: gerarDataAula(1, 15, 0),
    duration: 60, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-joao',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_7', _id: 'class_7',
    title: 'Matematica - Multiplicacao',
    studentId: 'student_7', studentName: 'Gabriel Souza',
    subject: 'Matematica', grade: '4o Ano',
    scheduledAt: gerarDataAula(1, 14, 0),
    duration: 45, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-gabriel',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_3', _id: 'class_3',
    title: 'Matematica - Funcoes',
    studentId: 'student_3', studentName: 'Pedro Oliveira',
    subject: 'Matematica', grade: '9o Ano',
    scheduledAt: gerarDataAula(2, 16, 0),
    duration: 90, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-pedro',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_8', _id: 'class_8',
    title: 'Biologia - Celulas',
    studentId: 'student_8', studentName: 'Isabela Rodrigues',
    subject: 'Biologia', grade: '2o EM',
    scheduledAt: gerarDataAula(2, 14, 0),
    duration: 90, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-isabela',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_5', _id: 'class_5',
    title: 'Fisica - Cinematica',
    studentId: 'student_5', studentName: 'Lucas Ferreira',
    subject: 'Fisica', grade: '1o EM',
    scheduledAt: gerarDataAula(3, 14, 0),
    duration: 90, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-lucas',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_6', _id: 'class_6',
    title: 'Quimica - Tabela Periodica',
    studentId: 'student_6', studentName: 'Beatriz Costa',
    subject: 'Quimica', grade: '8o Ano',
    scheduledAt: gerarDataAula(4, 15, 0),
    duration: 60, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-beatriz',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_9', _id: 'class_9',
    title: 'Historia - Brasil Colonial',
    studentId: 'student_9', studentName: 'Rafael Lima',
    subject: 'Historia', grade: '7o Ano',
    scheduledAt: gerarDataAula(5, 15, 0),
    duration: 60, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-rafael',
    teacherId: 'user_demo', createdAt: new Date()
  },
  {
    id: 'class_10', _id: 'class_10',
    title: 'Geografia - Relevo Brasileiro',
    studentId: 'student_10', studentName: 'Camila Almeida',
    subject: 'Geografia', grade: '9o Ano',
    scheduledAt: gerarDataAula(6, 16, 0),
    duration: 60, status: 'scheduled', isLive: false,
    meetingLink: 'https://meet.nexus.com/aula-camila',
    teacherId: 'user_demo', createdAt: new Date()
  }
];

// ====== MIDDLEWARE DE AUTENTICAÃ‡ÃƒO ======
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Nao autorizado' });
    }

    // Verificacao JWT normal
    try {
      const decoded = jwt.verify(token, JWT_SECRET || 'insecure-dev-secret');
      req.user = users.find(u => u.id === decoded.id);

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuario nao encontrado' });
      }

      next();
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Token invalido' });
    }
  } catch (error) {
    res.status(401).json({ success: false, message: 'Erro de autenticacao' });
  }
};

// ====== LIVE SESSIONS STORAGE ======
const liveSessions = new Map();
const sessionTranscripts = new Map();

// ====== NOTIFICATIONS & TEMPLATES ======
let notifications = [];
let notificationTemplates = [
  {
    id: 'template_1',
    name: 'Lembrete de Aula',
    type: 'reminder',
    subject: 'Lembrete: Sua aula de {{className}} Ã© amanhÃ£',
    body: 'OlÃ¡ {{studentName}}, nÃ£o esqueÃ§a sua aula de {{className}} amanhÃ£ Ã s {{time}}. AtÃ© logo!',
    variables: ['studentName', 'className', 'time'],
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template_2',
    name: 'Alerta de Pagamento',
    type: 'payment',
    subject: 'Seu pagamento estÃ¡ vencido',
    body: 'OlÃ¡ {{studentName}}, seu pagamento de R$ {{amount}} estava vencido hÃ¡ {{daysOverdue}} dias. Por favor, regularize para continuar as aulas.',
    variables: ['studentName', 'amount', 'daysOverdue'],
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template_3',
    name: 'SolicitaÃ§Ã£o de Feedback',
    type: 'feedback',
    subject: 'Sua opiniÃ£o importa!',
    body: 'OlÃ¡ {{studentName}}, como foi sua aula de hoje? Deixe seu feedback para nos ajudar a melhorar.',
    variables: ['studentName'],
    active: true,
    createdAt: new Date()
  }
];

let studentGrades = [
  // Notas de Maria Silva (student_1)
  { id: 'grade_1', studentId: 'student_1', classId: 'class_h1', subject: 'MatemÃ¡tica', score: 85, maxScore: 100, percentage: 85, assessmentType: 'quiz', createdAt: gerarDataAula(-30, 14, 0) },
  { id: 'grade_2', studentId: 'student_1', classId: 'class_h2', subject: 'MatemÃ¡tica', score: 90, maxScore: 100, percentage: 90, assessmentType: 'exercise', createdAt: gerarDataAula(-23, 14, 0) },
  // Notas de Joao Santos (student_2)
  { id: 'grade_3', studentId: 'student_2', classId: 'class_h3', subject: 'PortuguÃªs', score: 78, maxScore: 100, percentage: 78, assessmentType: 'exercise', createdAt: gerarDataAula(-20, 15, 0) },
  // Notas de Pedro Oliveira (student_3)
  { id: 'grade_4', studentId: 'student_3', classId: 'class_h4', subject: 'MatemÃ¡tica', score: 95, maxScore: 100, percentage: 95, assessmentType: 'test', createdAt: gerarDataAula(-15, 16, 0) },
  // Notas de Lucas Ferreira (student_5)
  { id: 'grade_5', studentId: 'student_5', classId: 'class_h5', subject: 'FÃ­sica', score: 88, maxScore: 100, percentage: 88, assessmentType: 'quiz', createdAt: gerarDataAula(-12, 14, 0) },
  // Notas de Isabela Rodrigues (student_8)
  { id: 'grade_6', studentId: 'student_8', classId: 'class_h6', subject: 'Biologia', score: 92, maxScore: 100, percentage: 92, assessmentType: 'test', createdAt: gerarDataAula(-10, 14, 0) },
  // Notas de Gabriel Souza (student_7)
  { id: 'grade_7', studentId: 'student_7', classId: 'class_h7', subject: 'MatemÃ¡tica', score: 70, maxScore: 100, percentage: 70, assessmentType: 'exercise', createdAt: gerarDataAula(-7, 14, 0) },
  // Notas de Beatriz Costa (student_6)
  { id: 'grade_8', studentId: 'student_6', classId: 'class_h8', subject: 'QuÃ­mica', score: 82, maxScore: 100, percentage: 82, assessmentType: 'quiz', createdAt: gerarDataAula(-5, 15, 0) }
];

let studentMaterials = [
  {
    id: 'material_1',
    classId: 'class_h2',
    className: 'MatemÃ¡tica - EquaÃ§Ãµes 1Âº Grau',
    topic: 'Ãlgebra',
    title: 'Lista de ExercÃ­cios - EquaÃ§Ãµes',
    type: 'pdf',
    url: 'https://drive.google.com/file/equacoes-1grau.pdf',
    description: 'Lista com 20 exercÃ­cios resolvidos e 30 para prÃ¡tica',
    uploadedAt: gerarDataAula(-23, 14, 0)
  },
  {
    id: 'material_2',
    classId: 'class_h4',
    className: 'MatemÃ¡tica - FunÃ§Ãµes Lineares',
    topic: 'FunÃ§Ãµes',
    title: 'VÃ­deo Aula - GrÃ¡ficos de FunÃ§Ãµes',
    type: 'video',
    url: 'https://youtube.com/watch?v=funcoes-lineares',
    description: 'ExplicaÃ§Ã£o detalhada sobre construÃ§Ã£o de grÃ¡ficos',
    uploadedAt: gerarDataAula(-15, 16, 0)
  },
  {
    id: 'material_3',
    classId: 'class_h5',
    className: 'FÃ­sica - Movimento RetilÃ­neo',
    topic: 'CinemÃ¡tica',
    title: 'Simulador de Movimento',
    type: 'link',
    url: 'https://phet.colorado.edu/pt_BR/simulations/moving-man',
    description: 'Simulador interativo para entender MRU e MRUV',
    uploadedAt: gerarDataAula(-12, 14, 0)
  },
  {
    id: 'material_4',
    classId: 'class_h6',
    className: 'Biologia - Sistema DigestÃ³rio',
    topic: 'Anatomia',
    title: 'InfogrÃ¡fico - Processo Digestivo',
    type: 'image',
    url: 'https://drive.google.com/infografico-digestao.png',
    description: 'InfogrÃ¡fico completo do sistema digestÃ³rio humano',
    uploadedAt: gerarDataAula(-10, 14, 0)
  },
  {
    id: 'material_5',
    classId: 'class_h8',
    className: 'QuÃ­mica - LigaÃ§Ãµes QuÃ­micas',
    topic: 'QuÃ­mica Geral',
    title: 'Slides - LigaÃ§Ãµes IÃ´nicas e Covalentes',
    type: 'presentation',
    url: 'https://docs.google.com/presentation/ligacoes-quimicas',
    description: 'ApresentaÃ§Ã£o com exemplos prÃ¡ticos',
    uploadedAt: gerarDataAula(-5, 15, 0)
  }
];

let teachingTemplates = [
  {
    id: 'tpl_1',
    name: 'Aula IntrodutÃ³ria - Novo ConteÃºdo',
    description: 'Template para introduzir um novo assunto',
    subject: 'Geral',
    duration: 60,
    structure: {
      warmup: '5min - RevisÃ£o do conteÃºdo anterior',
      introduction: '10min - ApresentaÃ§Ã£o do novo tema',
      development: '30min - ExplicaÃ§Ã£o detalhada com exemplos',
      practice: '10min - ExercÃ­cios prÃ¡ticos',
      closure: '5min - Resumo e dÃºvidas'
    },
    createdAt: new Date()
  },
  {
    id: 'tpl_2',
    name: 'Aula de RevisÃ£o - PreparaÃ§Ã£o para Prova',
    description: 'Template focado em revisÃ£o e fixaÃ§Ã£o',
    subject: 'Geral',
    duration: 90,
    structure: {
      warmup: '10min - Mapa mental dos tÃ³picos',
      review: '40min - RevisÃ£o dos principais conceitos',
      practice: '30min - ResoluÃ§Ã£o de exercÃ­cios tipo prova',
      closure: '10min - Tirar dÃºvidas finais'
    },
    createdAt: new Date()
  },
  {
    id: 'tpl_3',
    name: 'Aula PrÃ¡tica - Experimentos',
    description: 'Template para aulas com atividades prÃ¡ticas',
    subject: 'CiÃªncias',
    duration: 90,
    structure: {
      introduction: '15min - Base teÃ³rica',
      demonstration: '20min - DemonstraÃ§Ã£o do experimento',
      handson: '40min - Alunos realizam o experimento',
      discussion: '10min - DiscussÃ£o dos resultados',
      closure: '5min - ConclusÃµes'
    },
    createdAt: new Date()
  }
];

let referralLinks = [];
let coursePlans = [
  {
    id: 'plan_1',
    name: 'Plano Anual - MatemÃ¡tica 9Âº Ano',
    description: 'CurrÃ­culo completo de MatemÃ¡tica para o 9Âº ano',
    totalModules: 4,
    modules: [
      {
        name: 'MÃ³dulo 1 - Ãlgebra',
        topics: ['EquaÃ§Ãµes de 1Âº Grau', 'EquaÃ§Ãµes de 2Âº Grau', 'Sistemas de EquaÃ§Ãµes'],
        duration: '3 meses'
      },
      {
        name: 'MÃ³dulo 2 - FunÃ§Ãµes',
        topics: ['FunÃ§Ã£o Afim', 'FunÃ§Ã£o QuadrÃ¡tica', 'GrÃ¡ficos'],
        duration: '3 meses'
      },
      {
        name: 'MÃ³dulo 3 - Geometria',
        topics: ['Teorema de PitÃ¡goras', 'Ãreas e PerÃ­metros', 'Volume de SÃ³lidos'],
        duration: '3 meses'
      },
      {
        name: 'MÃ³dulo 4 - EstatÃ­stica',
        topics: ['MÃ©dia, Moda e Mediana', 'GrÃ¡ficos EstatÃ­sticos', 'Probabilidade'],
        duration: '3 meses'
      }
    ],
    createdAt: new Date()
  },
  {
    id: 'plan_2',
    name: 'Plano Semestral - FÃ­sica 1Âº EM',
    description: 'CurrÃ­culo de FÃ­sica para o primeiro semestre do Ensino MÃ©dio',
    totalModules: 2,
    modules: [
      {
        name: 'MÃ³dulo 1 - MecÃ¢nica',
        topics: ['CinemÃ¡tica', 'DinÃ¢mica', 'Leis de Newton'],
        duration: '3 meses'
      },
      {
        name: 'MÃ³dulo 2 - Energia',
        topics: ['Trabalho e PotÃªncia', 'Energia CinÃ©tica e Potencial', 'ConservaÃ§Ã£o de Energia'],
        duration: '3 meses'
      }
    ],
    createdAt: new Date()
  }
];

// ====== CHAT MESSAGES STORAGE ======
// Chat messages organized by room/class
const chatMessages = new Map(); // roomId -> Array of messages
const privateMessages = []; // Array of all private messages

// Helper functions for chat
function addChatMessage(roomId, message) {
  if (!chatMessages.has(roomId)) {
    chatMessages.set(roomId, []);
  }
  const messages = chatMessages.get(roomId);
  messages.push({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...message,
    timestamp: new Date()
  });
  // Keep only last 1000 messages per room
  if (messages.length > 1000) {
    messages.shift();
  }
  return messages[messages.length - 1];
}

function getChatMessages(roomId, limit = 100) {
  const messages = chatMessages.get(roomId) || [];
  return messages.slice(-limit);
}

// ====== SOCKET.IO ======
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});

io.on('connection', (socket) => {
  console.info(`ðŸ”Œ Client connected: ${socket.id}`);

  socket.on('join-classroom', ({ classId, userId, userName }) => {
    socket.join(classId);
    socket.userId = userId;
    socket.userName = userName;
    socket.currentRoom = classId;

    // Send chat history to the newly joined user
    const history = getChatMessages(classId, 100);
    socket.emit('chat-history', { messages: history });

    // Notify others
    socket.to(classId).emit('user-joined', {
      userId,
      userName,
      timestamp: new Date()
    });

    // DEBUG: console.log(`ðŸŽ“ User ${userName} joined class: ${classId}`);
  });

  socket.on('start-live-session', ({ classId }) => {
    const sessionId = `session_${Date.now()}`;
    const session = {
      id: sessionId,
      classId,
      teacherId: socket.handshake.auth?.userId || 'user_demo',
      studentIds: [],
      startTime: new Date(),
      status: 'active',
      transcript: '',
    };
    liveSessions.set(sessionId, session);
    sessionTranscripts.set(sessionId, '');
    socket.join(sessionId);
    io.to(sessionId).emit('session-started', session);
    console.info(`ðŸŽ¬ Live session started: ${sessionId}`);
  });

  socket.on('join-live-session', ({ classId }) => {
    const session = Array.from(liveSessions.values()).find(s => s.classId === classId && s.status === 'active');
    if (session) {
      socket.join(session.id);
      if (!session.studentIds.includes(socket.id)) {
        session.studentIds.push(socket.id);
      }
      io.to(session.id).emit('participant-joined', {
        userId: socket.id,
        participantCount: session.studentIds.length
      });
      // DEBUG: console.log(`ðŸ‘¤ Student joined live session: ${socket.id}`);
    }
  });

  socket.on('end-live-session', ({ classId }) => {
    const session = Array.from(liveSessions.values()).find(s => s.classId === classId && s.status === 'active');
    if (session) {
      session.status = 'ended';
      session.endTime = new Date();
      session.transcript = sessionTranscripts.get(session.id) || '';

      io.to(session.id).emit('session-ended', {
        sessionId: session.id,
        transcript: session.transcript,
        summary: `Aula finalizada. TranscriÃ§Ã£o com ${session.transcript.split(' ').length} palavras.`
      });

      // DEBUG: console.log(`ðŸ Live session ended: ${session.id}`);
      socket.leave(session.id);
    }
  });

  socket.on('transcript-chunk', ({ sessionId, text }) => {
    const session = liveSessions.get(sessionId);
    if (session) {
      sessionTranscripts.set(sessionId, (sessionTranscripts.get(sessionId) || '') + ' ' + text);
      io.to(sessionId).emit('transcript-update', { text });
    }
  });

  socket.on('class-message', ({ classId, message, userName, userId }) => {
    // Save message to persistent storage
    const savedMessage = addChatMessage(classId, {
      userId: userId || socket.userId || socket.id,
      userName: userName || socket.userName || 'AnÃ´nimo',
      message,
      type: 'text',
      roomId: classId
    });

    // Broadcast to all users in the room (including sender)
    io.to(classId).emit('new-message', savedMessage);

    // DEBUG: console.log(`ðŸ’¬ Message in ${classId} from ${userName}: ${message.substring(0, 50)}...`);
  });

  // Get chat history endpoint
  socket.on('get-chat-history', ({ roomId, limit = 100 }, callback) => {
    const messages = getChatMessages(roomId, limit);
    if (callback) {
      callback({ success: true, messages });
    }
  });

  // Private message between teacher and student
  socket.on('private-message', ({ toUserId, message, userName, userId }) => {
    const savedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromUserId: userId || socket.userId || socket.id,
      fromUserName: userName || socket.userName || 'AnÃ´nimo',
      toUserId,
      message,
      type: 'private',
      timestamp: new Date()
    };

    privateMessages.push(savedMessage);

    // Send to recipient
    io.to(toUserId).emit('new-private-message', savedMessage);

    // Send confirmation to sender
    socket.emit('message-sent', savedMessage);

    // DEBUG: console.log(`ðŸ”’ Private message from ${userName} to ${toUserId}`);
  });

  // Typing indicator
  socket.on('typing-start', ({ roomId, userName }) => {
    socket.to(roomId).emit('user-typing', { userName, userId: socket.userId });
  });

  socket.on('typing-stop', ({ roomId }) => {
    socket.to(roomId).emit('user-stopped-typing', { userId: socket.userId });
  });

  socket.on('webrtc-offer', (data) => {
    io.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on('webrtc-answer', (data) => {
    io.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  socket.on('disconnect', () => {
    liveSessions.forEach((session) => {
      session.studentIds = session.studentIds.filter(id => id !== socket.id);
      if (session.studentIds.length === 0 && session.status === 'active') {
        session.status = 'ended';
        session.endTime = new Date();
      }
    });
    console.error(`âŒ Client disconnected: ${socket.id}`);
  });
});

// ====== HANGMAN SOCKET.IO ======
setupHangmanSocket(io);

// ====== ROTAS DE AUTENTICAÃ‡ÃƒO ======

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Verificar se usuÃ¡rio jÃ¡ existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email jÃ¡ cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuÃ¡rio
    const user = {
      id: `user_${Date.now()}`,
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      role: 'teacher',
      createdAt: new Date()
    };

    users.push(user);

    // Gerar token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'nexus-secret-key-2025',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar conta' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    // DEBUG: console.log(`Tentativa de login: ${email}`);

    // Buscar usuÃ¡rio
    const user = users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      // DEBUG: console.log('Usuario nao encontrado');
      return res.status(401).json({ success: false, message: 'Email ou senha incorretos' });
    }

    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    // DEBUG: console.log(`Senha correta: ${isMatch}`);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ou senha incorretos' });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'nexus-secret-key-2025',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login' });
  }
});

// ====== ROTA DE PERFIL ======
app.get('/api/auth/me', protect, (req, res) => {
  try {
    const { password, ...usuarioSemSenha } = req.user;
    res.json({
      success: true,
      user: usuarioSemSenha
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar usuÃ¡rio' });
  }
});

// ====== ROTAS DE ALUNOS ======

// Listar alunos
app.get('/api/students', protect, (req, res) => {
  try {
    const userStudents = students.filter(s => s.teacherId === req.user.id && !s.deleted);
    res.json({ success: true, students: userStudents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar alunos' });
  }
});

// Criar aluno
app.post('/api/students', protect, (req, res) => {
  try {
    const { name, age, grade, monthlyFee, guardian, email, phone, parentName, parentEmail, parentPhone } = req.body;

    const student = {
      id: `student_${Date.now()}`,
      _id: `student_${Date.now()}`,
      name,
      age: parseInt(age) || 0,
      grade,
      monthlyFee: parseFloat(monthlyFee) || 0,
      guardian: guardian || parentName || '',
      parentName: parentName || guardian || '',
      email: email || parentEmail || '',
      parentEmail: parentEmail || email || '',
      phone: phone || parentPhone || '',
      parentPhone: parentPhone || phone || '',
      teacherId: req.user.id,
      status: 'active',
      paymentStatus: 'pending',
      deleted: false,
      createdAt: new Date()
    };

    students.push(student);

    // Criar primeira mensalidade
    const currentDate = new Date();
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10);

    const payment = {
      id: `payment_${Date.now()}`,
      studentId: student.id,
      amount: student.monthlyFee,
      month: currentDate.toLocaleString('pt-BR', { month: 'long' }),
      year: currentDate.getFullYear(),
      dueDate,
      status: 'pending',
      createdAt: new Date()
    };

    payments.push(payment);

    res.status(201).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar aluno' });
  }
});

// Atualizar aluno
app.put('/api/students/:id', protect, (req, res) => {
  try {
    const studentIndex = students.findIndex(s => s.id === req.params.id && s.teacherId === req.user.id);

    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno nÃ£o encontrado' });
    }

    students[studentIndex] = { ...students[studentIndex], ...req.body, updatedAt: new Date() };

    res.json({ success: true, student: students[studentIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar aluno' });
  }
});

// Deletar aluno
app.delete('/api/students/:id', protect, (req, res) => {
  try {
    const studentIndex = students.findIndex(s => s.id === req.params.id && s.teacherId === req.user.id);

    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno nÃ£o encontrado' });
    }

    students[studentIndex].deleted = true;
    students[studentIndex].deletedAt = new Date();

    res.json({ success: true, message: 'Aluno removido com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar aluno' });
  }
});

// EstatÃ­sticas de alunos
app.get('/api/students/stats/summary', protect, (req, res) => {
  try {
    const userStudents = students.filter(s => s.teacherId === req.user.id && !s.deleted);
    const totalStudents = userStudents.length;
    const totalMonthlyRevenue = userStudents.reduce((sum, s) => sum + s.monthlyFee, 0);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalMonthlyRevenue,
        activeStudents: userStudents.filter(s => s.status === 'active').length,
        inactiveStudents: userStudents.filter(s => s.status === 'inactive').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar estatÃ­sticas' });
  }
});

// ====== ROTAS DE PAGAMENTOS ======

// Listar pagamentos
app.get('/api/payments', protect, (req, res) => {
  try {
    const userStudentIds = students.filter(s => s.teacherId === req.user.id).map(s => s.id);
    const userPayments = payments.filter(p => userStudentIds.includes(p.studentId));

    res.json({ success: true, payments: userPayments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pagamentos' });
  }
});

// EstatÃ­sticas de pagamentos
app.get('/api/payments/stats/summary', protect, (req, res) => {
  try {
    const userStudentIds = students.filter(s => s.teacherId === req.user.id).map(s => s.id);
    const userPayments = payments.filter(p => userStudentIds.includes(p.studentId));

    const pendingPayments = userPayments.filter(p => p.status === 'pending');
    const paidPayments = userPayments.filter(p => p.status === 'paid');

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyPayments = paidPayments.filter(p => {
      const paymentDate = new Date(p.paidAt || p.createdAt);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    res.json({
      success: true,
      stats: {
        monthlyRevenue: monthlyPayments.reduce((sum, p) => sum + p.amount, 0),
        yearlyRevenue: paidPayments.reduce((sum, p) => sum + p.amount, 0),
        pendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        pendingCount: pendingPayments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar estatÃ­sticas' });
  }
});

// Atualizar pagamento
app.put('/api/payments/:id', protect, (req, res) => {
  try {
    const paymentIndex = payments.findIndex(p => p.id === req.params.id);

    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Pagamento nÃ£o encontrado' });
    }

    const oldStatus = payments[paymentIndex].status;
    payments[paymentIndex] = { ...payments[paymentIndex], ...req.body, updatedAt: new Date() };

    if (oldStatus !== req.body.status && req.body.status === 'paid') {
      io.emit('payment-confirmed', {
        paymentId: req.params.id,
        studentId: payments[paymentIndex].studentId,
        amount: payments[paymentIndex].amount,
        message: `Pagamento confirmado! Aluno liberado para aulas.`
      });
    }

    res.json({ success: true, payment: payments[paymentIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar pagamento' });
  }
});

// Verificar status de pagamento de aluno
app.get('/api/payments/student/:studentId/status', protect, (req, res) => {
  try {
    const studentPayments = payments.filter(p => p.studentId === req.params.studentId);
    const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const currentMonthPayment = studentPayments.find(p =>
      p.month === currentMonth && p.year === currentYear
    );

    res.json({
      success: true,
      isPaid: currentMonthPayment?.status === 'paid',
      payment: currentMonthPayment || null,
      allPayments: studentPayments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao verificar pagamento' });
  }
});

// ====== ROTAS DE AULAS ======

// Listar aulas
app.get('/api/classes', protect, (req, res) => {
  try {
    const userClasses = classes.filter(c => c.teacherId === req.user.id);
    // Ordenar por data
    userClasses.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    res.json({ success: true, classes: userClasses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar aulas' });
  }
});

// Buscar aula por ID
app.get('/api/classes/:id', protect, (req, res) => {
  try {
    const aula = classes.find(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (!aula) {
      return res.status(404).json({ success: false, message: 'Aula nao encontrada' });
    }
    res.json({ success: true, class: aula });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar aula' });
  }
});

// Criar aula
app.post('/api/classes', protect, (req, res) => {
  try {
    const { title, studentId, subject, scheduledAt, duration, notes } = req.body;
    const student = students.find(s => s.id === studentId);

    const classData = {
      id: `class_${Date.now()}`,
      _id: `class_${Date.now()}`,
      title,
      studentId,
      studentName: student?.name || 'Aluno',
      subject,
      grade: student?.grade || '',
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration) || 60,
      status: 'scheduled',
      isLive: false,
      notes: notes || '',
      meetingLink: `https://meet.nexus.com/aula-${Date.now()}`,
      teacherId: req.user.id,
      createdAt: new Date()
    };

    classes.push(classData);
    res.status(201).json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar aula' });
  }
});

// Atualizar aula
app.put('/api/classes/:id', protect, (req, res) => {
  try {
    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula nao encontrada' });
    }
    classes[classIndex] = { ...classes[classIndex], ...req.body, updatedAt: new Date() };
    res.json({ success: true, class: classes[classIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar aula' });
  }
});

// Deletar aula
app.delete('/api/classes/:id', protect, (req, res) => {
  try {
    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula nao encontrada' });
    }
    classes.splice(classIndex, 1);
    res.json({ success: true, message: 'Aula removida com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar aula' });
  }
});

// Iniciar aula ao vivo
app.post('/api/classes/:id/start', protect, (req, res) => {
  try {
    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula nao encontrada' });
    }
    classes[classIndex].isLive = true;
    classes[classIndex].status = 'in_progress';
    classes[classIndex].startedAt = new Date();

    // Notificar via Socket.IO
    io.emit('class-started', { classId: req.params.id, class: classes[classIndex] });

    res.json({ success: true, class: classes[classIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao iniciar aula' });
  }
});

// Encerrar aula
app.post('/api/classes/:id/end', protect, (req, res) => {
  try {
    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula nao encontrada' });
    }
    classes[classIndex].isLive = false;
    classes[classIndex].status = 'completed';
    classes[classIndex].endedAt = new Date();

    io.emit('class-ended', { classId: req.params.id });

    res.json({ success: true, class: classes[classIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao encerrar aula' });
  }
});

// Gerar resumo de aula com IA
app.post('/api/classes/:id/generate-summary', protect, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'TranscriÃ§Ã£o nÃ£o fornecida' });
    }

    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula nÃ£o encontrada' });
    }

    try {
      const aiResponse = await fetch('http://localhost:5001/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });

      if (!aiResponse.ok) {
        throw new Error('AI service error');
      }

      const aiData = await aiResponse.json();

      classes[classIndex].summary = aiData.result || 'Resumo indisponÃ­vel';
      classes[classIndex].transcript = transcript;
      classes[classIndex].summaryGeneratedAt = new Date();

      res.json({
        success: true,
        summary: aiData.result,
        transcript: transcript,
        class: classes[classIndex]
      });
    } catch (aiError) {
      console.error('AI Service error:', aiError);

      classes[classIndex].summary = `Resumo automÃ¡tico: A aula abordou os seguintes tÃ³picos: ${transcript.split(' ').slice(0, 20).join(' ')}...`;
      classes[classIndex].transcript = transcript;
      classes[classIndex].summaryGeneratedAt = new Date();

      res.json({
        success: true,
        summary: classes[classIndex].summary,
        transcript: transcript,
        class: classes[classIndex],
        aiStatus: 'fallback'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar resumo' });
  }
});

// Gerar exercÃ­cios com IA
app.post('/api/classes/:id/generate-exercises', protect, async (req, res) => {
  try {
    const { transcript, subject, grade } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'TranscriÃ§Ã£o nÃ£o fornecida' });
    }

    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula nÃ£o encontrada' });
    }

    const defaultExercises = [
      { id: 'ex1', difficulty: 'easy', question: `Qual foi o tema principal abordado na aula de ${subject}?`, answer: 'Refira-se Ã  transcriÃ§Ã£o para resposta completa', explanation: 'Esta pergunta testa compreensÃ£o geral do conteÃºdo.' },
      { id: 'ex2', difficulty: 'medium', question: `Explique em suas prÃ³prias palavras os conceitos-chave de ${subject} discutidos.`, answer: 'Resposta esperada: ExplicaÃ§Ã£o clara dos conceitos', explanation: 'Demonstra se o aluno compreendeu profundamente.' },
      { id: 'ex3', difficulty: 'hard', question: `Como vocÃª aplicaria os conhecimentos de ${subject} em uma situaÃ§Ã£o prÃ¡tica do dia a dia?`, answer: 'Resposta esperada: AplicaÃ§Ã£o criativa dos conceitos', explanation: 'Avalia pensamento crÃ­tico e aplicaÃ§Ã£o prÃ¡tica.' }
    ];

    res.json({
      success: true,
      exercises: defaultExercises,
      message: 'ExercÃ­cios gerados com sucesso'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar exercÃ­cios' });
  }
});

// Estatisticas de aulas
app.get('/api/classes/stats/summary', protect, (req, res) => {
  try {
    const userClasses = classes.filter(c => c.teacherId === req.user.id);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const aulasHoje = userClasses.filter(c => {
      const dataAula = new Date(c.scheduledAt);
      dataAula.setHours(0, 0, 0, 0);
      return dataAula.getTime() === hoje.getTime();
    });

    const aulasAgendadas = userClasses.filter(c => c.status === 'scheduled');
    const aulasCompletadas = userClasses.filter(c => c.status === 'completed');
    const aulasAoVivo = userClasses.filter(c => c.isLive);

    res.json({
      success: true,
      stats: {
        totalAulas: userClasses.length,
        aulasHoje: aulasHoje.length,
        aulasAgendadas: aulasAgendadas.length,
        aulasCompletadas: aulasCompletadas.length,
        aulasAoVivo: aulasAoVivo.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar estatisticas' });
  }
});

// ====== ROTAS DE ANALYTICS (Teacher Dashboard) ======

app.get('/api/analytics/teacher', protect, (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherStudents = students.filter(s => s.teacherId === teacherId);
    const teacherPayments = payments.filter(p => {
      const student = teacherStudents.find(s => s.id === p.studentId);
      return !!student;
    });
    const teacherClasses = classes.filter(c => c.teacherId === teacherId);

    const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const activePaidStudents = teacherPayments.filter(p =>
      p.status === 'paid' && p.month === currentMonth && p.year === currentYear
    ).length;

    const inactiveStudents = teacherStudents.filter(s => s.status === 'inactive').length;
    const totalRevenue = teacherPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = teacherPayments
      .filter(p => p.status === 'paid' && p.month === currentMonth && p.year === currentYear)
      .reduce((sum, p) => sum + p.amount, 0);

    const averageTicket = teacherStudents.length > 0
      ? teacherStudents.reduce((sum, s) => sum + s.monthlyFee, 0) / teacherStudents.length
      : 0;

    const overduePayments = teacherPayments.filter(p => p.status === 'late' || p.status === 'overdue').length;
    const paymentRate = teacherPayments.length > 0 ? (activePaidStudents / teacherPayments.length) * 100 : 0;

    const churnedStudents = teacherStudents.filter(s => s.status === 'inactive').length;
    const churnRate = teacherStudents.length > 0 ? (churnedStudents / teacherStudents.length) * 100 : 0;

    const atRiskStudents = teacherStudents
      .filter(s => s.status === 'active')
      .map(student => {
        const lastClass = teacherClasses
          .filter(c => c.studentId === student.id && c.status === 'completed')
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

        const daysSinceLastClass = lastClass
          ? Math.floor((Date.now() - new Date(lastClass.scheduledAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const studentPayment = teacherPayments.find(p => p.studentId === student.id && p.month === currentMonth);
        const isPaidLate = studentPayment?.status === 'late';

        let riskScore = 0;
        let reason = '';
        let recommendation = '';

        if (daysSinceLastClass > 30) {
          riskScore += 50;
          reason = 'Ausente hÃ¡ mais de 30 dias';
          recommendation = 'Entre em contato para verificar se continuarÃ¡ com as aulas';
        } else if (daysSinceLastClass > 14) {
          riskScore += 30;
          reason = 'Ausente hÃ¡ mais de 2 semanas';
          recommendation = 'Envie um lembrete sobre as prÃ³ximas aulas';
        }

        if (isPaidLate) {
          riskScore += 25;
          reason = (reason ? reason + ' e ' : '') + 'Pagamento atrasado';
          recommendation = (recommendation ? recommendation + '. ' : '') + 'Cobre o pagamento em atraso';
        }

        if (riskScore > 0) {
          return {
            studentId: student.id,
            studentName: student.name,
            riskScore: Math.min(riskScore, 100),
            reason,
            lastActivityDate: lastClass?.scheduledAt,
            daysInactive: Math.max(0, daysSinceLastClass),
            recommendation
          };
        }
        return null;
      })
      .filter(s => s !== null);

    const occupancyRate = teacherClasses.length > 0
      ? (teacherClasses.filter(c => c.status === 'completed' || c.status === 'in_progress').length / teacherClasses.length) * 100
      : 0;

    const weeklyHours = teacherClasses
      .filter(c => {
        const classDate = new Date(c.scheduledAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return classDate >= weekAgo;
      })
      .reduce((sum, c) => sum + (c.duration || 0), 0);

    const monthlyHours = teacherClasses
      .filter(c => {
        const classDate = new Date(c.scheduledAt);
        return classDate.getMonth() === new Date().getMonth() && classDate.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, c) => sum + (c.duration || 0), 0);

    const completedClasses = teacherClasses.filter(c => c.status === 'completed').length;
    const avgPerformance = completedClasses > 0 ? Math.random() * 40 + 60 : 0;
    const improvementRate = Math.random() * 30 + 10;

    const topicsDifficulty = [
      { topic: 'Ãlgebra', difficulty: 7.2, count: 12 },
      { topic: 'Geometria', difficulty: 5.8, count: 8 },
      { topic: 'FunÃ§Ãµes', difficulty: 6.5, count: 10 }
    ];

    const studentsByPerformance = teacherStudents.slice(0, 5).map(s => ({
      studentName: s.name,
      score: Math.random() * 40 + 60,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
    }));

    res.json({
      financial: {
        totalRevenue,
        monthlyRevenue,
        activeStudents: teacherStudents.length - inactiveStudents,
        inactiveStudents,
        averageTicket,
        expectedMonthlyRevenue: (teacherStudents.length - inactiveStudents) * averageTicket,
        overduePayments,
        paymentRate
      },
      retention: {
        activeStudents: teacherStudents.length - inactiveStudents,
        totalChurn: churnedStudents,
        churnRate,
        atRiskStudents: atRiskStudents.slice(0, 5)
      },
      timeManagement: {
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        monthlyHours: Math.round(monthlyHours * 10) / 10,
        classesThisMonth: teacherClasses.filter(c => {
          const d = new Date(c.scheduledAt);
          return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
        }).length,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        availableSlots: Math.max(0, 20 - teacherClasses.length),
        suggestedSlots: ['Segunda 14:00', 'Quarta 16:00', 'Sexta 15:00']
      },
      pedagogical: {
        averagePerformance: Math.round(avgPerformance * 10) / 10,
        topicsDifficulty,
        improvementRate: Math.round(improvementRate * 10) / 10,
        studentsByPerformance
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar analytics' });
  }
});

app.get('/api/analytics/student-payments', protect, (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherStudents = students.filter(s => s.teacherId === teacherId);
    const teacherPayments = payments.filter(p => teacherStudents.some(s => s.id === p.studentId));

    const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const paymentStatus = teacherStudents.map(student => {
      const currentPayment = teacherPayments.find(p =>
        p.studentId === student.id && p.month === currentMonth && p.year === currentYear
      );

      let daysOverdue = 0;
      if (currentPayment && (currentPayment.status === 'late' || currentPayment.status === 'overdue')) {
        const dueDate = new Date(currentPayment.dueDate);
        daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        studentId: student.id,
        studentName: student.name,
        monthlyFee: student.monthlyFee,
        currentStatus: currentPayment?.status || 'pending',
        daysOverdue,
        lastPaymentDate: currentPayment?.paidAt,
        nextDueDate: currentPayment?.dueDate
      };
    });

    res.json(paymentStatus);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pagamentos' });
  }
});

// ====== ROTAS DE NOTIFICAÃ‡Ã•ES ======

app.get('/notifications', protect, (req, res) => {
  try {
    res.json(notifications.slice(0, 50));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar notificaÃ§Ãµes' });
  }
});

app.get('/notifications/templates', protect, (req, res) => {
  try {
    res.json(notificationTemplates);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar templates' });
  }
});

app.post('/notifications/templates', protect, (req, res) => {
  try {
    const { name, type, subject, body } = req.body;
    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      type,
      subject,
      body,
      variables: [],
      active: true,
      createdAt: new Date()
    };
    notificationTemplates.push(newTemplate);
    res.json(newTemplate);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar template' });
  }
});

app.delete('/notifications/templates/:id', protect, (req, res) => {
  try {
    notificationTemplates = notificationTemplates.filter(t => t.id !== req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar template' });
  }
});

app.post('/notifications/send', protect, (req, res) => {
  try {
    const { type, channel, recipientId, title, message, scheduledFor } = req.body;
    const student = students.find(s => s.id === recipientId);

    const notification = {
      id: `notif_${Date.now()}`,
      type,
      recipientId,
      recipientName: student?.name || 'Unknown',
      channel,
      title,
      message,
      scheduledFor: scheduledFor || new Date().toISOString(),
      status: scheduledFor ? 'pending' : 'sent',
      sentAt: scheduledFor ? null : new Date(),
      createdAt: new Date()
    };

    notifications.unshift(notification);

    // DEBUG: console.log(`ðŸ“¨ ${channel.toUpperCase()}: "${title}" â†’ ${student?.name || recipientId}`);

    res.json(notification);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao enviar notificaÃ§Ã£o' });
  }
});

// ====== ROTAS DE NOTAS (StudentGrades) ======

app.get('/grades', protect, (req, res) => {
  try {
    const userStudents = students.filter(s => s.teacherId === req.user.id);
    const userGrades = studentGrades.filter(g => userStudents.some(s => s.id === g.studentId));
    res.json(userGrades);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar notas' });
  }
});

app.post('/grades', protect, (req, res) => {
  try {
    const { studentId, classId, subject, score, maxScore, assessmentType } = req.body;
    const newGrade = {
      id: `grade_${Date.now()}`,
      studentId,
      classId,
      subject,
      score,
      maxScore,
      percentage: (score / maxScore) * 100,
      assessmentType,
      createdAt: new Date()
    };
    studentGrades.push(newGrade);
    res.json(newGrade);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar nota' });
  }
});

app.get('/grades/student/:studentId', protect, (req, res) => {
  try {
    const gradesForStudent = studentGrades.filter(g => g.studentId === req.params.studentId);
    const avgScore = gradesForStudent.length > 0
      ? gradesForStudent.reduce((sum, g) => sum + g.percentage, 0) / gradesForStudent.length
      : 0;

    res.json({
      studentId: req.params.studentId,
      averageScore: Math.round(avgScore * 10) / 10,
      totalAssessments: gradesForStudent.length,
      grades: gradesForStudent,
      trend: Math.random() > 0.5 ? 'improving' : 'stable'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar notas do aluno' });
  }
});

// ====== ROTAS DE MATERIAIS ======

app.get('/materials', protect, (req, res) => {
  try {
    res.json(studentMaterials);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar materiais' });
  }
});

app.post('/materials', protect, (req, res) => {
  try {
    const { classId, className, topic, title, type, url, description } = req.body;
    const newMaterial = {
      id: `material_${Date.now()}`,
      classId,
      className,
      topic,
      title,
      type,
      url,
      description,
      uploadedAt: new Date()
    };
    studentMaterials.push(newMaterial);
    res.json(newMaterial);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar material' });
  }
});

// ====== ROTAS DE TEMPLATES DE AULA ======

app.get('/teaching-templates', protect, (req, res) => {
  try {
    res.json(teachingTemplates);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar templates' });
  }
});

app.post('/teaching-templates', protect, (req, res) => {
  try {
    const { name, description, subject, duration, structure } = req.body;
    const newTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      description,
      subject,
      duration,
      structure,
      createdAt: new Date()
    };
    teachingTemplates.push(newTemplate);
    res.json(newTemplate);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar template' });
  }
});

// ====== ROTAS DE LINKS DE REFERÃŠNCIA ======

app.get('/referral', protect, (req, res) => {
  try {
    const teacherId = req.user.id;
    let referral = referralLinks.find(r => r.teacherId === teacherId);

    if (!referral) {
      referral = {
        id: `ref_${Date.now()}`,
        teacherId,
        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        fullUrl: `https://nexus.academy?ref=${Math.random().toString(36).substring(2, 8)}`,
        totalReferred: 0,
        activeReferred: 0,
        totalBonus: 0,
        createdAt: new Date()
      };
      referralLinks.push(referral);
    }

    res.json(referral);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar referÃªncia' });
  }
});

// ====== ROTAS DE PLANOS DE CURSO ======

app.get('/course-plans', protect, (req, res) => {
  try {
    res.json(coursePlans);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar planos' });
  }
});

app.post('/course-plans', protect, (req, res) => {
  try {
    const { name, description, totalModules, modules } = req.body;
    const newPlan = {
      id: `plan_${Date.now()}`,
      name,
      description,
      totalModules,
      modules,
      createdAt: new Date()
    };
    coursePlans.push(newPlan);
    res.json(newPlan);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar plano' });
  }
});

// ====== ROTAS DE ANALYTICS ======

app.get('/analytics/teacher', protect, (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherStudents = students.filter(s => s.teacherId === teacherId && !s.deleted);
    const teacherPayments = payments.filter(p => teacherStudents.some(s => s.id === p.studentId));

    const activeStudents = teacherStudents.filter(s => s.status === 'active').length;
    const inactiveStudents = teacherStudents.filter(s => s.status === 'inactive').length;

    const monthlyRevenue = teacherPayments
      .filter(p => p.status === 'paid' && p.month === mesAtual && p.year === anoAtual)
      .reduce((sum, p) => sum + p.amount, 0);

    const expectedMonthlyRevenue = teacherStudents.reduce((sum, s) => sum + s.monthlyFee, 0);
    const averageTicket = activeStudents > 0 ? expectedMonthlyRevenue / activeStudents : 0;

    const overduePayments = teacherPayments.filter(p => p.status === 'late').length;

    const analytics = {
      lastUpdated: new Date(),
      financial: {
        monthlyRevenue,
        totalRevenue: teacherPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
        expectedMonthlyRevenue,
        paymentRate: expectedMonthlyRevenue > 0 ? (monthlyRevenue / expectedMonthlyRevenue) * 100 : 0,
        activeStudents,
        inactiveStudents,
        averageTicket,
        overduePayments
      },
      retention: {
        activeStudents,
        totalChurn: 2,
        churnRate: 5.4,
        atRiskStudents: [
          {
            studentId: 'student_3',
            studentName: 'Pedro Oliveira',
            riskScore: 85,
            reason: 'Faltou 2 aulas seguidas e pagamento atrasado',
            recommendation: 'Enviar mensagem de incentivo e lembrete amigÃ¡vel'
          }
        ]
      },
      timeManagement: {
        weeklyHours: 12,
        monthlyHours: 48,
        occupancyRate: 75,
        availableSlots: 4,
        suggestedSlots: ['Segunda 18:00', 'Quarta 10:00', 'Sexta 14:00']
      },
      pedagogical: {
        averagePerformance: 82.5,
        improvementRate: 12,
        topicsDifficulty: [
          { topic: 'EquaÃ§Ãµes de 2Âº Grau', difficultyLevel: 75, affectedStudents: 3 },
          { topic: 'InterpretaÃ§Ã£o de Texto', difficultyLevel: 60, affectedStudents: 2 }
        ]
      }
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar analytics' });
  }
});

app.get('/analytics/student-payments', protect, (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherStudents = students.filter(s => s.teacherId === teacherId && !s.deleted);

    const status = teacherStudents.map(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id);
      const latestPayment = studentPayments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];

      return {
        studentId: student.id,
        studentName: student.name,
        monthlyFee: student.monthlyFee,
        currentStatus: latestPayment?.status || 'pending',
        daysOverdue: latestPayment?.status === 'late' ? 15 : 0,
        lastPaymentDate: latestPayment?.paidAt || null
      };
    });

    res.json(status);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar status de pagamentos' });
  }
});

// ====== ROTA DE HEALTH CHECK ======
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Nexus Core Online ðŸš€',
    mode: 'In-Memory (No MongoDB)',
    users: users.length,
    students: students.length,
    payments: payments.length,
    notifications: notifications.length,
    materials: studentMaterials.length
  });
});

// ====== CHAT API ENDPOINTS ======

// Get chat messages for a specific room/class
app.get('/api/chat/messages/:roomId', protect, (req, res) => {
  const { roomId } = req.params;
  const { limit = 100 } = req.query;

  const messages = getChatMessages(roomId, parseInt(limit));

  res.json({
    success: true,
    roomId,
    count: messages.length,
    messages
  });
});

// Get all chat rooms/classes with message count
app.get('/api/chat/rooms', protect, (req, res) => {
  const rooms = [];

  chatMessages.forEach((messages, roomId) => {
    rooms.push({
      roomId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1] || null
    });
  });

  res.json({
    success: true,
    count: rooms.length,
    rooms
  });
});

// Get private messages for current user
app.get('/api/chat/private', protect, (req, res) => {
  const userId = req.user.id;

  // Filter private messages where user is sender or recipient
  const userPrivateMessages = privateMessages.filter(
    msg => msg.fromUserId === userId || msg.toUserId === userId
  );

  res.json({
    success: true,
    count: userPrivateMessages.length,
    messages: userPrivateMessages
  });
});

// Send a chat message via REST (alternative to Socket.IO)
app.post('/api/chat/messages/:roomId', protect, (req, res) => {
  const { roomId } = req.params;
  const { message } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;

  if (!message || message.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Message content is required'
    });
  }

  const savedMessage = addChatMessage(roomId, {
    userId,
    userName,
    message,
    type: 'text',
    roomId
  });

  // Broadcast via Socket.IO
  io.to(roomId).emit('new-message', savedMessage);

  res.status(201).json({
    success: true,
    message: savedMessage
  });
});

// Delete a message (teacher only)
app.delete('/api/chat/messages/:messageId', protect, (req, res) => {
  const { messageId } = req.params;

  // Find and remove message from all rooms
  let deleted = false;
  chatMessages.forEach((messages, roomId) => {
    const index = messages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      messages.splice(index, 1);
      deleted = true;

      // Notify via Socket.IO
      io.to(roomId).emit('message-deleted', { messageId });
    }
  });

  if (deleted) {
    res.json({ success: true, message: 'Message deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Message not found' });
  }
});

// ====== ROTAS DO JOGO DA FORCA ======
import hangmanRoutes from './routes/hangman.js';
app.use('/api/hangman', hangmanRoutes);

// ====== MIDDLEWARE DE ERRO ======
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erro interno do servidor', error: err.message });
});

// ====== INICIALIZAR DADOS DEMO ======
const inicializarDadosDemo = async () => {
  // Criar senha hash para usuario demo
  const senhaHash = await bcrypt.hash('123456', 12);
  users[0].password = senhaHash;
  senhaDemoHash = senhaHash;
  // DEBUG: console.log('âœ… Usuario demo criado: demo@nexus.com / 123456');
};

// ====== INICIAR SERVIDOR ======
const PORT = process.env.PORT || 5000;

// Inicializar dados demo ANTES de iniciar o servidor
const iniciar = async () => {
  await inicializarDadosDemo();

  httpServer.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('ðŸš€ NEXUS CORE - BACKEND SIMPLIFICADO');
    console.log('Rodando SEM MongoDB (MemÃ³ria RAM)');
    console.log('='.repeat(60));
    console.log(`âœ… Servidor rodando na porta: ${PORT}`);
    console.log('âœ… Modo: In-Memory Database (dados em memÃ³ria)');
    console.log('âœ… Socket.IO: Ativo');
    console.log('âœ… API Routes configuradas');
    console.log('\nðŸ‘¤ USUARIO DEMO:');
    console.log('   Email: demo@nexus.com');
    console.log('   Senha: 123456');
    console.log('\nðŸ“¡ Rotas disponÃ­veis:');
    console.log('   - POST   /api/auth/register');
    console.log('   - POST   /api/auth/login');
    console.log('   - GET    /api/students');
    console.log('   - POST   /api/students');
    console.log('   - PUT    /api/students/:id');
    console.log('   - DELETE /api/students/:id');
    console.log('   - GET    /api/students/stats/summary');
    console.log('   - GET    /api/payments');
    console.log('   - GET    /api/payments/stats/summary');
    console.log('   - PUT    /api/payments/:id');
    console.log('   - GET    /api/classes');
    console.log('   - POST   /api/classes');
    console.log('   - GET    /api/health');
    console.log('\nâš ï¸  ATENÃ‡ÃƒO: Dados sÃ£o perdidos ao reiniciar o servidor!');
    console.log('ðŸ’¡ Para persistÃªncia, instale MongoDB ou use MongoDB Atlas');
    console.log('\nðŸŽ‰ Backend pronto para uso!\n');
  });
};

iniciar();
