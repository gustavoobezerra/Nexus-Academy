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
  const message = 'JWT_SECRET deve estar definido nas variáveis de ambiente';
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(`⚠️ ${message}. Usando valor inseguro apenas para desenvolvimento.`);
}

// Permitir uso em produção para deploy inicial
// if (isProduction) {
//   throw new Error('server-simple não deve ser usado em produção. Utilize server.js com MongoDB.');
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

// ====== BANCO DE DADOS EM MEMÓRIA ======
// Em produção, usar MongoDB ou outro banco persistente
// Este banco em memória é apenas para desenvolvimento/testes

let users = [];

const RESERVED_SLUGS = [
  'admin', 'api', 'dashboard', 'login', 'register', 'signup',
  'professor', 'student', 'payment', 'nexus', 'onboarding',
  'settings', 'profile', 'help', 'support', 'about', 'contact',
  'terms', 'privacy', 'blog', 'docs', 'status', 'health'
];

// Dados iniciais vazios para produção
let students = [];
let payments = [];

// Dados iniciais vazios para produção
let classes = [];

const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
const anoAtual = new Date().getFullYear();
const hoje = new Date();
const gerarDataAula = (diasAFrente, hora, minuto) => {
  const data = new Date(hoje);
  data.setDate(data.getDate() + diasAFrente);
  data.setHours(hora, minuto, 0, 0);
  return data;
};

// ====== MIDDLEWARE DE AUTENTICAÇÃO ======
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Nao autorizado' });
    }

    // Verificacao JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET || 'nexus-secret-key-2025');
      req.user = users.find(u => u.id === decoded.id);

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuario nao encontrado' });
      }

      next();
    } catch (jwtError) {
      // Tratamento específico para token expirado
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
      }
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
    subject: 'Lembrete: Sua aula de {{className}} é amanhã',
    body: 'Olá {{studentName}}, não esqueça sua aula de {{className}} amanhã às {{time}}. Até logo!',
    variables: ['studentName', 'className', 'time'],
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template_2',
    name: 'Alerta de Pagamento',
    type: 'payment',
    subject: 'Seu pagamento está vencido',
    body: 'Olá {{studentName}}, seu pagamento de R$ {{amount}} estava vencido há {{daysOverdue}} dias. Por favor, regularize para continuar as aulas.',
    variables: ['studentName', 'amount', 'daysOverdue'],
    active: true,
    createdAt: new Date()
  },
  {
    id: 'template_3',
    name: 'Solicitação de Feedback',
    type: 'feedback',
    subject: 'Sua opinião importa!',
    body: 'Olá {{studentName}}, como foi sua aula de hoje? Deixe seu feedback para nos ajudar a melhorar.',
    variables: ['studentName'],
    active: true,
    createdAt: new Date()
  }
];

let studentGrades = [
  // Notas de Maria Silva (student_1)
  { id: 'grade_1', studentId: 'student_1', classId: 'class_h1', subject: 'Matemática', score: 85, maxScore: 100, percentage: 85, assessmentType: 'quiz', createdAt: gerarDataAula(-30, 14, 0) },
  { id: 'grade_2', studentId: 'student_1', classId: 'class_h2', subject: 'Matemática', score: 90, maxScore: 100, percentage: 90, assessmentType: 'exercise', createdAt: gerarDataAula(-23, 14, 0) },
  // Notas de Joao Santos (student_2)
  { id: 'grade_3', studentId: 'student_2', classId: 'class_h3', subject: 'Português', score: 78, maxScore: 100, percentage: 78, assessmentType: 'exercise', createdAt: gerarDataAula(-20, 15, 0) },
  // Notas de Pedro Oliveira (student_3)
  { id: 'grade_4', studentId: 'student_3', classId: 'class_h4', subject: 'Matemática', score: 95, maxScore: 100, percentage: 95, assessmentType: 'test', createdAt: gerarDataAula(-15, 16, 0) },
  // Notas de Lucas Ferreira (student_5)
  { id: 'grade_5', studentId: 'student_5', classId: 'class_h5', subject: 'Física', score: 88, maxScore: 100, percentage: 88, assessmentType: 'quiz', createdAt: gerarDataAula(-12, 14, 0) },
  // Notas de Isabela Rodrigues (student_8)
  { id: 'grade_6', studentId: 'student_8', classId: 'class_h6', subject: 'Biologia', score: 92, maxScore: 100, percentage: 92, assessmentType: 'test', createdAt: gerarDataAula(-10, 14, 0) },
  // Notas de Gabriel Souza (student_7)
  { id: 'grade_7', studentId: 'student_7', classId: 'class_h7', subject: 'Matemática', score: 70, maxScore: 100, percentage: 70, assessmentType: 'exercise', createdAt: gerarDataAula(-7, 14, 0) },
  // Notas de Beatriz Costa (student_6)
  { id: 'grade_8', studentId: 'student_6', classId: 'class_h8', subject: 'Química', score: 82, maxScore: 100, percentage: 82, assessmentType: 'quiz', createdAt: gerarDataAula(-5, 15, 0) }
];

