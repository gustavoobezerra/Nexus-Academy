import type { Aluno, Aula } from '../types';

/**
 * Credenciais e colecoes de demonstracao usadas no ambiente local para manter
 * login, estados vazios e o dashboard navegaveis mesmo quando a API ainda nao
 * possui dados reais ou esta indisponivel.
 */
export const DEMO_TEACHER_CREDENTIALS = {
  email: 'demo@nexus.com',
  password: 'Nexus@123',
  name: 'Professor Demo'
} as const;

export const DEMO_STUDENT_CREDENTIALS = {
  email: 'aluno.demo@nexus.com',
  password: 'Aluno@123',
  name: 'Lia Demo'
} as const;

export const DEMO_STUDENT_ACCOUNTS = [
  DEMO_STUDENT_CREDENTIALS,
  {
    email: 'caio.demo@nexus.com',
    password: 'Aluno@123',
    name: 'Caio Demo'
  },
  {
    email: 'sofia.demo@nexus.com',
    password: 'Aluno@123',
    name: 'Sofia Demo'
  }
] as const;

type DashboardMockData = {
  stats: {
    students: {
      totalStudents: number;
      totalMonthlyRevenue: number;
      pendingPayments: number;
    };
    payments: {
      monthlyRevenue: number;
      yearlyRevenue: number;
      pendingAmount: number;
      lateAmount: number;
      pendingCount: number;
      lateCount: number;
    };
  };
  students: Aluno[];
  classes: Aula[];
};

const toIsoDate = (dayOffset: number, hour: number, minute: number) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

/**
 * Gera datas relativas ao dia atual para que o dashboard de exemplo continue
 * coerente ao longo do tempo sem precisar atualizar valores manualmente.
 */
export const createDashboardMockData = (): DashboardMockData => ({
  stats: {
    students: {
      totalStudents: 4,
      totalMonthlyRevenue: 2080,
      pendingPayments: 1
    },
    payments: {
      monthlyRevenue: 1560,
      yearlyRevenue: 18720,
      pendingAmount: 520,
      lateAmount: 480,
      pendingCount: 1,
      lateCount: 1
    }
  },
  students: [
    {
      id: 'demo-student-1',
      name: 'Lia Martins',
      email: 'lia.martins@nexus.demo',
      grade: '9o Ano',
      monthlyFee: 520,
      paymentStatus: 'paid',
      status: 'active',
      subject: 'Matematica',
      nextClass: toIsoDate(0, 14, 0),
      performance: { overall: 91, trend: 'up' },
      profile: {
        description: 'Aluna focada em reforco para provas bimestrais.',
        interests: ['Algebra', 'Geometria']
      }
    },
    {
      id: 'demo-student-2',
      name: 'Caio Rocha',
      email: 'caio.rocha@nexus.demo',
      grade: '8o Ano',
      monthlyFee: 480,
      paymentStatus: 'late',
      status: 'active',
      subject: 'Fisica',
      nextClass: toIsoDate(1, 10, 30),
      performance: { overall: 74, trend: 'stable' }
    },
    {
      id: 'demo-student-3',
      name: 'Sofia Almeida',
      email: 'sofia.almeida@nexus.demo',
      grade: '1o EM',
      monthlyFee: 560,
      paymentStatus: 'pending',
      status: 'active',
      subject: 'Quimica',
      nextClass: toIsoDate(0, 16, 0),
      performance: { overall: 83, trend: 'up' }
    },
    {
      id: 'demo-student-4',
      name: 'Enzo Freitas',
      email: 'enzo.freitas@nexus.demo',
      grade: '7o Ano',
      monthlyFee: 520,
      paymentStatus: 'paid',
      status: 'active',
      subject: 'Portugues',
      nextClass: toIsoDate(2, 9, 0),
      performance: { overall: 88, trend: 'up' }
    }
  ],
  classes: [
    {
      id: 'demo-class-1',
      title: 'Reforco de Algebra',
      studentId: 'demo-student-1',
      studentName: 'Lia Martins',
      subject: 'Matematica',
      grade: '9o Ano',
      scheduledAt: toIsoDate(0, 14, 0),
      duration: 60,
      status: 'scheduled',
      isLive: false,
      notes: 'Foco em expressoes algbricas e inequacoes.'
    },
    {
      id: 'demo-class-2',
      title: 'Interpretacao de Problemas',
      studentId: 'demo-student-4',
      studentName: 'Enzo Freitas',
      subject: 'Portugues',
      grade: '7o Ano',
      scheduledAt: toIsoDate(0, 17, 30),
      duration: 50,
      status: 'scheduled',
      isLive: false
    },
    {
      id: 'demo-class-3',
      title: 'Introducao a Cinematica',
      studentId: 'demo-student-2',
      studentName: 'Caio Rocha',
      subject: 'Fisica',
      grade: '8o Ano',
      scheduledAt: toIsoDate(1, 10, 30),
      duration: 60,
      status: 'scheduled',
      isLive: false
    },
    {
      id: 'demo-class-4',
      title: 'Ligacoes Quimicas',
      studentId: 'demo-student-3',
      studentName: 'Sofia Almeida',
      subject: 'Quimica',
      grade: '1o EM',
      scheduledAt: toIsoDate(-1, 15, 0),
      duration: 60,
      status: 'completed',
      isLive: false,
      notes: 'Boa evolucao na leitura de estruturas moleculares.'
    }
  ]
});
