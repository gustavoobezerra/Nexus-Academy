import mongoose from 'mongoose';

const pronunciationTestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phrase: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'proficient'],
    default: 'intermediate'
  },
  accuracyScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  fluencyScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  pronunciationScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  feedback: {
    type: String,
    trim: true
  },
  wordScores: [{
    word: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    phonetic: {
      type: String
    },
    phonemes: [{
      type: String
    }]
  }],
  audioUrl: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índice composto para queries eficientes
pronunciationTestSchema.index({ teacher: 1, student: 1, createdAt: -1 });
pronunciationTestSchema.index({ teacher: 1, difficulty: 1 });

// Virtual para calcular porcentagem
pronunciationTestSchema.virtual('scorePercentage').get(function() {
  return Math.round(this.pronunciationScore * 100);
});

// Método para obter estatísticas do aluno
pronunciationTestSchema.statics.getStudentStats = async function(studentId, teacherId) {
  const stats = await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        teacher: new mongoose.Types.ObjectId(teacherId)
      }
    },
    {
      $group: {
        _id: null,
        totalTests: { $sum: 1 },
        avgAccuracy: { $avg: '$accuracyScore' },
        avgFluency: { $avg: '$fluencyScore' },
        avgPronunciation: { $avg: '$pronunciationScore' },
        bestScore: { $max: '$pronunciationScore' },
        latestTest: { $max: '$createdAt' }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : null;
};

// Método para obter progresso por dificuldade
pronunciationTestSchema.statics.getProgressByDifficulty = async function(studentId, teacherId) {
  return await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        teacher: new mongoose.Types.ObjectId(teacherId)
      }
    },
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
        avgScore: { $avg: '$pronunciationScore' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const PronunciationTest = mongoose.model('PronunciationTest', pronunciationTestSchema);

export default PronunciationTest;
