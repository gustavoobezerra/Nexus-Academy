import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const classSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Título da aula é obrigatório'], trim: true },
  description: { type: String, trim: true },
  subject: { type: String, trim: true },
  grade: { type: String, trim: true },
  topic: { type: String, trim: true },

  // Participants
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String },

  // Course (if part of a course)
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  moduleIndex: { type: Number },
  lessonIndex: { type: Number },

  // Scheduling
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, required: true, default: 60 },
  actualDuration: { type: Number },
  startedAt: Date,
  endedAt: Date,
  recurrence: { type: { type: String, enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly'], default: 'none' }, endDate: Date, exceptions: [Date] },

  // Status
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  isLive: { type: Boolean, default: false },
  cancellationReason: String,

  // Meeting
  meetingLink: { type: String },
  meetingProvider: { type: String, enum: ['internal', 'zoom', 'meet', 'teams'], default: 'internal' },
  zoomMeetingId: String,
  recordingUrl: String,

  // Content
  transcript: { type: String, default: '' },
  aiSummary: { type: String, default: '' },
  notes: { type: String, default: '' },
  homework: [{ title: String, description: String, dueDate: Date, completed: { type: Boolean, default: false } }],

  // AI Features
  lessonPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonPreparation' },
  aiInsights: { difficulty: { type: Number, min: 1, max: 10 }, engagement: { type: Number, min: 0, max: 100 }, keyTopics: [String], suggestedNextTopics: [String] },

  // Assessment
  assessmentScore: { type: Number, min: 0, max: 100 },
  studentFeedback: { rating: { type: Number, min: 1, max: 5 }, comment: String, submittedAt: Date },
  teacherNotes: String,

  // Calendar sync
  googleEventId: String,
  outlookEventId: String
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Índices simples
classSchema.index({ teacher: 1 });
classSchema.index({ student: 1 });
classSchema.index({ scheduledAt: 1 });
classSchema.index({ status: 1 });
classSchema.index({ course: 1 });

// Índices compostos para queries comuns (melhor performance)
classSchema.index({ teacher: 1, status: 1, scheduledAt: 1 }); // Aulas do professor por status e data
classSchema.index({ student: 1, status: 1 }); // Aulas do aluno por status
classSchema.index({ teacher: 1, scheduledAt: 1 }); // Calendário do professor
classSchema.index({ status: 1, scheduledAt: 1 }); // Aulas agendadas
classSchema.index({ course: 1, moduleIndex: 1, lessonIndex: 1 }); // Lições do curso
classSchema.index({ teacher: 1, createdAt: -1 }); // Últimas aulas criadas

// Middleware para validações e cálculos automáticos
classSchema.pre('save', function(next) {
  // Validar duração
  if (this.duration && (this.duration < 15 || this.duration > 480)) {
    return next(new Error('Duration must be between 15 and 480 minutes'));
  }

  // Validar datas
  if (this.scheduledAt && this.scheduledAt < new Date() && this.status === 'scheduled') {
    // Permitir mas avisar se for muito no passado
    const hoursDiff = (new Date() - this.scheduledAt) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      console.warn(`Class scheduled ${hoursDiff.toFixed(1)} hours in the past`);
    }
  }

  // Calcular duração real se a aula foi finalizada
  if (this.status === 'completed' && this.startedAt && this.endedAt && !this.actualDuration) {
    this.actualDuration = Math.floor((this.endedAt - this.startedAt) / (1000 * 60));
  }

  // Atualizar status baseado em datas
  if (this.status === 'scheduled' && this.startedAt && !this.endedAt) {
    this.status = 'in_progress';
  }

  next();
});

// Virtuals
classSchema.virtual('activities', { ref: 'Activity', localField: '_id', foreignField: 'class' });

classSchema.virtual('isPast').get(function() {
  return this.scheduledAt && this.scheduledAt < new Date();
});

classSchema.virtual('isUpcoming').get(function() {
  if (!this.scheduledAt) return false;
  const now = new Date();
  const classTime = new Date(this.scheduledAt);
  const hoursUntil = (classTime - now) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil <= 24;
});

// Métodos de instância
classSchema.methods.startClass = function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
  this.isLive = true;
  return this.save();
};

classSchema.methods.endClass = function(notes = '') {
  this.status = 'completed';
  this.endedAt = new Date();
  this.isLive = false;
  if (notes) this.notes = notes;
  if (this.startedAt && this.endedAt) {
    this.actualDuration = Math.floor((this.endedAt - this.startedAt) / (1000 * 60));
  }
  return this.save();
};

classSchema.methods.cancelClass = function(reason = '') {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  return this.save();
};

classSchema.plugin(tenantAwarePlugin);

export default mongoose.model('Class', classSchema);