let studentMaterials = [
  {
    id: 'material_1',
    classId: 'class_h2',
    className: 'Matemática - Equações 1º Grau',
    topic: 'Álgebra',
    title: 'Lista de Exercícios - Equações',
    type: 'pdf',
    url: 'https://drive.google.com/file/equacoes-1grau.pdf',
    description: 'Lista com 20 exercícios resolvidos e 30 para prática',
    uploadedAt: gerarDataAula(-23, 14, 0)
  },
  {
    id: 'material_2',
    classId: 'class_h4',
    className: 'Matemática - Funções Lineares',
    topic: 'Funções',
    title: 'Vídeo Aula - Gráficos de Funções',
    type: 'video',
    url: 'https://youtube.com/watch?v=funcoes-lineares',
    description: 'Explicação detalhada sobre construção de gráficos',
    uploadedAt: gerarDataAula(-15, 16, 0)
  },
  {
    id: 'material_3',
    classId: 'class_h5',
    className: 'Física - Movimento Retilíneo',
    topic: 'Cinemática',
    title: 'Simulador de Movimento',
    type: 'link',
    url: 'https://phet.colorado.edu/pt_BR/simulations/moving-man',
    description: 'Simulador interativo para entender MRU e MRUV',
    uploadedAt: gerarDataAula(-12, 14, 0)
  },
  {
    id: 'material_4',
    classId: 'class_h6',
    className: 'Biologia - Sistema Digestório',
    topic: 'Anatomia',
    title: 'Infográfico - Processo Digestivo',
    type: 'image',
    url: 'https://drive.google.com/infografico-digestao.png',
    description: 'Infográfico completo do sistema digestório humano',
    uploadedAt: gerarDataAula(-10, 14, 0)
  },
  {
    id: 'material_5',
    classId: 'class_h8',
    className: 'Química - Ligações Químicas',
    topic: 'Química Geral',
    title: 'Slides - Ligações Iônicas e Covalentes',
    type: 'presentation',
    url: 'https://docs.google.com/presentation/ligacoes-quimicas',
    description: 'Apresentação com exemplos práticos',
    uploadedAt: gerarDataAula(-5, 15, 0)
  }
];

let teachingTemplates = [
  {
    id: 'tpl_1',
    name: 'Aula Introdutória - Novo Conteúdo',
    description: 'Template para introduzir um novo assunto',
    subject: 'Geral',
    duration: 60,
    structure: {
      warmup: '5min - Revisão do conteúdo anterior',
      introduction: '10min - Apresentação do novo tema',
      development: '30min - Explicação detalhada com exemplos',
      practice: '10min - Exercícios práticos',
      closure: '5min - Resumo e dúvidas'
    },
    createdAt: new Date()
  },
  {
    id: 'tpl_2',
    name: 'Aula de Revisão - Preparação para Prova',
    description: 'Template focado em revisão e fixação',
    subject: 'Geral',
    duration: 90,
    structure: {
      warmup: '10min - Mapa mental dos tópicos',
      review: '40min - Revisão dos principais conceitos',
      practice: '30min - Resolução de exercícios tipo prova',
      closure: '10min - Tirar dúvidas finais'
    },
    createdAt: new Date()
  },
  {
    id: 'tpl_3',
    name: 'Aula Prática - Experimentos',
    description: 'Template para aulas com atividades práticas',
    subject: 'Ciências',
    duration: 90,
    structure: {
      introduction: '15min - Base teórica',
      demonstration: '20min - Demonstração do experimento',
      handson: '40min - Alunos realizam o experimento',
      discussion: '10min - Discussão dos resultados',
      closure: '5min - Conclusões'
    },
    createdAt: new Date()
  }
];

let referralLinks = [];
let coursePlans = [
  {
    id: 'plan_1',
    name: 'Plano Anual - Matemática 9º Ano',
    description: 'Currículo completo de Matemática para o 9º ano',
    totalModules: 4,
    modules: [
      {
        name: 'Módulo 1 - Álgebra',
        topics: ['Equações de 1º Grau', 'Equações de 2º Grau', 'Sistemas de Equações'],
        duration: '3 meses'
      },
      {
        name: 'Módulo 2 - Funções',
        topics: ['Função Afim', 'Função Quadrática', 'Gráficos'],
        duration: '3 meses'
      },
      {
        name: 'Módulo 3 - Geometria',
        topics: ['Teorema de Pitágoras', 'Áreas e Perímetros', 'Volume de Sólidos'],
        duration: '3 meses'
      },
      {
        name: 'Módulo 4 - Estatística',
        topics: ['Média, Moda e Mediana', 'Gráficos Estatísticos', 'Probabilidade'],
        duration: '3 meses'
      }
    ],
    createdAt: new Date()
  },
  {
    id: 'plan_2',
    name: 'Plano Semestral - Física 1º EM',
    description: 'Currículo de Física para o primeiro semestre do Ensino Médio',
    totalModules: 2,
    modules: [
      {
        name: 'Módulo 1 - Mecânica',
        topics: ['Cinemática', 'Dinâmica', 'Leis de Newton'],
        duration: '3 meses'
      },
      {
        name: 'Módulo 2 - Energia',
        topics: ['Trabalho e Potência', 'Energia Cinética e Potencial', 'Conservação de Energia'],
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
  console.info(`🔌 Client connected: ${socket.id}`);

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

    // DEBUG: console.log(`🎓 User ${userName} joined class: ${classId}`);
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
    console.info(`🎬 Live session started: ${sessionId}`);
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
      // DEBUG: console.log(`👤 Student joined live session: ${socket.id}`);
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
        summary: `Aula finalizada. Transcrição com ${session.transcript.split(' ').length} palavras.`
      });
      
      // DEBUG: console.log(`🏁 Live session ended: ${session.id}`);
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
      userName: userName || socket.userName || 'Anônimo',
      message,
      type: 'text',
      roomId: classId
    });

    // Broadcast to all users in the room (including sender)
    io.to(classId).emit('new-message', savedMessage);

    // DEBUG: console.log(`💬 Message in ${classId} from ${userName}: ${message.substring(0, 50)}...`);
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
      fromUserName: userName || socket.userName || 'Anônimo',
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

    // DEBUG: console.log(`🔒 Private message from ${userName} to ${toUserId}`);
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
    console.error(`❌ Client disconnected: ${socket.id}`);
  });
});

// ====== HANGMAN SOCKET.IO ======
setupHangmanSocket(io);

