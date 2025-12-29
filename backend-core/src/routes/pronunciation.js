import express from 'express';
import multer from 'multer';
import PronunciationTest from '../models/PronunciationTest.js';
import { generatePhrase, analyzePronunciation } from '../services/pronunciationService.js';

const router = express.Router();

// Configurar multer para upload de áudio
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de áudio não suportado. Use webm, wav, mp3 ou ogg.'));
    }
  }
});

// Middleware de autenticação do aluno
const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Aqui você deve validar o token JWT e extrair o studentId
    // Por enquanto, vamos assumir que o token é válido
    // Em produção, use jwt.verify() aqui
    
    // Exemplo simplificado:
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.studentId = decoded.studentId;
    // req.teacherId = decoded.teacherId;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

/**
 * @swagger
 * /api/portal/pronunciation/generate:
 *   post:
 *     summary: Gera uma frase para teste de pronúncia
 *     tags: [Pronunciation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, elementary, intermediate, upper-intermediate, advanced, proficient]
 *     responses:
 *       200:
 *         description: Frase gerada com sucesso
 */
router.post('/generate', authenticateStudent, async (req, res) => {
  try {
    const { difficulty = 'intermediate' } = req.body;

    const result = await generatePhrase(difficulty);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao gerar frase:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar frase para teste de pronúncia'
    });
  }
});

/**
 * @swagger
 * /api/portal/pronunciation/analyze:
 *   post:
 *     summary: Analisa a pronúncia do áudio enviado
 *     tags: [Pronunciation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *               - originalPhrase
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               originalPhrase:
 *                 type: string
 *     responses:
 *       200:
 *         description: Análise concluída com sucesso
 */
router.post('/analyze', authenticateStudent, upload.single('audio'), async (req, res) => {
  try {
    const { originalPhrase } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo de áudio não fornecido'
      });
    }

    if (!originalPhrase) {
      return res.status(400).json({
        success: false,
        message: 'Frase original não fornecida'
      });
    }

    const audioBuffer = req.file.buffer;

    const analysis = await analyzePronunciation({
      audioBuffer,
      originalPhrase
    });

    res.json({
      success: true,
      data: {
        analysis
      }
    });
  } catch (error) {
    console.error('Erro ao analisar pronúncia:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao analisar pronúncia'
    });
  }
});

/**
 * @swagger
 * /api/portal/pronunciation/history:
 *   post:
 *     summary: Salva o resultado do teste no histórico
 *     tags: [Pronunciation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phrase
 *               - difficulty
 *               - accuracyScore
 *               - fluencyScore
 *               - pronunciationScore
 *             properties:
 *               phrase:
 *                 type: string
 *               difficulty:
 *                 type: string
 *               accuracyScore:
 *                 type: number
 *               fluencyScore:
 *                 type: number
 *               pronunciationScore:
 *                 type: number
 *               feedback:
 *                 type: string
 *               wordScores:
 *                 type: array
 *     responses:
 *       201:
 *         description: Resultado salvo com sucesso
 */
router.post('/history', authenticateStudent, async (req, res) => {
  try {
    const {
      phrase,
      difficulty,
      accuracyScore,
      fluencyScore,
      pronunciationScore,
      feedback,
      wordScores
    } = req.body;

    // Validação básica
    if (!phrase || !difficulty || accuracyScore === undefined || fluencyScore === undefined || pronunciationScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Dados incompletos para salvar o teste'
      });
    }

    // Aqui você deve pegar o studentId e teacherId do token
    // Por enquanto, vamos usar valores de exemplo
    const studentId = req.studentId; // Deve vir do middleware de autenticação
    const teacherId = req.teacherId; // Deve vir do middleware de autenticação

    const pronunciationTest = new PronunciationTest({
      student: studentId,
      teacher: teacherId,
      phrase,
      difficulty,
      accuracyScore,
      fluencyScore,
      pronunciationScore,
      feedback,
      wordScores: wordScores || []
    });

    await pronunciationTest.save();

    res.status(201).json({
      success: true,
      message: 'Resultado salvo com sucesso',
      data: {
        id: pronunciationTest._id,
        scorePercentage: pronunciationTest.scorePercentage
      }
    });
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar resultado do teste'
    });
  }
});

/**
 * @swagger
 * /api/portal/pronunciation/history:
 *   get:
 *     summary: Obtém o histórico de testes do aluno
 *     tags: [Pronunciation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Histórico obtido com sucesso
 */
router.get('/history', authenticateStudent, async (req, res) => {
  try {
    const { limit = 10, difficulty } = req.query;
    const studentId = req.studentId;
    const teacherId = req.teacherId;

    const query = {
      student: studentId,
      teacher: teacherId
    };

    if (difficulty) {
      query.difficulty = difficulty;
    }

    const tests = await PronunciationTest.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    const stats = await PronunciationTest.getStudentStats(studentId, teacherId);

    res.json({
      success: true,
      data: {
        tests,
        stats
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de testes'
    });
  }
});

/**
 * @swagger
 * /api/portal/pronunciation/stats:
 *   get:
 *     summary: Obtém estatísticas do aluno
 *     tags: [Pronunciation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 */
router.get('/stats', authenticateStudent, async (req, res) => {
  try {
    const studentId = req.studentId;
    const teacherId = req.teacherId;

    const stats = await PronunciationTest.getStudentStats(studentId, teacherId);
    const progressByDifficulty = await PronunciationTest.getProgressByDifficulty(studentId, teacherId);

    res.json({
      success: true,
      data: {
        overall: stats,
        byDifficulty: progressByDifficulty
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas'
    });
  }
});

export default router;
