/**
 * Serviço de Assistente Conversacional IA
 * Integra com Gemini API para fornecer assistência inteligente ao professor
 */

import axios from 'axios';

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

class AIAssistantService {
  constructor() {
    this.conversationHistory = new Map(); // userId -> conversation history
    this.maxHistoryLength = 20;
  }

  isConfigured() {
    return !!GEMINI_API_KEY;
  }

  /**
   * Obter contexto do professor (alunos, aulas, pagamentos)
   */
  async getTeacherContext(teacherId, models) {
    const { User, Student, Class, Payment, Course } = models;
    
    try {
      const [teacher, students, recentClasses, recentPayments, courses] = await Promise.all([
        User.findById(teacherId).select('name email'),
        Student.find({ teacher: teacherId, active: true }).limit(10).select('name email performance points'),
        Class.find({ teacher: teacherId }).sort({ scheduledAt: -1 }).limit(5).select('title scheduledAt status student'),
        Payment.find({ teacher: teacherId }).sort({ dueDate: -1 }).limit(5).select('amount status dueDate student'),
        Course.find({ teacher: teacherId }).limit(5).select('title enrollments')
      ]);

      return {
        teacher: {
          name: teacher?.name,
          email: teacher?.email
        },
        students: {
          total: students.length,
          list: students.map(s => ({
            name: s.name,
            performance: s.performance?.overall || 0,
            points: s.points || 0
          }))
        },
        recentClasses: recentClasses.map(c => ({
          title: c.title,
          scheduledAt: c.scheduledAt,
          status: c.status
        })),
        recentPayments: recentPayments.map(p => ({
          amount: p.amount,
          status: p.status,
          dueDate: p.dueDate
        })),
        courses: {
          total: courses.length,
          totalEnrollments: courses.reduce((sum, c) => sum + (c.enrollments?.length || 0), 0)
        }
      };
    } catch (error) {
      console.error('Error getting teacher context:', error);
      return null;
    }
  }

  /**
   * Processar mensagem do professor e retornar resposta da IA
   */
  async processMessage(teacherId, message, models) {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'IA não configurada. Configure GEMINI_API_KEY no .env',
        mock: true
      };
    }

    try {
      // Obter contexto do professor
      const context = await this.getTeacherContext(teacherId, models);
      
      // Obter histórico da conversa
      const history = this.conversationHistory.get(teacherId) || [];
      
      // Construir prompt com contexto
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Preparar mensagens para Gemini
      const messages = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.slice(-this.maxHistoryLength).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      // Chamar Gemini API
      const response = await axios.post(
        `${GEMINI_API_URL}/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;

      // Atualizar histórico
      this.updateHistory(teacherId, message, aiResponse);

      return {
        success: true,
        message: aiResponse,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI Assistant error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Erro ao processar mensagem. Tente novamente.',
        error: error.message
      };
    }
  }

  /**
   * Construir prompt do sistema com contexto
   */
  buildSystemPrompt(context) {
    if (!context) {
      return `Você é um assistente IA especializado em educação, ajudando professores a gerenciar alunos, aulas e finanças.
      Responda de forma clara, objetiva e em português brasileiro.`;
    }

    return `Você é um assistente IA especializado em educação para o Nexus Academy.

CONTEXTO DO PROFESSOR:
- Nome: ${context.teacher.name}
- Total de alunos ativos: ${context.students.total}
- Aulas recentes: ${context.recentClasses.length}
- Pagamentos recentes: ${context.recentPayments.length}
- Cursos: ${context.courses.total} cursos, ${context.courses.totalEnrollments} matrículas

ALUNOS:
${context.students.list.map(s => `- ${s.name}: Desempenho ${s.performance}%, ${s.points} pontos`).join('\n')}

SUAS CAPACIDADES:
1. Analisar desempenho de alunos e sugerir ações
2. Sugerir horários de aula baseados em histórico
3. Identificar alunos com risco de evasão
4. Analisar dados financeiros e sugerir melhorias
5. Sugerir próximos tópicos de ensino
6. Responder perguntas sobre o sistema

INSTRUÇÕES:
- Seja conciso e direto
- Use dados do contexto quando relevante
- Sugira ações práticas e acionáveis
- Responda em português brasileiro
- Se não souber algo, seja honesto`;
  }

  /**
   * Atualizar histórico de conversa
   */
  updateHistory(teacherId, userMessage, aiResponse) {
    if (!this.conversationHistory.has(teacherId)) {
      this.conversationHistory.set(teacherId, []);
    }

    const history = this.conversationHistory.get(teacherId);
    history.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: aiResponse, timestamp: new Date() }
    );

    // Manter apenas últimas N mensagens
    if (history.length > this.maxHistoryLength * 2) {
      history.splice(0, history.length - this.maxHistoryLength * 2);
    }

    this.conversationHistory.set(teacherId, history);
  }

  /**
   * Limpar histórico de conversa
   */
  clearHistory(teacherId) {
    this.conversationHistory.delete(teacherId);
  }

  /**
   * Obter histórico de conversa
   */
  getHistory(teacherId) {
    return this.conversationHistory.get(teacherId) || [];
  }

  /**
   * Sugestões rápidas baseadas em contexto
   */
  async getQuickSuggestions(teacherId, models) {
    const context = await this.getTeacherContext(teacherId, models);
    
    if (!context) {
      return [];
    }

    const suggestions = [];

    // Alunos com baixo desempenho
    const lowPerformance = context.students.list.filter(s => s.performance < 70);
    if (lowPerformance.length > 0) {
      suggestions.push({
        type: 'warning',
        title: `${lowPerformance.length} aluno(s) com desempenho abaixo de 70%`,
        message: `Considere agendar aulas de reforço para: ${lowPerformance.map(s => s.name).join(', ')}`,
        action: 'view_students'
      });
    }

    // Pagamentos pendentes
    const pendingPayments = context.recentPayments.filter(p => ['pending', 'late'].includes(p.status));
    if (pendingPayments.length > 0) {
      suggestions.push({
        type: 'payment',
        title: `${pendingPayments.length} pagamento(s) pendente(s)`,
        message: 'Revise os pagamentos pendentes e envie lembretes',
        action: 'view_payments'
      });
    }

    // Aulas agendadas hoje
    const today = new Date().toDateString();
    const todayClasses = context.recentClasses.filter(c => 
      new Date(c.scheduledAt).toDateString() === today
    );
    if (todayClasses.length > 0) {
      suggestions.push({
        type: 'info',
        title: `${todayClasses.length} aula(s) hoje`,
        message: `Você tem ${todayClasses.length} aula(s) agendada(s) para hoje`,
        action: 'view_classes'
      });
    }

    return suggestions;
  }
}

export default new AIAssistantService();

