import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// ============================================================================
// CONFIGURAÇÃO E TIPOS
// ============================================================================

interface ApiError {
  type: 'network' | 'validation' | 'auth' | 'forbidden' | 'notfound' | 'server' | 'timeout' | 'unknown';
  message: string;
  field?: string;
  code?: string;
  status?: number;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatuses: number[];
}

interface ValidationErrorDetail {
  field?: string;
  message: string;
}

interface ErrorResponseBody {
  message?: string;
  field?: string;
  errors?: ValidationErrorDetail[];
  code?: string;
  status?: number;
  [key: string]: unknown;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo inicial
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const LOCAL_API_PORT = 5000;
const LOCAL_DEV_PORTS = new Set(['3000', '4173', '4174', '4175', '4176', '4177', '5173', '5174', '5175', '5176', '5177']);

const normalizeLocalApiUrl = (rawUrl: string): string => {
  if (rawUrl === '/api') {
    return rawUrl;
  }

  if (typeof window === 'undefined') {
    return rawUrl;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const currentHostname = window.location.hostname;

    if (
      import.meta.env.DEV &&
      LOCAL_HOSTNAMES.has(parsedUrl.hostname) &&
      LOCAL_HOSTNAMES.has(currentHostname)
    ) {
      parsedUrl.hostname = currentHostname;
    }

    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
};

const uniqueApiCandidates = (candidates: string[]): string[] => {
  const seen = new Set<string>();
  const normalizedCandidates: string[] = [];

  candidates
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .forEach((candidate) => {
      const normalizedCandidate = normalizeLocalApiUrl(candidate);
      if (!seen.has(normalizedCandidate)) {
        seen.add(normalizedCandidate);
        normalizedCandidates.push(normalizedCandidate);
      }
    });

  return normalizedCandidates;
};

const getApiCandidates = (): string[] => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  const candidates: string[] = [];

  if (envUrl) {
    candidates.push(envUrl);
  }

  if (typeof window === 'undefined') {
    return uniqueApiCandidates(candidates.length > 0 ? candidates : [`http://localhost:${LOCAL_API_PORT}/api`]);
  }

  const { hostname, port } = window.location;
  const isLocalRuntime = LOCAL_HOSTNAMES.has(hostname) || LOCAL_DEV_PORTS.has(port);

  if (import.meta.env.DEV || isLocalRuntime) {
    candidates.push('/api');
    candidates.push(`http://${hostname}:${LOCAL_API_PORT}/api`);
    candidates.push(`http://localhost:${LOCAL_API_PORT}/api`);
    candidates.push(`http://127.0.0.1:${LOCAL_API_PORT}/api`);
  }

  if (candidates.length === 0) {
    candidates.push('/api');
  }

  return uniqueApiCandidates(candidates);
};

type ApiRequestConfig = InternalAxiosRequestConfig & {
  _apiBaseCandidates?: string[];
  _apiBaseAttempt?: number;
};

const stripApiSuffix = (baseUrl: string): string => baseUrl.replace(/\/api\/?$/, '');

// ============================================================================
// INSTÂNCIA AXIOS COM CONFIGURAÇÃO BASE
// ============================================================================

// Configuração de URL da API com validação de HTTPS em produção
const API_CANDIDATES = getApiCandidates();
const API_URL = API_CANDIDATES[0];

if (
  import.meta.env.PROD &&
  API_URL.startsWith('http://') &&
  !LOCAL_HOSTNAMES.has(new URL(API_URL).hostname)
) {
  console.warn('[SECURITY] API URL should use HTTPS in production');
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================================================
// INTERCEPTOR DE REQUISIÇÃO
// ============================================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Adicionar token de autenticação (suporta múltiplos tipos de token)
    // Priorizar studentToken se estiver no portal do aluno ou em rotas de student-onboarding
    const isStudentRoute = window.location.pathname.startsWith('/portal') ||
                           config.url?.includes('student-onboarding') ||
                           config.url?.includes('/portal/');

    const token = isStudentRoute
      ? (localStorage.getItem('studentToken') || localStorage.getItem('token'))
      : (localStorage.getItem('token') || localStorage.getItem('studentToken'));

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log apenas em desenvolvimento
    if (import.meta.env.DEV) {
      // Não logar dados sensíveis
      const safeUrl = config.url?.replace(/token=([^&]+)/, 'token=***');
      console.log(`[API] ${config.method?.toUpperCase()} ${safeUrl}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const getRequestBaseCandidates = (config?: ApiRequestConfig): string[] => {
  if (config?._apiBaseCandidates?.length) {
    return config._apiBaseCandidates;
  }

  const currentBase = config?.baseURL ? normalizeLocalApiUrl(String(config.baseURL)) : API_URL;
  return uniqueApiCandidates([currentBase, ...API_CANDIDATES]);
};

const getNextBaseCandidate = (config?: ApiRequestConfig): { candidates: string[]; nextIndex: number; nextBaseUrl: string } | null => {
  const candidates = getRequestBaseCandidates(config);
  const currentIndex = typeof config?._apiBaseAttempt === 'number'
    ? config._apiBaseAttempt
    : Math.max(0, candidates.findIndex((candidate) => candidate === normalizeLocalApiUrl(String(config?.baseURL || API_URL))));

  const nextIndex = currentIndex + 1;

  if (nextIndex >= candidates.length) {
    return null;
  }

  return {
    candidates,
    nextIndex,
    nextBaseUrl: candidates[nextIndex]
  };
};

export const getSocketBaseUrl = (): string => {
  if (typeof window !== 'undefined' && API_CANDIDATES.includes('/api')) {
    return window.location.origin;
  }

  const absoluteCandidate = API_CANDIDATES.find((candidate) => /^https?:\/\//.test(candidate));
  return absoluteCandidate ? stripApiSuffix(absoluteCandidate) : `http://localhost:${LOCAL_API_PORT}`;
};

// ============================================================================
// INTERCEPTOR DE RESPOSTA COM TRATAMENTO INTELIGENTE DE ERROS
// ============================================================================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log de sucesso apenas em desenvolvimento (sem dados sensíveis)
    if (import.meta.env.DEV) {
      const safeUrl = response.config.url?.replace(/token=([^&]+)/, 'token=***');
      console.log(`[API] ✓ ${response.config.method?.toUpperCase()} ${safeUrl}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ApiRequestConfig & { _retry?: boolean; _retryCount?: number };

    // ========================================================================
    // ERRO DE REDE - Servidor não respondeu
    // ========================================================================
    if (!error.response) {
      const retryBaseCandidate = getNextBaseCandidate(originalRequest);

      if (retryBaseCandidate && originalRequest) {
        if (import.meta.env.DEV) {
          console.warn(
            `[API] Falha de rede em ${originalRequest.url}. Tentando novamente com base ${retryBaseCandidate.nextBaseUrl}`
          );
        }

        originalRequest.baseURL = retryBaseCandidate.nextBaseUrl;
        originalRequest._apiBaseCandidates = retryBaseCandidate.candidates;
        originalRequest._apiBaseAttempt = retryBaseCandidate.nextIndex;

        return api(originalRequest);
      }

      const localApiHint = LOCAL_HOSTNAMES.has(window.location.hostname)
        ? ` Verifique se a API local esta acessivel. Tentativas: ${API_CANDIDATES.join(', ')}.`
        : '';

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('A requisição demorou muito. Tente novamente.');
        return Promise.reject({
          type: 'timeout',
          message: 'Timeout da requisição',
          code: 'TIMEOUT'
        } as ApiError);
      }

      toast.error(`Sem conexão com o servidor.${localApiHint}`);
      return Promise.reject({
        type: 'network',
        message: `Erro de conexão com o servidor.${localApiHint}`.trim(),
        code: 'NETWORK_ERROR'
      } as ApiError);
    }

    const status = error.response.status;
    const data = (error.response.data ?? {}) as ErrorResponseBody;

    // ========================================================================
    // RETRY AUTOMÁTICO PARA ERROS TEMPORÁRIOS
    // ========================================================================
    if (
      RETRY_CONFIG.retryableStatuses.includes(status) &&
      originalRequest &&
      !originalRequest._retry &&
      (originalRequest._retryCount || 0) < RETRY_CONFIG.maxRetries
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, originalRequest._retryCount - 1); // Exponential backoff

      toast.loading(`Tentando novamente (${originalRequest._retryCount}/${RETRY_CONFIG.maxRetries})...`, {
        id: 'retry-toast',
        duration: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));

      return api(originalRequest);
    }

    // ========================================================================
    // TRATAMENTO POR STATUS HTTP
    // ========================================================================

    switch (status) {
      // ====== 400 / 422: ERRO DE VALIDAÇÃO ======
      case 400:
      case 422: {
        const errorMessage = data.message || 'Dados inválidos. Verifique e tente novamente.';

        if (data.field) {
          const fieldName = translateFieldName(data.field);
          toast.error(`${fieldName}: ${errorMessage}`);
        } else if (Array.isArray(data.errors)) {
          data.errors.forEach((err) => {
            const fieldLabel = err.field ? `${translateFieldName(err.field)}: ` : '';
            toast.error(`${fieldLabel}${err.message}`);
          });
        } else {
          toast.error(errorMessage);
        }

        return Promise.reject({
          type: 'validation',
          message: errorMessage,
          field: data.field,
          status
        } as ApiError);
      }

      // ====== 401: NÃO AUTENTICADO ======
      case 401: {
        toast.error('Sessão expirada. Faça login novamente.');

        // Limpar tokens e dados do usuário
        localStorage.removeItem('token');
        localStorage.removeItem('studentToken');
        localStorage.removeItem('user');
        localStorage.removeItem('student');
        localStorage.removeItem('studentData');
        localStorage.removeItem('auth-storage');

        // Redirecionar para login apropriado
        const isStudentPortal = window.location.pathname.includes('/portal');
        const redirectTarget = `${window.location.pathname}${window.location.search}`;
        setTimeout(() => {
          window.location.href = isStudentPortal
            ? `/portal/login?redirect=${encodeURIComponent(redirectTarget)}`
            : '/login';
        }, 1500);

        return Promise.reject({
          type: 'auth',
          message: 'Não autenticado',
          status
        } as ApiError);
      }

      // ====== 403: NÃO AUTORIZADO ======
      case 403: {
        const forbiddenMessage = data.message || 'Você não tem permissão para realizar esta ação.';
        toast.error(forbiddenMessage);

        return Promise.reject({
          type: 'forbidden',
          message: forbiddenMessage,
          status
        } as ApiError);
      }

      // ====== 404: RECURSO NÃO ENCONTRADO ======
      case 404: {
        const notFoundMessage = data.message || 'Recurso não encontrado.';
        toast.error(notFoundMessage);

        return Promise.reject({
          type: 'notfound',
          message: notFoundMessage,
          status
        } as ApiError);
      }

      // ====== 500, 502, 503: ERRO DO SERVIDOR ======
      case 500:
      case 502:
      case 503: {
        toast.error('Erro no servidor. Nossa equipe foi notificada. Tente novamente em instantes.');

        // Em produção, aqui você enviaria para serviço de monitoramento (Sentry, etc)
        if (import.meta.env.PROD) {
          logErrorToMonitoring(error, 'server_error');
        }

        return Promise.reject({
          type: 'server',
          message: 'Erro interno do servidor',
          status
        } as ApiError);
      }

      // ====== OUTROS ERROS ======
      default: {
        const genericMessage = data.message || 'Algo deu errado. Tente novamente.';
        toast.error(genericMessage);

        return Promise.reject({
          type: 'unknown',
          message: genericMessage,
          status
        } as ApiError);
      }
    }
  }
);

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Traduz nomes de campos técnicos para nomes amigáveis em português
 */
function translateFieldName(field: string): string {
  const translations: Record<string, string> = {
    email: 'E-mail',
    password: 'Senha',
    name: 'Nome',
    phone: 'Telefone',
    age: 'Idade',
    grade: 'Série',
    subject: 'Matéria',
    title: 'Título',
    description: 'Descrição',
    scheduledAt: 'Data/Hora',
    amount: 'Valor',
    slug: 'URL personalizada'
  };

  return translations[field] || field;
}

/**
 * Envia erro para serviço de monitoramento (placeholder)
 */
function logErrorToMonitoring(error: unknown, category: string): void {
  console.error(`[MONITORING] ${category}:`, error);
}

// ============================================================================
// API SERVICE - MÉTODOS PRINCIPAIS
// ============================================================================

const apiService = {
  /**
   * GET request
   */
  get: async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  /**
   * POST request
   */
  post: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  /**
   * PUT request
   */
  put: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  /**
   * PATCH request
   */
  patch: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.patch<T>(url, data, config);
    return response.data;
  },

  /**
   * DELETE request
   */
  delete: async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<T>(url, config);
    return response.data;
  },

  /**
   * Upload de arquivo com progresso
   */
  upload: async <T = unknown>(
    url: string,
    formData: FormData,
    onProgress?: (percentage: number) => void
  ): Promise<T> => {
    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
    return response.data;
  }
};

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export default apiService;
export { api, API_URL, type ApiError };
