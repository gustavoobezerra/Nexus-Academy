import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { recordLoginAttempt } from '../middleware/auth.js';

const signToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Validação de senha forte
const validateStrongPassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Senha deve ter no mínimo 8 caracteres' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra maiúscula' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra minúscula' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um número' };
  }
  
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um símbolo (!@#$%^&*...)' };
  }
  
  return { valid: true };
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validar senha forte
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'Email já cadastrado.' 
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'teacher',
      status: 'pending_setup',
      subscriptionStatus: 'incomplete'
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        onboardingCompletedAt: user.onboardingCompletedAt,
        slug: user.slug,
        trialEndsAt: user.trialEndsAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erro ao criar usuário', 
      error: error.message 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email e senha são obrigatórios.' 
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Registrar tentativa falha de login
      const ip = req.ip || req.connection.remoteAddress;
      if (typeof recordLoginAttempt === 'function') {
        recordLoginAttempt(ip, false);
      }
      return res.status(401).json({ 
        success: false,
        message: 'Email ou senha incorretos.' 
      });
    }

    // Registrar tentativa bem-sucedida
    const ip = req.ip || req.connection.remoteAddress;
    if (typeof recordLoginAttempt === 'function') {
      recordLoginAttempt(ip, true);
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        onboardingCompletedAt: user.onboardingCompletedAt,
        slug: user.slug,
        trialEndsAt: user.trialEndsAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erro ao fazer login', 
      error: error.message 
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erro ao buscar usuário', 
      error: error.message 
    });
  }
};
