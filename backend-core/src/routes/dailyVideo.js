import express from 'express';
import Class from '../models/Class.js';
import { authenticateOptional } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateOptional);

// Daily.co API configuration
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

if (!DAILY_API_KEY) {
  console.warn('[DailyVideo] DAILY_API_KEY não configurada — endpoints operando em modo simulado. Salas e tokens gerados NÃO são reais.');
}

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
    const requestError = new Error(error.info || error.error || `Daily API error: ${response.status}`);
    requestError.status = response.status;
    throw requestError;
  }

  return response.json();
}

const isTeacherActor = (req) =>
  Array.isArray(req.roles) && req.roles.some((role) => role === 'teacher' || role === 'admin');

const getActorId = (req) =>
  req.user?._id?.toString?.() || req.userId?.toString?.() || req.studentId?.toString?.() || null;

const getActorDisplayName = (req, providedName) => {
  if (typeof providedName === 'string' && providedName.trim()) {
    return providedName.trim().slice(0, 100);
  }

  if (req.user?.name) {
    return req.user.name;
  }

  return isTeacherActor(req) ? 'Professor' : 'Aluno';
};

const buildRoomName = (classId) => `nexus-class-${String(classId).toLowerCase()}`;

const parseClassIdFromRoomName = (roomName) => {
  if (typeof roomName !== 'string') {
    return null;
  }

  const match = roomName.match(/^nexus-class-([a-f0-9]{24})$/i);
  return match ? match[1].toLowerCase() : null;
};

const ensureAuthenticated = (req, res) => {
  if (getActorId(req)) {
    return true;
  }

  res.status(401).json({
    success: false,
    message: 'Autenticacao obrigatoria'
  });
  return false;
};

const ensureTeacher = (req, res) => {
  if (!ensureAuthenticated(req, res)) {
    return false;
  }

  if (isTeacherActor(req)) {
    return true;
  }

  res.status(403).json({
    success: false,
    message: 'Apenas professores podem executar esta acao'
  });
  return false;
};

const getAccessibleClass = async (req, classId) => {
  if (!classId) {
    return null;
  }

  const actorId = getActorId(req);
  if (!actorId) {
    return null;
  }

  const query = isTeacherActor(req)
    ? { _id: classId, teacher: actorId }
    : { _id: classId, student: actorId };

  return Class.findOne(query).select('title teacher student status meetingLink');
};

const getAccessibleClassByRoomName = async (req, roomName) => {
  const classId = parseClassIdFromRoomName(roomName);
  if (!classId) {
    return null;
  }

  return getAccessibleClass(req, classId);
};

async function getOrCreateRoom(roomName, expiry) {
  try {
    return await dailyFetch(`/rooms/${roomName}`);
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }

  try {
    return await dailyFetch('/rooms', {
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
          enable_prejoin_ui: false,
          enable_network_ui: true
        }
      })
    });
  } catch (error) {
    if (error.status === 409) {
      return dailyFetch(`/rooms/${roomName}`);
    }
    throw error;
  }
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
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const { classId, expiryMinutes = 120 } = req.body;
    const classData = await getAccessibleClass(req, classId);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Aula nao encontrada ou acesso negado'
      });
    }

    const roomName = buildRoomName(classData._id);
    const expiry = Math.floor(Date.now() / 1000) + (Number(expiryMinutes || 120) * 60);

    // Verificar se Daily.co está configurado
    if (!DAILY_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Daily.co indisponivel. Configure DAILY_API_KEY ou use o provedor padrao.'
      });
    }

    // Criar sala no Daily.co
    const room = await getOrCreateRoom(roomName, expiry);

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
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const { roomName, classId, isOwner = false, userName } = req.body;
    const classData = await getAccessibleClass(req, classId);
    const actorId = getActorId(req);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Aula nao encontrada ou acesso negado'
      });
    }

    const normalizedRoomName = buildRoomName(classData._id);

    if (roomName && roomName !== normalizedRoomName) {
      return res.status(400).json({
        success: false,
        message: 'Sala invalida para esta aula'
      });
    }

    const ownerToken = Boolean(isOwner) && isTeacherActor(req);

    // Verificar se Daily.co está configurado
    if (!DAILY_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Daily.co indisponivel. Configure DAILY_API_KEY ou use o provedor padrao.'
      });
    }

    // Determinar nome de exibição
    const displayName = getActorDisplayName(req, userName);

    // Configurar permissões baseadas no tipo de usuário
    const tokenConfig = {
      properties: {
        room_name: normalizedRoomName,
        user_name: displayName,
        user_id: actorId,
        is_owner: ownerToken,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        // Permissões de proprietário (professor)
        ...(ownerToken && {
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
      roomName: normalizedRoomName,
      userName: displayName,
      isOwner: ownerToken
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
    if (!ensureAuthenticated(req, res)) {
      return;
    }

    const classData = await getAccessibleClassByRoomName(req, req.params.roomName);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Sala nao encontrada ou acesso negado'
      });
    }

    if (!DAILY_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Daily.co indisponivel. Configure DAILY_API_KEY ou use o provedor padrao.'
      });
    }

    const roomName = buildRoomName(classData._id);

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
    if (!ensureTeacher(req, res)) {
      return;
    }

    const classData = await getAccessibleClassByRoomName(req, req.params.roomName);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Sala nao encontrada ou acesso negado'
      });
    }

    if (!DAILY_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Daily.co indisponivel. Configure DAILY_API_KEY ou use o provedor padrao.'
      });
    }

    const roomName = buildRoomName(classData._id);

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

