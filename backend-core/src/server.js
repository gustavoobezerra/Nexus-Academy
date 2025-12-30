import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Import Routes
import aiAssistantRoutes from './routes/aiAssistant.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import automationRoutes from './routes/automation.js';
import certificatesRoutes from './routes/certificates.js';
import chatRoutes from './routes/chat.js';
import classesRoutes from './routes/classes.js';
import contentLibraryRoutes from './routes/contentLibrary.js';
import coursesRoutes from './routes/courses.js';
import dailyVideoRoutes from './routes/dailyVideo.js';
import goalsRoutes from './routes/goals.js';
import integrationsRoutes from './routes/integrations.js';
import liveClassRoutes from './routes/liveClass.js';
import notificationsRoutes from './routes/notifications.js';
import onboardingRoutes from './routes/onboarding.js';
import paymentsRoutes from './routes/payments.js';
import pronunciationRoutes from './routes/pronunciation.js';
import quizzesRoutes from './routes/quizzes.js';
import reportsRoutes from './routes/reports.js';
import studentOnboardingRoutes from './routes/studentOnboarding.js';
import studentPortalRoutes from './routes/studentPortal.js';
import studentsRoutes from './routes/students.js';
import webhooksRoutes from './routes/webhooks.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-academy';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Socket.IO Setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO Logic (Adapted from server-simple.js for basic functionality)
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-classroom', ({ classId, userId, userName }) => {
    socket.join(classId);
    console.log(`🎓 User ${userName} (${userId}) joined class: ${classId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });

  // More socket logic can be added/imported here as needed
});

// Pass io to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/content-library', contentLibraryRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/daily', dailyVideoRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/live-class', liveClassRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/portal/pronunciation', pronunciationRoutes); // Mounted at /api/portal/pronunciation
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/student-onboarding', studentOnboardingRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/webhooks', webhooksRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Nexus Core Online 🚀',
    mode: 'MongoDB Production Ready',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🚀 NEXUS CORE - SERVER ONLINE 🚀                    ║
║                                                              ║
║              Rodando com MongoDB                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Servidor rodando na porta: ${PORT}
✅ Ambiente: ${process.env.NODE_ENV || 'development'}
  `);
});

export default app;
