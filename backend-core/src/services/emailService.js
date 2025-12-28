import nodemailer from 'nodemailer';

let transporter = null;

export const emailService = {
  isConfigured: () => !!(process.env.SMTP_HOST && process.env.SMTP_USER),

  initialize() {
    if (this.isConfigured()) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    }
  },

  async sendEmail(options) {
    if (!this.isConfigured()) {
      console.log(`[Email Mock] To: ${options.to}, Subject: ${options.subject}`);
      return { success: true, mock: true, messageId: `mock_${Date.now()}` };
    }

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || 'noreply@nexusacademy.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  },

  // Template-based emails
  async sendClassReminder(to, data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Lembrete de Aula</h2>
        <p>Olá!</p>
        <p>Este é um lembrete de que a aula <strong>${data.className}</strong> está agendada para:</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Data:</strong> ${data.date}</p>
          <p><strong>Horário:</strong> ${data.time}</p>
          <p><strong>Aluno:</strong> ${data.studentName}</p>
          ${data.meetingLink ? `<p><strong>Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>` : ''}
        </div>
        <p>Até logo!</p>
      </div>
    `;
    return await this.sendEmail({ to, subject: `Lembrete: ${data.className}`, html });
  },

  async sendPaymentReminder(to, data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Lembrete de Pagamento</h2>
        <p>Olá!</p>
        <p>O pagamento referente às aulas de <strong>${data.studentName}</strong> vence em breve:</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Valor:</strong> R$ ${data.amount.toFixed(2)}</p>
          <p><strong>Vencimento:</strong> ${data.dueDate}</p>
          ${data.pixCode ? `<p><strong>PIX:</strong> ${data.pixCode}</p>` : ''}
        </div>
        ${data.paymentLink ? `<a href="${data.paymentLink}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Pagar Agora</a>` : ''}
      </div>
    `;
    return await this.sendEmail({ to, subject: `Pagamento - ${data.studentName}`, html });
  },

  async sendPaymentConfirmation(to, data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22C55E;">Pagamento Confirmado!</h2>
        <p>Olá!</p>
        <p>Confirmamos o recebimento do pagamento:</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Aluno:</strong> ${data.studentName}</p>
          <p><strong>Valor:</strong> R$ ${data.amount.toFixed(2)}</p>
          <p><strong>Referente a:</strong> ${data.month}/${data.year}</p>
        </div>
        <p>Obrigado!</p>
      </div>
    `;
    return await this.sendEmail({ to, subject: 'Pagamento Confirmado', html });
  },

  async sendWelcome(to, data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Bem-vindo(a) ao Nexus Academy!</h2>
        <p>Olá, ${data.name}!</p>
        <p>Sua conta foi criada com sucesso. Estamos felizes em tê-lo(a) conosco!</p>
        <div style="margin: 30px 0;">
          <a href="${data.loginUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Acessar Plataforma</a>
        </div>
        <p>Qualquer dúvida, estamos à disposição.</p>
      </div>
    `;
    return await this.sendEmail({ to, subject: 'Bem-vindo ao Nexus Academy!', html });
  },

  async sendClassSummary(to, data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Resumo da Aula</h2>
        <p>Olá!</p>
        <p>Segue o resumo da aula de <strong>${data.studentName}</strong>:</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Data:</strong> ${data.date}</p>
          <p><strong>Matéria:</strong> ${data.subject}</p>
          <h3>Resumo:</h3>
          <p>${data.summary}</p>
          ${data.homework ? `<h3>Lição de Casa:</h3><p>${data.homework}</p>` : ''}
        </div>
        <p>Até a próxima aula!</p>
      </div>
    `;
    return await this.sendEmail({ to, subject: `Resumo: ${data.subject} - ${data.studentName}`, html });
  },

  async sendReport(to, data) {
    return await this.sendEmail({
      to,
      subject: `Relatório: ${data.title}`,
      html: `<p>Segue em anexo o relatório ${data.title}.</p>`,
      attachments: [{ filename: data.filename, path: data.filePath }]
    });
  },

  async sendPasswordReset(to, data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Redefinição de Senha</h2>
        <p>Você solicitou a redefinição de sua senha.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <div style="margin: 30px 0;">
          <a href="${data.resetUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Redefinir Senha</a>
        </div>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou isso, ignore este email.</p>
      </div>
    `;
    return await this.sendEmail({ to, subject: 'Redefinição de Senha', html });
  }
};

// Initialize on import if configured
emailService.initialize();

export default emailService;
