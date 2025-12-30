import apiService, { api } from '../services/api.service';

// ============================================================================
// AUTHENTICATION API
// ============================================================================
export const authAPI = {
  login: (credentials: any) => apiService.post('/auth/login', credentials),
  register: (data: any) => apiService.post('/auth/register', data),
  me: () => apiService.get('/auth/me'),
  updateProfile: (data: any) => apiService.put('/auth/profile', data)
};

// ============================================================================
// STUDENTS API
// ============================================================================
export const studentsAPI = {
  getAll: (params?: any) => apiService.get('/students', { params }),
  get: (id: string) => apiService.get(`/students/${id}`),
  create: (data: any) => apiService.post('/students', data),
  update: (id: string, data: any) => apiService.put(`/students/${id}`, data),
  delete: (id: string) => apiService.delete(`/students/${id}`),
  getStats: () => apiService.get('/students/stats/summary'),
  addPoints: (studentId: string, amount: number, type: string, description: string) =>
    apiService.post(`/students/${studentId}/points`, { amount, type, description })
};

// ============================================================================
// PAYMENTS API
// ============================================================================
export const paymentsAPI = {
  getAll: (params?: any) => apiService.get('/payments', { params }),
  update: (id: string, data: any) => apiService.put(`/payments/${id}`, data),
  getStats: () => apiService.get('/payments/stats/summary'),
  getStudentStatus: (studentId: string) => apiService.get(`/payments/student/${studentId}/status`)
};

// ============================================================================
// CLASSES API
// ============================================================================
export const classesAPI = {
  getAll: (params?: any) => apiService.get('/classes', { params }),
  get: (id: string) => apiService.get(`/classes/${id}`),
  create: (data: any) => apiService.post('/classes', data),
  update: (id: string, data: any) => apiService.put(`/classes/${id}`, data),
  delete: (id: string) => apiService.delete(`/classes/${id}`),
  start: (id: string) => apiService.post(`/classes/${id}/start`),
  end: (id: string) => apiService.post(`/classes/${id}/end`),
  generateSummary: (id: string, transcript: string) =>
    apiService.post(`/classes/${id}/generate-summary`, { transcript }),
  generateExercises: (id: string, data: any) =>
    apiService.post(`/classes/${id}/generate-exercises`, data)
};

// ============================================================================
// DAILY VIDEO API
// ============================================================================
export const dailyAPI = {
  createRoom: (data: any) => apiService.post('/daily/create-room', data),
  createToken: (data: any) => apiService.post('/daily/create-token', data),
  deleteRoom: (roomName: string) => apiService.delete(`/daily/delete-room/${roomName}`)
};

// ============================================================================
// STUDENT PORTAL API
// ============================================================================
export const portalAPI = {
  login: (email: string, password: string) => apiService.post('/student-portal/login', { email, password }),
  register: (data: any) => apiService.post('/student-portal/register', data),
  getProfile: () => apiService.get('/student-portal/me'),
  updateProfile: (data: any) => apiService.put('/student-portal/me', data),
  getClasses: (params?: any) => apiService.get('/student-portal/classes', { params }),
  getPayments: () => apiService.get('/student-portal/payments'),
  createGoal: (data: any) => apiService.post('/student-portal/goals', data),
  updateGoal: (id: string, data: any) => apiService.put(`/student-portal/goals/${id}`, data),
  deleteGoal: (id: string) => apiService.delete(`/student-portal/goals/${id}`),
  completeOnboarding: (data: any) => apiService.post('/student-portal/complete-onboarding', data),
  materials: () => apiService.get('/student-portal/materials'),
  notifications: () => apiService.get('/student-portal/notifications'),
  financial: () => apiService.get('/student-portal/financial')
};

// ============================================================================
// STUDENT ONBOARDING API
// ============================================================================
export const studentOnboardingAPI = {
  getSubjects: () => apiService.get('/student-onboarding/subjects'),
  selectSubject: (subjectId: string) => apiService.post('/student-onboarding/select-subject', { subjectId }),
  submit: (data: any) => apiService.post('/student-onboarding/submit', data),
  getQuestionnaire: (subjectId: string) => apiService.get(`/student-onboarding/questionnaire/${subjectId}`)
};

// ============================================================================
// TEACHER ONBOARDING API
// ============================================================================
export const onboardingAPI = {
  checkSlug: (slug: string) => apiService.post('/onboarding/check-slug', { slug }),
  setSlug: (slug: string) => apiService.post('/onboarding/set-slug', { slug }),
  setupManualPayment: (data: any) => apiService.post('/onboarding/setup-manual-payment', data),
  setupAutomaticPayment: (data: any) => apiService.post('/onboarding/setup-automatic-payment', data),
  createSubscriptionSession: (plan: string) => apiService.post('/onboarding/create-subscription-session', { plan }),
  skipPayment: () => apiService.post('/onboarding/skip-payment'),
  complete: () => apiService.post('/onboarding/complete')
};

// ============================================================================
// PRONUNCIATION API
// ============================================================================
export const pronunciationAPI = {
  generatePhrase: (difficulty: string) => apiService.post('/portal/pronunciation/generate', { difficulty }),
  analyzeAudio: (formData: FormData) => apiService.upload('/portal/pronunciation/analyze', formData),
  saveHistory: (data: any) => apiService.post('/portal/pronunciation/history', data),
  getHistory: (params?: any) => apiService.get('/portal/pronunciation/history', { params }),
  getStats: () => apiService.get('/portal/pronunciation/stats')
};

export { api };
