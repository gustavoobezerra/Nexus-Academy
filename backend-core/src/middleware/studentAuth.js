import jwt from 'jsonwebtoken';
import { tenantContext } from './tenantAware.js';

const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return secret;
};

export const authenticateStudent = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret());
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Sessão expirada. Faça login novamente.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (decoded.type !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    if (!decoded.studentId || typeof decoded.studentId !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Token malformado'
      });
    }

    req.studentId = decoded.studentId;
    req.teacherId = decoded.teacherId;

    return tenantContext.run({ teacherId: decoded.teacherId?.toString() }, () => next());
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Erro de autenticação'
    });
  }
};

export default {
  authenticateStudent
};
