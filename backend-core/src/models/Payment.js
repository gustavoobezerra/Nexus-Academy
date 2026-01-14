import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Amount
  amount: { type: Number, required: true },
  originalAmount: { type: Number },
  discount: { amount: Number, reason: String, code: String },
  lateFee: { type: Number, default: 0 },

  // Period
  month: { type: String, required: true },
  year: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidAt: { type: Date, default: null },

  // Status
  status: {
    type: String,
    enum: ['pending', 'awaiting_approval', 'approved', 'paid', 'late', 'overdue', 'cancelled', 'rejected', 'refunded'],
    default: 'pending'
  },

  // ===== TIPO DE PROCESSAMENTO =====
  type: {
    type: String,
    enum: ['manual', 'automatic'],
    required: true,
    default: 'manual'
  },

  // ===== CAMPOS PARA PAGAMENTO MANUAL =====
  proofOfPayment: String, // URL do comprovante enviado pelo aluno
  referenceCode: { type: String, unique: true, sparse: true }, // Código único para identificar pagamento manual

  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,

  // ===== CAMPOS PARA PAGAMENTO AUTOMÁTICO =====
  gatewayProvider: {
    type: String,
    enum: ['mercadopago', 'asaas', 'pagseguro', 'efi', null]
  },

  gatewayPaymentId: String, // ID do pagamento no gateway
  gatewayResponse: mongoose.Schema.Types.Mixed, // Resposta completa do gateway

  // Payment Details (métodos tradicionais)
  paymentMethod: { type: String, enum: ['cash', 'pix', 'credit_card', 'debit_card', 'transfer', 'boleto', 'stripe'], default: null },

  // Stripe
  stripePaymentIntentId: String,
  stripeChargeId: String,
  stripeInvoiceId: String,

  // PIX
  pixCode: String,
  pixQRCode: String,
  pixExpiresAt: Date,

  // Boleto
  boletoCode: String,
  boletoUrl: String,
  boletoExpiresAt: Date,

  // Invoice
  invoiceNumber: { type: String, unique: true, sparse: true },
  invoiceUrl: String,
  receiptUrl: String,

  // Recurrence
  isRecurring: { type: Boolean, default: false },
  subscriptionId: String,

  // Reminders
  remindersSent: [{ sentAt: Date, channel: String, type: String }],
  lastReminderSent: Date,

  // Notes
  notes: { type: String, default: '' },
  internalNotes: { type: String, default: '' }
}, { timestamps: true });

// Índices simples
paymentSchema.index({ student: 1 });
paymentSchema.index({ teacher: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ month: 1, year: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

// Índices compostos para queries comuns (melhor performance)
paymentSchema.index({ teacher: 1, status: 1, dueDate: 1 }); // Pagamentos por professor, status e data
paymentSchema.index({ teacher: 1, month: 1, year: 1 }); // Relatórios mensais
paymentSchema.index({ student: 1, status: 1 }); // Pagamentos do aluno por status
paymentSchema.index({ dueDate: 1, status: 1 }); // Pagamentos vencidos
paymentSchema.index({ teacher: 1, createdAt: -1 }); // Últimos pagamentos

// Validações e middlewares
paymentSchema.pre('save', function(next) {
  // Gerar número de invoice automaticamente
  if (!this.invoiceNumber && this.status === 'paid') {
    this.invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  // Atualizar status baseado na data de vencimento
  if (this.status === 'pending' && this.dueDate) {
    const now = new Date();
    const daysDiff = Math.floor((now - this.dueDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 30) {
      this.status = 'overdue';
    } else if (daysDiff > 0) {
      this.status = 'late';
    }
  }

  // Validar valores
  if (this.amount < 0) {
    return next(new Error('Amount cannot be negative'));
  }

  if (this.originalAmount && this.originalAmount < this.amount) {
    return next(new Error('Original amount cannot be less than final amount'));
  }

  next();
});

paymentSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

paymentSchema.virtual('daysOverdue').get(function() {
  if (this.status !== 'late' && this.status !== 'overdue') return 0;
  return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
});

paymentSchema.plugin(tenantAwarePlugin);

export default mongoose.model('Payment', paymentSchema);
