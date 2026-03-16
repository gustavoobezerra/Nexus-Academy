import apiService, { api, ApiError } from '../services/api.service';
import type { Pagamento, Aula, Aluno, TeacherAnalytics, StudentPaymentStatus, AIAnalysis, Activity, LessonPreparation, Contract, HourBank, MarketplaceItem, MarketplacePurchase } from '../types';

// ============================================================================
// API ENDPOINTS WRAPPERS
// ============================================================================

export const paymentsAPI = {
  getAll: () => apiService.get<Pagamento[]>('/payments'),
  getStats: () => apiService.get<{ stats: { monthlyRevenue: number; yearlyRevenue: number; pendingAmount: number; lateAmount: number; pendingCount: number; lateCount: number } }>('/payments/stats'),
  update: (id: string, data: Partial<Pagamento>) => apiService.put<Pagamento>(`/payments/${id}`, data),
};

export const classesAPI = {
  getAll: (params?: { page?: number; limit?: number }) => apiService.get<{ classes: Aula[]; total: number; totalPages: number }>('/classes', { params }),
  create: (data: Partial<Aula>) => apiService.post<{ success: boolean; class: Aula }>('/classes', data),
  start: (id: string) => apiService.post<{ success: boolean; class: Aula }>(`/classes/${id}/start`),
  end: (id: string) => apiService.post<{ success: boolean; class: Aula }>(`/classes/${id}/end`),
  delete: (id: string) => apiService.delete<void>(`/classes/${id}`),
  generateSummary: (classId: string, transcript: string) => apiService.post<{ success: boolean; aiSummary: string }>(`/classes/${classId}/generate-summary`, { transcript }),
  sendSummary: (classId: string, data: { parentEmail: string; studentName: string; summary: string; keyPoints: string[]; homework: string[]; className: string }) =>
    apiService.post<{ success: boolean; message: string }>(`/classes/${classId}/send-summary`, data),
};

export const studentsAPI = {
  getAll: () => apiService.get<{ students: Aluno[] }>('/students'),
  getStats: () => apiService.get<{ stats: { totalStudents: number; totalMonthlyRevenue: number; pendingPayments: number } }>('/students/stats'),
  create: (data: Partial<Aluno>) => apiService.post<{ success: boolean; student: Aluno }>('/students', data),
  delete: (id: string) => apiService.delete<void>(`/students/${id}`),
  addPoints: (studentId: string, points: number, _eventType: string, reason: string) =>
    apiService.post<{ success: boolean; message: string; student: { id: string; totalPoints: number; awarded: number } }>(
      '/gamification/award-points',
      { studentId, points, reason }
    ),
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
  login: (email: string, password: string) => apiService.post<{ student: Aluno; token: string }>('/portal/auth/login', { email, password }),
  register: (data: Partial<Aluno>) => apiService.post<{ student: Aluno; token: string }>('/portal/auth/register', data),
  getProfile: () => apiService.get<{ student: Aluno }>('/portal/profile'),
  updateProfile: (data: unknown) => apiService.put<{ success: boolean; message: string; profile: Aluno['profile'] }>('/portal/profile', data),
  completeOnboarding: (data: unknown) => apiService.post<{ success: boolean; message: string }>('/portal/onboarding', data),
  createGoal: (data: unknown) => apiService.post<{ goal: Record<string, unknown> }>('/portal/goals', data),
  updateGoal: (id: string, data: unknown) => apiService.put<{ goal: Record<string, unknown> }>(`/portal/goals/${id}`, data),
  deleteGoal: (id: string) => apiService.delete<void>(`/portal/goals/${id}`),
  getClasses: (params?: { status?: string; limit?: number; page?: number }) =>
    apiService.get<{ classes: Aula[]; pagination?: { total: number; page: number; limit: number; pages: number } }>('/portal/classes', { params }),
  getPayments: () => apiService.get<{ payments: Pagamento[] }>('/portal/payments'),
  getActivities: () => apiService.get<{ activities: Activity[] }>('/portal/activities')
};

export const liveClassAPI = {
  create: (data: { classId: string; className?: string }) => apiService.post<{ success: boolean; session: { sessionId: string; classId: string; status: string } }>('/live-class/start', data),
  join: (sessionId: string) => apiService.post<{ success: boolean; session: { sessionId: string; classId: string; status: string } }>(`/live-class/${sessionId}/join`),
  end: (sessionId: string) => apiService.post<{ success: boolean; session: { sessionId: string; classId: string; status: string; duration: number } }>(`/live-class/${sessionId}/end`),
  getSession: (sessionId: string) => apiService.get<{ success: boolean; session: { sessionId: string; classId: string; teacherId: string; studentId: string; status: string; startTime: string } }>(`/live-class/${sessionId}`),
};

export const dailyAPI = {
  createRoom: (data: { classId: string; className: string; expiryMinutes?: number }) => apiService.post<{ success: boolean; message?: string; room: { url: string; name: string } }>('/daily/create-room', data),
  createToken: (data: { roomName: string; classId: string; isOwner: boolean; userName: string }) => apiService.post<{ success: boolean; message?: string; token: string }>('/daily/create-token', data),
};

export const onboardingAPI = {
  checkSlug: (slug: string) => apiService.post<{ available: boolean }>('/onboarding/check-slug', { slug }),
  setSlug: (slug: string) => apiService.post<void>('/onboarding/set-slug', { slug }),
  setupManualPayment: (data: { manualType: 'pix_in_system' | 'external'; pixKey?: string; pixKeyType?: string }) => apiService.post<void>('/onboarding/setup-manual-payment', data),
  setupAutomaticPayment: (data: { provider: string; credentials: Record<string, string> }) => apiService.post<void>('/onboarding/setup-automatic-payment', data),
  createSubscriptionSession: (plan: string) => apiService.post<{ checkoutUrl: string }>('/onboarding/create-subscription-session', { plan }),
  skipPayment: () => apiService.post<void>('/onboarding/skip-payment'),
  complete: () => apiService.post<{ user: { id: string; name: string; email: string; slug: string; subscriptionStatus?: string; subscriptionPlan?: string; trialEndsAt?: string; status?: string; publicUrl?: string } }>('/onboarding/complete')
};

export const aiAPI = {
  generateActivity: (data: { lessonTopic: string; lessonSubject: string; lessonDescription?: string }) =>
    apiService.post<{ success: boolean; questions: import('../types').Question[] }>('/ai/generate-activity', data),
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
