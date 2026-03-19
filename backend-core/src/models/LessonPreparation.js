import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const lessonPreparationSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
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
  topic: {
    type: String,
    required: true,
    trim: true
  },
  subtopics: [String],
  objectives: [{
    objective: String,
    priority: {
      type: String,
      enum: ['primary', 'secondary', 'optional']
    }
  }],
  structure: {
    warmup: {
      duration: Number, // em minutos
      description: String,
      activities: [String]
    },
    mainContent: {
      duration: Number,
      keyPoints: [String],
      teachingMethod: {
        type: String,
        enum: ['exposition', 'discussion', 'practice', 'project', 'game', 'mixed']
      },
      materials: [String]
    },
    practice: {
      duration: Number,
      exercises: [{
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard']
        },
        description: String,
        estimatedTime: Number
      }]
    },
    review: {
      duration: Number,
      keyTakeaways: [String],
      questionsToAsk: [String]
    },
    homework: {
      assigned: Boolean,
      description: String,
      dueDate: Date,
      estimatedTime: Number
    }
  },
  materials: [{
    type: {
      type: String,
      enum: ['presentation', 'video', 'document', 'link', 'image', 'interactive']
    },
    title: String,
    url: String,
    description: String
  }],
  prerequisites: [String],
  anticipatedDifficulties: [{
    concept: String,
    strategy: String,
    examples: [String]
  }],
  differentiation: {
    forStruggling: [String],
    forAdvanced: [String],
    visualLearners: [String],
    auditoryLearners: [String],
    kinestheticLearners: [String]
  },
  assessmentPlan: {
    formative: [String],
    summative: String,
    selfAssessment: Boolean
  },
  generatedByAI: {
    type: Boolean,
    default: false
  },
  aiMetadata: {
    basedOn: {
      previousClasses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
      }],
      studentPerformance: mongoose.Schema.Types.Mixed,
      detectedDifficulties: [String]
    },
    generatedAt: Date,
    providerMode: {
      type: String,
      enum: ['live', 'fallback'],
      default: 'fallback'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  teacherReview: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedAt: Date,
    modifications: [String],
    approved: Boolean,
    notes: String
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'in_use', 'completed'],
    default: 'draft'
  },
  executionNotes: {
    actualDuration: Number,
    whatWorkedWell: [String],
    whatNeedsImprovement: [String],
    studentEngagement: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    objectivesAchieved: [Boolean]
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

// Middleware para atualizar updatedAt
lessonPreparationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método estático para gerar preparação automática com IA
lessonPreparationSchema.statics.generatePreparation = async function(classData, studentData, previousClasses) {
  // Esta função seria integrada com IA real
  // Por enquanto, retorna uma estrutura inteligente baseada em dados

  const topic = classData.title || classData.subject;
  const duration = classData.duration || 60;

  // Analisar aulas anteriores para identificar padrões
  const recentTopics = previousClasses
    .slice(-3)
    .map(c => c.title || c.subject)
    .filter(t => t);

  // Dividir tempo da aula de forma inteligente
  const warmupTime = Math.min(10, duration * 0.15);
  const mainTime = duration * 0.50;
  const practiceTime = duration * 0.25;
  const reviewTime = duration - warmupTime - mainTime - practiceTime;

  return {
    topic,
    subtopics: [],
    objectives: [
      {
        objective: `Compreender os conceitos fundamentais de ${topic}`,
        priority: 'primary'
      },
      {
        objective: `Aplicar ${topic} em exercícios práticos`,
        priority: 'primary'
      },
      {
        objective: `Relacionar ${topic} com conhecimentos anteriores`,
        priority: 'secondary'
      }
    ],
    structure: {
      warmup: {
        duration: warmupTime,
        description: 'Revisão rápida e conexão com aula anterior',
        activities: [
          'Perguntar sobre dúvidas da aula anterior',
          'Fazer uma pergunta instigante sobre o tema de hoje',
          recentTopics.length > 0 ? `Relembrar: ${recentTopics[recentTopics.length - 1]}` : 'Ativação de conhecimento prévio'
        ]
      },
      mainContent: {
        duration: mainTime,
        keyPoints: [
          `Introdução aos conceitos de ${topic}`,
          `Demonstração prática`,
          `Exemplos do dia a dia`
        ],
        teachingMethod: 'mixed',
        materials: [
          'Apresentação visual',
          'Exemplos práticos',
          'Exercícios resolvidos'
        ]
      },
      practice: {
        duration: practiceTime,
        exercises: [
          {
            difficulty: 'easy',
            description: 'Exercício introdutório para fixação',
            estimatedTime: practiceTime * 0.3
          },
          {
            difficulty: 'medium',
            description: 'Exercício de aplicação',
            estimatedTime: practiceTime * 0.4
          },
          {
            difficulty: 'hard',
            description: 'Desafio (se houver tempo)',
            estimatedTime: practiceTime * 0.3
          }
        ]
      },
      review: {
        duration: reviewTime,
        keyTakeaways: [
          `Principais conceitos de ${topic}`,
          'Como aplicar na prática',
          'Relação com próximos tópicos'
        ],
        questionsToAsk: [
          'O que você achou mais interessante hoje?',
          'Ficou alguma dúvida?',
          'Consegue explicar com suas palavras o que aprendemos?'
        ]
      },
      homework: {
        assigned: true,
        description: `Exercícios sobre ${topic} para fixação`,
        estimatedTime: 20
      }
    },
    materials: [
      {
        type: 'presentation',
        title: `Apresentação: ${topic}`,
        description: 'Slides com conceitos principais'
      },
      {
        type: 'document',
        title: 'Lista de exercícios',
        description: 'Exercícios de fixação'
      }
    ],
    prerequisites: recentTopics.length > 0 ? recentTopics : [`Conhecimentos básicos de ${studentData.grade}`],
    anticipatedDifficulties: [
      {
        concept: 'Conceitos abstratos',
        strategy: 'Usar exemplos concretos e do cotidiano',
        examples: ['Analogia com situação do dia a dia', 'Demonstração prática']
      }
    ],
    differentiation: {
      forStruggling: [
        'Revisar pré-requisitos',
        'Usar mais exemplos visuais',
        'Dividir em passos menores'
      ],
      forAdvanced: [
        'Propor desafios extras',
        'Conectar com tópicos avançados',
        'Incentivar explicação para colegas'
      ],
      visualLearners: ['Diagramas', 'Vídeos', 'Infográficos'],
      auditoryLearners: ['Explicações verbais', 'Discussões', 'Podcasts'],
      kinestheticLearners: ['Atividades práticas', 'Manipulativos', 'Projetos']
    },
    assessmentPlan: {
      formative: [
        'Perguntas durante a aula',
        'Observação da resolução de exercícios',
        'Feedback imediato'
      ],
      summative: 'Exercícios de casa corrigidos',
      selfAssessment: true
    },
    generatedByAI: true,
    aiMetadata: {
      basedOn: {
        previousClasses: previousClasses.map(c => c._id),
        studentPerformance: {
          averageGrade: 'N/A',
          engagementLevel: 'medium'
        },
        detectedDifficulties: []
      },
      generatedAt: new Date(),
      confidence: 75
    },
    status: 'draft'
  };
};

lessonPreparationSchema.plugin(tenantAwarePlugin);

export default mongoose.model('LessonPreparation', lessonPreparationSchema);
