import axios from 'axios';

// WhatsApp Business API via Meta Cloud API
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export const whatsappService = {
  isConfigured: () => !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN),

  async sendMessage(to, message, templateName = null, templateParams = null) {
    if (!this.isConfigured()) {
      // DEBUG: console.log(`[WhatsApp Mock] To: ${to}, Message: ${message}`);
      return { success: true, mock: true, messageId: `mock_${Date.now()}` };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    try {
      let payload;

      if (templateName) {
        // Template message
        payload = {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'pt_BR' },
            components: templateParams ? [{
              type: 'body',
              parameters: templateParams.map(p => ({ type: 'text', text: p }))
            }] : undefined
          }
        };
      } else {
        // Text message
        payload = {
          messaging_product: 'whatsapp',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: { body: message }
        };
      }

      const response = await axios.post(
        `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      console.error('WhatsApp API Error:', error.response?.data || error.message);
      throw error;
    }
  },

  async sendMediaMessage(to, mediaType, mediaUrl, caption = '') {
    if (!this.isConfigured()) {
      // DEBUG: console.log(`[WhatsApp Mock] Media to: ${to}, Type: ${mediaType}`);
      return { success: true, mock: true };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: mediaType, // image, document, audio, video
      [mediaType]: { link: mediaUrl, caption }
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    return { success: true, messageId: response.data.messages[0].id };
  },

  async sendInteractiveMessage(to, type, body, buttons) {
    if (!this.isConfigured()) {
      // DEBUG: console.log(`[WhatsApp Mock] Interactive to: ${to}`);
      return { success: true, mock: true };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: type, // button, list
        body: { text: body },
        action: type === 'button' ? {
          buttons: buttons.map((btn, i) => ({
            type: 'reply',
            reply: { id: `btn_${i}`, title: btn }
          }))
        } : {
          button: 'Opções',
          sections: [{ title: 'Escolha', rows: buttons.map((btn, i) => ({ id: `row_${i}`, title: btn })) }]
        }
      }
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return { success: true, messageId: response.data.messages[0].id };
  },

  formatPhoneNumber(phone) {
    // Remove non-digits and add Brazil country code if needed
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('9')) {
      cleaned = '55' + cleaned;
    } else if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  },

  // Template helpers
  async sendClassReminder(to, studentName, className, dateTime) {
    const message = `Olá! Lembrete: a aula "${className}" de ${studentName} está agendada para ${dateTime}. Até logo!`;
    return await this.sendMessage(to, message);
  },

  async sendPaymentReminder(to, studentName, amount, dueDate) {
    const message = `Olá! O pagamento de R$ ${amount.toFixed(2)} referente às aulas de ${studentName} vence em ${dueDate}. Qualquer dúvida, estou à disposição.`;
    return await this.sendMessage(to, message);
  },

  async sendPaymentOverdue(to, studentName, amount, daysOverdue) {
    const message = `Olá! O pagamento de R$ ${amount.toFixed(2)} referente às aulas de ${studentName} está em atraso há ${daysOverdue} dias. Por favor, regularize para continuarmos com as aulas.`;
    return await this.sendMessage(to, message);
  },

  async sendPaymentConfirmation(to, studentName, amount) {
    const message = `Pagamento confirmado! Recebemos R$ ${amount.toFixed(2)} referente às aulas de ${studentName}. Obrigado!`;
    return await this.sendMessage(to, message);
  },

  async sendBirthdayWish(to, studentName) {
    const message = `🎂 Feliz Aniversário, ${studentName}! Desejamos um dia incrível cheio de alegria e conquistas!`;
    return await this.sendMessage(to, message);
  },

  async sendClassSummary(to, studentName, summary) {
    const message = `Resumo da aula de ${studentName}:\n\n${summary}\n\nAté a próxima aula!`;
    return await this.sendMessage(to, message);
  },

  // Webhook verification
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  },

  // Process incoming webhook
  processWebhook(body) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      return value.messages.map(msg => ({
        from: msg.from,
        type: msg.type,
        text: msg.text?.body,
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
        messageId: msg.id
      }));
    }

    if (value?.statuses) {
      return value.statuses.map(status => ({
        messageId: status.id,
        status: status.status, // sent, delivered, read
        timestamp: new Date(parseInt(status.timestamp) * 1000)
      }));
    }

    return null;
  }
};

export default whatsappService;
