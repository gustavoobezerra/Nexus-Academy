import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  slug?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  trialEndsAt?: string;
  status?: string;
  onboardingCompletedAt?: string;
  bio?: string;
  subjects?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

/**
 * Lê o usuário persistido sem quebrar a hidratação do app quando o storage
 * contém dados inválidos ou antigos.
 */
const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Store central de autenticação do professor. Os fluxos de login/onboarding
 * dependem destas chaves e, por isso, o redesign visual não altera sua forma
 * de persistência.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
