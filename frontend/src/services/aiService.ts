import type { Aluno, Aula, LessonPreparation } from '../types';
import axios from 'axios';

interface AIServiceConfig {
  useMock: boolean;
  apiKey?: string;
  model?: string;
}

const baseFromEnv = import.meta.env.VITE_AI_SERVICE_URL?.trim() ?? '';
const derivedBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '').replace(/\/api$/, '/ai') : '';
const AI_SERVICE_URL = (baseFromEnv || derivedBase).replace(/\/$/, '');

const config: AIServiceConfig = {
  useMock: import.meta.env.VITE_USE_MOCK_AI !== 'false',
  apiKey: import.meta.env.VITE_AI_SERVICE_KEY,
  model: import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini',
};

async function requestAI<T>(endpoint: string, payload: Record<string, unknown>, fallback: () => T | Promise<T>): Promise<T> {
  if (config.useMock || !AI_SERVICE_URL) {
    return fallback();
  }

  try {
    const response = await axios.post<T>(`${AI_SERVICE_URL}${endpoint}`, {
      model: config.model,
      ...payload,
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      }
    });

    return response.data;
  } catch (error) {
    console.error('AI service request failed:', error);
    return fallback();
  }
}

// Generate lesson plan
export async function generateLessonPlan(
  classData: Aula,
  student: Aluno
): Promise<LessonPreparation> {
  return requestAI('/lesson-plan', { classData, student }, () => generateMockLessonPlan(classData, student));
}

// Generate post-class summary
export async function generateClassSummary(
  classData: Aula,
  student: Aluno,
  notes?: string
): Promise<{
  summary: string;
  keyPoints: string[];
  homework: string[];
  nextSteps: string[];
  parentReport: string;
}> {
  return requestAI('/class-summary', { classData, student, notes }, () => generateMockSummary(classData, student, notes));
}

// Generate homework/exercises
export async function generateHomework(
  topic: string,
  count: number
): Promise<{
  title: string;
  exercises: {
    question: string;
    type: 'multiple_choice' | 'open' | 'true_false';
    options?: string[];
    answer: string;
    explanation: string;
  }[];
}> {
  const fallback = () => ({
    title: `Exercicios de ${topic}`,
    exercises: Array(count).fill(null).map((_item, i) => ({
      question: `Questao ${i + 1} sobre ${topic}`,
      type: 'open' as const,
      answer: 'Resposta modelo',
      explanation: 'Explicacao da resposta'
    }))
  });

  return requestAI('/homework', { topic, count }, fallback);
}

// NEW: AI Assistant - Real-time suggestions during class
export async function getRealtimeSuggestions(
  topic: string,
  studentLevel: string,
  currentContext: string
): Promise<{
  suggestions: string[];
  examples: string[];
  questions: string[];
}> {
  const fallback = () => ({
    suggestions: [
      `Tente explicar ${topic} usando uma analogia do dia a dia`,
      'Faça uma pausa para verificar a compreensão do aluno',
      'Proponha um exercício prático simples'
    ],
    examples: [
      `Exemplo prático de ${topic} aplicado ao cotidiano`,
      'Demonstração visual do conceito',
      'Caso de uso real'
    ],
    questions: [
      `O que você entende por ${topic}?`,
      'Consegue me dar um exemplo?',
      'Onde você acha que isso se aplica?'
    ]
  });

  return requestAI('/realtime-suggestions', { topic, studentLevel, currentContext }, fallback);
}

// NEW: Detect difficult topics
export async function detectDifficultTopics(
  studentId: string,
  classHistory: Aula[]
): Promise<{
  difficultTopics: { topic: string; difficulty: number; count: number }[];
  recommendations: string[];
}> {
  const fallback = () => ({
    difficultTopics: [
      { topic: 'Equações de 2º Grau', difficulty: 7.5, count: 3 },
      { topic: 'Funções Exponenciais', difficulty: 6.8, count: 2 },
      { topic: 'Geometria Espacial', difficulty: 6.2, count: 4 }
    ],
    recommendations: [
      'Revisitar conceitos base de álgebra antes de avançar',
      'Usar mais representações visuais para geometria',
      'Aumentar o número de exercícios práticos'
    ]
  });

  return requestAI('/difficult-topics', { studentId, classHistory }, fallback);
}

// NEW: Performance prediction
export async function predictPerformance(
  studentId: string,
  subject: string
): Promise<{
  currentLevel: number;
  predictedLevel: number;
  trend: 'up' | 'down' | 'stable';
  factors: { factor: string; impact: 'positive' | 'negative' }[];
  recommendations: string[];
}> {
  const fallback = () => ({
    currentLevel: 75,
    predictedLevel: 82,
    trend: 'up' as const,
    factors: [
      { factor: 'Frequência nas aulas', impact: 'positive' as const },
      { factor: 'Conclusão de tarefas', impact: 'positive' as const },
      { factor: 'Participação ativa', impact: 'positive' as const },
      { factor: 'Tempo entre aulas', impact: 'negative' as const }
    ],
    recommendations: [
      'Manter a regularidade das aulas',
      'Reforçar tópicos de dificuldade identificados',
      'Propor desafios progressivamente mais complexos'
    ]
  });

  return requestAI('/performance', { studentId, subject }, fallback);
}

