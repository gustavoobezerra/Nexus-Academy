import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import connectDB, { isDBConnected } from './config/database.js';
import { sanitizeInput } from './middleware/auth.js';
import { setupHangmanSocket } from './socket/hangmanSocket.js';
import Class from './models/Class.js';
import liveClassService from './services/liveClassService.js';
import User from './models/User.js';
import Student from './models/Student.js';

import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import studentsRoutes from './routes/students.js';
import paymentsRoutes from './routes/payments.js';
import classesRoutes from './routes/classes.js';
import reportsRoutes from './routes/reports.js';
import liveClassRoutes from './routes/liveClass.js';
import dailyVideoRoutes from './routes/dailyVideo.js';
import chatRoutes from './routes/chat.js';
import notificationsRoutes from './routes/notifications.js';
import contentLibraryRoutes from './routes/contentLibrary.js';
import coursesRoutes from './routes/courses.js';
import quizzesRoutes from './routes/quizzes.js';
import goalsRoutes from './routes/goals.js';
import automationRoutes from './routes/automation.js';
import certificatesRoutes from './routes/certificates.js';
import integrationsRoutes from './routes/integrations.js';
import studentPortalRoutes from './routes/studentPortal.js';
import studentOnboardingRoutes from './routes/studentOnboarding.js';
import pronunciationRoutes from './routes/pronunciation.js';
import pronunciationTeacherRoutes from './routes/pronunciationTeacher.js';
import webhooksRoutes from './routes/webhooks.js';
import analyticsRoutes from './routes/analytics.js';
import aiAssistantRoutes from './routes/aiAssistant.js';
import hangmanRoutes from './routes/hangman.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000'
  );
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});
app.set('io', io);

const getSocketToken = (socket) => {
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return secret;
};

io.use(async (socket, next) => {
  try {
    const token = getSocketToken(socket);
    if (!token) {
      return next(new Error('Token não fornecido'));
    }

    const decoded = jwt.verify(token, getJWTSecret());

    if (decoded.type === 'student') {
      const student = await Student.findById(decoded.studentId).select('_id teacher');
      if (!student) {
        return next(new Error('Aluno não encontrado'));
      }
      socket.data.user = {
        id: student._id.toString(),
        role: 'student',
        teacherId: student.teacher?.toString()
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('_id role');
    if (!user) {
      return next(new Error('Usuário não encontrado'));
    }
    socket.data.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  if (!user) {
    socket.disconnect();
    return;
  }

  socket.join(`user:${user.id}`);

  if (user.role === 'student') {
    socket.join(`student:${user.id}`);
    if (user.teacherId) {
      socket.join(`teacher:${user.teacherId}`);
    }
  } else {
    socket.join(`teacher:${user.id}`);
  }

  socket.on('join-classroom', async ({ classId }) => {
    if (!classId) {
      return;
    }
    const classDoc = await Class.findById(classId).select('_id teacher student');
    if (!classDoc) {
      return;
    }
    const isTeacher = user.role !== 'student' && classDoc.teacher.toString() === user.id;
    const isStudent = user.role === 'student' && classDoc.student.toString() === user.id;

    if (!isTeacher && !isStudent) {
      return;
    }

    socket.join(classId);
  });

  socket.on('join-live-session', ({ sessionId }) => {
    const session = liveClassService.getSession(sessionId);
    if (!session) return;

    const allowed = user.role === 'student'
      ? session.studentId === user.id
      : session.teacherId === user.id;

    if (!allowed) return;

    socket.join(sessionId);
  });

  socket.on('webrtc-offer', (data) => {
    if (!data?.to || !data?.offer) return;
    io.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on('webrtc-answer', (data) => {
    if (!data?.to || !data?.answer) return;
    io.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on('ice-candidate', (data) => {
    if (!data?.to || !data?.candidate) return;
    io.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });
});

setupHangmanSocket(io);

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/live-class', liveClassRoutes);
app.use('/api/daily', dailyVideoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/content-library', contentLibraryRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/portal', studentPortalRoutes);
app.use('/api/student-onboarding', studentOnboardingRoutes);
app.use('/api/portal/pronunciation', pronunciationRoutes);
app.use('/api/pronunciation', pronunciationTeacherRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiAssistantRoutes);
app.use('/api/hangman', hangmanRoutes);

app.get('/api/health', (req, res) => {
  const dbConnected = isDBConnected();
  if (process.env.NODE_ENV === 'production' && !dbConnected) {
    return res.status(503).json({
      status: 'degraded',
      database: 'disconnected'
    });
  }
  return res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`✅ API rodando na porta ${PORT}`);
  });
};

start();
