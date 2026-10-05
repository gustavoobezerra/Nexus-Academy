/**
 * API Service - Camada de compatibilidade
 *
 * Este arquivo mantém a API antiga para compatibilidade com código existente,
 * mas agora usa o novo apiService por baixo para aproveitar o tratamento
 * robusto de erros e retry automático.
 *
 * IMPORTANTE: Para novos componentes, use diretamente:
 * import apiService from '@/services/api.service'
 * ou os hooks em @/hooks/useApi
 */

import apiService, { api } from '../services/api.service';
import type { Aluno, Pagamento, Aula, LiveSession } from '../types';

type ApiPayload = Record<string, unknown>;

// ============================================================================
// API PARA AUTENTICAÇÃO
// ============================================================================

export const authAPI = {
  register: (data: ApiPayload) => apiService.post('/auth/register', data),
  login: (credentials: { email: string; password: string }) => apiService.post('/auth/login', credentials),
  getMe: () => apiService.get('/auth/me'),
};

// ============================================================================
// API PARA ALUNOS (STUDENTS)
// ============================================================================

export const studentsAPI = {
  getAll: () => apiService.get<Aluno[]>('/students'),
  getOne: (id: string) => apiService.get<Aluno>(`/students/${id}`),
  create: (data: Partial<Aluno>) => apiService.post<Aluno>('/students', data),
  update: (id: string, data: Partial<Aluno>) => apiService.put<Aluno>(`/students/${id}`, data),
  delete: (id: string) => apiService.delete(`/students/${id}`),
  getStats: () => apiService.get('/students/stats/summary'),
};

// ============================================================================
// API PARA PAGAMENTOS (PAYMENTS)
// ============================================================================

export const paymentsAPI = {
  getAll: () => apiService.get<Pagamento[]>('/payments'),
  create: (data: Partial<Pagamento>) => apiService.post<Pagamento>('/payments', data),
  update: (id: string, data: Partial<Pagamento>) => apiService.put(`/payments/${id}`, data),
  getStats: () => apiService.get('/payments/stats/summary'),
};

// ============================================================================
// API PARA AULAS (CLASSES)
// ============================================================================

export const classesAPI = {
  getAll: () => apiService.get<Aula[]>('/classes'),
  getOne: (id: string) => apiService.get<Aula>(`/classes/${id}`),
  create: (data: Partial<Aula>) => apiService.post<Aula>('/classes', data),
  update: (id: string, data: Partial<Aula>) => apiService.put<Aula>(`/classes/${id}`, data),
  delete: (id: string) => apiService.delete(`/classes/${id}`),
  start: (id: string) => apiService.post(`/classes/${id}/start`),
  end: (id: string) => apiService.post(`/classes/${id}/end`),
  getStats: () => apiService.get('/classes/stats/summary'),
  generateSummary: (id: string, transcript: string) =>
    apiService.post(`/classes/${id}/generate-summary`, { transcript }),
  generateExercises: (id: string, data: ApiPayload) =>
    apiService.post(`/classes/${id}/generate-exercises`, data),
};

// ============================================================================
// API PARA ONBOARDING
// ============================================================================

export const onboardingAPI = {
  checkSlug: (slug: string) => apiService.post('/onboarding/check-slug', { slug }),
  setSlug: (slug: string) => apiService.post('/onboarding/set-slug', { slug }),
  setupManualPayment: (data: {
    manualType: 'pix_in_system' | 'external';
    pixKey?: string;
    pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  }) => apiService.post('/onboarding/setup-manual-payment', data),
  setupAutomaticPayment: (data: {
    provider: 'mercadopago' | 'asaas' | 'pagseguro' | 'efi';
    credentials: ApiPayload;
  }) => apiService.post('/onboarding/setup-automatic-payment', data),
  skipPayment: () => apiService.post('/onboarding/skip-payment'),
  createSubscriptionSession: (plan: 'basic' | 'pro') =>
    apiService.post('/onboarding/create-subscription-session', { plan }),
  complete: () => apiService.post('/onboarding/complete'),
};

// ============================================================================
// API PARA CHAT
// ============================================================================

export const chatAPI = {
  getChats: () => apiService.get('/chat'),
  getMessages: (chatId: string) => apiService.get(`/chat/${chatId}/messages`),
  sendMessage: (chatId: string, content: string) =>
    apiService.post(`/chat/${chatId}/messages`, { content }),
  markAsRead: (chatId: string) => apiService.post(`/chat/${chatId}/read`),
};

// ============================================================================
// API PARA AI ASSISTANT
// ============================================================================

export const aiAssistantAPI = {
  getHistory: () => apiService.get('/ai-assistant/history'),
  getSuggestions: () => apiService.get('/ai-assistant/suggestions'),
  sendMessage: (message: string) => apiService.post('/ai-assistant/chat', { message }),
  clearHistory: () => apiService.delete('/ai-assistant/history'),
};

