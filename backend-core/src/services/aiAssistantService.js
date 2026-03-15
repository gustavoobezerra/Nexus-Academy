/**
 * Serviço de Assistente Conversacional IA
 * Integra com Gemini API para fornecer assistência inteligente ao professor
 */

import axios from 'axios';

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

class AIAssistantService {
  constructor() {
    this.conversationHistory = new Map(); // scope:id -> conversation history
    this.maxHistoryLength = 20;
  }

  isConfigured() {
    return !!GEMINI_API_KEY;
  }

  getConversationKey(actorId, scope = 'teacher') {
    return `${scope}:${actorId}`;
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
   * Obter contexto do aluno (professor, próximas aulas, atividades)
   */
  async getStudentContext(studentId, models) {
    const { Student, Class, Payment, Activity, User } = models;

    try {
      const student = await Student.findById(studentId)
        .populate('teacher', 'name email subjects')
        .lean();

      if (!student) {
        return null;
      }

      const [upcomingClasses, recentActivities, payments] = await Promise.all([
        Class.find({ student: studentId })
          .sort({ scheduledAt: 1 })
          .limit(5)
          .select('title subject scheduledAt status duration'),
        Activity.find({ student: studentId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title type status dueDate'),
        Payment.find({ student: studentId })
          .sort({ dueDate: -1 })
          .limit(5)
          .select('amount status dueDate paidAt month year')
      ]);

      let teacher = student.teacher;
      if (!teacher && student.teacher) {
        teacher = await User.findById(student.teacher).select('name email subjects').lean();
      }

      return {
        student: {
          name: student.name,
          grade: student.grade,
          subject: student.subject,
          points: student.points || 0,
          level: student.level || 1,
          performance: student.performance?.overall || 0,
          onboardingCompleted: student.onboarding?.completed || false
        },
        teacher: {
          name: teacher?.name || 'Professor',
          email: teacher?.email || '',
          subjects: teacher?.subjects || []
        },
        upcomingClasses: upcomingClasses.map((item) => ({
          title: item.title,
          subject: item.subject,
          scheduledAt: item.scheduledAt,
          status: item.status,
          duration: item.duration
        })),
        recentActivities: recentActivities.map((item) => ({
          title: item.title,
          type: item.type,
          status: item.status,
          dueDate: item.dueDate
        })),
        payments: payments.map((item) => ({
          amount: item.amount,
          status: item.status,
          dueDate: item.dueDate
        }))
      };
    } catch (error) {
      console.error('Error getting student context:', error);
      return null;
    }
  }

  /**
   * Processar mensagem do professor e retornar resposta da IA
   */
  async processMessage(teacherId, message, models) {
    return this.processTeacherMessage(teacherId, message, models);
  }

  async processTeacherMessage(teacherId, message, models) {
    return this.processActorMessage({
      actorType: 'teacher',
      actorId: teacherId,
      message,
      models
    });
  }

  async processStudentMessage(studentId, message, models) {
    return this.processActorMessage({
      actorType: 'student',
      actorId: studentId,
      message,
      models
    });
  }

  async processActorMessage({ actorType, actorId, message, models }) {
    try {
      const context = actorType === 'teacher'
        ? await this.getTeacherContext(actorId, models)
        : await this.getStudentContext(actorId, models);

      const history = this.getHistory(actorId, actorType);
      const systemPrompt = actorType === 'teacher'
        ? this.buildSystemPrompt(context)
        : this.buildStudentSystemPrompt(context);

      if (!this.isConfigured()) {
        const fallbackMessage = this.generateOfflineResponse({
          actorType,
          context,
          message
        });

        this.updateHistory(actorId, message, fallbackMessage, actorType);

        return {
          success: true,
          message: fallbackMessage,
          timestamp: new Date().toISOString(),
          mock: true
        };
      }

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
      this.updateHistory(actorId, message, aiResponse, actorType);

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

  buildStudentSystemPrompt(context) {
    if (!context) {
      return `Você é um tutor educacional do Nexus Academy.
Responda como um mentor de estudos, em português brasileiro, com linguagem clara e prática.`;
    }

    return `Você é um tutor educacional do Nexus Academy ajudando um aluno.

CONTEXTO DO ALUNO:
- Nome: ${context.student.name}
- Matéria principal: ${context.student.subject || 'não definida'}
- Série/Nível escolar: ${context.student.grade}
- Pontos: ${context.student.points}
- Nível: ${context.student.level}
- Desempenho atual: ${context.student.performance}%
- Professor: ${context.teacher.name}

PRÓXIMAS AULAS:
${context.upcomingClasses.map((item) => `- ${item.title} (${item.subject || 'matéria'}) em ${item.scheduledAt}`).join('\n') || '- Nenhuma aula agendada'}

ATIVIDADES RECENTES:
${context.recentActivities.map((item) => `- ${item.title} (${item.status})`).join('\n') || '- Nenhuma atividade recente'}

INSTRUÇÕES:
- Ajude com organização de estudos, motivação, revisão e entendimento de atividades
- Dê passos curtos e acionáveis
- Fale em português brasileiro
- Quando apropriado, sugira pedir apoio ao professor`;
  }

  generateOfflineResponse({ actorType, context, message }) {
    const lowerMessage = String(message || '').toLowerCase();

    if (actorType === 'student') {
      const nextClass = context?.upcomingClasses?.[0];
      const pendingPayment = context?.payments?.find((payment) => ['pending', 'late', 'overdue'].includes(payment.status));

      if (lowerMessage.includes('aula') && nextClass) {
        return `Sua próxima aula é "${nextClass.title}" em ${new Date(nextClass.scheduledAt).toLocaleString('pt-BR')}. Revise ${nextClass.subject || 'o conteúdo da matéria'} por 15 minutos antes de entrar.`;
      }

      if ((lowerMessage.includes('pagamento') || lowerMessage.includes('mensalidade')) && pendingPayment) {
        return `Existe um pagamento com status ${pendingPayment.status}. O melhor caminho é abrir a área de pagamentos do portal e confirmar a data de vencimento com seu professor.`;
      }

      return `Estou em modo local no momento, mas consigo te orientar com base no seu portal. Você está no nível ${context?.student?.level || 1}, com ${context?.student?.points || 0} pontos. Foque em revisar a matéria principal, registrar suas dúvidas e usar o chat com ${context?.teacher?.name || 'seu professor'} quando precisar de algo específico.`;
    }

    const lowPerformance = context?.students?.list?.filter((student) => student.performance < 70) || [];
    const pendingPayments = context?.recentPayments?.filter((payment) => ['pending', 'late'].includes(payment.status)) || [];

    if (lowerMessage.includes('pagamento') && pendingPayments.length > 0) {
      return `Você tem ${pendingPayments.length} pagamento(s) recente(s) com pendência. Priorize uma régua curta: lembrete amigável, confirmação de leitura e follow-up em 48 horas.`;
    }

    if ((lowerMessage.includes('desempenho') || lowerMessage.includes('aluno')) && lowPerformance.length > 0) {
      return `Os alunos com maior necessidade de atenção agora são ${lowPerformance.map((student) => student.name).join(', ')}. Vale revisar frequência, tarefas entregues e propor um reforço curto com objetivo específico para a próxima aula.`;
    }

    return `Estou em modo local, mas consigo resumir seu contexto atual: ${context?.students?.total || 0} aluno(s) ativos, ${context?.recentClasses?.length || 0} aula(s) recente(s) e ${pendingPayments.length} pagamento(s) pendente(s). Posso te ajudar com prioridades pedagógicas, agenda e cobrança.`;
  }

  /**
   * Atualizar histórico de conversa
   */
  updateHistory(actorId, userMessage, aiResponse, scope = 'teacher') {
    const historyKey = this.getConversationKey(actorId, scope);

    if (!this.conversationHistory.has(historyKey)) {
      this.conversationHistory.set(historyKey, []);
    }

    const history = this.conversationHistory.get(historyKey);
    history.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: aiResponse, timestamp: new Date() }
    );

    // Manter apenas últimas N mensagens
    if (history.length > this.maxHistoryLength * 2) {
      history.splice(0, history.length - this.maxHistoryLength * 2);
    }

    this.conversationHistory.set(historyKey, history);
  }

  /**
   * Gerar atividade pedagógica com questões reais usando Gemini
   */
  async generateActivity(lessonTopic, lessonSubject, lessonDescription) {
    if (!this.isConfigured()) {
      return null;
    }

    const descriptionPart = lessonDescription
      ? `\n- Descrição da aula: ${lessonDescription}`
      : '';

    const prompt = `Você é um professor especialista e criador de provas pedagógicas de alta qualidade.

Crie exatamente 6 questões de estudo variadas sobre:
- Tópico: ${lessonTopic}
- Matéria: ${lessonSubject}${descriptionPart}

RETORNE APENAS JSON VÁLIDO sem nenhum texto antes ou depois, sem markdown, sem blocos de código:

{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Texto da pergunta específica sobre o tópico?",
      "difficulty": "easy",
      "points": 10,
      "options": [
        { "letter": "A", "text": "Texto real e substantivo da opção A" },
        { "letter": "B", "text": "Texto real e substantivo da opção B" },
        { "letter": "C", "text": "Texto real e substantivo da opção C" },
        { "letter": "D", "text": "Texto real e substantivo da opção D" }
      ],
      "correctLetter": "B",
      "explanation": "Explicação detalhada de por que B é a correta e as outras não"
    }
  ]
}

REGRAS OBRIGATÓRIAS (violação invalida a resposta):
1. Questões devem ser ESPECÍFICAS sobre "${lessonTopic}" - nunca genéricas ou sobre outro assunto
2. O texto de cada opção deve ser CONTEÚDO REAL sobre o tema - jamais use "opção A", "alternativa correta", "placeholder", "conceito principal", ou qualquer descrição do tipo de opção
3. Todas as opções incorretas devem ser plausíveis e enganosas para quem não estudou
4. Distribua os 6 tipos assim: 3 multiple_choice, 1 true_false, 1 essay, 1 fill_blank
5. Para true_false: options = [{"letter":"A","text":"Verdadeiro"},{"letter":"B","text":"Falso"}], defina correctLetter como A ou B
6. Para essay: sem campo "options", adicione "correctAnswer" com os critérios de avaliação da resposta ideal
7. Para fill_blank: sem campo "options", adicione "correctAnswer" com a resposta esperada para completar o espaço
8. Distribuição de dificuldade: 2 easy (10pts), 3 medium (15pts), 1 hard (25pts)
9. NUNCA coloque palavras como "correta", "incorreta", "errada", "certa", "melhor resposta" dentro do texto das alternativas
10. A pergunta da questão deve estar completa e ser autoexplicativa`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const rawText = response.data.candidates[0].content.parts[0].text;
      // Remove possíveis blocos de markdown ao redor do JSON
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(jsonText);

      // Mapear correctLetter para isCorrect em cada opção
      const questions = (parsed.questions || []).map((q, index) => {
        const base = {
          questionNumber: index + 1,
          type: q.type,
          question: q.question,
          difficulty: q.difficulty || 'medium',
          points: q.points || 10,
          explanation: q.explanation || '',
          topics: [lessonSubject]
        };

        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          return {
            ...base,
            options: (q.options || []).map(opt => ({
              letter: opt.letter,
              text: opt.text,
              isCorrect: opt.letter === q.correctLetter
            }))
          };
        }

        return { ...base, correctAnswer: q.correctAnswer || '' };
      });

      return { questions };
    } catch (error) {
      console.error('generateActivity error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Limpar histórico de conversa
   */
  clearHistory(actorId, scope = 'teacher') {
    this.conversationHistory.delete(this.getConversationKey(actorId, scope));
  }

  /**
   * Obter histórico de conversa
   */
  getHistory(actorId, scope = 'teacher') {
    return this.conversationHistory.get(this.getConversationKey(actorId, scope)) || [];
  }

  /**
   * Sugestões rápidas baseadas em contexto
   */
  async getQuickSuggestions(actorId, models, actorType = 'teacher') {
    if (actorType === 'student') {
      return this.getStudentQuickSuggestions(actorId, models);
    }

    const context = await this.getTeacherContext(actorId, models);

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

  async getStudentQuickSuggestions(studentId, models) {
    const context = await this.getStudentContext(studentId, models);

    if (!context) {
      return [];
    }

    const suggestions = [];
    const nextClass = context.upcomingClasses[0];
    const pendingActivity = context.recentActivities.find((activity) => activity.status === 'pending');
    const pendingPayment = context.payments.find((payment) => ['pending', 'late', 'overdue'].includes(payment.status));

    if (nextClass) {
      suggestions.push({
        type: 'class',
        title: 'Preparar próxima aula',
        message: `Como posso me preparar para a aula "${nextClass.title}"?`,
        action: 'view_classes'
      });
    }

    if (pendingActivity) {
      suggestions.push({
        type: 'activity',
        title: 'Organizar estudos',
        message: `Me ajude a concluir a atividade "${pendingActivity.title}"`,
        action: 'view_activities'
      });
    }

    if (pendingPayment) {
      suggestions.push({
        type: 'payment',
        title: 'Entender pagamentos',
        message: 'Explique meu status de pagamentos e o que eu devo fazer agora',
        action: 'view_payments'
      });
    }

    suggestions.push({
      type: 'study',
      title: 'Plano de estudo curto',
      message: 'Monte um plano de estudo para esta semana',
      action: 'study_plan'
    });

    return suggestions;
  }
}

export default new AIAssistantService();

