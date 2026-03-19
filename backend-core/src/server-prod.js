import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB, { isDBConnected } from './config/database.js';
import { authenticateOptional, sanitizeInput } from './middleware/auth.js';
import { setupHangmanSocket } from './socket/hangmanSocket.js';
import liveClassService from './services/liveClassService.js';
import { tenantContextMiddleware } from './middleware/tenantAware.js';
import correlationId from './middleware/correlationId.js';
import logger from './utils/logger.js';
import { ensureDevelopmentDemoData } from './dev/ensureDemoData.js';
import {
  authenticateSocket,
  validateClassRoomAccess,
  validateLiveSessionAccess,
  checkRateLimit,
  cleanupRateLimit,
  sanitizeEventData,
  createSocketError,
  logSecurityEvent
} from './socket/socketSecurity.js';

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
import teachingAssistantRoutes from './routes/teachingAssistant.js';
import gamificationRoutes from './routes/gamification.js';
import auditLogsRoutes from './routes/auditLogs.js';
import hubRoutes from './routes/hub.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

const localDevOrigins = ['localhost', '127.0.0.1']
  .flatMap((hostname) =>
    ['3000', '4173', '4174', '4175', '4176', '4177', '5173', '5174', '5175', '5176', '5177']
      .map((port) => `http://${hostname}:${port}`)
  );

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(...localDevOrigins);
}

const normalizedAllowedOrigins = [...new Set(allowedOrigins)];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || normalizedAllowedOrigins.includes(origin)) {
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
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(correlationId);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);
app.use('/api', authenticateOptional);
app.use('/api', tenantContextMiddleware);

