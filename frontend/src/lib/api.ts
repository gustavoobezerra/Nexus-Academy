import apiService, { api, ApiError } from '../services/api.service';
import type { Pagamento, Aula, Aluno, TeacherAnalytics, StudentPaymentStatus, AIAnalysis, Activity, LessonPreparation, Contract, HourBank, MarketplaceItem, MarketplacePurchase } from '../types';

// ============================================================================
// API ENDPOINTS WRAPPERS
// ============================================================================

export const paymentsAPI = {
  getAll: () => apiService.get<Pagamento[]>('/payments'),
  update: (id: string, data: Partial<Pagamento>) => apiService.put<Pagamento>(`/payments/${id}`, data),
};

export const classesAPI = {
  getAll: () => apiService.get<{ classes: Aula[] }>('/classes'),
  create: (data: Partial<Aula>) => apiService.post<Aula>('/classes', data),
};

export const studentsAPI = {
  getAll: () => apiService.get<Aluno[]>('/students'),
  create: (data: Partial<Aluno>) => apiService.post<Aluno>('/students', data),
  delete: (id: string) => apiService.delete<void>(`/students/${id}`),
};

export const authAPI = {
  login: (data: { email: string; password: string }) => apiService.post<{ user: { id: string; name: string; email: string; role: string; status?: string; onboardingCompletedAt?: string }; token: string }>('/auth/login', data),
  register: (data: { name: string; email: string; password: string; phone?: string }) => apiService.post<{ user: { id: string; name: string; email: string; role: string; status?: string; onboardingCompletedAt?: string }; token: string }>('/auth/register', data),
};

export const studentOnboardingAPI = {
  getSubjects: () => apiService.get<{ byCategory: Record<string, { name: string; icon: string; category: string; description: string }[]> }>('/student-onboarding/subjects'),
  selectSubject: (subject: string, customSubject?: string) => apiService.post<{ questionnaire: { subject: string; icon: string; description: string; category: string; questions: unknown[] } }>('/student-onboarding/select-subject', { subject, customSubject }),
  submit: (data: { subject: string; answers: Record<string, string | number | string[]>; goals: { title: string }[]; studyHoursPerWeek: number; preferredSchedule: string }) => apiService.post<void>('/student-onboarding/submit', data),
};

export const portalAPI = {
  login: (email: string, password: string) => apiService.post<{ student: Aluno; token: string }>('/portal/login', { email, password }),
  register: (data: Partial<Aluno>) => apiService.post<{ student: Aluno; token: string }>('/portal/register', data),
  getProfile: () => apiService.get<{ student: any }>('/portal/profile'),
  updateProfile: (data: any) => apiService.put<{ student: any }>('/portal/profile', data),
  createGoal: (data: any) => apiService.post<{ goal: any }>('/portal/goals', data),
  updateGoal: (id: string, data: any) => apiService.put<{ goal: any }>(`/portal/goals/${id}`, data),
  deleteGoal: (id: string) => apiService.delete<void>(`/portal/goals/${id}`),
};

export const liveClassAPI = {
  create: (data: { classId: string; className: string }) => apiService.post<{ id: string; url: string }>('/live-classes', data),
  join: (id: string) => apiService.get<{ url: string }>(`/live-classes/${id}/join`),
};

export const dailyAPI = {
  createRoom: (data: { classId: string; className: string; expiryMinutes?: number }) => apiService.post<{ success: boolean; message?: string; room: { url: string; name: string } }>('/daily/create-room', data),
  createToken: (data: { roomName: string; isOwner: boolean; userName: string }) => apiService.post<{ success: boolean; message?: string; token: string }>('/daily/create-token', data),
};

export const onboardingAPI = {
  checkSlug: (slug: string) => apiService.post<{ available: boolean }>('/onboarding/check-slug', { slug }),
  setSlug: (slug: string) => apiService.post<void>('/onboarding/set-slug', { slug }),
  setupManualPayment: (data: { manualType: 'pix_in_system' | 'external'; pixKey?: string; pixKeyType?: string }) => apiService.post<void>('/onboarding/payment/manual', data),
  setupAutomaticPayment: (data: { provider: string; credentials: Record<string, string> }) => apiService.post<void>('/onboarding/payment/automatic', data),
  createSubscriptionSession: (plan: string) => apiService.post<{ checkoutUrl: string }>('/onboarding/subscription', { plan }),
  skipPayment: () => apiService.post<void>('/onboarding/skip-payment'),
};

// ============================================================================
// EXPORT TYPES
// ============================================================================
export type {
  Pagamento,
  Aula,
  Aluno,
  TeacherAnalytics,
  StudentPaymentStatus,
  AIAnalysis,
  Activity,
  LessonPreparation,
  Contract,
  HourBank,
  MarketplaceItem,
  MarketplacePurchase,
  ApiError
};

// Default export for TeacherAnalyticsDashboard.tsx
export default api;