// ====== ROTAS DE AUTENTICAÇÃO ======

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Verificar se usuário já existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const user = {
      id: `user_${Date.now()}`,
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      role: 'teacher',
      status: 'pending_setup',
      onboardingCompletedAt: null,
      slug: null,
      subscriptionStatus: 'none',
      subscriptionPlan: null,
      trialEndsAt: null,
      paymentMethod: 'pending',
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        onboardingCompletedAt: user.onboardingCompletedAt,
        slug: user.slug
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar conta', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    // DEBUG: console.log(`Tentativa de login: ${email}`);

    // Buscar usuário
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        onboardingCompletedAt: user.onboardingCompletedAt,
        slug: user.slug
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar usuário', error: error.message });
  }
});

// Atualizar perfil do professor
app.put('/api/auth/profile', protect, (req, res) => {
  try {
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const allowedFields = ['name', 'phone', 'bio', 'avatar', 'socialLinks'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        users[userIndex][field] = req.body[field];
      }
    }

    const { password, ...usuarioSemSenha } = users[userIndex];
    res.json({
      success: true,
      user: usuarioSemSenha
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil', error: error.message });
  }
});

// Atualizar configurações de notificação
app.put('/api/auth/notification-settings', protect, (req, res) => {
  try {
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    users[userIndex].notificationSettings = {
      ...users[userIndex].notificationSettings,
      ...req.body
    };

    res.json({
      success: true,
      notificationSettings: users[userIndex].notificationSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar configurações', error: error.message });
  }
});

// Atualizar configurações de pagamento
app.put('/api/auth/payment-settings', protect, (req, res) => {
  try {
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    users[userIndex].paymentSettings = {
      ...users[userIndex].paymentSettings,
      ...req.body
    };

    res.json({
      success: true,
      paymentSettings: users[userIndex].paymentSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar configurações de pagamento', error: error.message });
  }
});

// Buscar professor pelo slug (rota pública)
app.get('/api/auth/teacher/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const teacher = users.find(u => u.slug === slug && u.role === 'teacher');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Professor não encontrado'
      });
    }

    res.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        slug: teacher.slug,
        bio: teacher.bio || '',
        avatar: teacher.avatar || null,
        subjects: teacher.subjects || ['Geral']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar professor', error: error.message });
  }
});

// ====== ROTAS DE ONBOARDING (SIMPLE) ======

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const validateSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return { ok: false, message: 'Slug e obrigatorio' };
  }

  const trimmed = slug.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { ok: false, message: 'Slug deve conter apenas letras minusculas, numeros e hifen' };
  }

  if (trimmed.length < 3 || trimmed.length > 30) {
    return { ok: false, message: 'Slug deve ter entre 3 e 30 caracteres' };
  }

  if (RESERVED_SLUGS.includes(trimmed)) {
    return { ok: false, message: 'Slug reservado. Escolha outro.' };
  }

  return { ok: true, slug: trimmed };
};

app.post('/api/onboarding/check-slug', protect, (req, res) => {
  const validation = validateSlug(req.body?.slug);
  if (!validation.ok) {
    return res.status(400).json({ success: false, available: false, message: validation.message });
  }

  const inUse = users.some(u => u.slug === validation.slug);

  return res.json({
    success: true,
    available: !inUse,
    message: inUse ? 'Slug ja esta em uso. Escolha outro.' : 'Slug disponivel!'
  });
});

app.post('/api/onboarding/set-slug', protect, (req, res) => {
  const validation = validateSlug(req.body?.slug);
  if (!validation.ok) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  const inUse = users.some(u => u.slug === validation.slug && u.id !== req.user.id);
  if (inUse) {
    return res.status(400).json({ success: false, message: 'Slug ja esta em uso. Escolha outro.' });
  }

  req.user.slug = validation.slug;

  return res.json({
    success: true,
    message: 'Slug configurado com sucesso',
    slug: req.user.slug,
    publicUrl: `${getFrontendUrl()}/professor/${req.user.slug}`
  });
});

app.post('/api/onboarding/setup-manual-payment', protect, (req, res) => {
  const { manualType, pixKey, pixKeyType } = req.body || {};
  if (!['pix_in_system', 'external'].includes(manualType)) {
    return res.status(400).json({ success: false, message: 'Tipo de pagamento manual invalido' });
  }

  if (manualType === 'pix_in_system') {
    if (!pixKey || !pixKeyType) {
      return res.status(400).json({ success: false, message: 'Chave PIX e tipo sao obrigatorios' });
    }
  }

  req.user.paymentMethod = 'manual';
  req.user.manualPaymentType = manualType;
  req.user.pixKey = manualType === 'pix_in_system' ? String(pixKey || '').trim() : null;
  req.user.pixKeyType = manualType === 'pix_in_system' ? pixKeyType : null;

  return res.json({
    success: true,
    message: 'Pagamento manual configurado com sucesso'
  });
});

app.post('/api/onboarding/setup-automatic-payment', protect, (req, res) => {
  const { provider, credentials } = req.body || {};
  const validProviders = ['mercadopago', 'asaas', 'pagseguro', 'efi'];

  if (!validProviders.includes(provider)) {
    return res.status(400).json({ success: false, message: 'Gateway invalido' });
  }

  if (!credentials || typeof credentials !== 'object') {
    return res.status(400).json({ success: false, message: 'Credenciais sao obrigatorias' });
  }

  req.user.paymentMethod = 'automatic';
  req.user.gatewayProvider = provider;
  req.user.gatewayCredentials = credentials;

  return res.json({
    success: true,
    message: 'Gateway configurado com sucesso'
  });
});

app.post('/api/onboarding/skip-payment', protect, (req, res) => {
  req.user.paymentMethod = 'pending';
  return res.json({
    success: true,
    message: 'Voce pode configurar pagamentos depois no dashboard'
  });
});

