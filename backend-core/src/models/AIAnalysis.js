import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const aiAnalysisSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  analysisType: {
    type: String,
    enum: [
      'performance_prediction',
      'difficulty_detection',
      'evasion_risk',
      'learning_style',
      'topic_recommendation',
      'engagement_analysis'
    ],
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  data: {
    // Dados brutos da análise
    rawData: mongoose.Schema.Types.Mixed,

    // Análise de Desempenho
    performanceScore: Number,
    performanceTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining']
    },

    // Detecção de Dificuldades
    difficultTopics: [{
      topic: String,
      difficultyLevel: {
        type: Number,
        min: 0,
        max: 100
      },
      errorCount: Number,
      lastAttempt: Date
    }],

    // Risco de Evasão
    evasionRisk: {
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      factors: [{
        factor: String,
        weight: Number,
        description: String
      }],
      lastActivity: Date,
      daysInactive: Number
    },

    // Padrões de Aprendizagem
    learningStyle: {
      visual: Number,
      auditory: Number,
      kinesthetic: Number,
      readingWriting: Number
    },

    // Engajamento
    engagementMetrics: {
      averageAttention: Number,
      participationRate: Number,
      questionFrequency: Number,
      homeworkCompletionRate: Number
    }
  },
  insights: [{
    type: {
      type: String,
      enum: ['strength', 'weakness', 'opportunity', 'threat', 'recommendation']
    },
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    actionable: Boolean,
    suggestedAction: String
  }],
  recommendations: [{
    category: {
      type: String,
      enum: ['content', 'methodology', 'pacing', 'material', 'schedule']
    },
    recommendation: String,
    rationale: String,
    expectedImpact: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para consultas rápidas
aiAnalysisSchema.index({ student: 1, analysisType: 1 });
aiAnalysisSchema.index({ teacher: 1, student: 1 });
aiAnalysisSchema.index({ processedAt: -1 });
aiAnalysisSchema.index({ 'data.evasionRisk.level': 1 });

// Método para calcular risco de evasão
aiAnalysisSchema.statics.calculateEvasionRisk = async function(studentId, classes, payments) {
  const factors = [];
  let totalScore = 0;

  // Fator 1: Inatividade (peso 30)
  const lastClass = classes
    .filter(c => c.student?.toString() === studentId.toString() && c.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const daysInactive = lastClass
    ? Math.floor((new Date() - new Date(lastClass.date)) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysInactive > 30) {
    totalScore += 30;
    factors.push({
      factor: 'high_inactivity',
      weight: 30,
      description: `${daysInactive} dias sem aula`
    });
  } else if (daysInactive > 14) {
    totalScore += 20;
    factors.push({
      factor: 'medium_inactivity',
      weight: 20,
      description: `${daysInactive} dias sem aula`
    });
  }

  // Fator 2: Pagamentos atrasados (peso 25)
  const latePayments = payments.filter(p =>
    p.student?.toString() === studentId.toString() &&
    (p.status === 'late' || p.status === 'overdue')
  );

  if (latePayments.length >= 3) {
    totalScore += 25;
    factors.push({
      factor: 'multiple_late_payments',
      weight: 25,
      description: `${latePayments.length} pagamentos atrasados`
    });
  } else if (latePayments.length > 0) {
    totalScore += 15;
    factors.push({
      factor: 'late_payment',
      weight: 15,
      description: `${latePayments.length} pagamento(s) atrasado(s)`
    });
  }

  // Fator 3: Baixo engajamento (peso 20)
  const recentClasses = classes
    .filter(c => c.student?.toString() === studentId.toString() && c.status === 'completed')
    .slice(-5);

  const cancelledRecently = classes
    .filter(c => c.student?.toString() === studentId.toString() && c.status === 'cancelled')
    .filter(c => {
      const daysSince = Math.floor((new Date() - new Date(c.date)) / (1000 * 60 * 60 * 24));
      return daysSince <= 30;
    }).length;

  if (cancelledRecently >= 3) {
    totalScore += 20;
    factors.push({
      factor: 'frequent_cancellations',
      weight: 20,
      description: `${cancelledRecently} cancelamentos no último mês`
    });
  }

  // Fator 4: Desempenho baixo (peso 15)
  // (seria calculado com base em notas/exercícios - mock por enquanto)

  // Fator 5: Redução de frequência (peso 10)
  const classesLastMonth = classes.filter(c => {
    const daysSince = Math.floor((new Date() - new Date(c.date)) / (1000 * 60 * 60 * 24));
    return c.student?.toString() === studentId.toString() && daysSince <= 30 && c.status === 'completed';
  }).length;

  const classesPreviousMonth = classes.filter(c => {
    const daysSince = Math.floor((new Date() - new Date(c.date)) / (1000 * 60 * 60 * 24));
    return c.student?.toString() === studentId.toString() &&
           daysSince > 30 && daysSince <= 60 && c.status === 'completed';
  }).length;

  if (classesPreviousMonth > 0 && classesLastMonth < classesPreviousMonth * 0.5) {
    totalScore += 10;
    factors.push({
      factor: 'frequency_reduction',
      weight: 10,
      description: `Redução de ${classesPreviousMonth} para ${classesLastMonth} aulas/mês`
    });
  }

  // Determinar nível de risco
  let level;
  if (totalScore >= 70) level = 'critical';
  else if (totalScore >= 50) level = 'high';
  else if (totalScore >= 30) level = 'medium';
  else level = 'low';

  return {
    score: totalScore,
    level,
    factors,
    lastActivity: lastClass?.date,
    daysInactive
  };
};

aiAnalysisSchema.plugin(tenantAwarePlugin);

export default mongoose.model('AIAnalysis', aiAnalysisSchema);
