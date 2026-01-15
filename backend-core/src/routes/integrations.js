import express from 'express';
import User from '../models/User.js';
import { authorize, protect } from '../middleware/auth.js';
import stripeService from '../services/stripeService.js';
import googleCalendarService from '../services/googleCalendarService.js';
import zoomService from '../services/zoomService.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

// ========== STATUS ==========

router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      integrations: {
        stripe: { connected: user.integrations?.stripe?.connected || false, configured: stripeService.isConfigured() },
        google: { connected: user.integrations?.google?.connected || false, configured: googleCalendarService.isConfigured() },
        zoom: { connected: user.integrations?.zoom?.connected || false, configured: zoomService.isConfigured() },
        whatsapp: { connected: user.integrations?.whatsapp?.verified || false }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STRIPE ==========

router.get('/stripe/connect', async (req, res) => {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(400).json({ success: false, message: 'Stripe não configurado' });
    }

    const user = await User.findById(req.user._id);
    if (!user.integrations?.stripe?.accountId) {
      const account = await stripeService.createConnectAccount({ email: user.email });
      user.integrations = user.integrations || {};
      user.integrations.stripe = { accountId: account.id };
      await user.save();
    }

    const accountLink = await stripeService.createAccountLink(
      user.integrations.stripe.accountId,
      `${process.env.FRONTEND_URL}/settings/integrations?stripe=refresh`,
      `${process.env.FRONTEND_URL}/settings/integrations?stripe=success`
    );

    res.json({ success: true, url: accountLink.url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/stripe/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { 'integrations.stripe': { connected: false } });
    res.json({ success: true, message: 'Stripe desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GOOGLE CALENDAR ==========

router.get('/google/auth-url', (req, res) => {
  try {
    if (!googleCalendarService.isConfigured()) {
      return res.status(400).json({ success: false, message: 'Google não configurado' });
    }
    const url = googleCalendarService.getAuthUrl();
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const tokens = await googleCalendarService.getTokens(code);

    await User.findByIdAndUpdate(req.user._id, {
      'integrations.google': {
        connected: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      }
    });

    res.json({ success: true, message: 'Google Calendar conectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/google/calendars', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.integrations?.google?.connected) {
      return res.status(400).json({ success: false, message: 'Google não conectado' });
    }

    const calendars = await googleCalendarService.listCalendars({
      access_token: user.integrations.google.accessToken,
      refresh_token: user.integrations.google.refreshToken
    });

    res.json({ success: true, calendars });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/google/set-calendar', async (req, res) => {
  try {
    const { calendarId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { 'integrations.google.calendarId': calendarId });
    res.json({ success: true, message: 'Calendário definido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/google/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { 'integrations.google': { connected: false } });
    res.json({ success: true, message: 'Google desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ZOOM ==========

router.get('/zoom/auth-url', (req, res) => {
  try {
    if (!zoomService.isConfigured()) {
      return res.status(400).json({ success: false, message: 'Zoom não configurado' });
    }
    const state = Buffer.from(JSON.stringify({ userId: req.user._id })).toString('base64');
    const url = zoomService.getAuthUrl(`${process.env.API_URL}/api/integrations/zoom/callback`, state);
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/zoom/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const tokens = await zoomService.getAccessToken(code, `${process.env.API_URL}/api/integrations/zoom/callback`);
    const userInfo = await zoomService.getUser(tokens.access_token);

    await User.findByIdAndUpdate(req.user._id, {
      'integrations.zoom': {
        connected: true,
        userId: userInfo?.id,
        accessToken: tokens.access_token
      }
    });

    res.json({ success: true, message: 'Zoom conectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/zoom/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { 'integrations.zoom': { connected: false } });
    res.json({ success: true, message: 'Zoom desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/zoom/create-meeting', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.integrations?.zoom?.connected) {
      return res.status(400).json({ success: false, message: 'Zoom não conectado' });
    }

    const meeting = await zoomService.createMeeting(user.integrations.zoom.accessToken, req.body);
    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== WHATSAPP ==========

router.post('/whatsapp/verify', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Validar formato do telefone
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ success: false, message: 'Número de telefone é obrigatório' });
    }
    
    // Limpar número - apenas dígitos
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return res.status(400).json({ success: false, message: 'Número de telefone inválido' });
    }
    
    // Gerar código de verificação seguro
    const crypto = await import('crypto');
    const verificationCode = crypto.default.randomInt(100000, 999999).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    // Salvar código e telefone
    await User.findByIdAndUpdate(req.user._id, {
      'integrations.whatsapp': { 
        phoneNumber: cleanPhone, 
        verified: false,
        verificationCode: verificationCode,
        verificationExpiry: expiryTime
      }
    });
    
    // TODO: Em produção, enviar código via WhatsApp API
    // whatsappService.sendVerificationCode(cleanPhone, verificationCode);
    // DEBUG: console.log(`[DEV] Código de verificação WhatsApp para ${cleanPhone}: ${verificationCode}`);
    
    res.json({ 
      success: true, 
      message: 'Código de verificação enviado',
      // Apenas em desenvolvimento - remover em produção
      ...(process.env.NODE_ENV === 'development' && { devCode: verificationCode })
    });
  } catch (error) {
    console.error('WhatsApp verify error:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar código' });
  }
});

router.post('/whatsapp/confirm', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ success: false, message: 'Código inválido' });
    }
    
    // Buscar código de verificação salvo no usuário
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    
    const storedCode = user.integrations?.whatsapp?.verificationCode;
    const codeExpiry = user.integrations?.whatsapp?.verificationExpiry;
    
    // Verificar se código existe e não expirou
    if (!storedCode || !codeExpiry || Date.now() > new Date(codeExpiry).getTime()) {
      return res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo código.' });
    }
    
    // Comparar código (timing-safe)
    const crypto = await import('crypto');
    const isValid = crypto.default.timingSafeEqual(
      Buffer.from(code.padEnd(6, '0')),
      Buffer.from(storedCode.padEnd(6, '0'))
    );
    
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Código incorreto' });
    }
    
    // Código válido - marcar como verificado e limpar código
    await User.findByIdAndUpdate(req.user._id, { 
      'integrations.whatsapp.verified': true,
      'integrations.whatsapp.verificationCode': null,
      'integrations.whatsapp.verificationExpiry': null
    });
    
    res.json({ success: true, message: 'WhatsApp verificado' });
  } catch (error) {
    console.error('WhatsApp confirm error:', error);
    res.status(500).json({ success: false, message: 'Erro ao verificar código' });
  }
});

router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { 'integrations.whatsapp': { verified: false } });
    res.json({ success: true, message: 'WhatsApp desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
