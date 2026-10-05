export type AlertType =
  | 'payment_overdue'      // Pagamento atrasado
  | 'payment_due_soon'     // Pagamento vencendo
  | 'class_starting_soon'  // Aula em breve
  | 'student_birthday'     // Aniversario
  | 'student_inactive'     // Aluno inativo
  | 'lesson_plan_pending'  // Plano de aula pendente
  | 'homework_not_done'    // Tarefa nao feita
  | 'report_due'           // Relatorio pendente
  | 'new_student'          // Novo aluno
  | 'student_onboarding'   // Aluno completou onboarding
  | 'system';              // Notificação do sistema

export type AlertPriority = 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  type: AlertType | string;
  priority: AlertPriority;
  title: string;
  message: string;
  entityType: 'student' | 'class' | 'payment' | 'system';
  entityId: string;
  entityName: string;
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
  dismissedAt?: string;
  readAt?: string;
  status?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Estado local (cache)
let cachedAlerts: Alert[] = [];
let cachedUnreadCount = 0;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30 segundos

// Mock alerts para fallback
const mockAlerts: Alert[] = [
  {
    id: 'alert_1',
    type: 'payment_overdue',
    priority: 'high',
    title: 'Pagamento Atrasado',
    message: 'Maria Oliveira está com o pagamento de Dezembro atrasado há 2 dias.',
    entityType: 'payment',
    entityId: 'p1',
    entityName: 'Maria Oliveira',
    actionLabel: 'Cobrar agora',
    actionRoute: 'finance',
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'alert_2',
    type: 'student_birthday',
    priority: 'medium',
    title: 'Aniversário Hoje!',
    message: 'Carlos Eduardo faz 15 anos hoje. Que tal enviar um parabéns?',
    entityType: 'student',
    entityId: 's5',
    entityName: 'Carlos Eduardo',
    actionLabel: 'Enviar Parabéns',
    createdAt: new Date().toISOString()
  }
];

class AlertService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private getHeaders() {
    this.token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`
    };
  }

  async fetchAlerts(): Promise<Alert[]> {
    // Verificar cache
    if (Date.now() - lastFetch < CACHE_DURATION && cachedAlerts.length > 0) {
      return cachedAlerts;
    }

    try {
      const response = await fetch(`${API_URL}/notifications?status=all&limit=50`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar notificações');
      }

      const data = await response.json();

      if (data.success) {
        cachedAlerts = data.notifications.map((n: Alert & { id: string }) => ({
          id: n.id,
          type: n.entityType === 'student' ? 'student_onboarding' : n.type || 'system',
          priority: n.priority || 'medium',
          title: n.title,
          message: n.message,
          entityType: n.entityType || 'system',
          entityId: n.entityId || '',
          entityName: n.entityName || '',
          createdAt: n.createdAt,
          readAt: n.readAt,
          status: n.status
        }));
        cachedUnreadCount = data.unreadCount || 0;
        lastFetch = Date.now();
        return cachedAlerts;
      }

      return mockAlerts;
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      return mockAlerts;
    }
  }

  getAlerts(): Alert[] {
    // Retorna cache ou mock
    if (cachedAlerts.length > 0) {
      return cachedAlerts.filter(a => !a.dismissedAt);
    }
    return mockAlerts.filter(a => !a.dismissedAt);
  }

  getAlert(id: string): Alert | undefined {
    return cachedAlerts.find(a => a.id === id) || mockAlerts.find(a => a.id === id);
  }

  async dismissAlert(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: this.getHeaders()
      });

      if (response.ok) {
        const alert = cachedAlerts.find(a => a.id === id);
        if (alert) {
          alert.dismissedAt = new Date().toISOString();
          alert.readAt = new Date().toISOString();
          alert.status = 'read';
          cachedUnreadCount = Math.max(0, cachedUnreadCount - 1);
        }
      }
    } catch (error) {
      console.error('Erro ao dispensar alerta:', error);
      // Fallback local
      const alert = cachedAlerts.find(a => a.id === id);
      if (alert) {
        alert.dismissedAt = new Date().toISOString();
      }
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: this.getHeaders()
      });

      if (response.ok) {
        cachedAlerts.forEach(alert => {
          alert.readAt = new Date().toISOString();
          alert.status = 'read';
        });
        cachedUnreadCount = 0;
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }

  addAlert(alert: Omit<Alert, 'id' | 'createdAt'>): Alert {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    cachedAlerts.unshift(newAlert);
    cachedUnreadCount++;
    return newAlert;
  }

  async fetchUnreadCount(): Promise<number> {
    try {
      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar contagem');
      }

      const data = await response.json();
      if (data.success) {
        cachedUnreadCount = data.count;
        return data.count;
      }

      return cachedUnreadCount;
    } catch (error) {
      console.error('Erro ao buscar contagem de não lidas:', error);
      return cachedUnreadCount;
    }
  }

  getUnreadCount(): number {
    // Retorna o cache primeiro para resposta imediata
    if (cachedUnreadCount > 0) {
      return cachedUnreadCount;
    }
    // Fallback para mock
    return mockAlerts.filter(a => !a.dismissedAt).length;
  }

  // Limpar cache (útil após logout)
  clearCache(): void {
    cachedAlerts = [];
    cachedUnreadCount = 0;
    lastFetch = 0;
  }
}

export const alertService = new AlertService();
export default alertService;
