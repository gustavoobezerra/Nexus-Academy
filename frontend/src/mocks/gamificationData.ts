import type { Aluno, PortalNotification } from '../types';

export type PointsAction = {
  id: string;
  label: string;
  amount: number;
  reason: string;
  tone: 'neutral' | 'accent' | 'success';
};

export type RewardItem = {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  available: boolean;
};

export type StudentPointsSnapshot = {
  studentId: string;
  studentName: string;
  totalPoints: number;
  level: number;
  achievements: string[];
  lastUpdate: string;
};

export type StudentActivityEntry = {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  description: string;
  points: number;
  date: string;
  icon: string;
};

export const POINTS_ACTIONS: PointsAction[] = [
  {
    id: 'participacao',
    label: 'Participacao',
    amount: 10,
    reason: 'Participacao destacada na aula',
    tone: 'neutral'
  },
  {
    id: 'desafio',
    label: 'Desafio concluido',
    amount: 25,
    reason: 'Conclusao de desafio pedagogico',
    tone: 'accent'
  },
  {
    id: 'bonus',
    label: 'Bonus de destaque',
    amount: 50,
    reason: 'Bonus por excelente desempenho',
    tone: 'success'
  }
];

export const createRewardCatalog = (currentPoints: number): RewardItem[] => [
  {
    id: 'reward-1',
    name: 'Escolher o proximo tema',
    description: 'O aluno decide o tema de aquecimento da proxima aula.',
    points: 250,
    icon: 'star',
    available: currentPoints >= 250
  },
  {
    id: 'reward-2',
    name: 'Desafio premium',
    description: 'Libera um desafio especial com feedback individual.',
    points: 500,
    icon: 'zap',
    available: currentPoints >= 500
  },
  {
    id: 'reward-3',
    name: 'Aula bonus curta',
    description: 'Sessao extra de 15 minutos para revisar um tema critico.',
    points: 800,
    icon: 'trophy',
    available: currentPoints >= 800
  }
];

const achievementPool = [
  'Participacao consistente',
  'Foco em aula',
  'Sequencia semanal',
  'Resposta rapida',
  'Meta batida'
];

const relativeIso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

/**
 * Como o projeto ainda nao possui historico transacional de pontos, este mock
 * gera um contexto legivel e consistente a partir do total atual do aluno.
 */
export const buildStudentPointsSnapshot = (student: Aluno): StudentPointsSnapshot => {
  const studentId = student._id || student.id || student.email || student.name;
  const totalPoints = student.points || 0;
  const level = student.level || Math.max(1, Math.floor(totalPoints / 250) + 1);
  const achievementCount = Math.max(1, Math.min(achievementPool.length, level));

  return {
    studentId,
    studentName: student.name,
    totalPoints,
    level,
    achievements: achievementPool.slice(0, achievementCount),
    lastUpdate: new Date().toISOString()
  };
};

export const buildStudentActivities = (students: Aluno[]): StudentActivityEntry[] =>
  students.flatMap((student, index) => {
    const studentId = student._id || student.id || `${student.name}-${index}`;
    const basePoints = student.points || 0;

    return [
      {
        id: `${studentId}-activity-1`,
        studentId,
        studentName: student.name,
        type: 'class_completed',
        description: 'Concluiu a aula com participacao ativa',
        points: 20,
        date: relativeIso(12 + index * 2),
        icon: 'award'
      },
      {
        id: `${studentId}-activity-2`,
        studentId,
        studentName: student.name,
        type: 'exercise_submitted',
        description: 'Entregou exercicios da trilha da semana',
        points: 15,
        date: relativeIso(28 + index * 3),
        icon: 'book'
      },
      {
        id: `${studentId}-activity-3`,
        studentId,
        studentName: student.name,
        type: 'streak_bonus',
        description: basePoints >= 500 ? 'Recebeu bonus por manter a sequencia' : 'Iniciou nova sequencia de estudo',
        points: basePoints >= 500 ? 30 : 10,
        date: relativeIso(48 + index * 4),
        icon: 'zap'
      }
    ];
  });

export const createDemoPortalNotifications = (): PortalNotification[] => [
  {
    id: 'demo-hangman-invite',
    title: 'Convite para o jogo da forca',
    message: 'Professor Demo convidou voce para uma rodada de Forca.',
    status: 'delivered',
    createdAt: new Date().toISOString(),
    gameId: 'demo-hangman',
    route: '/portal/hangman?gameId=demo-hangman',
    invitedBy: 'Professor Demo',
    category: 'Ingles',
    hint: 'Palavra ligada a estudo',
    turnDurationSeconds: 20,
    kind: 'hangman_invite'
  }
];
