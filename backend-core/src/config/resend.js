// backend-core/src/config/resend.js
// Sistema de Email usando Resend - Nexus Academy

import { Resend } from 'resend';

// Inicializar Resend apenas se API key estiver configurada
let resend = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  // DEBUG: console.log('✅ Resend configurado para envio de emails');
} else {
  console.warn('⚠️ RESEND_API_KEY não configurada. Emails desabilitados.');
}

const EMAIL_CONFIG = {
  defaultFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  subjectPrefix: '[Nexus Academy] ',
  fromName: 'Nexus Academy',
  replyTo: process.env.EMAIL_REPLY_TO || 'suporte@nexusacademy.com'
};

/**
 * Envia email genérico
 * @param {Object} options - to, subject, html, from (opcional)
 */
export async function sendEmail({ to, subject, html, from, replyTo }) {
  try {
    if (!to || !subject || !html) {
      throw new Error('Parâmetros obrigatórios: to, subject, html');
    }

    if (!resend) {
      console.warn('⚠️ Email não enviado - Resend não configurado:', to);
      return {
        success: false,
        error: 'RESEND_API_KEY não configurada',
        message: 'Email não enviado - serviço desabilitado'
      };
    }

    const emailData = {
      from: from || `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.defaultFrom}>`,
      to: to,
      subject: EMAIL_CONFIG.subjectPrefix + subject,
      html: html,
      replyTo: replyTo || EMAIL_CONFIG.replyTo
    };

    // DEBUG: console.log('📧 Enviando email via Resend para:', to);

    const result = await resend.emails.send(emailData);

    // DEBUG: console.log('✅ Email enviado:', result.data?.id);

    return {
      success: true,
      messageId: result.data?.id,
      message: 'Email enviado com sucesso'
    };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Falha ao enviar email'
    };
  }
}

/**
 * Email de boas-vindas para novo aluno
 */
export async function sendWelcomeEmail(student) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Bem-vindo ao Nexus Academy!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${student.name}</strong>,</p>

            <p>Estamos muito felizes em tê-lo conosco! Seu cadastro foi realizado com sucesso.</p>

            <h3>📚 Próximos Passos:</h3>
            <ol>
              <li>Acesse a plataforma usando: <strong>${student.email}</strong></li>
              <li>Complete seu perfil</li>
              <li>Explore o calendário de aulas</li>
              <li>Entre em contato com seu professor</li>
            </ol>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                Acessar Plataforma
              </a>
            </div>

            <p>Atenciosamente,<br><strong>Equipe Nexus Academy</strong></p>
          </div>
          <div class="footer">
            <p>Para suporte: ${EMAIL_CONFIG.replyTo}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: student.email,
    subject: `Bem-vindo, ${student.name}!`,
    html: html
  });
}

/**
 * Email de lembrete de aula (24h antes)
 */
export async function sendClassReminderEmail(classData, student) {
  const classDate = new Date(classData.scheduledAt).toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .button { background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Lembrete de Aula</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${student.name}</strong>,</p>

            <div class="alert">
              <strong>🎯 Sua aula está chegando!</strong><br>
              Você tem uma aula agendada para amanhã.
            </div>

            <h3>📋 Detalhes:</h3>
            <ul>
              <li><strong>Matéria:</strong> ${classData.subject || 'Não especificado'}</li>
              <li><strong>Data/Hora:</strong> ${classDate}</li>
              <li><strong>Duração:</strong> ${classData.duration || 60} minutos</li>
            </ul>

            ${classData.notes ? `<p><strong>Observações:</strong> ${classData.notes}</p>` : ''}

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/classes" class="button">
                Ver Detalhes
              </a>
            </div>

            <p>Nos vemos em breve!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    to: student.email,
    subject: `Lembrete: Aula amanhã`,
    html: html
  });
}

export { resend, EMAIL_CONFIG };
