/**
 * WhatsApp Service via Twilio API (MELHOR CUSTO-BENEFÍCIO BRASIL)
 *
 * Setup:
 * 1. Criar conta: https://www.twilio.com/try-twilio (GRÁTIS - $15 de crédito)
 * 2. WhatsApp Sandbox ou número verificado
 * 3. Obter credenciais: Account SID, Auth Token, WhatsApp Number
 * 4. Adicionar ao .env
 * 5. npm install twilio
 * 6. Descomentar código abaixo
 *
 * CUSTO (mais barato que Telegram no Brasil):
 * - Crédito grátis: $15 (600 mensagens)
 * - Após crédito: $0.005/msg (~R$ 0.025/msg)
 * - 100 alunos x 10 msgs/mês = 1000 msgs = $5/mês (~R$ 25/mês)
 *
 * VANTAGENS:
 * ✅ WhatsApp é #1 no Brasil (99% penetração)
 * ✅ Melhor entrega que email
 * ✅ Alunos já têm instalado
 * ✅ Suporta mídia (fotos, PDFs, vídeos)
 * ✅ Templates aprovados pelo WhatsApp
 * ✅ Two-way messaging (alunos podem responder)
 * ✅ Status de entrega (sent, delivered, read)
 * ✅ API confiável (usada por milhares de empresas)
 */

// Uncomment when ready:
// const twilio = require('twilio');

// const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
//   ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
//   : null;

