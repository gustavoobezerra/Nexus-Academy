import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

// Daily.co API configuration
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

/**
 * Helper function to make Daily.co API calls
 */
async function dailyFetch(endpoint, options = {}) {
  const url = `${DAILY_API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.info || error.error || `Daily API error: ${response.status}`);
  }

  return response.json();
}

/**
 * @swagger
 * /api/daily/create-room:
 *   post:
 *     summary: Cria uma sala de videoconferência no Daily.co
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classId
 *               - className
 *             properties:
 *               classId:
 *                 type: string
 *               className:
 *                 type: string
 *               expiryMinutes:
 *                 type: number
 *                 default: 120
 *     responses:
 *       200:
 *         description: Sala criada com sucesso
 */
router.post('/create-room', async (req, res) => {
  try {
    // Verificar se Daily.co está configurado
    if (!DAILY_API_KEY) {
      // Modo fallback sem Daily.co configurado
      const roomName = `nexus-${req.user._id}-${Date.now()}`;
      return res.json({
        success: true,
        room: {
          name: roomName,
          url: `https://nexus-academy.daily.co/${roomName}`,
          id: roomName,
          privacy: 'private'
        },
        message: 'Sala criada em modo simulado (configure DAILY_API_KEY para produção)'
      });
    }

    const { classId, className, expiryMinutes = 120 } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'ID da aula é obrigatório'
      });
    }

    // Criar nome único para a sala
    const roomName = `nexus-${req.user._id.toString().slice(-8)}-${classId.toString().slice(-8)}-${Date.now().toString().slice(-6)}`;

    // Calcular expiração
    const expiry = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

    // Criar sala no Daily.co
    const room = await dailyFetch('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp: expiry,
          eject_at_room_exp: true,
          max_participants: 10,
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: true,
          start_video_off: false,
          start_audio_off: false,
          lang: 'pt',
          // Configurações de gravação (requer plano pago)
          // enable_recording: 'cloud',
          // Configurações de qualidade
          enable_prejoin_ui: false, // Desabilita tela de entrada para SSO
          enable_network_ui: true
        }
      })
    });

    res.json({
      success: true,
      room: {
        name: room.name,
        url: room.url,
        id: room.id,
        privacy: room.privacy,
        expiresAt: new Date(expiry * 1000).toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar sala de vídeo'
    });
  }
});

/**
 * @swagger
 * /api/daily/create-token:
 *   post:
 *     summary: Cria um token de acesso para a sala
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *             properties:
 *               roomName:
 *                 type: string
 *               isOwner:
 *                 type: boolean
 *                 default: false
 *               userName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token criado com sucesso
 */
router.post('/create-token', async (req, res) => {
  try {
    // Verificar se Daily.co está configurado
    if (!DAILY_API_KEY) {
      // Modo fallback
      return res.json({
        success: true,
        token: `demo-token-${Date.now()}`,
        message: 'Token simulado (configure DAILY_API_KEY para produção)'
      });
    }

    const { roomName, isOwner = false, userName } = req.body;

    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'Nome da sala é obrigatório'
      });
    }

    // Determinar nome de exibição
    const displayName = userName || req.user.name || 'Participante';

    // Configurar permissões baseadas no tipo de usuário
    const tokenConfig = {
      properties: {
        room_name: roomName,
        user_name: displayName,
        user_id: req.user._id.toString(),
        is_owner: isOwner,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        // Permissões de proprietário (professor)
        ...(isOwner && {
          enable_recording: true,
          enable_transcription: true
        })
      }
    };

    // Criar token no Daily.co
    const tokenResponse = await dailyFetch('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify(tokenConfig)
    });

    res.json({
      success: true,
      token: tokenResponse.token,
      roomName,
      userName: displayName,
      isOwner
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar token de acesso'
    });
  }
});

/**
 * @swagger
 * /api/daily/room-info/{roomName}:
 *   get:
 *     summary: Obtém informações de uma sala
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Informações da sala
 */
router.get('/room-info/:roomName', async (req, res) => {
  try {
    if (!DAILY_API_KEY) {
      return res.json({
        success: true,
        room: {
          name: req.params.roomName,
          url: `https://nexus-academy.daily.co/${req.params.roomName}`,
          privacy: 'private',
          participants: 0
        }
      });
    }

    const { roomName } = req.params;

    const room = await dailyFetch(`/rooms/${roomName}`);

    res.json({
      success: true,
      room: {
        name: room.name,
        url: room.url,
        id: room.id,
        privacy: room.privacy,
        createdAt: room.created_at
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações da sala'
    });
  }
});

/**
 * @swagger
 * /api/daily/delete-room/{roomName}:
 *   delete:
 *     summary: Deleta uma sala
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sala deletada com sucesso
 */
router.delete('/delete-room/:roomName', async (req, res) => {
  try {
    if (!DAILY_API_KEY) {
      return res.json({
        success: true,
        message: 'Sala deletada (modo simulado)'
      });
    }

    const { roomName } = req.params;

    await dailyFetch(`/rooms/${roomName}`, {
      method: 'DELETE'
    });

    res.json({
      success: true,
      message: 'Sala deletada com sucesso'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar sala'
    });
  }
});

export default router;