// NEW: Evasion risk analysis
export async function analyzeEvasionRisk(
  studentId: string
): Promise<{
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: { indicator: string; weight: number }[];
  interventions: string[];
}> {
  const fallback = () => ({
    riskScore: 25,
    riskLevel: 'low' as const,
    indicators: [
      { indicator: 'Frequência regular', weight: -20 },
      { indicator: 'Pagamentos em dia', weight: -15 },
      { indicator: 'Engajamento nas aulas', weight: -10 },
      { indicator: 'Ausência recente', weight: 10 }
    ],
    interventions: [
      'Enviar mensagem de acompanhamento',
      'Verificar satisfação com as aulas',
      'Oferecer flexibilidade de horários se necessário'
    ]
  });

  return requestAI('/evasion-risk', { studentId }, fallback);
}

// NEW: Generate quiz from content
export async function generateQuiz(
  topic: string,
  content: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionCount: number
): Promise<{
  title: string;
  questions: {
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'fill_blank';
    options?: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }[];
  totalPoints: number;
}> {
  const fallback = () => {
    const questions = Array(questionCount).fill(null).map((_, i) => ({
      id: `q_${Date.now()}_${i}`,
      question: `Pergunta ${i + 1} sobre ${topic}`,
      type: 'multiple_choice' as const,
      options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correctAnswer: 'Opção A',
      explanation: `Explicação da resposta correta para questão ${i + 1}`,
      points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
    }));

    return {
      title: `Quiz: ${topic}`,
      questions,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0)
    };
  };

  return requestAI('/quiz', { topic, content, difficulty, questionCount }, fallback);
}

// NEW: Generate personalized learning path
export async function generateLearningPath(
  studentId: string,
  subject: string,
  targetGoal: string
): Promise<{
  path: {
    step: number;
    topic: string;
    description: string;
    estimatedHours: number;
    prerequisites: string[];
  }[];
  totalHours: number;
  milestones: { step: number; milestone: string }[];
}> {
  const fallback = () => ({
    path: [
      { step: 1, topic: 'Fundamentos', description: 'Conceitos básicos', estimatedHours: 4, prerequisites: [] },
      { step: 2, topic: 'Conceitos Intermediários', description: 'Aprofundamento', estimatedHours: 6, prerequisites: ['Fundamentos'] },
      { step: 3, topic: 'Aplicações Práticas', description: 'Exercícios avançados', estimatedHours: 8, prerequisites: ['Conceitos Intermediários'] },
      { step: 4, topic: 'Domínio Completo', description: 'Consolidação', estimatedHours: 4, prerequisites: ['Aplicações Práticas'] }
    ],
    totalHours: 22,
    milestones: [
      { step: 2, milestone: 'Compreensão básica consolidada' },
      { step: 4, milestone: 'Objetivo alcançado' }
    ]
  });

  return requestAI('/learning-path', { studentId, subject, targetGoal }, fallback);
}

// NEW: Analyze transcript for insights
export async function analyzeTranscript(
  transcript: string
): Promise<{
  topics: string[];
  studentEngagement: number;
  keyMoments: { time: string; description: string }[];
  suggestedFollowUp: string[];
}> {
  const fallback = () => {
    const wordCount = transcript.split(' ').length;
    return {
      topics: ['Tópico principal identificado', 'Conceitos relacionados'],
      studentEngagement: Math.min(100, Math.round(wordCount / 10)),
      keyMoments: [
        { time: '5:00', description: 'Introdução do conceito principal' },
        { time: '15:00', description: 'Momento de dúvida - esclarecido' },
        { time: '25:00', description: 'Aplicação prática bem-sucedida' }
      ],
      suggestedFollowUp: [
        'Reforçar conceito discutido aos 15min',
        'Enviar material complementar',
        'Propor exercício relacionado'
      ]
    };
  };

  return requestAI('/transcript-insights', { transcript }, fallback);
}

