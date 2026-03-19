import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const learningSignalSchema = new mongoose.Schema({
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
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    default: null
  },
  pronunciationTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PronunciationTest',
    default: null
  },
  sourceType: {
    type: String,
    enum: ['activity', 'pronunciation', 'assessment', 'classroom'],
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['question_response', 'activity_submission', 'pronunciation_word', 'pronunciation_phrase', 'teacher_assessment'],
    required: true,
    index: true
  },
  subject: {
    type: String,
    trim: true,
    default: 'Geral',
    index: true
  },
  topic: {
    type: String,
    trim: true,
    default: 'Geral',
    index: true
  },
  difficulty: {
    type: String,
    trim: true,
    default: 'medium'
  },
  correctness: {
    type: Boolean,
    default: null
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  maxScore: {
    type: Number,
    min: 0,
    default: 100
  },
  signalWeight: {
    type: Number,
    min: 0.1,
    default: 1
  },
  metadata: {
    questionNumber: Number,
    answer: String,
    expectedAnswer: String,
    feedback: String,
    word: String,
    phrase: String,
    sourceId: String,
    tags: [String],
    details: mongoose.Schema.Types.Mixed
  },
  capturedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

learningSignalSchema.index({ teacher: 1, student: 1, capturedAt: -1 });
learningSignalSchema.index({ teacher: 1, student: 1, subject: 1, topic: 1, capturedAt: -1 });
learningSignalSchema.index({ teacher: 1, sourceType: 1, eventType: 1, capturedAt: -1 });

/**
 * Fonte canônica dos sinais de aprendizagem.
 *
 * Cada registro representa um evento granular do percurso do aluno
 * e serve como base para sugestões pedagógicas, insights e próximas automações.
 */
learningSignalSchema.plugin(tenantAwarePlugin);

export default mongoose.model('LearningSignal', learningSignalSchema);
