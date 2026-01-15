import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authorize, protect, loginRateLimiter, recordLoginAttempt } from '../middleware/auth.js';
import User from '../models/User.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting para registro
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de registro. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, authorize('teacher', 'admin'), getMe);

// Atualizar perfil do professor
router.put('/profile', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { name, email, phone, bio, subjects, slug } = req.body;

    // Validações
    if (name && (typeof name !== 'string' || name.length < 2 || name.length > 100)) {
      return res.status(400).json({ success: false, message: 'Nome inválido' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

    if (slug) {
      // Verificar se slug já existe (diferente do usuário atual)
      const existingSlug = await User.findOne({ slug, _id: { $ne: req.user.id } });
      if (existingSlug) {
        return res.status(400).json({ success: false, message: 'Este link já está em uso' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (subjects !== undefined) updateData.subjects = subjects;
    if (slug) updateData.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true })
      .select('-password -gatewayCredentials');

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
  }
});

// Atualizar configurações de pagamento
router.put('/payment-settings', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { paymentMethod, manualPaymentType, pixKey, pixKeyType } = req.body;

    const updateData = {};

    if (paymentMethod) {
      if (!['manual', 'automatic', 'pending'].includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: 'Método de pagamento inválido' });
      }
      updateData.paymentMethod = paymentMethod;
    }

    if (manualPaymentType) {
      if (!['pix_in_system', 'external'].includes(manualPaymentType)) {
        return res.status(400).json({ success: false, message: 'Tipo de pagamento manual inválido' });
      }
      updateData.manualPaymentType = manualPaymentType;
    }

    if (pixKey !== undefined) updateData.pixKey = pixKey;
    if (pixKeyType !== undefined) {
      if (pixKeyType && !['cpf', 'cnpj', 'email', 'phone', 'random'].includes(pixKeyType)) {
        return res.status(400).json({ success: false, message: 'Tipo de chave PIX inválido' });
      }
      updateData.pixKeyType = pixKeyType;
    }

    await User.findByIdAndUpdate(req.user.id, updateData);

    res.json({
      success: true,
      message: 'Configurações de pagamento atualizadas'
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de pagamento:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar configurações' });
  }
});

// Atualizar preferências de notificação
router.put('/notification-settings', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json({ success: false, message: 'Dados de notificação inválidos' });
    }

    const updateData = {
      'settings.notifications.email': !!notifications.email,
      'settings.notifications.whatsapp': !!notifications.whatsapp,
      'settings.notifications.sms': !!notifications.sms,
      'settings.notifications.push': !!notifications.push
    };

    await User.findByIdAndUpdate(req.user.id, { $set: updateData });

    res.json({
      success: true,
      message: 'Preferências de notificação atualizadas'
    });
  } catch (error) {
    console.error('Erro ao atualizar preferências:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar preferências' });
  }
});

// Rota pública para buscar professor por slug (para cadastro de aluno)
router.get('/teacher/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug || slug.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Slug inválido'
      });
    }

    const teacher = await User.findOne({ slug: slug.toLowerCase(), role: 'teacher' })
      .select('name email slug subscriptionStatus status');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Professor não encontrado'
      });
    }

    // Verificar se o professor está ativo (permitir mais status durante desenvolvimento)
    const allowedStatuses = ['active', 'trialing', 'incomplete', null, undefined];
    if (!allowedStatuses.includes(teacher.subscriptionStatus)) {
      return res.status(403).json({
        success: false,
        message: 'Este professor não está aceitando novos alunos no momento'
      });
    }

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        slug: teacher.slug
      }
    });
  } catch (error) {
    console.error('Erro ao buscar professor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar professor'
    });
  }
});

export default router;