// Mock implementations
function generateMockLessonPlan(classData: Aula, student: Aluno): LessonPreparation {
  const duration = classData.duration || 60;
  const warmupTime = Math.min(10, duration * 0.15);
  const mainTime = duration * 0.50;
  const practiceTime = duration * 0.25;
  const reviewTime = duration - warmupTime - mainTime - practiceTime;

  return {
    _id: `prep_${Date.now()}`,
    class: classData._id || classData.id || '',
    student: student._id || student.id || '',
    teacher: 'teacher_demo',
    topic: classData.title,
    subtopics: [
      `Introducao a ${classData.subject}`,
      'Conceitos fundamentais',
      'Aplicacoes praticas',
      'Exercicios de fixacao'
    ],
    objectives: [
      { objective: `Compreender os fundamentos de ${classData.subject}`, priority: 'primary' },
      { objective: `Aplicar ${classData.subject} em exercicios praticos`, priority: 'primary' },
      { objective: `Relacionar ${classData.subject} com conhecimento previo`, priority: 'secondary' }
    ],
    structure: {
      warmup: {
        duration: warmupTime,
        description: 'Revisao do conteudo anterior e introducao ao novo tema',
        activities: [
          'Perguntar sobre duvidas da aula anterior',
          `Fazer pergunta instigante sobre ${classData.subject}`,
          'Conectar com experiencias do cotidiano'
        ]
      },
      mainContent: {
        duration: mainTime,
        description: 'Apresentacao do conteudo principal',
        keyPoints: [
          `Definicao de ${classData.subject}`,
          'Exemplos praticos e demonstracoes',
          'Conceitos-chave e suas relacoes',
          'Aplicacoes no dia a dia'
        ],
        teachingMethod: 'mixed',
        materials: [
          'Apresentacao visual com slides',
          'Exemplos praticos demonstrativos',
          'Exercicios resolvidos passo a passo'
        ]
      },
      practice: {
        duration: practiceTime,
        exercises: [
          { difficulty: 'easy', description: 'Exercicio introdutorio', estimatedTime: practiceTime * 0.3 },
          { difficulty: 'medium', description: 'Exercicio de aplicacao', estimatedTime: practiceTime * 0.4 },
          { difficulty: 'hard', description: 'Desafio opcional', estimatedTime: practiceTime * 0.3 }
        ]
      },
      review: {
        duration: reviewTime,
        keyTakeaways: [`Principais conceitos de ${classData.subject}`],
        questionsToAsk: ['O que voce achou mais interessante na aula de hoje?']
      },
      homework: {
        assigned: true,
        description: `Lista de exercicios sobre ${classData.subject}`,
        estimatedTime: 20
      }
    },
    materials: [
      { type: 'presentation', title: `Apresentacao: ${classData.title}`, description: 'Slides' },
      { type: 'document', title: 'Lista de Exercicios', description: 'Exercicios de fixacao' }
    ],
    prerequisites: [`Conhecimentos basicos de ${student.grade || 'Nivel atual'}`],
    anticipatedDifficulties: [
      { concept: 'Conceitos abstratos', strategy: 'Usar analogias', examples: ['Comparar com situacoes familiares'] }
    ],
    differentiation: {
      forStruggling: ['Revisar pre-requisitos', 'Usar mais exemplos'],
      forAdvanced: ['Propor desafios extras', 'Conectar com topicos avancados'],
      visualLearners: ['Diagramas', 'Videos'],
      auditoryLearners: ['Explicacoes verbais', 'Discussoes'],
      kinestheticLearners: ['Atividades hands-on', 'Experimentacao']
    },
    assessmentPlan: {
      formative: ['Perguntas durante a explicacao', 'Observacao'],
      summative: 'Exercicios para casa',
      selfAssessment: true
    },
    generatedByAI: true,
    aiMetadata: {
      basedOn: { previousClasses: [], studentPerformance: { level: student.grade || 'Medium' }, detectedDifficulties: [] },
      generatedAt: new Date().toISOString(),
      confidence: 85
    },
    teacherReview: { reviewed: false, modifications: [], approved: false },
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateMockSummary(classData: Aula, student: Aluno, notes?: string) {
  return {
    summary: `Aula de ${classData.subject} com ${student.name}. ${notes || 'O aluno demonstrou bom engajamento durante a aula.'}`,
    keyPoints: [
      `Topico principal: ${classData.title}`,
      'Conceitos fundamentais foram abordados',
      'Exercicios praticos realizados'
    ],
    homework: [
      'Revisar material da aula',
      'Completar exercicios da lista',
      'Preparar duvidas para proxima aula'
    ],
    nextSteps: [
      'Continuar com topico relacionado',
      'Aprofundar conceitos introduzidos'
    ],
    parentReport: `Prezado(a) responsavel,\n\nHoje ${student.name} teve aula de ${classData.subject}. O conteudo abordado foi "${classData.title}". O aluno demonstrou bom desempenho e engajamento.\n\nAtenciosamente,\nProfessor`
  };
}

export const aiService = {
  generateLessonPlan,
  generateClassSummary,
  generateHomework,
  getRealtimeSuggestions,
  detectDifficultTopics,
  predictPerformance,
  analyzeEvasionRisk,
  generateQuiz,
  generateLearningPath,
  analyzeTranscript,
  config
};

export default aiService;