app.post('/api/onboarding/create-subscription-session', protect, (req, res) => {
  const { plan } = req.body || {};
  if (!['basic', 'pro'].includes(plan)) {
    return res.status(400).json({ success: false, message: 'Plano invalido' });
  }

  const checkoutUrl = `${getFrontendUrl()}/onboarding/success?session_id=demo`;

  return res.json({
    success: true,
    checkoutUrl
  });
});

app.post('/api/onboarding/complete', protect, (req, res) => {
  if (!req.user.onboardingCompletedAt) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    req.user.status = 'active';
    req.user.subscriptionStatus = 'trialing';
    req.user.trialEndsAt = trialEndsAt;
    req.user.onboardingCompletedAt = new Date();
  }

  return res.json({
    success: true,
    message: 'Onboarding completo!',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      slug: req.user.slug,
      subscriptionStatus: req.user.subscriptionStatus,
      subscriptionPlan: req.user.subscriptionPlan,
      trialEndsAt: req.user.trialEndsAt,
      status: req.user.status,
      publicUrl: req.user.slug ? `${getFrontendUrl()}/professor/${req.user.slug}` : undefined
    }
  });
});

// ====== ROTAS DE ALUNOS ======

// Listar alunos
app.get('/api/students', protect, (req, res) => {
  try {
    const userStudents = students.filter(s => s.teacherId === req.user.id && !s.deleted);
    res.json({ success: true, students: userStudents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar alunos', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar aluno', error: error.message });
  }
});

// Atualizar aluno
app.put('/api/students/:id', protect, (req, res) => {
  try {
    const studentIndex = students.findIndex(s => s.id === req.params.id && s.teacherId === req.user.id);

    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    students[studentIndex] = { ...students[studentIndex], ...req.body, updatedAt: new Date() };

    res.json({ success: true, student: students[studentIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar aluno', error: error.message });
  }
});

// Deletar aluno
app.delete('/api/students/:id', protect, (req, res) => {
  try {
    const studentIndex = students.findIndex(s => s.id === req.params.id && s.teacherId === req.user.id);

    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    students[studentIndex].deleted = true;
    students[studentIndex].deletedAt = new Date();

    res.json({ success: true, message: 'Aluno removido com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar aluno', error: error.message });
  }
});

// Estatísticas de alunos
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
    res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar pagamentos', error: error.message });
  }
});

// Estatísticas de pagamentos
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
    res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas', error: error.message });
  }
});

// Atualizar pagamento
app.put('/api/payments/:id', protect, (req, res) => {
  try {
    const paymentIndex = payments.findIndex(p => p.id === req.params.id);

    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
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
    res.status(500).json({ success: false, message: 'Erro ao atualizar pagamento', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao verificar pagamento', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar aulas', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar aula', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar aula', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao atualizar aula', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao deletar aula', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao iniciar aula', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao encerrar aula', error: error.message });
  }
});

// Gerar resumo de aula com IA
app.post('/api/classes/:id/generate-summary', protect, async (req, res) => {
  try {
    const { transcript } = req.body;
    
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Transcrição não fornecida' });
    }

    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada' });
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
      
      classes[classIndex].summary = aiData.result || 'Resumo indisponível';
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
      
      classes[classIndex].summary = `Resumo automático: A aula abordou os seguintes tópicos: ${transcript.split(' ').slice(0, 20).join(' ')}...`;
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
    res.status(500).json({ success: false, message: 'Erro ao gerar resumo', error: error.message });
  }
});