const io = new Server(httpServer, {
  cors: { origin: normalizedAllowedOrigins, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB max message size
  connectTimeout: 45000
});
app.set('io', io);

// Apply authentication middleware to all namespaces
io.use(authenticateSocket);

io.on('connection', (socket) => {
  const user = socket.data.user;

  // Double-check authentication (should never happen with middleware)
  if (!user) {
    logSecurityEvent('UNAUTHENTICATED_CONNECTION', socket);
    socket.disconnect();
    return;
  }

  logger.info('Socket connected', { socketId: socket.id, userId: user.id, userName: user.name, role: user.role });

  // Auto-join user-specific rooms
  socket.join(`user:${user.id}`);

  if (user.role === 'student') {
    socket.join(`student:${user.id}`);
    if (user.teacherId) {
      socket.join(`teacher:${user.teacherId}`);
    }
  } else {
    socket.join(`teacher:${user.id}`);
  }

  // === JOIN CLASSROOM ===
  socket.on('join-classroom', async (data) => {
    const sanitizedData = sanitizeEventData(data);
    const { classId } = sanitizedData;

    // Rate limiting
    if (!checkRateLimit(socket, 'join')) {
      socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many join requests'));
      logSecurityEvent('RATE_LIMIT_EXCEEDED', socket, { event: 'join-classroom' });
      return;
    }

    // Validate access
    const validation = await validateClassRoomAccess(classId, user);

    if (!validation.allowed) {
      socket.emit('error', createSocketError(validation.reason, 'Cannot join classroom'));
      logSecurityEvent('UNAUTHORIZED_CLASS_ACCESS', socket, { classId, reason: validation.reason });
      return;
    }

    // Join room
    socket.join(classId);

    // Notify room
    io.to(classId).emit('user-joined', {
      userId: user.id,
      userName: user.name,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    logger.info('User joined class', { userId: user.id, userName: user.name, classId });
  });

  // === JOIN LIVE SESSION ===
  socket.on('join-live-session', (data) => {
    const sanitizedData = sanitizeEventData(data);
    const { sessionId } = sanitizedData;

    // Rate limiting
    if (!checkRateLimit(socket, 'join')) {
      socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many join requests'));
      return;
    }

    // Get session
    const session = liveClassService.getSession(sessionId);

    // Validate access
    const validation = validateLiveSessionAccess(session, user);

    if (!validation.allowed) {
      socket.emit('error', createSocketError(validation.reason, 'Cannot join live session'));
      logSecurityEvent('UNAUTHORIZED_SESSION_ACCESS', socket, { sessionId, reason: validation.reason });
      return;
    }

    // Join room
    socket.join(sessionId);

    // Notify room
    io.to(sessionId).emit('participant-joined', {
      userId: user.id,
      userName: user.name,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    logger.info('User joined live session', { userId: user.id, userName: user.name, sessionId });
  });

  // === WEBRTC SIGNALING (with validation) ===
  socket.on('webrtc-offer', (data) => {
    const sanitizedData = sanitizeEventData(data);

    if (!sanitizedData?.to || !sanitizedData?.offer) {
      return;
    }

    // Rate limiting
    if (!checkRateLimit(socket, 'event')) {
      return;
    }

    io.to(sanitizedData.to).emit('webrtc-offer', {
      from: socket.id,
      offer: sanitizedData.offer
    });
  });

  socket.on('webrtc-answer', (data) => {
    const sanitizedData = sanitizeEventData(data);

    if (!sanitizedData?.to || !sanitizedData?.answer) {
      return;
    }

    // Rate limiting
    if (!checkRateLimit(socket, 'event')) {
      return;
    }

    io.to(sanitizedData.to).emit('webrtc-answer', {
      from: socket.id,
      answer: sanitizedData.answer
    });
  });

  socket.on('ice-candidate', (data) => {
    const sanitizedData = sanitizeEventData(data);

    if (!sanitizedData?.to || !sanitizedData?.candidate) {
      return;
    }

    // Rate limiting
    if (!checkRateLimit(socket, 'event')) {
      return;
    }

    io.to(sanitizedData.to).emit('ice-candidate', {
      from: socket.id,
      candidate: sanitizedData.candidate
    });
  });

  // === CHAT MESSAGE ===
  socket.on('class-message', async (data) => {
    const sanitizedData = sanitizeEventData(data);
    const { classId, message } = sanitizedData;

    // Rate limiting for messages
    if (!checkRateLimit(socket, 'message')) {
      socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Sending messages too fast'));
      return;
    }

    // Validate message content
    if (!message || typeof message !== 'string' || message.length > 2000) {
      socket.emit('error', createSocketError('INVALID_MESSAGE', 'Message must be 1-2000 characters'));
      return;
    }

    // Validate class access
    const validation = await validateClassRoomAccess(classId, user);
    if (!validation.allowed) {
      socket.emit('error', createSocketError('UNAUTHORIZED', 'Cannot send message to this class'));
      return;
    }

    // Broadcast message
    const messageData = {
      classId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    io.to(classId).emit('new-message', messageData);
  });

  // === TYPING INDICATORS ===
  socket.on('typing-start', (data) => {
    const sanitizedData = sanitizeEventData(data);
    const { roomId } = sanitizedData;

    if (roomId) {
      socket.to(roomId).emit('user-typing', {
        userId: user.id,
        userName: user.name
      });
    }
  });

  socket.on('typing-stop', (data) => {
    const sanitizedData = sanitizeEventData(data);
    const { roomId } = sanitizedData;

    if (roomId) {
      socket.to(roomId).emit('user-stopped-typing', {
        userId: user.id
      });
    }
  });

  // === DISCONNECT ===
  socket.on('disconnect', (reason) => {
    logger.info('Socket disconnected', { socketId: socket.id, reason });
    cleanupRateLimit(socket.id);
  });

  // === ERROR HANDLER ===
  socket.on('error', (error) => {
    logger.error('Socket error', { socketId: socket.id, error: error.message });
    logSecurityEvent('SOCKET_ERROR', socket, { error: error.message });
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
app.use('/api', hubRoutes);
app.use('/api/hangman', hangmanRoutes);
app.use('/api/teaching-assistant', teachingAssistantRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

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
  logger.error('Unhandled error', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
    correlationId: req.correlationId
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  if (process.env.NODE_ENV !== 'production') {
    try {
      const demoCredentials = await ensureDevelopmentDemoData();
      if (demoCredentials) {
        logger.info('Dados demo garantidos para desenvolvimento local', demoCredentials);
      }
    } catch (error) {
      logger.warn('Falha ao preparar dados demo locais', {
        error: error.message
      });
    }
  }

  httpServer.listen(PORT, () => {
    logger.info(`API rodando na porta ${PORT}`);
  });
};

start();
