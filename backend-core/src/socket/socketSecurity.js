/**
 * Socket.IO Security Middleware & Utilities
 * Handles authentication, tenant isolation, rate limiting, and room validation
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';

// Rate limiting tracking per socket
const socketRateLimits = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
  message: { window: 10000, max: 20 }, // 20 messages per 10 seconds
  event: { window: 5000, max: 50 },     // 50 events per 5 seconds
  join: { window: 60000, max: 30 }      // 30 joins per minute
};

/**
 * Extract JWT token from socket handshake
 */
export const getSocketToken = (socket) => {
  // Priority 1: auth.token in handshake
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // Priority 2: Authorization header
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Priority 3: Query parameter (fallback for legacy clients)
  if (socket.handshake.query?.token) {
    return socket.handshake.query.token;
  }

  return null;
};

/**
 * Get JWT secret from environment
 */
export const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return secret;
};

/**
 * Socket.IO authentication middleware
 * Validates JWT token and attaches user identity to socket
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = getSocketToken(socket);

    if (!token) {
      return next(new Error('AUTHENTICATION_REQUIRED'));
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('TOKEN_EXPIRED'));
      }
      return next(new Error('INVALID_TOKEN'));
    }

    // Handle student tokens
    if (decoded.type === 'student') {
      const student = await Student.findById(decoded.studentId)
        .select('_id teacher name email portalAccess')
        .lean();

      if (!student) {
        return next(new Error('STUDENT_NOT_FOUND'));
      }

      // Check if student portal access is enabled
      if (!student.portalAccess?.enabled) {
        return next(new Error('PORTAL_ACCESS_DISABLED'));
      }

      socket.data.user = {
        id: student._id.toString(),
        role: 'student',
        type: 'student',
        teacherId: student.teacher?.toString(),
        tenantId: student.teacher?.toString(), // Tenant = teacher
        name: student.name,
        email: student.email
      };

      return next();
    }

    // Handle teacher/admin tokens
    const user = await User.findById(decoded.id)
      .select('_id role email name subscriptionStatus')
      .lean();

    if (!user) {
      return next(new Error('USER_NOT_FOUND'));
    }

    // Check subscription status for teachers
    if (user.role === 'teacher') {
      const validStatuses = ['active', 'trialing', 'incomplete'];
      if (!validStatuses.includes(user.subscriptionStatus)) {
        return next(new Error('SUBSCRIPTION_INACTIVE'));
      }
    }

    socket.data.user = {
      id: user._id.toString(),
      role: user.role,
      type: 'teacher',
      tenantId: user._id.toString(), // Teachers are their own tenant
      name: user.name,
      email: user.email
    };

    return next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    return next(new Error('AUTHENTICATION_FAILED'));
  }
};

/**
 * Rate limiting for socket events
 * Prevents spam and abuse
 */
export const checkRateLimit = (socket, limitType = 'event') => {
  const socketId = socket.id;
  const config = RATE_LIMIT_CONFIG[limitType] || RATE_LIMIT_CONFIG.event;

  const now = Date.now();

  if (!socketRateLimits.has(socketId)) {
    socketRateLimits.set(socketId, new Map());
  }

  const socketLimits = socketRateLimits.get(socketId);

  if (!socketLimits.has(limitType)) {
    socketLimits.set(limitType, {
      count: 1,
      windowStart: now
    });
    return true;
  }

  const limit = socketLimits.get(limitType);

  // Reset window if expired
  if (now - limit.windowStart > config.window) {
    limit.count = 1;
    limit.windowStart = now;
    return true;
  }

  // Check if over limit
  if (limit.count >= config.max) {
    return false;
  }

  limit.count++;
  return true;
};

/**
 * Clean up rate limit tracking for disconnected socket
 */
export const cleanupRateLimit = (socketId) => {
  socketRateLimits.delete(socketId);
};

/**
 * Validate class room access
 * Ensures user can join the specified class room
 */
