import { defaultTemplates, type MessageTemplate } from '../data/messageTemplates';

interface SendMessageParams {
  templateId: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipientPhone?: string;
  recipientEmail?: string;
  variables: Record<string, string>;
}

interface MessageResult {
  success: boolean;
  messageId: string;
  channel: string;
  sentAt: string;
  error?: string;
}

// Estado mock
const sentMessages: MessageResult[] = [];
const templates = [...defaultTemplates];

class MessagingService {
  // Enviar mensagem
  async send(params: SendMessageParams): Promise<MessageResult> {
    const template = templates.find(t => t.id === params.templateId);
    if (!template) {
      return {
        success: false,
        messageId: '',
        channel: params.channel,
        sentAt: new Date().toISOString(),
        error: 'Template não encontrado'
      };
    }

    // Substituir variáveis
    let body = template.body;
    for (const [key, value] of Object.entries(params.variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Simular envio (em produção, integrar com APIs reais)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result: MessageResult = {
      success: true,
      messageId: `msg_${Date.now()}`,
      channel: params.channel,
      sentAt: new Date().toISOString()
    };

    sentMessages.unshift(result);
    console.log(`[MessagingService] Mensagem enviada via ${params.channel}:`, body);

    return result;
  }

  // Agendar mensagem
  async schedule(params: SendMessageParams & { scheduledFor: Date }): Promise<MessageResult> {
    // Em produção, salvar no banco e processar via cron
    console.log(`[MessagingService] Mensagem agendada para ${params.scheduledFor}`);
    return this.send(params);
  }

  // CRUD de templates
  getTemplates(): MessageTemplate[] {
    return templates;
  }

  getTemplate(id: string): MessageTemplate | undefined {
    return templates.find(t => t.id === id);
  }

  createTemplate(template: Omit<MessageTemplate, 'id'>): MessageTemplate {
    const newTemplate = { ...template, id: `template_${Date.now()}` };
    templates.push(newTemplate);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<MessageTemplate>): MessageTemplate | null {
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return null;
    templates[index] = { ...templates[index], ...updates };
    return templates[index];
  }

  deleteTemplate(id: string): boolean {
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    templates.splice(index, 1);
    return true;
  }

  // Histórico
  getHistory(): MessageResult[] {
    return sentMessages;
  }

  // Preencher template com variáveis
  fillTemplate(templateId: string, variables: Record<string, string>): string | null {
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;

    let body = template.body;
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return body;
  }
}

export const messagingService = new MessagingService();
export default messagingService;
