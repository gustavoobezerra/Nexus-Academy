import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import PronunciationPhrase from '../models/PronunciationPhrase.js';
import cloudinaryService from '../services/cloudinaryService.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
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

router.post('/phrases', protect, authorize('teacher', 'admin'), upload.single('audio'), async (req, res) => {
  try {
    const { phrase, difficulty = 'intermediate', active = true } = req.body;

    if (!phrase) {
      return res.status(400).json({
        success: false,
        message: 'Frase é obrigatória'
      });
    }

    let audioUrl = null;
    if (req.file) {
      try {
        const uploadResult = await cloudinaryService.uploadAudioBuffer(req.file.buffer, {
          folder: 'nexus-academy/pronunciation/teacher',
          tags: ['pronunciation', 'teacher']
        });
        audioUrl = uploadResult?.url || null;
      } catch (uploadError) {
        console.warn('⚠️ Falha ao salvar áudio do professor:', uploadError.message);
      }
    }

    if (active) {
      await PronunciationPhrase.updateMany(
        { teacher: req.user._id, difficulty },
        { $set: { active: false } }
      );
    }

    const phraseDoc = await PronunciationPhrase.create({
      teacher: req.user._id,
      phrase,
      difficulty,
      audioUrl,
      source: 'teacher',
      active: Boolean(active)
    });

    return res.status(201).json({
      success: true,
      data: phraseDoc
    });
  } catch (error) {
    console.error('Erro ao criar frase de pronúncia:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar frase de pronúncia'
    });
  }
});

router.get('/phrases', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const phrases = await PronunciationPhrase.find({ teacher: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, data: phrases });
  } catch (error) {
    console.error('Erro ao listar frases de pronúncia:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar frases de pronúncia'
    });
  }
});

export default router;
