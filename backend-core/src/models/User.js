import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Nome é obrigatório'], trim: true },
  email: { type: String, required: [true, 'Email é obrigatório'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Senha é obrigatória'], minlength: 6, select: false },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['admin', 'teacher', 'student', 'parent'], default: 'teacher' },
  avatar: { type: String, default: null },
  bio: { type: String },
  subjects: [{ type: String }],

  // Settings
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, default: 'pt-BR' },
    timezone: { type: String, default: 'America/Sao_Paulo' }
  },

  // Integrations
  integrations: {
    google: {
      connected: { type: Boolean, default: false },
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      calendarId: String
    },
    stripe: { customerId: String, accountId: String, connected: { type: Boolean, default: false } },
    whatsapp: { phoneNumber: String, verified: { type: Boolean, default: false } },
    zoom: {
      userId: String,
      accessToken: { type: String, select: false },
      connected: { type: Boolean, default: false }
    }
  },

  // Subscription
  subscription: {
    plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'cancelled', 'past_due'], default: 'active' },
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    features: {
      maxStudents: { type: Number, default: 10 },
      maxClasses: { type: Number, default: 50 },
      aiFeatures: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false }
    }
  },

  // Referral
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralBonus: { type: Number, default: 0 },

  // Teacher workspace data used by the advanced hub screens
  teacherWorkspace: {
    grades: [{
      studentId: { type: String, trim: true },
      classId: { type: String, trim: true },
      subject: { type: String, trim: true },
      score: { type: Number, default: 0 },
      maxScore: { type: Number, default: 100 },
      percentage: { type: Number, default: 0 },
      assessmentType: {
        type: String,
        enum: ['quiz', 'exercise', 'test', 'participation'],
        default: 'exercise'
      },
      createdAt: { type: Date, default: Date.now }
    }],
    materials: [{
      classId: { type: String, trim: true },
      className: { type: String, trim: true },
      topic: { type: String, trim: true },
      title: { type: String, required: true, trim: true },
      type: {
        type: String,
        enum: ['pdf', 'video', 'link', 'exercise'],
        default: 'pdf'
      },
      url: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    teachingTemplates: [{
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      subject: { type: String, trim: true },
      duration: { type: Number, default: 60 },
      structure: {
        warmup: { type: String, trim: true },
        mainTopic: { type: String, trim: true },
        exercises: { type: String, trim: true },
        closing: { type: String, trim: true }
      },
      materials: [{ type: String, trim: true }],
      createdAt: { type: Date, default: Date.now }
    }],
    coursePlans: [{
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      totalModules: { type: Number, default: 0 },
      modules: [{
        order: { type: Number, default: 1 },
        name: { type: String, trim: true },
        topics: [{ type: String, trim: true }],
        duration: { type: Number, default: 0 },
        students: [{ type: String, trim: true }]
      }],
      createdAt: { type: Date, default: Date.now }
    }],
    studentGroups: [{
      id: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      color: { type: String, trim: true, default: '#4f46e5' },
      studentIds: [{ type: String, trim: true }],
      suggestedByAI: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }]
  },

  // ===== MULTI-TENANT: Link Único do Professor =====
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
    sparse: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[a-z0-9-]+$/.test(v);
      },
      message: 'Slug deve conter apenas letras minúsculas, números e hífen'
    }
  },

  // ===== CONFIGURAÇÃO DE PAGAMENTOS - RECEBER DE ALUNOS =====
  paymentMethod: {
    type: String,
    enum: ['manual', 'automatic', 'pending', null],
    default: 'pending'
  },

  // Se manual:
  manualPaymentType: {
    type: String,
    enum: ['pix_in_system', 'external', null],
    default: null
  },

  pixKey: { type: String, trim: true },
  pixKeyType: {
    type: String,
    enum: ['cpf', 'cnpj', 'email', 'phone', 'random', null]
  },

  // Se automático:
  gatewayProvider: {
    type: String,
    enum: ['mercadopago', 'asaas', 'pagseguro', 'efi', null]
  },

  gatewayCredentials: {
    type: mongoose.Schema.Types.Mixed,
    select: false // NUNCA retornar em queries normais
  },

  // ===== ASSINATURA DO NEXUS ACADEMY =====
  subscriptionStatus: {
    type: String,
    enum: ['incomplete', 'trialing', 'active', 'past_due', 'canceled'],
    default: 'incomplete'
  },

  subscriptionPlan: {
    type: String,
    enum: ['basic', 'pro', null],
    default: null
  },

  stripeCustomerId: String,
  stripeSubscriptionId: String,

  trialEndsAt: Date,
  subscriptionRenewsAt: Date,

  // Status
  status: {
    type: String,
    enum: ['pending_setup', 'active', 'suspended', 'canceled'],
    default: 'pending_setup'
  },

  onboardingCompletedAt: Date,

  // Campos legados (manter compatibilidade)
  active: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.index({ role: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Verifica se professor pode acessar a plataforma (assinatura ativa)
userSchema.methods.canAccess = function() {
  return ['trialing', 'active'].includes(this.subscriptionStatus);
};

userSchema.virtual('referralUrl').get(function() {
  return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${this.referralCode}`;
});

export default mongoose.model('User', userSchema);
