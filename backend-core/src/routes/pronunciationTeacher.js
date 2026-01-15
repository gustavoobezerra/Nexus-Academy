import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import PronunciationPhrase from '../models/PronunciationPhrase.js';
import PronunciationTest from '../models/PronunciationTest.js';
import cloudinaryService from '../services/cloudinaryService.js';
import { generatePhrase } from '../services/pronunciationService.js';

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

router.post('/phrases/generate', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { difficulty } = req.body || {};
    const result = await generatePhrase(difficulty);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erro ao gerar frase de pron£ncia:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar frase de pron£ncia'
    });
  }
});

// Update phrase
router.put('/phrases/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { phrase, difficulty, active } = req.body;

    const phraseDoc = await PronunciationPhrase.findOne({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!phraseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Phrase not found'
      });
    }

    if (phrase) phraseDoc.phrase = phrase;
    if (difficulty) phraseDoc.difficulty = difficulty;
    if (active !== undefined) phraseDoc.active = Boolean(active);

    // If activating this phrase, deactivate others with same difficulty
    if (active) {
      await PronunciationPhrase.updateMany(
        {
          teacher: req.user._id,
          difficulty: phraseDoc.difficulty,
          _id: { $ne: phraseDoc._id }
        },
        { $set: { active: false } }
      );
    }

    await phraseDoc.save();

    return res.json({ success: true, data: phraseDoc });
  } catch (error) {
    console.error('Error updating phrase:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating phrase'
    });
  }
});

// Delete phrase
router.delete('/phrases/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const phraseDoc = await PronunciationPhrase.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!phraseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Phrase not found'
      });
    }

    return res.json({
      success: true,
      message: 'Phrase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting phrase:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting phrase'
    });
  }
});

// Get student pronunciation tests (teacher view)
router.get('/tests', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId, difficulty, limit = 20 } = req.query;

    const query = { teacher: req.user._id };
    if (studentId) query.student = studentId;
    if (difficulty) query.difficulty = difficulty;

    const tests = await PronunciationTest.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.json({ success: true, data: tests });
  } catch (error) {
    console.error('Error fetching tests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pronunciation tests'
    });
  }
});

// Get aggregated pronunciation statistics for all students
router.get('/stats', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const PronunciationTest = (await import('../models/PronunciationTest.js')).default;

    const overallStats = await PronunciationTest.aggregate([
      { $match: { teacher: req.user._id } },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracyScore' },
          avgFluency: { $avg: '$fluencyScore' },
          avgPronunciation: { $avg: '$pronunciationScore' }
        }
      }
    ]);

    const byDifficulty = await PronunciationTest.aggregate([
      { $match: { teacher: req.user._id } },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          avgScore: { $avg: '$pronunciationScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topStudents = await PronunciationTest.aggregate([
      { $match: { teacher: req.user._id } },
      {
        $group: {
          _id: '$student',
          testsCount: { $sum: 1 },
          avgScore: { $avg: '$pronunciationScore' }
        }
      },
      { $sort: { avgScore: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $project: {
          studentId: '$_id',
          studentName: '$studentInfo.name',
          testsCount: 1,
          avgScore: { $round: ['$avgScore', 2] }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        overall: overallStats[0] || {},
        byDifficulty,
        topStudents
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pronunciation statistics'
    });
  }
});

export default router;
