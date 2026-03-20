import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const activitySchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false,
    default: null
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['quiz', 'exercise', 'homework', 'test', 'practice'],
    default: 'exercise'
  },
  questions: [{
    questionNumber: Number,
    type: {
      type: String,
      enum: ['multiple_choice', 'essay', 'true_false', 'fill_blank', 'matching'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    points: {
      type: Number,
      default: 10
    },
    // Para múltipla escolha
    options: [{
      letter: String,
      text: String,
      isCorrect: Boolean
    }],
    // Resposta correta (para outros tipos)
    correctAnswer: String,
    // Explicação da resposta
    explanation: String,
    // Tópicos relacionados
    topics: [String]
  }],
  totalPoints: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'completed', 'graded'],
    default: 'draft'
  },
  dueDate: Date,
  submissions: [{
    submittedAt: {
      type: Date,
      default: Date.now
    },
    answers: [{
      questionNumber: Number,
      answer: String,
      isCorrect: Boolean,
      pointsEarned: Number,
      feedback: String
    }],
    score: Number,
    percentage: Number,
    autoGraded: {
      type: Boolean,
      default: false
    },
    gradedAt: Date,
    teacherFeedback: String
  }],
  generatedByAI: {
    type: Boolean,
    default: false
  },
  aiMetadata: {
    sourceTranscript: String,
    topics: [String],
    generatedAt: Date,
    providerMode: {
      type: String,
      enum: ['live', 'fallback'],
      default: 'fallback'
    },
    sourceType: {
      type: String,
      enum: ['class', 'manual'],
      default: 'manual'
    },
    batchId: String,
    targetMode: {
      type: String,
      enum: ['specific', 'group', 'all'],
      default: 'specific'
    },
    gradeLevel: String,
    learningObjective: String,
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para calcular totalPoints
activitySchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  this.updatedAt = new Date();
  next();
});

// Método para auto-corrigir questões objetivas
activitySchema.methods.autoGradeSubmission = function(submissionIndex = 0) {
  const submission = this.submissions[submissionIndex];
  if (!submission) {
    throw new Error('Submissão não encontrada');
  }

  let totalScore = 0;
  const gradedAnswers = submission.answers.map(answer => {
    const question = this.questions.find(q => q.questionNumber === answer.questionNumber);
    if (!question) return answer;

    let isCorrect = false;
    let pointsEarned = 0;

    if (question.type === 'multiple_choice') {
      const correctOption = question.options.find(opt => opt.isCorrect);
      isCorrect = correctOption && answer.answer === correctOption.letter;
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.type === 'true_false') {
      isCorrect = answer.answer.toLowerCase() === question.correctAnswer.toLowerCase();
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.type === 'fill_blank') {
      isCorrect = answer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      pointsEarned = isCorrect ? question.points : 0;
    }
    // Questões dissertativas precisam de correção manual

    totalScore += pointsEarned;

    return {
      ...answer.toObject(),
      isCorrect,
      pointsEarned,
      feedback: isCorrect ? 'Resposta correta!' : `Resposta incorreta. ${question.explanation || ''}`
    };
  });

  submission.answers = gradedAnswers;
  submission.score = totalScore;
  submission.percentage = this.totalPoints > 0 ? (totalScore / this.totalPoints) * 100 : 0;
  submission.autoGraded = true;
  submission.gradedAt = new Date();

  return this.save();
};

// Método para gerar atividades com IA (mock - integração futura)
activitySchema.statics.generateFromTranscript = async function(classId, transcript, topics) {
  // Esta função seria integrada com IA real
  // Por enquanto, retorna uma estrutura mock

  const questions = topics.map((topic, index) => ({
    questionNumber: index + 1,
    type: 'multiple_choice',
    question: `Sobre ${topic}, qual das alternativas está correta?`,
    difficulty: 'medium',
    points: 10,
    options: [
      { letter: 'A', text: 'Opção A', isCorrect: true },
      { letter: 'B', text: 'Opção B', isCorrect: false },
      { letter: 'C', text: 'Opção C', isCorrect: false },
      { letter: 'D', text: 'Opção D', isCorrect: false }
    ],
    explanation: `A opção correta é A porque...`,
    topics: [topic]
  }));

  return {
    title: 'Atividade gerada automaticamente',
    description: 'Questões baseadas na transcrição da aula',
    type: 'exercise',
    questions,
    status: 'draft',
    generatedByAI: true,
    aiMetadata: {
      sourceTranscript: transcript,
      topics,
      generatedAt: new Date(),
      reviewed: false
    }
  };
};

activitySchema.plugin(tenantAwarePlugin);

export default mongoose.model('Activity', activitySchema);
