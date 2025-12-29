import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import connectDB from './config/database.js';
import cacheService from './services/cacheService.js';
import automationEngine from './services/automationEngine.js';
import monitoringService from './services/monitoringService.js';
import logger from './utils/logger.js';
import { tenantContextMiddleware } from './middleware/tenantAware.js';

// Routes
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import paymentRoutes from './routes/payments.js';
import classRoutes from './routes/classes.js';
import analyticsRoutes from './routes/analytics.js';
import courseRoutes from './routes/courses.js';
import automationRoutes from './routes/automation.js';
import webhookRoutes from './routes/webhooks.js';
import integrationRoutes from './routes/integrations.js';
import reportRoutes from './routes/reports.js';
import studentPortalRoutes from './routes/studentPortal.js';
import chatRoutes from './routes/chat.js';
import aiAssistantRoutes from './routes/aiAssistant.js';
import quizRoutes from './routes/quizzes.js';
import certificateRoutes from './routes/certificates.js';
import goalRoutes from './routes/goals.js';
import contentLibraryRoutes from './routes/contentLibrary.js';
import liveClassRoutes from './routes/liveClass.js';
import onboardingRoutes from './routes/onboarding.js';
import studentOnboardingRoutes from './routes/studentOnboarding.js';
import dailyVideoRoutes from './routes/dailyVideo.js';
import notificationsRoutes from './routes/notifications.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174'
];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Security & Performance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://meet.jit.si"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://meet.jit.si", "wss://meet.jit.si", process.env.FRONTEND_URL || 'http://localhost:5173'],
      frameSrc: ["'self'", "https://meet.jit.si"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Logging with Winston
app.use(morgan('combined', {
  stream: logger.stream,
  skip: (req) => process.env.NODE_ENV === 'production' && req.url.includes('/auth')
}));

// Rate limiting - configurações mais restritivas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Limite geral
  message: { success: false, message: 'Muitas requisições. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite mais restritivo para auth
  message: { success: false, message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // Limite para uploads
  message: { success: false, message: 'Limite de uploads atingido.' }
});

// IMPORTANTE: Webhook do Stripe DEVE vir ANTES do body parser
// O Stripe precisa do raw body para verificar a assinatura
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/portal/auth/login', authLimiter);
app.use('/api/portal/auth/register', authLimiter);

// Body parsing (DEPOIS do webhook do Stripe)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Tenant context middleware (DEPOIS do body parsing, ANTES das rotas)
app.use(tenantContextMiddleware);

// Static files (certificates / reports)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Swagger API Docs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Nexus Academy API', version: '2.0.0', description: 'Complete API for Nexus Academy SaaS' },
    servers: [{ url: process.env.API_URL || 'http://localhost:5000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./src/routes/*.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Socket.IO
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});

// Socket.IO events
io.on('connection', (socket) => {

  // Vincular usuário autenticado a salas direcionadas
  const { userId, userType } = socket.handshake.auth || {};
  if (userId) {
    socket.join(`user:${userId}`);
    if (userType === 'student') {
      socket.join(`student:${userId}`);
    }
  }

  socket.on('join-classroom', ({ classId }) => {
    socket.join(`class:${classId}`);
  });

  socket.on('start-live-session', ({ classId, teacherId }) => {
    const sessionId = `session_${Date.now()}`;
    socket.join(sessionId);
    io.to(`class:${classId}`).emit('session-started', { sessionId, classId });
  });

  socket.on('join-live-session', ({ sessionId }) => {
    socket.join(sessionId);
    io.to(sessionId).emit('participant-joined', { participantId: socket.id });
  });

  socket.on('transcript-chunk', ({ sessionId, text }) => {
    io.to(sessionId).emit('transcript-update', { text, timestamp: Date.now() });
  });

  socket.on('class-message', ({ sessionId, message, sender }) => {
    io.to(sessionId).emit('new-message', { message, sender, timestamp: Date.now() });
  });

  // Live class events
  socket.on('join-live-class', ({ sessionId, userType, userId }) => {
    socket.join(sessionId);
    socket.to(sessionId).emit('participant-joined', { userId, userType, socketId: socket.id });
  });

  socket.on('webrtc-offer', ({ sessionId, offer, targetId }) => {
    if (targetId && targetId !== 'all') {
      socket.to(targetId).emit('webrtc-offer', { offer, from: socket.id });
    } else {
      socket.to(sessionId).emit('webrtc-offer', { offer, from: socket.id });
    }
  });

  socket.on('webrtc-answer', ({ sessionId, answer, targetId }) => {
    if (targetId) {
      socket.to(targetId).emit('webrtc-answer', { answer, from: socket.id });
    }
  });

  socket.on('webrtc-ice-candidate', ({ sessionId, candidate, targetId }) => {
    if (targetId) {
      socket.to(targetId).emit('webrtc-ice-candidate', { candidate, from: socket.id });
    } else {
      socket.to(sessionId).emit('webrtc-ice-candidate', { candidate, from: socket.id });
    }
  });

  socket.on('toggle-recording', ({ sessionId, enabled }) => {
    socket.to(sessionId).emit('recording-toggled', { enabled, by: socket.id });
  });

  socket.on('update-transcript', ({ sessionId, transcript }) => {
    socket.to(sessionId).emit('transcript-updated', { transcript, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// Make io available to routes
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Nexus Academy API Online 🚀',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      cache: cacheService.isConnected() ? 'redis' : 'memory',
      automation: automationEngine.isRunning ? 'running' : 'stopped'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/portal', studentPortalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/content-library', contentLibraryRoutes);
app.use('/api/live-class', liveClassRoutes);
app.use('/api/student-onboarding', studentOnboardingRoutes);
app.use('/api/daily', dailyVideoRoutes);
app.use('/api/notifications', notificationsRoutes);

// Performance monitoring middleware
app.use(monitoringService.performanceMiddleware());

// Error handling
app.use(monitoringService.errorHandler());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis (optional)
    await cacheService.connect();

    // Start automation engine
    automationEngine.start();

    httpServer.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🚀 NEXUS ACADEMY API v2.0.0 🚀                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Server running on port: ${PORT}
✅ MongoDB: Connected
✅ Cache: ${cacheService.isConnected() ? 'Redis' : 'In-Memory'}
✅ Socket.IO: Active
✅ Automation Engine: Running

📚 API Docs: http://localhost:${PORT}/api-docs
📡 Health: http://localhost:${PORT}/api/health

🔗 Routes:
   - POST   /api/auth/register
   - POST   /api/auth/login
   - GET    /api/students
   - GET    /api/payments
   - GET    /api/classes
   - GET    /api/analytics/teacher
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  automationEngine.stop();
  await cacheService.disconnect();
  process.exit(0);
});

startServer();

export { app, io };
