/**
 * Resend Email Service (FREE alternative to paid SMTP)
 * FREE: 3,000 emails/month, 100/day
 *
 * Setup:
 * 1. Sign up: https://resend.com/
 * 2. Get API key from dashboard
 * 3. Add to .env: RESEND_API_KEY=re_xxxxx
 * 4. Install: npm install resend
 * 5. Uncomment code below
 *
 * WHY RESEND?
 * - FREE forever (3k emails/month)
 * - No SMTP configuration needed
 * - Better deliverability than SMTP
 * - Simple API
 * - Perfect for small/medium SaaS
 */

// Uncomment when ready:
// const { Resend } = require('resend');
// const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const resendService = {
  isConfigured: () => !!process.env.RESEND_API_KEY,

  async sendEmail({ to, from, subject, html, text }) {
    // Uncomment when ready:
    /*
    if (!resend) {
      // DEBUG: console.log(`[Resend Mock] To: ${to}, Subject: ${subject}`);
      return { success: true, mock: true, id: `mock_${Date.now()}` };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: from || 'Nexus Academy <noreply@nexusacademy.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || text
      });

      if (error) {
        throw new Error(error.message);
      }

      // DEBUG: console.log(`✅ Email sent via Resend: ${data.id}`);
      return { success: true, id: data.id };
    } catch (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }
    */

    // Mock for now
    // DEBUG: console.log(`📧 [Resend Mock] To: ${to}, Subject: ${subject}`);
    return { success: true, mock: true, id: `mock_${Date.now()}` };
  },

  async sendClassReminder(to, data) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Lembrete de Aula</h1>
        </div>
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151;">Olá <strong>${data.studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Sua aula de <strong>${data.className}</strong> está marcada para:</p>

          <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; border-left: 4px solid #667eea; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 16px; color: #1f2937;">📅 <strong>Data:</strong> ${data.date}</p>
            <p style="margin: 0 0 12px 0; font-size: 16px; color: #1f2937;">🕐 <strong>Horário:</strong> ${data.time}</p>
            ${data.meetingLink ? `<p style="margin: 0; font-size: 16px; color: #1f2937;">🎥 <strong>Link:</strong> <a href="${data.meetingLink}" style="color: #667eea;">${data.meetingLink}</a></p>` : ''}
          </div>

          <p style="font-size: 16px; color: #374151;">Esteja preparado e pontual!</p>

          ${data.meetingLink ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.meetingLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Entrar na Aula
            </a>
          </div>
          ` : ''}
        </div>
        <div style="background: #f9fafb; padding: 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Nexus Academy - Educação Personalizada</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `🔔 Lembrete: ${data.className} - Hoje às ${data.time}`,
      html
    });
  },

  async sendPaymentReceipt(to, data) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Pagamento Confirmado</h1>
        </div>
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151;">Olá <strong>${data.studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Seu pagamento foi processado com sucesso!</p>

          <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #059669; margin-top: 0;">Detalhes do Pagamento</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;"><strong>Valor:</strong> R$ ${data.amount.toFixed(2)}</p>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;"><strong>Data:</strong> ${data.date}</p>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;"><strong>Método:</strong> ${data.method}</p>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;"><strong>Referência:</strong> ${data.month}/${data.year}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">Este é seu recibo oficial. Guarde-o para seus registros.</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `✅ Recibo - R$ ${data.amount.toFixed(2)} - ${data.month}/${data.year}`,
      html
    });
  },

  async sendWelcome(to, data) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🎓 Bem-vindo à Nexus Academy!</h1>
        </div>
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; color: #374151;">Olá <strong>${data.studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">É um prazer tê-lo como aluno! Seu professor <strong>${data.teacherName}</strong> está animado para começar sua jornada de aprendizado.</p>

          <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin: 32px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">🚀 Próximos Passos</h3>
            <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
              <li>Acesse o portal do aluno com suas credenciais</li>
              <li>Confira seu calendário de aulas</li>
              <li>Prepare-se para sua primeira aula!</li>
              <li>Entre em contato se tiver alguma dúvida</li>
            </ul>
          </div>

          ${data.loginUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.loginUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Acessar Plataforma
            </a>
          </div>
          ` : ''}

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">Se tiver alguma dúvida, responda este email ou entre em contato com seu professor.</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `🎓 Bem-vindo à Nexus Academy!`,
      html
    });
  },

  async sendClassSummary(to, data) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📚 Resumo da Aula</h1>
        </div>
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">${data.className}</h2>
          <p style="font-size: 16px; color: #374151;">Olá <strong>${data.studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Aqui está o resumo da aula de hoje:</p>

          <div style="background: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #1f2937;">📝 Resumo</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${data.summary}</p>
          </div>

          ${data.topics && data.topics.length > 0 ? `
          <div style="background: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #92400e;">🎯 Tópicos Abordados</h3>
            <ul style="color: #78350f; font-size: 16px; line-height: 1.8;">
              ${data.topics.map(topic => `<li>${topic}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${data.homework ? `
          <div style="background: #dbeafe; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #1e40af;">✏️ Tarefa de Casa</h3>
            <p style="color: #1e3a8a; font-size: 16px; line-height: 1.6;">${data.homework}</p>
          </div>
          ` : ''}

          <p style="font-size: 16px; color: #374151; margin-top: 32px;">Continue estudando e nos vemos na próxima aula!</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `📚 Resumo: ${data.className}`,
      html
    });
  }
};

module.exports = resendService;
