import { useState, useEffect, useCallback, useRef } from 'react';
import apiService, { ApiError } from '../services/api.service';

// ============================================================================
// TIPOS
// ============================================================================

interface UseApiOptions<T> {
  immediate?: boolean; // Se deve fazer a chamada imediatamente ao montar
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  fallbackData?: T; // Dados de fallback em caso de erro
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

interface UseApiMutationReturn<T, P> {
  mutate: (params: P) => Promise<T | null>;
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reset: () => void;
}

// ============================================================================
// HOOK: useApi - Para requisições GET simples
// ============================================================================

/**
 * Hook para requisições GET com gerenciamento automático de loading/error
 *
 * @example
 * const { data, loading, error, refetch } = useApi<Student>('/portal/profile', {
 *   immediate: true,
 *   onSuccess: (student) => console.log('Perfil carregado:', student)
 * });
 */
export function useApi<T = any>(
  url: string | null,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const { immediate = false, onSuccess, onError, fallbackData } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<ApiError | null>(null);

  // Usar ref para evitar loops infinitos com useCallback
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.get<T>(url, {
        signal: abortControllerRef.current.signal
      });

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const apiError = err as ApiError;
        setError(apiError);

        // Usar dados de fallback se fornecidos
        if (fallbackData) {
          setData(fallbackData);
        }

        onError?.(apiError);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, onSuccess, onError, fallbackData]);

  useEffect(() => {
    isMountedRef.current = true;

    if (immediate && url) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      // Cancelar requisição ao desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, url, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

// ============================================================================
// HOOK: useApiMutation - Para POST, PUT, DELETE
// ============================================================================

/**
 * Hook para mutations (POST, PUT, PATCH, DELETE)
 *
 * @example
 * const { mutate, loading, error } = useApiMutation<Student, UpdateProfileData>(
 *   'PUT',
 *   '/portal/profile',
 *   {
 *     onSuccess: (student) => toast.success('Perfil atualizado!')
 *   }
 * );
 *
 * // Usar:
 * mutate({ description: 'Nova descrição' });
 */
export function useApiMutation<T = any, P = any>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: UseApiOptions<T> = {}
): UseApiMutationReturn<T, P> {
  const { onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(async (params: P): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      let result: T;

      switch (method) {
        case 'POST':
          result = await apiService.post<T>(url, params);
          break;
        case 'PUT':
          result = await apiService.put<T>(url, params);
          break;
        case 'PATCH':
          result = await apiService.patch<T>(url, params);
          break;
        case 'DELETE':
          result = await apiService.delete<T>(url);
          break;
        default:
          throw new Error(`Método não suportado: ${method}`);
      }

      setData(result);
      setError(null);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [method, url, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    data,
    loading,
    error,
    reset
  };
}

// ============================================================================
// HOOK: useApiWithFallback - Com dados de demonstração
// ============================================================================

/**
 * Hook que automaticamente usa dados de fallback quando API falha
 * Útil para modo demonstração
 *
 * @example
 * const { data, loading, fromCache } = useApiWithFallback<Student>(
 *   '/portal/profile',
 *   mockStudentData,
 *   { immediate: true }
 * );
 */
export function useApiWithFallback<T = any>(
  url: string | null,
  fallbackData: T,
  options: Omit<UseApiOptions<T>, 'fallbackData'> = {}
): UseApiReturn<T> & { fromCache: boolean } {
  const [fromCache, setFromCache] = useState(false);

  const result = useApi<T>(url, {
    ...options,
    fallbackData,
    onError: (error) => {
      setFromCache(true);
      options.onError?.(error);
    },
    onSuccess: (data) => {
      setFromCache(false);
      options.onSuccess?.(data);
    }
  });

  return {
    ...result,
    fromCache
  };
}

// ============================================================================
// HOOK: useApiPolling - Para polling de dados
// ============================================================================

/**
 * Hook que faz polling de dados em intervalos regulares
 *
 * @example
 * const { data, isPolling, startPolling, stopPolling } = useApiPolling<Message[]>(
 *   '/chat/messages',
 *   5000 // polling a cada 5 segundos
 * );
 */
export function useApiPolling<T = any>(
  url: string | null,
  intervalMs: number = 5000,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> & {
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
} {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const { data, loading, error, refetch } = useApi<T>(url, options);

  const startPolling = useCallback(() => {
    setIsPolling(true);

    // Fazer primeira requisição imediatamente
    refetch();

    // Iniciar polling
    intervalRef.current = window.setInterval(() => {
      refetch();
    }, intervalMs);
  }, [refetch, intervalMs]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      // Limpar polling ao desmontar
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isPolling,
    startPolling,
    stopPolling
  };
}

// ============================================================================
// HOOK: useApiUpload - Para upload de arquivos
// ============================================================================

/**
 * Hook para upload de arquivos com progresso
 *
 * @example
 * const { upload, progress, uploading } = useApiUpload('/upload/photo', {
 *   onSuccess: (result) => toast.success('Foto atualizada!')
 * });
 *
 * // Usar:
 * const handleFile = (file: File) => {
 *   const formData = new FormData();
 *   formData.append('photo', file);
 *   upload(formData);
 * };
 */
export function useApiUpload<T = any>(
  url: string,
  options: UseApiOptions<T> = {}
) {
  const { onSuccess, onError } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const upload = useCallback(async (formData: FormData): Promise<T | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await apiService.upload<T>(url, formData, (percentage) => {
        setProgress(percentage);
      });

      setData(result);
      setError(null);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      onError?.(apiError);
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [url, onSuccess, onError]);

  return {
    upload,
    uploading,
    progress,
    data,
    error
  };
}
