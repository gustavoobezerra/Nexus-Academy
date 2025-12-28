/**
 * Telegram Bot Service (100% FREE alternative to WhatsApp/Twilio)
 *
 * Setup:
 * 1. Open Telegram and search for @BotFather
 * 2. Send /newbot and follow instructions
 * 3. Copy the bot token
 * 4. Add to .env: TELEGRAM_BOT_TOKEN=your_token_here
 * 5. Install: npm install node-telegram-bot-api
 * 6. Uncomment code below
 *
 * WHY TELEGRAM?
 * - 100% FREE forever (no limits!)
 * - Instant delivery
 * - Rich formatting (Markdown/HTML)
 * - Can send files, images, videos
 * - Two-way communication (students can reply)
 * - Bot commands for automation
 * - No phone number verification needed
 */

// Uncomment when ready:
// const TelegramBot = require('node-telegram-bot-api');

// const bot = process.env.TELEGRAM_BOT_TOKEN
//   ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
//   : null;

// Store student chat IDs (in production, use database)
const studentChatIds = new Map();

const telegramService = {
  isConfigured: () => !!process.env.TELEGRAM_BOT_TOKEN,

  /**
   * Initialize bot commands and message handlers
   */
  initialize() {
    // Uncomment when ready:
    /*
    if (!bot) {
      console.log('⚠️ Telegram Bot not configured');
      return;
    }

    // Command: /start - Register student
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userName = msg.from.first_name;

      bot.sendMessage(chatId, `
🎓 *Bem-vindo ao Nexus Academy Bot!*

Olá ${userName}! Para vincular sua conta:

1. Acesse a plataforma Nexus Academy
2. Vá em Configurações > Notificações
3. Digite seu Chat ID: \`${chatId}\`
4. Clique em "Conectar Telegram"

Pronto! Você receberá notificações automáticas aqui.
      `, { parse_mode: 'Markdown' });
    });

    // Command: /help
    bot.onText(/\/help/, (msg) => {
      bot.sendMessage(msg.chat.id, `
📚 *Comandos Disponíveis:*

/start - Iniciar e obter seu Chat ID
/aulas - Ver suas próximas aulas
/pagamentos - Verificar pagamentos
/notas - Ver suas notas
/materiais - Acessar materiais
/ajuda - Falar com o professor

Para receber notificações automáticas, vincule sua conta usando /start
      `, { parse_mode: 'Markdown' });
    });

    // Command: /aulas - Show upcoming classes
    bot.onText(/\/aulas/, async (msg) => {
      const chatId = msg.chat.id;
      // In production, fetch from database using chatId
      bot.sendMessage(chatId, `
📅 *Suas Próximas Aulas:*

🔹 Matemática - Amanhã 14:00
🔹 Física - Sex 10:00
🔹 Química - Seg 15:30

Use /help para mais comandos.
      `, { parse_mode: 'Markdown' });
    });

    console.log('✅ Telegram Bot initialized and listening...');
    */

    console.log('ℹ️ Telegram Bot not configured - add TELEGRAM_BOT_TOKEN to .env');
  },

  /**
   * Send class reminder to student
   */
  async sendClassReminder(chatId, data) {
    // Uncomment when ready:
    /*
    if (!bot) {
      console.log(`[Telegram Mock] Reminder to ${chatId}`);
      return { success: true, mock: true };
    }

    try {
      await bot.sendMessage(chatId, `
🔔 *Lembrete de Aula*

Olá ${data.studentName}!

Sua aula de *${data.className}* está agendada para:

📅 Data: ${data.date}
🕐 Horário: ${data.time}

${data.meetingLink ? `🎥 Link: ${data.meetingLink}` : ''}

Esteja preparado e pontual!
      `, {
        parse_mode: 'Markdown',
        reply_markup: data.meetingLink ? {
          inline_keyboard: [[
            { text: '🎥 Entrar na Aula', url: data.meetingLink }
          ]]
        } : undefined
      });

      console.log(`✅ Telegram reminder sent to ${chatId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Telegram error:', error);
      return { success: false, error: error.message };
    }
    */

    console.log(`📱 [Telegram Mock] Class reminder would be sent to ${chatId}`);
    console.log(`   Student: ${data.studentName}, Class: ${data.className}`);
    return { success: true, mock: true };
  },

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(chatId, data) {
    // Uncomment when ready:
    /*
    const message = `
💰 *Lembrete de Pagamento*

Olá ${data.studentName}!

O pagamento das aulas vence em breve:

💵 Valor: R$ ${data.amount.toFixed(2)}
📅 Vencimento: ${data.dueDate}

${data.pixCode ? `📲 PIX Copia e Cola:\n\`${data.pixCode}\`` : ''}

Para pagar, acesse a plataforma ou use o PIX acima.
    `;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: data.paymentLink ? {
        inline_keyboard: [[
          { text: '💳 Pagar Agora', url: data.paymentLink }
        ]]
      } : undefined
    });

    return { success: true };
    */

    console.log(`📱 [Telegram Mock] Payment reminder to ${chatId}: R$ ${data.amount}`);
    return { success: true, mock: true };
  },

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(chatId, data) {
    // Uncomment when ready:
    /*
    await bot.sendMessage(chatId, `
✅ *Pagamento Confirmado!*

Recebemos seu pagamento:

👤 Aluno: ${data.studentName}
💵 Valor: R$ ${data.amount.toFixed(2)}
📅 Referente a: ${data.month}/${data.year}

Obrigado! 🎉
    `, { parse_mode: 'Markdown' });

    return { success: true };
    */

    console.log(`📱 [Telegram Mock] Payment confirmation to ${chatId}`);
    return { success: true, mock: true };
  },

  /**
   * Send class summary with AI-generated content
   */
  async sendClassSummary(chatId, data) {
    // Uncomment when ready:
    /*
    await bot.sendMessage(chatId, `
📚 *Resumo da Aula*

*${data.className}*

Olá ${data.studentName}!

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

Continue estudando! 📖
    `, { parse_mode: 'Markdown' });

    return { success: true };
    */

    console.log(`📱 [Telegram Mock] Class summary to ${chatId}`);
    return { success: true, mock: true };
  },

  /**
   * Send material/file to student
   */
  async sendMaterial(chatId, data) {
    // Uncomment when ready:
    /*
    if (data.type === 'pdf' || data.type === 'document') {
      await bot.sendDocument(chatId, data.fileUrl, {
        caption: `📄 *${data.title}*\n\n${data.description || ''}`,
        parse_mode: 'Markdown'
      });
    } else if (data.type === 'image') {
      await bot.sendPhoto(chatId, data.fileUrl, {
        caption: `🖼️ *${data.title}*\n\n${data.description || ''}`,
        parse_mode: 'Markdown'
      });
    } else if (data.type === 'video') {
      await bot.sendVideo(chatId, data.fileUrl, {
        caption: `🎥 *${data.title}*\n\n${data.description || ''}`,
        parse_mode: 'Markdown'
      });
    }

    return { success: true };
    */

    console.log(`📱 [Telegram Mock] Material ${data.title} would be sent to ${chatId}`);
    return { success: true, mock: true };
  },

  /**
   * Send bulk message to multiple students
   */
  async sendBulkMessage(chatIds, message, options = {}) {
    // Uncomment when ready:
    /*
    const results = await Promise.allSettled(
      chatIds.map(chatId =>
        bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          ...options
        })
      )
    );

    return {
      success: true,
      total: chatIds.length,
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
    */

    console.log(`📱 [Telegram Mock] Bulk message to ${chatIds.length} students`);
    return {
      success: true,
      total: chatIds.length,
      sent: chatIds.length,
      failed: 0,
      mock: true
    };
  },

  /**
   * Register student's chat ID
   */
  registerStudent(studentId, chatId) {
    studentChatIds.set(studentId, chatId);
    console.log(`✅ Student ${studentId} registered with Telegram chat ID ${chatId}`);
    return { success: true };
  },

  /**
   * Get student's chat ID
   */
  getStudentChatId(studentId) {
    return studentChatIds.get(studentId);
  }
};

// Initialize bot on module load
telegramService.initialize();

module.exports = telegramService;
