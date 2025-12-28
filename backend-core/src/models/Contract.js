import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
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
  templateId: {
    type: String,
    default: 'default'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'signed', 'cancelled', 'expired'],
    default: 'draft'
  },
  contractData: {
    // Dados do Aluno
    studentName: {
      type: String,
      required: true
    },
    studentAge: Number,
    studentGrade: String,

    // Dados dos Responsáveis
    parentName: {
      type: String,
      required: true
    },
    parentEmail: {
      type: String,
      required: true
    },
    parentPhone: String,
    parentCPF: String,
    parentRG: String,

    // Dados do Professor
    teacherName: String,
    teacherCPF: String,
    teacherPhone: String,

    // Dados do Serviço
    serviceDescription: String,
    monthlyFee: {
      type: Number,
      required: true
    },
    hoursPerMonth: Number,
    paymentDay: {
      type: Number,
      min: 1,
      max: 31,
      default: 5
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,

    // Termos Específicos
    customClauses: [String],
    additionalTerms: String
  },
  generatedContent: {
    type: String,
    default: ''
  },
  signatures: {
    parent: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      ipAddress: String,
      signatureImage: String
    },
    teacher: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      ipAddress: String,
      signatureImage: String
    }
  },
  pdfUrl: String,
  signatureLink: String,
  expiresAt: Date,
  sentAt: Date,
  signedAt: Date,
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
contractSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método para gerar conteúdo do contrato
contractSchema.methods.generateContent = function() {
  const template = this.getTemplate();

  // Substituir variáveis no template
  let content = template;
  const replacements = {
    '{{studentName}}': this.contractData.studentName,
    '{{parentName}}': this.contractData.parentName,
    '{{parentCPF}}': this.contractData.parentCPF || '__________',
    '{{parentRG}}': this.contractData.parentRG || '__________',
    '{{parentEmail}}': this.contractData.parentEmail,
    '{{parentPhone}}': this.contractData.parentPhone || '__________',
    '{{teacherName}}': this.contractData.teacherName || 'Professor(a)',
    '{{monthlyFee}}': `R$ ${this.contractData.monthlyFee.toFixed(2)}`,
    '{{hoursPerMonth}}': this.contractData.hoursPerMonth || '4',
    '{{paymentDay}}': this.contractData.paymentDay || '5',
    '{{startDate}}': new Date(this.contractData.startDate).toLocaleDateString('pt-BR'),
    '{{endDate}}': this.contractData.endDate ? new Date(this.contractData.endDate).toLocaleDateString('pt-BR') : 'Indeterminado',
    '{{currentDate}}': new Date().toLocaleDateString('pt-BR'),
    '{{serviceDescription}}': this.contractData.serviceDescription || 'Aulas particulares'
  };

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, 'g'), value);
  }

  this.generatedContent = content;
  return content;
};

// Método para obter template
contractSchema.methods.getTemplate = function() {
  // Template padrão (pode ser customizado)
  return `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS

CONTRATANTE: {{parentName}}, CPF: {{parentCPF}}, RG: {{parentRG}},
responsável legal pelo(a) aluno(a) {{studentName}},
E-mail: {{parentEmail}}, Telefone: {{parentPhone}}

CONTRATADO: {{teacherName}}, doravante denominado PROFESSOR

DO OBJETO:
O presente contrato tem por objeto a prestação de serviços de {{serviceDescription}}
para o(a) aluno(a) {{studentName}}.

DAS CONDIÇÕES:
1. O PROFESSOR ministrará aproximadamente {{hoursPerMonth}} horas de aula por mês.
2. As aulas serão realizadas em datas e horários acordados entre as partes.
3. As aulas poderão ser realizadas de forma presencial ou online, conforme acordado.

DO VALOR E FORMA DE PAGAMENTO:
1. O CONTRATANTE pagará ao PROFESSOR o valor mensal de {{monthlyFee}}.
2. O pagamento deverá ser efetuado até o dia {{paymentDay}} de cada mês.
3. Formas de pagamento: PIX, transferência bancária, ou outras formas combinadas.

DA VIGÊNCIA:
1. Este contrato terá início em {{startDate}} e término em {{endDate}}.
2. Qualquer das partes poderá rescindir o contrato com aviso prévio de 30 dias.

DAS RESPONSABILIDADES:
1. O PROFESSOR se compromete a preparar e ministrar as aulas com qualidade.
2. O CONTRATANTE se compromete a garantir a presença do aluno nas aulas agendadas.
3. Faltas do aluno não justificadas não geram direito a reembolso ou reposição.

TERMOS ADICIONAIS:
${this.contractData.additionalTerms || 'Não há termos adicionais.'}

Por estarem de acordo com todos os termos, as partes assinam o presente contrato.

Data: {{currentDate}}

_____________________________          _____________________________
CONTRATANTE                            CONTRATADO
{{parentName}}                         {{teacherName}}
  `;
};

export default mongoose.model('Contract', contractSchema);
