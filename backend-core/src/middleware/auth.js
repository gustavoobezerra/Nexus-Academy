import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { tenantContext } from './tenantAware.js';

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return secret;
};

export const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Token não fornecido.'
      });
    }

    const JWT_SECRET = getJWTSecret();

    // Verificar e decodificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido.'
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Por favor, faça login novamente.'
        });
      }
      throw jwtError;
    }

    if (decoded?.type === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado.'
      });
    }

    // Buscar usuário
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    req.user = user;
    req.userId = user._id.toString();
    req.teacherId = user._id; // Para filtros multi-tenant
    req.roles = [user.role];
    req.tenantId = user._id.toString();

    // VERIFICAÇÃO DE ASSINATURA ATIVA
    // Não verificar durante onboarding (status: pending_setup)
    if (user.status !== 'pending_setup' && !user.canAccess()) {
      return res.status(403).json({
        success: false,
        message: 'Assinatura inativa. Regularize seu pagamento.',
        subscriptionStatus: user.subscriptionStatus
      });
    }

    return tenantContext.run({ teacherId: req.tenantId?.toString() }, () => next());
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Erro de autenticação.'
    });
  }
};

export const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token invalido.'
      });
    }

    if (decoded?.type === 'student') {
      req.userId = decoded.studentId;
      req.studentId = decoded.studentId;
      req.teacherId = decoded.teacherId;
      req.roles = ['student'];
      req.tenantId = decoded.teacherId || null;
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario nao encontrado.'
      });
    }

    req.user = user;
    req.userId = user._id.toString();
    req.teacherId = user._id;
    req.roles = [user.role];
    req.tenantId = user._id.toString();
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Erro de autenticacao.'
    });
  }
};

// Alias para compatibilidade
export const protect = authenticate;

/**
 * Middleware que exige assinatura ativa para acessar
 * Usar em rotas que requerem plano pago (após trial)
 */
export const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado.'
    });
  }

  // Verificar se tem assinatura ativa (trialing ou active)
  if (!req.user.canAccess || !req.user.canAccess()) {
    return res.status(403).json({
      success: false,
      message: 'Assinatura inativa. Regularize seu pagamento para continuar.',
      subscriptionStatus: req.user.subscriptionStatus,
      trialEndsAt: req.user.trialEndsAt
    });
  }

  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user && !req.roles) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.'
      });
    }

    const userRoles = req.roles || (req.user?.role ? [req.user.role] : []);
    if (!roles.some((role) => userRoles.includes(role))) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissão insuficiente.'
      });
    }
    next();
  };
};

/**
 * Middleware que exige onboarding completo
 * Usar em TODAS as rotas do dashboard para garantir que professor configurou tudo
 */
export const requireCompletedOnboarding = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado.'
    });
  }

  // Verificar se onboarding foi completado
  if (!req.user.onboardingCompletedAt) {
    return res.status(403).json({
      success: false,
      message: 'Complete o onboarding primeiro.',
      redirectTo: '/onboarding',
      needsOnboarding: true
    });
  }

  // Verificar se tem assinatura ativa (trialing ou active)
  if (!['trialing', 'active'].includes(req.user.subscriptionStatus)) {
    return res.status(403).json({
      success: false,
      message: 'Assinatura inativa. Regularize seu pagamento.',
      redirectTo: '/assinatura',
      subscriptionStatus: req.user.subscriptionStatus
    });
  }

  next();
};

// Rate limiter para tentativas de login
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

export const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `login:${ip}`;

  const attempts = loginAttempts.get(key);

  if (attempts) {
    const { count, lockedUntil } = attempts;

    if (lockedUntil && Date.now() < lockedUntil) {
      const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Muitas tentativas de login. Tente novamente em ${minutesLeft} minutos.`
      });
    }

    if (count >= MAX_LOGIN_ATTEMPTS) {
      loginAttempts.set(key, { count, lockedUntil: Date.now() + LOCKOUT_TIME });
      return res.status(429).json({
        success: false,
        message: 'Muitas tentativas de login. Conta temporariamente bloqueada.'
      });
    }
  }

  next();
};

export const recordLoginAttempt = (ip, success) => {
  const key = `login:${ip}`;

  if (success) {
    loginAttempts.delete(key);
    return;
  }

  const attempts = loginAttempts.get(key) || { count: 0, createdAt: Date.now() };
  loginAttempts.set(key, { count: attempts.count + 1, createdAt: attempts.createdAt || Date.now() });
};

// Limpeza periódica do Map para evitar memory leak (a cada 10 minutos)
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [key, value] of loginAttempts.entries()) {
    if (now - (value.createdAt || 0) > ONE_HOUR) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Sanitização de input
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Prevenir NoSQL injection
      if (key.startsWith('$') || key.includes('.')) {
        continue; // Ignorar keys suspeitas
      }

      if (typeof value === 'string') {
        // Remover caracteres potencialmente perigosos
        sanitized[key] = value
          .replace(/[<>]/g, '') // XSS básico
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};
