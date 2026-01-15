/**
 * Utilitários de Segurança para o Frontend
 *
 * Este módulo fornece funções para sanitização de inputs e proteção contra XSS.
 */

/**
 * Sanitiza uma string removendo caracteres HTML potencialmente perigosos
 * Use esta função para qualquer input de usuário que será exibido na página
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza um objeto removendo caracteres HTML de todas as strings
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key in result) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeInput(result[key] as string);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      (result as Record<string, unknown>)[key] = sanitizeObject(result[key] as Record<string, unknown>);
    }
  }

  return result;
}

/**
 * Valida se uma URL é segura (não é javascript:, data:, etc.)
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    // URLs relativas são permitidas
    return url.startsWith('/') && !url.startsWith('//');
  }
}

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

/**
 * Formata telefone BR: (DD) 99999-9999 ou (DD) 9999-9999
 */
export function formatPhoneBR(value: string): string {
  if (!value || typeof value !== 'string') return '';

  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Valida senha (mínimo 6 caracteres)
 */
export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

/**
 * Remove scripts de uma string HTML (para uso com dangerouslySetInnerHTML - usar com cautela)
 */
export function stripScripts(html: string): string {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Gera um nonce para CSP (Content Security Policy)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se o token JWT está expirado
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // JWT exp é em segundos
    return Date.now() >= exp;
  } catch {
    return true;
  }
}

/**
 * Obtém o tempo restante do token em milissegundos
 */
export function getTokenTimeRemaining(token: string): number {
  if (!token) return 0;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Math.max(0, exp - Date.now());
  } catch {
    return 0;
  }
}

/**
 * Limpa dados sensíveis da memória
 */
export function clearSensitiveData(): void {
  // Limpar localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('studentToken');
  localStorage.removeItem('user');
  localStorage.removeItem('studentData');

  // Limpar sessionStorage também
  sessionStorage.clear();
}

/**
 * Função debounce para prevenir spam de requisições
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Função throttle para limitar taxa de execução
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