// Gerar exercícios com IA
app.post('/api/classes/:id/generate-exercises', protect, async (req, res) => {
  try {
    const { transcript, subject, grade } = req.body;
    
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Transcrição não fornecida' });
    }

    const classIndex = classes.findIndex(c => c.id === req.params.id && c.teacherId === req.user.id);
    if (classIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aula não encontrada' });
    }

    const defaultExercises = [
      { id: 'ex1', difficulty: 'easy', question: `Qual foi o tema principal abordado na aula de ${subject}?`, answer: 'Refira-se à transcrição para resposta completa', explanation: 'Esta pergunta testa compreensão geral do conteúdo.' },
      { id: 'ex2', difficulty: 'medium', question: `Explique em suas próprias palavras os conceitos-chave de ${subject} discutidos.`, answer: 'Resposta esperada: Explicação clara dos conceitos', explanation: 'Demonstra se o aluno compreendeu profundamente.' },
      { id: 'ex3', difficulty: 'hard', question: `Como você aplicaria os conhecimentos de ${subject} em uma situação prática do dia a dia?`, answer: 'Resposta esperada: Aplicação criativa dos conceitos', explanation: 'Avalia pensamento crítico e aplicação prática.' }
    ];

    res.json({
      success: true,
      exercises: defaultExercises,
      message: 'Exercícios gerados com sucesso'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar exercícios', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar estatisticas', error: error.message });
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
          reason = 'Ausente há mais de 30 dias';
          recommendation = 'Entre em contato para verificar se continuará com as aulas';
        } else if (daysSinceLastClass > 14) {
          riskScore += 30;
          reason = 'Ausente há mais de 2 semanas';
          recommendation = 'Envie um lembrete sobre as próximas aulas';
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
      { topic: 'Álgebra', difficulty: 7.2, count: 12 },
      { topic: 'Geometria', difficulty: 5.8, count: 8 },
      { topic: 'Funções', difficulty: 6.5, count: 10 }
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
    res.status(500).json({ success: false, message: 'Erro ao buscar analytics', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar pagamentos', error: error.message });
  }
});

// ====== ROTAS DE NOTIFICAÇÕES ======
// Suporte tanto para /notifications quanto /api/notifications

app.get('/notifications', protect, (req, res) => {
  try {
    res.json(notifications.slice(0, 50));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar notificações', error: error.message });
  }
});

app.get('/api/notifications', protect, (req, res) => {
  try {
    res.json({
      success: true,
      notifications: notifications.slice(0, 50)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar notificações', error: error.message });
  }
});

// Contar notificações não lidas
app.get('/api/notifications/unread-count', protect, (req, res) => {
  try {
    const unreadCount = notifications.filter(n => !n.read && n.recipientId === req.user.id).length;
    res.json({
      success: true,
      count: unreadCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao contar notificações', error: error.message });
  }
});

// Marcar notificação como lida
app.post('/api/notifications/:id/read', protect, (req, res) => {
  try {
    const { id } = req.params;
    const notifIndex = notifications.findIndex(n => n.id === id);
    if (notifIndex !== -1) {
      notifications[notifIndex].read = true;
      notifications[notifIndex].readAt = new Date();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao marcar como lida', error: error.message });
  }
});

// Marcar todas como lidas
app.post('/api/notifications/read-all', protect, (req, res) => {
  try {
    notifications.forEach(n => {
      if (n.recipientId === req.user.id && !n.read) {
        n.read = true;
        n.readAt = new Date();
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao marcar todas como lidas', error: error.message });
  }
});

app.get('/notifications/templates', protect, (req, res) => {
  try {
    res.json(notificationTemplates);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar templates', error: error.message });
  }
});

app.get('/api/notifications/templates', protect, (req, res) => {
  try {
    res.json({
      success: true,
      templates: notificationTemplates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar templates', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar template', error: error.message });
  }
});

app.post('/api/notifications/templates', protect, (req, res) => {
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
    res.json({ success: true, template: newTemplate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar template', error: error.message });
  }
});

app.delete('/notifications/templates/:id', protect, (req, res) => {
  try {
    notificationTemplates = notificationTemplates.filter(t => t.id !== req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar template', error: error.message });
  }
});

app.delete('/api/notifications/templates/:id', protect, (req, res) => {
  try {
    notificationTemplates = notificationTemplates.filter(t => t.id !== req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar template', error: error.message });
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
      read: false,
      createdAt: new Date()
    };

    notifications.unshift(notification);

    res.json(notification);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao enviar notificação', error: error.message });
  }
});

app.post('/api/notifications/send', protect, (req, res) => {
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
      read: false,
      createdAt: new Date()
    };

    notifications.unshift(notification);

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao enviar notificação', error: error.message });
  }
});

// ====== ROTAS DE NOTAS (StudentGrades) ======

app.get('/grades', protect, (req, res) => {
  try {
    const userStudents = students.filter(s => s.teacherId === req.user.id);
    const userGrades = studentGrades.filter(g => userStudents.some(s => s.id === g.studentId));
    res.json(userGrades);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar notas', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar nota', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar notas do aluno', error: error.message });
  }
});

// ====== ROTAS DE MATERIAIS ======

app.get('/materials', protect, (req, res) => {
  try {
    res.json(studentMaterials);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar materiais', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar material', error: error.message });
  }
});

// ====== ROTAS DE TEMPLATES DE AULA ======

app.get('/teaching-templates', protect, (req, res) => {
  try {
    res.json(teachingTemplates);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar templates', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar template', error: error.message });
  }
});

// ====== ROTAS DE LINKS DE REFERÊNCIA ======

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
    res.status(500).json({ success: false, message: 'Erro ao buscar referência', error: error.message });
  }
});

// ====== ROTAS DE PLANOS DE CURSO ======

app.get('/course-plans', protect, (req, res) => {
  try {
    res.json(coursePlans);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar planos', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao criar plano', error: error.message });
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
            recommendation: 'Enviar mensagem de incentivo e lembrete amigável'
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
          { topic: 'Equações de 2º Grau', difficultyLevel: 75, affectedStudents: 3 },
          { topic: 'Interpretação de Texto', difficultyLevel: 60, affectedStudents: 2 }
        ]
      }
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar analytics', error: error.message });
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
    res.status(500).json({ success: false, message: 'Erro ao buscar status de pagamentos', error: error.message });
  }
});

// ====== ROTA DE HEALTH CHECK ======
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Nexus Core Online 🚀',
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

// ====== ROTAS DO PORTAL DO ALUNO ======

// Banco de dados em memória para alunos do portal
let portalStudents = [];

// Middleware de autenticação do aluno
const protectStudent = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexus-secret-key-2025');

    if (decoded.type !== 'student') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    req.studentId = decoded.studentId;
    req.student = portalStudents.find(s => s.id === decoded.studentId);

    if (!req.student) {
      return res.status(401).json({ success: false, message: 'Aluno não encontrado' });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
    }
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

// Login do aluno
app.post('/api/portal/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    // Buscar aluno
    let student = portalStudents.find(s => s.email?.toLowerCase() === email.toLowerCase());

    // Se não encontrar, criar um aluno demo
    if (!student) {
      student = {
        id: `student_portal_${Date.now()}`,
        name: 'Aluno Demo',
        email: email.toLowerCase(),
        grade: '9º Ano',
        subject: 'Matemática',
        points: 0,
        level: 1,
        onboardingCompleted: false,
        createdAt: new Date()
      };
      portalStudents.push(student);
    }

    // Gerar token do aluno
    const token = jwt.sign(
      { studentId: student.id, type: 'student' },
      process.env.JWT_SECRET || 'nexus-secret-key-2025',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        subject: student.subject,
        points: student.points || 0,
        level: student.level || 1,
        onboardingCompleted: student.onboardingCompleted || false
      },
      token
    });
  } catch (error) {
    console.error('Portal login error:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login', error: error.message });
  }
});

