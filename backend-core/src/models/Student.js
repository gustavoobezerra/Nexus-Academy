import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Nome do aluno é obrigatório'], trim: true },
  email: { type: String, lowercase: true, trim: true },
  age: { type: Number, required: true },
  grade: { type: String, required: true, trim: true },
  subject: { type: String, trim: true },

  // Parent/Guardian
  parentName: { type: String, required: true, trim: true },
  parentEmail: { type: String, required: true, lowercase: true, trim: true },
  parentPhone: { type: String, required: true, trim: true },
  parentCPF: { type: String, trim: true },

  // Financial
  monthlyFee: { type: Number, required: true, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'late', 'overdue'], default: 'pending' },
  paymentDay: { type: Number, default: 10 },

  // Schedule
  preferredDays: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
  preferredTimes: [{ type: String }],
  nextClass: { type: String },

  // Progress
  performance: {
    overall: { type: Number, default: 0, min: 0, max: 100 },
    trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
    lastAssessment: Date,
    strengths: [{ type: String }],
    weaknesses: [{ type: String }]
  },

  // Profile & Goals
  profile: {
    description: { type: String, default: '', maxlength: 500 },
    avatar: { type: String, default: null },
    interests: [{ type: String }]
  },

  // Learning Goals
  goals: [{
    title: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
  }],

  // Onboarding Questionnaire (Sistema Inteligente por Matéria)
  onboarding: {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    subject: { type: String, trim: true }, // Matéria principal escolhida
    questionnaire: { type: Map, of: mongoose.Schema.Types.Mixed }, // Respostas dinâmicas do questionário
    answers: {
      learningPurpose: { type: String }, // Por que deseja aprender?
      currentLevel: { type: String, enum: ['beginner', 'elementary', 'basic', 'intermediate', 'upper_intermediate', 'advanced', 'fluent', 'none', 'fundamental', 'medio', 'vestibular', 'superior', 'concursos'] },
      targetTimeframe: { type: String }, // Em quanto tempo deseja aprender?
      studyHoursPerWeek: { type: Number }, // Quantas horas por semana pode estudar?
      preferredSchedule: { type: String, enum: ['morning', 'afternoon', 'evening', 'flexible'] },
      learningStyle: { type: String, enum: ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed', 'exercises', 'theory_first', 'projects', 'applied'] },
      previousExperience: { type: String }, // Já estudou antes?
      mainChallenges: [{ type: String }], // Quais suas maiores dificuldades?
      specificGoals: [{ type: String }] // Objetivos específicos
    }
  },

  // Gamification
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ name: String, earnedAt: Date, description: String }],
  streak: { current: { type: Number, default: 0 }, longest: { type: Number, default: 0 }, lastActivity: Date },

  // Portal Access
  portalAccess: {
    enabled: { type: Boolean, default: false },
    email: String,
    password: { type: String, select: false },
    lastLogin: Date
  },

  // Metadata
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  enrollmentDate: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

studentSchema.index({ teacher: 1 });
studentSchema.index({ active: 1 });
studentSchema.index({ paymentStatus: 1 });
studentSchema.index({ 'portalAccess.email': 1 });

// ÍNDICE COMPOSTO CRÍTICO PARA MULTI-TENANT
// Permite mesmo email em professores diferentes (isolamento total)
studentSchema.index({ teacher: 1, email: 1 }, { unique: true, sparse: true });

studentSchema.virtual('totalClasses', {
  ref: 'Class',
  localField: '_id',
  foreignField: 'student',
  count: true
});

// Aplicar plugin de isolamento automático multi-tenant
studentSchema.plugin(tenantAwarePlugin);

export default mongoose.model('Student', studentSchema);