export const validateClassRoomAccess = async (classId, user) => {
  if (!classId) {
    return { allowed: false, reason: 'MISSING_CLASS_ID' };
  }

  try {
    const classDoc = await Class.findById(classId)
      .select('_id teacher student')
      .lean();

    if (!classDoc) {
      return { allowed: false, reason: 'CLASS_NOT_FOUND' };
    }

    // Teacher check
    if (user.role === 'teacher') {
      const isOwner = classDoc.teacher.toString() === user.id;
      if (!isOwner) {
        return { allowed: false, reason: 'NOT_CLASS_OWNER' };
      }
      return { allowed: true, classDoc };
    }

    // Student check
    if (user.role === 'student') {
      const isEnrolled = classDoc.student.toString() === user.id;
      const isSameTenant = classDoc.teacher.toString() === user.teacherId;

      if (!isEnrolled || !isSameTenant) {
        return { allowed: false, reason: 'NOT_ENROLLED' };
      }
      return { allowed: true, classDoc };
    }

    return { allowed: false, reason: 'INVALID_ROLE' };
  } catch (error) {
    console.error('Class room validation error:', error);
    return { allowed: false, reason: 'VALIDATION_ERROR' };
  }
};

/**
 * Validate live session access
 * Ensures user can join the specified live session
 */
export const validateLiveSessionAccess = (session, user) => {
  if (!session) {
    return { allowed: false, reason: 'SESSION_NOT_FOUND' };
  }

  // Teacher check
  if (user.role === 'teacher') {
    const isOwner = session.teacherId === user.id;
    if (!isOwner) {
      return { allowed: false, reason: 'NOT_SESSION_OWNER' };
    }
    return { allowed: true };
  }

  // Student check
  if (user.role === 'student') {
    const isParticipant = session.studentId === user.id;
    const isSameTenant = session.teacherId === user.teacherId;

    if (!isParticipant || !isSameTenant) {
      return { allowed: false, reason: 'NOT_PARTICIPANT' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'INVALID_ROLE' };
};

/**
 * Validate game room access
 * Ensures user can access the specified game
 */
export const validateGameAccess = async (game, user) => {
  if (!game) {
    return { allowed: false, reason: 'GAME_NOT_FOUND' };
  }

  // Teachers can access their own games
  if (user.role === 'teacher') {
    const isOwner = game.teacher.toString() === user.id;
    if (!isOwner) {
      return { allowed: false, reason: 'NOT_GAME_OWNER' };
    }
    return { allowed: true };
  }

  // Students can access if they're enrolled with the game's teacher
  if (user.role === 'student') {
    const isSameTenant = game.teacher.toString() === user.teacherId;
    if (!isSameTenant) {
      return { allowed: false, reason: 'TENANT_MISMATCH' };
    }

    // Check if already a player or if game is still accepting players
    const isPlayer = game.players?.some(
      p => p.studentId.toString() === user.id
    );

    if (!isPlayer && game.status !== 'waiting') {
      return { allowed: false, reason: 'GAME_ALREADY_STARTED' };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'INVALID_ROLE' };
};

/**
 * Validate room name format
 * Prevents arbitrary room names that could leak data
 */
export const validateRoomName = (roomName) => {
  if (!roomName || typeof roomName !== 'string') {
    return false;
  }

  // Allowed patterns: user:ID, teacher:ID, student:ID, class:ID, session:ID, game:ID
  const allowedPatterns = [
    /^user:[a-f0-9]{24}$/,
    /^teacher:[a-f0-9]{24}$/,
    /^student:[a-f0-9]{24}$/,
    /^class:[a-f0-9]{24}$/,
    /^session:[a-f0-9]{24}$/,
    /^game:[a-f0-9]{24}$/,
    /^[a-f0-9]{24}$/ // Direct ObjectId for games/classes
  ];

  return allowedPatterns.some(pattern => pattern.test(roomName));
};

/**
 * Sanitize socket event data
 * Removes potentially dangerous fields
 */
export const sanitizeEventData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === 'object' && item !== null
        ? sanitizeEventData(item)
        : item
    );
  }

  const sanitized = { ...data };

  // Remove dangerous fields
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  dangerousFields.forEach(field => {
    delete sanitized[field];
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeEventData(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Create error response for socket events
 */
export const createSocketError = (code, message) => {
  return {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Logging helper for security events
 */
export const logSecurityEvent = (event, socket, details = {}) => {
  const user = socket.data.user;
  const timestamp = new Date().toISOString();

  console.warn(`[SOCKET_SECURITY] ${timestamp} - ${event}`, {
    socketId: socket.id,
    userId: user?.id,
    role: user?.role,
    ip: socket.handshake.address,
    ...details
  });
};