// Registro do aluno
app.post('/api/portal/auth/register', async (req, res) => {
  try {
    const { name, email, password, age, grade, parentName, parentPhone, parentEmail } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se já existe
    const existingStudent = portalStudents.find(s => s.email?.toLowerCase() === email.toLowerCase());
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    }

    // Criar aluno
    const student = {
      id: `student_portal_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      age: parseInt(age) || 0,
      grade: grade || '',
      parentName: parentName || '',
      parentPhone: parentPhone || '',
      parentEmail: parentEmail || '',
      subject: 'Geral',
      points: 0,
      level: 1,
      onboardingCompleted: false,
      onboarding: {
        completed: false,
        subject: null,
        questionnaire: null
      },
      goals: [],
      createdAt: new Date()
    };

    portalStudents.push(student);

    // Gerar token
    const token = jwt.sign(
      { studentId: student.id, type: 'student' },
      process.env.JWT_SECRET || 'nexus-secret-key-2025',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        grade: student.grade,
        points: 0,
        level: 1,
        onboardingCompleted: false
      },
      token
    });
  } catch (error) {
    console.error('Portal register error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar conta', error: error.message });
  }
});

// Perfil do aluno (alias /me)
app.get('/api/portal/me', protectStudent, (req, res) => {
  try {
    // Buscar dados do localStorage se não tiver student
    const storedStudent = req.student || portalStudents.find(s => s.id === req.studentId);

    if (!storedStudent) {
      // Criar dados demo
      const demoStudent = {
        _id: req.studentId || 'demo_student',
        id: req.studentId || 'demo_student',
        name: 'Aluno Demo',
        email: 'aluno@demo.com',
        grade: '9º Ano',
        subject: 'Matemática',
        performance: { overall: 85, trend: 'up' },
        points: 1250,
        level: 5,
        teacher: {
          _id: 'user_demo',
          name: 'Professor Demo',
          email: 'demo@nexus.com'
        }
      };
      return res.json(demoStudent);
    }

    res.json({
      _id: storedStudent.id,
      id: storedStudent.id,
      name: storedStudent.name,
      email: storedStudent.email,
      grade: storedStudent.grade || '9º Ano',
      subject: storedStudent.subject || 'Geral',
      performance: storedStudent.performance || { overall: 75, trend: 'stable' },
      points: storedStudent.points || 0,
      level: storedStudent.level || 1,
      teacher: {
        _id: 'user_demo',
        name: 'Professor Demo',
        email: 'demo@nexus.com'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar perfil', error: error.message });
  }
});

// Perfil do aluno
app.get('/api/portal/profile', protectStudent, (req, res) => {
  try {
    res.json({
      success: true,
      student: req.student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar perfil', error: error.message });
  }
});

// Atualizar perfil do aluno
app.put('/api/portal/profile', protectStudent, (req, res) => {
  try {
    const studentIndex = portalStudents.findIndex(s => s.id === req.studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const allowedFields = ['name', 'grade', 'profile'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        portalStudents[studentIndex][field] = req.body[field];
      }
    }

    res.json({
      success: true,
      student: portalStudents[studentIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil', error: error.message });
  }
});

// Aulas do aluno
app.get('/api/portal/classes', protectStudent, (req, res) => {
  try {
    const studentClasses = classes.filter(c => c.studentId === req.studentId);
    res.json({
      success: true,
      classes: studentClasses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar aulas', error: error.message });
  }
});

// Pagamentos do aluno
app.get('/api/portal/payments', protectStudent, (req, res) => {
  try {
    const studentPayments = payments.filter(p => p.studentId === req.studentId);
    res.json({
      success: true,
      payments: studentPayments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pagamentos', error: error.message });
  }
});

// Atividades do aluno
app.get('/api/portal/activities', protectStudent, (req, res) => {
  try {
    // Retornar atividades demo
    const demoActivities = [
      {
        _id: 'activity_1',
        title: 'Lista de Exercícios - Matemática',
        type: 'exercise',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      },
      {
        _id: 'activity_2',
        title: 'Redação - Tema Livre',
        type: 'essay',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    ];

    res.json({
      success: true,
      activities: demoActivities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar atividades', error: error.message });
  }
});

// Metas do aluno
app.get('/api/portal/goals', protectStudent, (req, res) => {
  try {
    const student = portalStudents.find(s => s.id === req.studentId);
    res.json({
      success: true,
      goals: student?.goals || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar metas', error: error.message });
  }
});

app.post('/api/portal/goals', protectStudent, (req, res) => {
  try {
    const studentIndex = portalStudents.findIndex(s => s.id === req.studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const goal = {
      id: `goal_${Date.now()}`,
      title: req.body.title,
      description: req.body.description || '',
      progress: 0,
      status: 'active',
      createdAt: new Date()
    };

    if (!portalStudents[studentIndex].goals) {
      portalStudents[studentIndex].goals = [];
    }
    portalStudents[studentIndex].goals.push(goal);

    res.status(201).json({
      success: true,
      goal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao criar meta', error: error.message });
  }
});

// Atualizar meta do aluno
app.put('/api/portal/goals/:goalId', protectStudent, (req, res) => {
  try {
    const { goalId } = req.params;
    const studentIndex = portalStudents.findIndex(s => s.id === req.studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    if (!portalStudents[studentIndex].goals) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    const goalIndex = portalStudents[studentIndex].goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    const allowedFields = ['title', 'description', 'progress', 'status', 'targetDate'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        portalStudents[studentIndex].goals[goalIndex][field] = req.body[field];
      }
    }
    portalStudents[studentIndex].goals[goalIndex].updatedAt = new Date();

    res.json({
      success: true,
      goal: portalStudents[studentIndex].goals[goalIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar meta', error: error.message });
  }
});

// Deletar meta do aluno
app.delete('/api/portal/goals/:goalId', protectStudent, (req, res) => {
  try {
    const { goalId } = req.params;
    const studentIndex = portalStudents.findIndex(s => s.id === req.studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    if (!portalStudents[studentIndex].goals) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    const goalIndex = portalStudents[studentIndex].goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) {
      return res.status(404).json({ success: false, message: 'Meta não encontrada' });
    }

    portalStudents[studentIndex].goals.splice(goalIndex, 1);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao deletar meta', error: error.message });
  }
});

// Chat do portal do aluno
let portalChatMessages = [];

app.get('/api/portal/chat/messages', protectStudent, (req, res) => {
  try {
    const teacherId = req.query.teacherId || 'user_demo';
    const studentId = req.studentId;

    // Filtrar mensagens entre aluno e professor
    const messages = portalChatMessages.filter(
      m => (m.senderId === studentId && m.receiverId === teacherId) ||
           (m.senderId === teacherId && m.receiverId === studentId)
    );

    res.json({
      success: true,
      messages: messages.length > 0 ? messages : [
        {
          id: 'welcome_msg',
          senderId: 'user_demo',
          receiverId: studentId,
          message: 'Olá! Seja bem-vindo. Como posso ajudá-lo hoje?',
          type: 'text',
          createdAt: new Date(),
          read: false
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar mensagens', error: error.message });
  }
});

app.post('/api/portal/chat/send', protectStudent, (req, res) => {
  try {
    const { teacherId, message } = req.body;
    const studentId = req.studentId;

    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: studentId,
      receiverId: teacherId || 'user_demo',
      message,
      type: 'text',
      createdAt: new Date(),
      read: false
    };

    portalChatMessages.push(newMessage);

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao enviar mensagem', error: error.message });
  }
});

app.post('/api/portal/chat/mark-read/:messageId', protectStudent, (req, res) => {
  try {
    const { messageId } = req.params;
    const msgIndex = portalChatMessages.findIndex(m => m.id === messageId);
    if (msgIndex !== -1) {
      portalChatMessages[msgIndex].read = true;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao marcar como lida', error: error.message });
  }
});

// ====== ROTAS DE STUDENT ONBOARDING ======

// Templates de questionários
const SUBJECTS_DATA = {
  'Idiomas': [
    { name: 'Inglês', icon: '🇬🇧', category: 'Idiomas', description: 'Aprenda inglês do básico ao avançado' },
    { name: 'Espanhol', icon: '🇪🇸', category: 'Idiomas', description: 'Domine o espanhol para viagens e negócios' },
    { name: 'Francês', icon: '🇫🇷', category: 'Idiomas', description: 'Aprenda o idioma da cultura francesa' },
  ],
  'Exatas': [
    { name: 'Matemática', icon: '📐', category: 'Exatas', description: 'Álgebra, geometria e cálculo' },
    { name: 'Física', icon: '⚛️', category: 'Exatas', description: 'Mecânica, termodinâmica e mais' },
    { name: 'Química', icon: '🧪', category: 'Exatas', description: 'Química orgânica e inorgânica' },
  ],
  'Programação e Tecnologia': [
    { name: 'Programação', icon: '💻', category: 'Programação e Tecnologia', description: 'Python, JavaScript, Java e mais' },
    { name: 'Desenvolvimento Web', icon: '🌐', category: 'Programação e Tecnologia', description: 'HTML, CSS, React e frameworks' },
  ],
  'Preparação para Provas': [
    { name: 'ENEM', icon: '🎓', category: 'Preparação para Provas', description: 'Preparação completa para o ENEM' },
    { name: 'Vestibular', icon: '🏛️', category: 'Preparação para Provas', description: 'Vestibulares específicos' },
    { name: 'Concursos Públicos', icon: '📋', category: 'Preparação para Provas', description: 'Preparação para concursos' },
  ],
  'Outros': [
    { name: 'Outros', icon: '❓', category: 'Outros', description: 'Outra matéria ou objetivo específico' },
  ]
};

const QUESTIONNAIRE_TEMPLATES = {
  'Inglês': {
    icon: '🇬🇧',
    description: 'Aprenda inglês do básico ao avançado',
    category: 'Idiomas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Qual é seu nível atual de inglês?',
        options: [
          { value: 'beginner', label: 'Iniciante (nunca estudei)' },
          { value: 'basic', label: 'Básico (sei algumas palavras e frases)' },
          { value: 'intermediate', label: 'Intermediário (converso sobre temas simples)' },
          { value: 'advanced', label: 'Avançado (sou fluente mas quero aperfeiçoar)' }
        ],
        required: true
      },
      {
        id: 'objectives',
        type: 'multiple-choice',
        question: 'Quais são seus principais objetivos com o inglês?',
        options: ['Viajar', 'Trabalho/carreira', 'Exames (TOEFL, IELTS)', 'Filmes e séries', 'Estudar fora'],
        required: true
      },
      {
        id: 'focus',
        type: 'single-choice',
        question: 'Prefere aulas focadas em:',
        options: [
          { value: 'conversation', label: 'Conversação e fluência' },
          { value: 'grammar', label: 'Gramática e escrita' },
          { value: 'balanced', label: 'Equilíbrio entre conversação e gramática' }
        ],
        required: true
      }
    ]
  },
  'Matemática': {
    icon: '📐',
    description: 'Álgebra, geometria e cálculo',
    category: 'Exatas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Para que nível você precisa de aulas?',
        options: [
          { value: 'fundamental', label: 'Ensino Fundamental' },
          { value: 'medio', label: 'Ensino Médio' },
          { value: 'vestibular', label: 'Vestibular/ENEM' },
          { value: 'superior', label: 'Ensino Superior' }
        ],
        required: true
      },
      {
        id: 'topics',
        type: 'multiple-choice',
        question: 'Quais tópicos você tem mais dificuldade?',
        options: ['Álgebra', 'Geometria', 'Trigonometria', 'Cálculo', 'Estatística'],
        required: true
      },
      {
        id: 'goal',
        type: 'single-choice',
        question: 'Qual é seu objetivo principal?',
        options: [
          { value: 'school', label: 'Melhorar as notas na escola' },
          { value: 'exam', label: 'Passar em uma prova específica' },
          { value: 'foundation', label: 'Fortalecer a base matemática' }
        ],
        required: true
      }
    ]
  }
};

// Questionário genérico
const GENERIC_QUESTIONNAIRE = {
  icon: '❓',
  description: 'Questionário personalizado',
  category: 'Outros',
  questions: [
    {
      id: 'experience',
      type: 'single-choice',
      question: 'Você já tem alguma experiência prévia nessa área?',
      options: [
        { value: 'none', label: 'Nenhuma, sou totalmente iniciante' },
        { value: 'basic', label: 'Tenho noções básicas' },
        { value: 'intermediate', label: 'Tenho experiência intermediária' },
        { value: 'advanced', label: 'Tenho experiência avançada' }
      ],
      required: true
    },
    {
      id: 'goal',
      type: 'text',
      question: 'Qual é seu principal objetivo ao aprender isso?',
      placeholder: 'Ex: Melhorar no trabalho, passar em provas...',
      required: true
    },
    {
      id: 'learning_preference',
      type: 'scale',
      question: 'Você prefere aulas mais teóricas ou práticas?',
      min: 1,
      max: 10,
      labels: { min: 'Totalmente teórico', max: 'Totalmente prático' },
      required: true
    }
  ]
};

// Obter lista de matérias
app.get('/api/student-onboarding/subjects', (req, res) => {
  try {
    res.json({
      success: true,
      byCategory: SUBJECTS_DATA
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter matérias' });
  }
});

// Selecionar matéria e obter questionário
app.post('/api/student-onboarding/select-subject', protectStudent, (req, res) => {
  try {
    const { subject, customSubject } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Matéria é obrigatória' });
    }

    const subjectName = subject === 'Outros' && customSubject ? customSubject.trim() : subject;

    // Buscar questionário específico ou usar genérico
    const template = QUESTIONNAIRE_TEMPLATES[subjectName] || GENERIC_QUESTIONNAIRE;

    const questionnaire = {
      subject: subjectName,
      icon: template.icon,
      description: template.description,
      category: template.category,
      questions: template.questions
    };

    // Atualizar aluno
    const studentIndex = portalStudents.findIndex(s => s.id === req.studentId);
    if (studentIndex !== -1) {
      portalStudents[studentIndex].subject = subjectName;
      if (!portalStudents[studentIndex].onboarding) {
        portalStudents[studentIndex].onboarding = {};
      }
      portalStudents[studentIndex].onboarding.subject = subjectName;
    }

    res.json({
      success: true,
      subject: subjectName,
      questionnaire
    });
  } catch (error) {
    console.error('Select subject error:', error);
    res.status(500).json({ success: false, message: 'Erro ao selecionar matéria' });
  }
});

// Obter questionário para matéria
app.post('/api/student-onboarding/get-questionnaire', (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Matéria é obrigatória' });
    }

    const template = QUESTIONNAIRE_TEMPLATES[subject] || GENERIC_QUESTIONNAIRE;

    res.json({
      success: true,
      questionnaire: {
        subject,
        ...template
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter questionário' });
  }
});

// Submeter onboarding
app.post('/api/student-onboarding/submit', protectStudent, (req, res) => {
  try {
    const { subject, answers, goals, studyHoursPerWeek, preferredSchedule } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Matéria é obrigatória' });
    }

    const studentIndex = portalStudents.findIndex(s => s.id === req.studentId);
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    // Atualizar dados do aluno
    portalStudents[studentIndex].subject = subject;
    portalStudents[studentIndex].onboardingCompleted = true;
    portalStudents[studentIndex].onboarding = {
      completed: true,
      completedAt: new Date(),
      subject,
      questionnaire: answers,
      answers: {
        studyHoursPerWeek: parseInt(studyHoursPerWeek) || 5,
        preferredSchedule: preferredSchedule || 'flexible'
      }
    };

    // Processar metas
    if (goals && Array.isArray(goals) && goals.length > 0) {
      portalStudents[studentIndex].goals = goals.slice(0, 5).map(goal => ({
        id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: typeof goal === 'string' ? goal : goal.title,
        description: goal.description || '',
        progress: 0,
        status: 'active',
        createdAt: new Date()
      }));
    }

    res.json({
      success: true,
      message: 'Onboarding concluído com sucesso!',
      data: {
        subject,
        completedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Submit onboarding error:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar onboarding' });
  }
});

// ====== ROTAS DO JOGO DA FORCA ======
import hangmanRoutes from './routes/hangman.js';
app.use('/api/hangman', hangmanRoutes);

// ====== HANDLER 404 - ROTA NÃO ENCONTRADA ======
app.use((req, res, next) => {
  // Ignorar requisições de arquivos estáticos
  if (req.path.includes('.') && !req.path.endsWith('.json')) {
    return next();
  }

  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    availableRoutes: {
      auth: ['/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/profile'],
      students: ['/api/students', '/api/students/:id'],
      classes: ['/api/classes', '/api/classes/:id'],
      payments: ['/api/payments', '/api/payments/:id'],
      portal: ['/api/portal/auth/login', '/api/portal/auth/register', '/api/portal/me', '/api/portal/profile'],
      onboarding: ['/api/student-onboarding/subjects', '/api/student-onboarding/select-subject', '/api/student-onboarding/submit']
    }
  });
});

// ====== MIDDLEWARE DE ERRO ======
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erro interno do servidor', error: err.message });
});

// ====== INICIAR SERVIDOR ======
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Servidor Nexus Academy rodando na porta ${PORT}`);
});