const twilioWhatsappService = {
  isConfigured: () => !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  ),

  /**
   * Formatar número de telefone brasileiro para WhatsApp
   * Aceita: (11) 99999-9999, 11999999999, 5511999999999
   * Retorna: whatsapp:+5511999999999
   */
  formatPhoneNumber(phone) {
    // Remove tudo exceto dígitos
    let cleaned = phone.replace(/\D/g, '');

    // Adiciona código do Brasil (55) se não tiver
    if (cleaned.length === 11 || cleaned.length === 10) {
      cleaned = '55' + cleaned;
    }

    // Formato WhatsApp Twilio
    return `whatsapp:+${cleaned}`;
  },

  /**
   * Enviar mensagem de texto simples
   */
  async sendMessage(to, message) {
    // Uncomment when ready:
    /*
    if (!client) {
      console.log(`📱 [Twilio Mock] WhatsApp to ${to}: ${message.substring(0, 50)}...`);
      return { success: true, mock: true, sid: `mock_${Date.now()}` };
    }

    try {
      const result = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER, // Ex: whatsapp:+14155238886
        to: this.formatPhoneNumber(to),
        body: message
      });

      console.log(`✅ WhatsApp enviado: ${result.sid}`);

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from
      };
    } catch (error) {
      console.error('❌ Twilio WhatsApp error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
    */

    console.log(`📱 [Twilio Mock] WhatsApp to ${to}: ${message.substring(0, 50)}...`);
    return { success: true, mock: true, sid: `mock_${Date.now()}` };
  },

  /**
   * Enviar mídia (imagem, PDF, vídeo)
   */
  async sendMedia(to, mediaUrl, caption = '') {
    // Uncomment when ready:
    /*
    if (!client) {
      console.log(`📱 [Twilio Mock] Media WhatsApp to ${to}`);
      return { success: true, mock: true };
    }

    try {
      const result = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: this.formatPhoneNumber(to),
        body: caption,
        mediaUrl: [mediaUrl] // Array de URLs
      });

      console.log(`✅ Mídia WhatsApp enviada: ${result.sid}`);

      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('❌ Twilio media error:', error);
      return { success: false, error: error.message };
    }
    */

    console.log(`📱 [Twilio Mock] Media WhatsApp to ${to}: ${mediaUrl}`);
    return { success: true, mock: true };
  },

  /**
   * Lembrete de aula
   */
  async sendClassReminder(to, data) {
    const message = `🔔 *Lembrete de Aula - Nexus Academy*

Olá *${data.studentName}*!

Sua aula de *${data.className}* está agendada para:

📅 *Data:* ${data.date}
🕐 *Horário:* ${data.time}

${data.meetingLink ? `🎥 *Link da aula:*\n${data.meetingLink}\n` : ''}
Esteja preparado e pontual!

_Nexus Academy - Educação Personalizada_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Lembrete de pagamento
   */
  async sendPaymentReminder(to, data) {
    const message = `💰 *Lembrete de Pagamento*

Olá!

O pagamento das aulas de *${data.studentName}* vence em breve:

💵 *Valor:* R$ ${data.amount.toFixed(2)}
📅 *Vencimento:* ${data.dueDate}

${data.pixCode ? `📲 *PIX Copia e Cola:*\n\`\`\`${data.pixCode}\`\`\`\n` : ''}
${data.paymentLink ? `💳 *Pagar online:*\n${data.paymentLink}\n` : ''}
Para pagar, acesse a plataforma ou use o PIX acima.

_Qualquer dúvida, estamos à disposição!_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Confirmação de pagamento
   */
  async sendPaymentConfirmation(to, data) {
    const message = `✅ *Pagamento Confirmado!*

Olá!

Recebemos seu pagamento:

👤 *Aluno:* ${data.studentName}
💵 *Valor:* R$ ${data.amount.toFixed(2)}
📅 *Referente a:* ${data.month}/${data.year}

Obrigado! 🎉

_Nexus Academy_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Pagamento em atraso
   */
  async sendPaymentOverdue(to, data) {
    const message = `⚠️ *Pagamento em Atraso*

Olá!

O pagamento de *${data.studentName}* está em atraso:

💵 *Valor:* R$ ${data.amount.toFixed(2)}
📅 *Vencimento:* ${data.dueDate}
⏰ *Dias em atraso:* ${data.daysOverdue}

Por favor, regularize para continuarmos com as aulas.

${data.pixCode ? `📲 *PIX:* \`${data.pixCode}\`\n` : ''}
_Em caso de dúvidas, entre em contato._`;

    return await this.sendMessage(to, message);
  },

  /**
   * Resumo da aula (com IA)
   */
  async sendClassSummary(to, data) {
    const message = `📚 *Resumo da Aula - ${data.className}*

Olá *${data.studentName}*!

📝 *Resumo:*
${data.summary}

${data.topics && data.topics.length > 0 ? `
🎯 *Tópicos Abordados:*
${data.topics.map(t => `• ${t}`).join('\n')}
` : ''}
${data.homework ? `
✏️ *Tarefa de Casa:*
${data.homework}
` : ''}
${data.nextClass ? `
📅 *Próxima Aula:* ${data.nextClass}
` : ''}
Continue estudando! 📖

_Nexus Academy_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Boas-vindas ao novo aluno
   */
  async sendWelcome(to, data) {
    const message = `🎓 *Bem-vindo à Nexus Academy!*

Olá *${data.studentName}*!

É um prazer tê-lo como aluno! 🎉

👨‍🏫 *Seu professor:* ${data.teacherName}
📚 *Matéria:* ${data.subject || 'A definir'}

📋 *Próximos Passos:*
1. Acesse o portal do aluno
2. Confira seu calendário de aulas
3. Prepare-se para sua primeira aula!

${data.loginUrl ? `🔗 *Portal do Aluno:*\n${data.loginUrl}\n` : ''}
_Qualquer dúvida, estamos à disposição!_

Nexus Academy - Educação Personalizada`;

    return await this.sendMessage(to, message);
  },

  /**
   * Aniversário do aluno
   */
  async sendBirthday(to, data) {
    const message = `🎂🎉 *FELIZ ANIVERSÁRIO!*

*${data.studentName}*!

A Nexus Academy deseja um dia incrível cheio de alegria, realizações e muito aprendizado!

Que este novo ano de vida seja repleto de conquistas! 🎈

_Com carinho,_
_Prof. ${data.teacherName} e toda equipe Nexus Academy_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Enviar material da aula (PDF, imagem, vídeo)
   */
  async sendMaterial(to, data) {
    const caption = `📄 *${data.title}*

${data.description || ''}

_Material enviado via Nexus Academy_`;

    return await this.sendMedia(to, data.fileUrl, caption);
  },

  /**
   * Aula cancelada
   */
  async sendClassCancellation(to, data) {
    const message = `❌ *Aula Cancelada*

Olá *${data.studentName}*,

Infelizmente precisamos cancelar a aula de *${data.className}* que estava agendada para:

📅 ${data.date} às ${data.time}

${data.reason ? `*Motivo:* ${data.reason}\n` : ''}
${data.newDate ? `📅 *Nova data:* ${data.newDate}\n` : ''}
Desculpe pelo transtorno!

_Nexus Academy_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Aula remarcada
   */
  async sendClassRescheduled(to, data) {
    const message = `🔄 *Aula Remarcada*

Olá *${data.studentName}*!

A aula de *${data.className}* foi remarcada:

❌ *Data anterior:* ${data.oldDate} às ${data.oldTime}
✅ *Nova data:* ${data.newDate} às ${data.newTime}

${data.reason ? `*Motivo:* ${data.reason}\n` : ''}
Nos vemos na nova data!

_Nexus Academy_`;

    return await this.sendMessage(to, message);
  },

  /**
   * Envio em massa (multiple numbers)
   */
  async sendBulkMessage(phoneNumbers, message) {
    // Uncomment when ready:
    /*
    if (!client) {
      console.log(`📱 [Twilio Mock] Bulk WhatsApp to ${phoneNumbers.length} recipients`);
      return {
        success: true,
        total: phoneNumbers.length,
        sent: phoneNumbers.length,
        failed: 0,
        mock: true
      };
    }

    const results = await Promise.allSettled(
      phoneNumbers.map(phone => this.sendMessage(phone, message))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;

    return {
      success: true,
      total: phoneNumbers.length,
      sent,
      failed,
      results: results.map(r => ({
        success: r.status === 'fulfilled' && r.value.success,
        ...r.value
      }))
    };
    */

    console.log(`📱 [Twilio Mock] Bulk WhatsApp to ${phoneNumbers.length} recipients`);
    return {
      success: true,
      total: phoneNumbers.length,
      sent: phoneNumbers.length,
      failed: 0,
      mock: true
    };
  },

  /**
   * Verificar status de uma mensagem
   */
  async getMessageStatus(messageSid) {
    // Uncomment when ready:
    /*
    if (!client) {
      return { success: true, status: 'mock', mock: true };
    }

    try {
      const message = await client.messages(messageSid).fetch();

      return {
        success: true,
        status: message.status, // queued, sent, delivered, read, failed
        to: message.to,
        from: message.from,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
    */

    return { success: true, status: 'mock', mock: true };
  },

  /**
   * Webhook handler para respostas do aluno
   * Twilio envia POST quando aluno responde
   */
  handleIncomingMessage(twilioRequest) {
    /*
    Exemplo do body do webhook:
    {
      From: 'whatsapp:+5511999999999',
      To: 'whatsapp:+14155238886',
      Body: 'Olá professor!',
      MessageSid: 'SMxxxxx',
      NumMedia: '0',
      MediaUrl0: 'https://...' // se tiver mídia
    }
    */

    const from = twilioRequest.From?.replace('whatsapp:', '');
    const to = twilioRequest.To?.replace('whatsapp:', '');
    const body = twilioRequest.Body;
    const sid = twilioRequest.MessageSid;
    const hasMedia = parseInt(twilioRequest.NumMedia || '0') > 0;
    const mediaUrl = hasMedia ? twilioRequest.MediaUrl0 : null;

    return {
      from,
      to,
      message: body,
      sid,
      hasMedia,
      mediaUrl,
      timestamp: new Date()
    };
  }
};

module.exports = twilioWhatsappService;
