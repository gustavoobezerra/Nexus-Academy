import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const hourBankSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  totalHoursPurchased: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  hoursConsumed: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  hoursRemaining: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  packageType: {
    type: String,
    enum: ['monthly_4h', 'monthly_8h', 'monthly_12h', 'custom'],
    default: 'monthly_4h'
  },
  renewalDate: {
    type: Date,
    required: true
  },
  history: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['purchase', 'consumption', 'refund', 'bonus'],
      required: true
    },
    hours: {
      type: Number,
      required: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    description: String
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['low_hours_25', 'low_hours_10', 'hours_depleted', 'renewal_reminder'],
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],
  autoRenew: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
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

// Middleware para atualizar hoursRemaining antes de salvar
hourBankSchema.pre('save', function(next) {
  this.hoursRemaining = Math.max(0, this.totalHoursPurchased - this.hoursConsumed);
  this.updatedAt = new Date();
  next();
});

// Método para consumir horas de uma aula
hourBankSchema.methods.consumeHours = function(hours, classId, description) {
  if (this.hoursRemaining < hours) {
    throw new Error('Horas insuficientes no banco de horas');
  }

  this.hoursConsumed += hours;
  this.history.push({
    type: 'consumption',
    hours: -hours,
    classId,
    description: description || 'Aula concluída'
  });

  // Verificar alertas
  const percentage = (this.hoursRemaining / this.totalHoursPurchased) * 100;
  if (percentage <= 10 && !this.alerts.some(a => a.type === 'low_hours_10' && !a.acknowledged)) {
    this.alerts.push({ type: 'low_hours_10' });
  } else if (percentage <= 25 && !this.alerts.some(a => a.type === 'low_hours_25' && !a.acknowledged)) {
    this.alerts.push({ type: 'low_hours_25' });
  }

  return this.save();
};

// Método para adicionar horas (compra ou bônus)
hourBankSchema.methods.addHours = function(hours, type = 'purchase', description) {
  this.totalHoursPurchased += hours;
  this.history.push({
    type,
    hours,
    description: description || `Adição de ${hours} horas`
  });

  return this.save();
};

hourBankSchema.plugin(tenantAwarePlugin);

export default mongoose.model('HourBank', hourBankSchema);