// ============================================================================
// API PARA QUIZZES
// ============================================================================

export const quizzesAPI = {
  create: (data: ApiPayload) => apiService.post('/quizzes', data),
  update: (id: string, data: ApiPayload) => apiService.put(`/quizzes/${id}`, data),
  delete: (id: string) => apiService.delete(`/quizzes/${id}`),
  getOne: (id: string) => apiService.get(`/quizzes/${id}`),
  getAll: () => apiService.get('/quizzes'),
};

// ============================================================================
// API PARA LIVE CLASS
// ============================================================================

export const liveClassAPI = {
  start: (sessionId: string) => apiService.post(`/live-class/${sessionId}/start`),
  end: (sessionId: string) => apiService.post(`/live-class/${sessionId}/end`),
  getSession: (sessionId: string) => apiService.get<LiveSession>(`/live-class/${sessionId}`),
};

// ============================================================================
// API PARA PORTAL DO ALUNO
// ============================================================================

export const portalAPI = {
  // Autenticação
  login: (email: string, password: string) =>
    apiService.post('/portal/auth/login', { email, password }),
  register: (data: ApiPayload) =>
    apiService.post('/portal/auth/register', data),

  // Perfil
  getProfile: () => apiService.get('/portal/profile'),
  updateProfile: (data: ApiPayload) => apiService.put('/portal/profile', data),

  // Aulas
  getClasses: (params?: { limit?: number }) =>
    apiService.get<Aula[]>('/portal/classes', { params }),
  getClass: (classId: string) => apiService.get<Aula>(`/portal/classes/${classId}`),

  // Pagamentos
  getPayments: () => apiService.get<Pagamento[]>('/portal/payments'),
  getPayment: (paymentId: string) => apiService.get<Pagamento>(`/portal/payments/${paymentId}`),

  // Metas
  getGoals: () => apiService.get('/portal/goals'),
  createGoal: (data: ApiPayload) => apiService.post('/portal/goals', data),
  updateGoal: (goalId: string, data: ApiPayload) =>
    apiService.put(`/portal/goals/${goalId}`, data),
  deleteGoal: (goalId: string) => apiService.delete(`/portal/goals/${goalId}`),

  // Onboarding
  completeOnboarding: (data: ApiPayload) =>
    apiService.post('/portal/onboarding', data),
};

// ============================================================================
// API PARA STUDENT ONBOARDING (Questionários Dinâmicos)
// ============================================================================

export const studentOnboardingAPI = {
  getSubjects: () => apiService.get('/student-onboarding/subjects'),
  selectSubject: (subject: string, customSubject?: string) =>
    apiService.post('/student-onboarding/select-subject', { subject, customSubject }),
  getQuestionnaire: (subject: string) =>
    apiService.post('/student-onboarding/get-questionnaire', { subject }),
  submit: (data: {
    subject: string;
    answers: unknown;
    goals?: string[];
    studyHoursPerWeek?: number;
    preferredSchedule?: string;
  }) => apiService.post('/student-onboarding/submit', data),
};

// ============================================================================
// API PARA DAILY.CO (Videoconferência)
// ============================================================================

export const dailyAPI = {
  // Criar sala de vídeo
  createRoom: (data: {
    classId: string;
    className: string;
    expiryMinutes?: number;
  }) => apiService.post('/daily/create-room', data),

  // Criar token de acesso para sala
  createToken: (data: {
    roomName: string;
    isOwner: boolean;
    userName: string;
  }) => apiService.post('/daily/create-token', data),

  // Obter informações da sala
  getRoomInfo: (roomName: string) => apiService.get(`/daily/room-info/${roomName}`),

  // Deletar sala
  deleteRoom: (roomName: string) => apiService.delete(`/daily/delete-room/${roomName}`),
};

// ============================================================================
// API PARA GAMIFICAÇÃO (XP, Níveis, Badges, Ranking)
// ============================================================================

export const gamificationAPI = {
  // Pontos e XP
  getPoints: () => apiService.get('/gamification/points'),
  addPoints: (points: number, reason: string) =>
    apiService.post('/gamification/points', { points, reason }),

  // Badges e conquistas
  getBadges: () => apiService.get('/gamification/badges'),
  unlockBadge: (badgeId: string) =>
    apiService.post(`/gamification/badges/${badgeId}/unlock`),

  // Ranking
  getRanking: (limit?: number) =>
    apiService.get('/gamification/ranking', { params: { limit } }),
  getMyRank: () => apiService.get('/gamification/ranking/me'),

  // Missões
  getMissions: () => apiService.get('/gamification/missions'),
  completeMission: (missionId: string) =>
    apiService.post(`/gamification/missions/${missionId}/complete`),

  // Stats gerais
  getStats: () => apiService.get('/gamification/stats'),
};

// ============================================================================
// EXPORTAÇÃO DA INSTÂNCIA AXIOS (para casos especiais)
// ============================================================================

export default api;
