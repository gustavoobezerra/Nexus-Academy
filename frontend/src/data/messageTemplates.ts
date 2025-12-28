export interface MessageTemplate {
  id: string;
  name: string;
  category: 'reminder' | 'payment' | 'report' | 'greeting' | 'general';
  channel: 'whatsapp' | 'email' | 'sms' | 'all';
  subject?: string;
  body: string;
  variables: string[]; // {{studentName}}, {{className}}, etc.
}

export const defaultTemplates: MessageTemplate[] = [
  {
    id: 'class_reminder_24h',
    name: 'Lembrete de Aula (24h)',
    category: 'reminder',
    channel: 'whatsapp',
    body: `Olá {{parentName}}!

Lembrando que {{studentName}} tem aula amanhã:

📚 *{{className}}*
📅 {{classDate}}
⏰ {{classTime}}

Qualquer dúvida, estou à disposição!`,
    variables: ['parentName', 'studentName', 'className', 'classDate', 'classTime']
  },
  {
    id: 'class_reminder_1h',
    name: 'Lembrete de Aula (1h)',
    category: 'reminder',
    channel: 'whatsapp',
    body: `Olá! A aula de {{studentName}} começa em 1 hora.

📚 {{className}}
⏰ {{classTime}}

Até já!`,
    variables: ['studentName', 'className', 'classTime']
  },
  {
    id: 'payment_reminder',
    name: 'Lembrete de Pagamento',
    category: 'payment',
    channel: 'whatsapp',
    body: `Olá {{parentName}}!

Passando para lembrar que o pagamento de {{studentName}} vence em {{daysUntilDue}} dias ({{dueDate}}).

💰 Valor: R$ {{amount}}
📅 Vencimento: {{dueDate}}

Chave PIX: {{pixKey}}

Qualquer dúvida, estou à disposição!`,
    variables: ['parentName', 'studentName', 'daysUntilDue', 'dueDate', 'amount', 'pixKey']
  },
  {
    id: 'payment_overdue',
    name: 'Cobrança de Atraso',
    category: 'payment',
    channel: 'whatsapp',
    body: `Olá {{parentName}},

Verificamos que o pagamento de {{studentName}} referente a {{month}} está em aberto.

💰 Valor: R$ {{amount}}
📅 Vencimento: {{dueDate}}

Por favor, regularize o pagamento para mantermos as aulas normalmente.

Chave PIX: {{pixKey}}

Se já efetuou o pagamento, por favor desconsidere esta mensagem.`,
    variables: ['parentName', 'studentName', 'month', 'amount', 'dueDate', 'pixKey']
  },
  {
    id: 'class_summary',
    name: 'Resumo da Aula',
    category: 'report',
    channel: 'email',
    subject: 'Resumo da Aula de {{studentName}} - {{classDate}}',
    body: `Prezado(a) {{parentName}},

Segue o resumo da aula de {{studentName}} realizada hoje:

📚 *Conteúdo:* {{className}}
⏱️ *Duração:* {{duration}} minutos

*Resumo:*
{{summary}}

*Pontos principais:*
{{keyPoints}}

*Tarefa para casa:*
{{homework}}

*Próximos passos:*
{{nextSteps}}

Atenciosamente,
{{teacherName}}`,
    variables: ['parentName', 'studentName', 'classDate', 'className', 'duration', 'summary', 'keyPoints', 'homework', 'nextSteps', 'teacherName']
  },
  {
    id: 'birthday_greeting',
    name: 'Felicitacao de Aniversário',
    category: 'greeting',
    channel: 'whatsapp',
    body: `🎂 Feliz Aniversário, {{studentName}}! 🎉

Desejo um dia maravilhoso cheio de alegria e realizações!

Que este novo ano de vida traga muito aprendizado e conquistas!

Um abraço,
{{teacherName}}`,
    variables: ['studentName', 'teacherName']
  },
  {
    id: 'inactive_student',
    name: 'Aluno Inativo',
    category: 'general',
    channel: 'whatsapp',
    body: `Olá {{parentName}}!

Sentimos falta de {{studentName}} nas aulas! Já faz {{daysInactive}} dias desde a última aula.

Gostaria de verificar se está tudo bem e se podemos agendar uma próxima aula.

Aguardo seu retorno!`,
    variables: ['parentName', 'studentName', 'daysInactive']
  }
];

export default defaultTemplates;
