import type {
  AutomationRule,
  AutomationEvent,
  AutomationStats,
  AutomationTrigger,
  AutomationAction,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
  ExecutedAction,
  ActionConfig,
} from '../types/automation';

// ============ DEFAULT AUTOMATION RULES ============

const defaultRules: AutomationRule[] = [
  {
    id: 'rule_1',
    name: 'Lembrete de Aula (30 min antes)',
    description: 'Envia notificação para aluno e responsável 30 minutos antes da aula',
    trigger: 'class_starting_soon',
    triggerConfig: {
      minutesBefore: 30,
    },
    actions: ['send_notification', 'log_event'],
    actionConfig: {
      channel: 'whatsapp',
      recipientType: 'both',
      messageTemplate: 'Lembrete: Aula de {{subject}} começa em 30 minutos!',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_2',
    name: 'Lembrete de Pagamento (5 dias antes)',
    description: 'Envia lembrete de pagamento 5 dias antes do vencimento',
    trigger: 'payment_due_soon',
    triggerConfig: {
      daysBefore: 5,
    },
    actions: ['send_reminder', 'log_event'],
    actionConfig: {
      channel: 'email',
      recipientType: 'parent',
      messageTemplate: 'Lembrete: O pagamento de R${{amount}} vence em {{daysLeft}} dias.',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_3',
    name: 'Cobranca de Pagamento Atrasado',
    description: 'Envia cobranca quando pagamento esta atrasado',
    trigger: 'payment_overdue',
    triggerConfig: {},
    actions: ['send_notification', 'create_invoice', 'log_event'],
    actionConfig: {
      channel: 'whatsapp',
      recipientType: 'parent',
      includeLateFee: true,
      messageTemplate: 'Aviso: Pagamento de R${{amount}} esta em atraso. Por favor, regularize.',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_4',
    name: 'Felicitacoes de Aniversario',
    description: 'Envia mensagem de aniversario para o aluno',
    trigger: 'student_birthday',
    triggerConfig: {},
    actions: ['send_notification', 'log_event'],
    actionConfig: {
      channel: 'whatsapp',
      recipientType: 'student',
      messageTemplate: 'Feliz Aniversario, {{studentName}}! Desejamos um dia incrivel!',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_5',
    name: 'Alerta de Aluno Inativo',
    description: 'Notifica quando aluno esta sem atividade por 14 dias',
    trigger: 'student_inactive',
    triggerConfig: {
      inactiveDays: 14,
    },
    actions: ['send_notification', 'log_event'],
    actionConfig: {
      channel: 'email',
      recipientType: 'parent',
      messageTemplate: 'Notamos que {{studentName}} nao tem aulas agendadas ha {{days}} dias. Vamos agendar?',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_6',
    name: 'Gerar Resumo Pos-Aula',
    description: 'Gera automaticamente resumo da aula com IA apos terminar',
    trigger: 'class_ended',
    triggerConfig: {},
    actions: ['generate_summary', 'send_notification', 'log_event'],
    actionConfig: {
      channel: 'email',
      recipientType: 'both',
      includeContext: true,
      messageTemplate: 'Resumo da aula de {{subject}} disponivel!',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_7',
    name: 'Preparar Plano de Aula',
    description: 'Gera plano de aula com IA quando nova aula e agendada',
    trigger: 'class_scheduled',
    triggerConfig: {},
    actions: ['generate_lesson_plan', 'update_calendar', 'log_event'],
    actionConfig: {
      includeContext: true,
      calendarType: 'internal',
    },
    enabled: true,
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'rule_8',
    name: 'Relatorio Semanal',
    description: 'Envia relatorio de atividades semanais toda segunda-feira',
    trigger: 'report_time',
    triggerConfig: {
      schedule: 'weekly',
      dayOfWeek: 1, // Monday
      timeOfDay: '08:00',
    },
    actions: ['send_notification', 'log_event'],
    actionConfig: {
      channel: 'email',
      recipientType: 'parent',
      messageTemplate: 'Relatorio semanal de {{studentName}} disponivel!',
    },
    enabled: false, // Disabled by default
    createdAt: new Date('2025-01-01').toISOString(),
  },
];

interface ActionExecutionContext {
  entityType: 'class' | 'student' | 'payment' | 'system';
  entityId: string;
  entityName?: string;
  rule: AutomationRule;
  metadata?: Record<string, unknown>;
}

// ============ AUTOMATION ENGINE CLASS ============

class AutomationEngine {
  private rules: AutomationRule[] = [];
  private events: AutomationEvent[] = [];
  private isRunning: boolean = false;
  private checkInterval: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, ((event: AutomationEvent) => void)[]> = new Map();

  constructor() {
    // Initialize with default rules
    this.rules = [...defaultRules];
    // Generate some mock events for demo purposes
    this.generateMockEvents();
  }

  // ============ ENGINE LIFECYCLE ============

  /**
   * Start the automation engine
   */
  start(): void {
    if (this.isRunning) {
      console.log('[AutomationEngine] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutomationEngine] Started');

    // Check triggers every minute
    this.checkInterval = setInterval(() => {
      this.checkTriggers();
    }, 60000);

    // Initial check
    this.checkTriggers();
  }

  /**
   * Stop the automation engine
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[AutomationEngine] Already stopped');
      return;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[AutomationEngine] Stopped');
  }

  /**
   * Check if engine is running
   */
  getStatus(): { isRunning: boolean; rulesCount: number; eventsCount: number } {
    return {
      isRunning: this.isRunning,
      rulesCount: this.rules.length,
      eventsCount: this.events.length,
    };
  }

  // ============ TRIGGER CHECKING ============

  /**
   * Check all triggers and fire matching ones
   */
  checkTriggers(): void {
    if (!this.isRunning) return;

    const enabledRules = this.rules.filter((r) => r.enabled);
    console.log(`[AutomationEngine] Checking ${enabledRules.length} active rules...`);

    // In a real implementation, this would check actual conditions
    // For now, this is a placeholder for the periodic check
  }

  /**
   * Manually fire a trigger for a specific entity
   */
  async fireTrigger(
    trigger: AutomationTrigger,
    entityType: 'class' | 'student' | 'payment' | 'system',
    entityId: string,
    entityName?: string,
    metadata?: Record<string, unknown>
  ): Promise<AutomationEvent | null> {
    // Find matching enabled rules
    const matchingRules = this.rules.filter(
      (r) => r.enabled && r.trigger === trigger
    );

    if (matchingRules.length === 0) {
      console.log(`[AutomationEngine] No matching rules for trigger: ${trigger}`);
      return null;
    }

    // Execute each matching rule
    for (const rule of matchingRules) {
      const event = await this.executeRule(rule, entityType, entityId, entityName, metadata);
      if (event) {
        this.events.unshift(event); // Add to beginning
        this.notifyListeners(event);
      }
    }

    return this.events[0] || null;
  }

  /**
   * Execute a specific rule
   */
  private async executeRule(
    rule: AutomationRule,
    entityType: 'class' | 'student' | 'payment' | 'system',
    entityId: string,
    entityName?: string,
    metadata?: Record<string, unknown>
  ): Promise<AutomationEvent> {
    const executedActions: ExecutedAction[] = [];
    let hasError = false;

    // Execute each action in the rule
    for (const action of rule.actions) {
      const result = await this.executeAction(action, rule.actionConfig, {
        entityType,
        entityId,
        entityName,
        rule,
        metadata,
      });
      executedActions.push(result);
      if (!result.success) {
        hasError = true;
      }
    }

    const event: AutomationEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      triggeredAt: new Date().toISOString(),
      entityType,
      entityId,
      entityName,
      actionsExecuted: executedActions,
      status: hasError
        ? executedActions.some((a) => a.success)
          ? 'partial'
          : 'failed'
        : 'success',
    };

    console.log(`[AutomationEngine] Rule executed: ${rule.name}`, event);
    return event;
  }

  // ============ ACTION EXECUTION ============

  /**
   * Execute a single action (mock implementation)
   */
  async executeAction(
    action: AutomationAction,
    config: ActionConfig,
    context: ActionExecutionContext
  ): Promise<ExecutedAction> {
    // Simulate async action execution
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock implementation - in production, this would call real services
    const actionHandlers: Record<AutomationAction, () => ExecutedAction> = {
      send_notification: () => ({
        action: 'send_notification',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Notificacao enviada com sucesso',
      }),
      generate_lesson_plan: () => ({
        action: 'generate_lesson_plan',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Plano de aula gerado com IA',
      }),
      generate_summary: () => ({
        action: 'generate_summary',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Resumo da aula gerado',
      }),
      generate_homework: () => ({
        action: 'generate_homework',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Exercicios gerados automaticamente',
      }),
      create_invoice: () => ({
        action: 'create_invoice',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Fatura criada',
      }),
      send_reminder: () => ({
        action: 'send_reminder',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Lembrete enviado',
      }),
      update_calendar: () => ({
        action: 'update_calendar',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Calendario atualizado',
      }),
      log_event: () => ({
        action: 'log_event',
        executedAt: new Date().toISOString(),
        success: true,
        result: 'Evento registrado no log',
      }),
    };

    const applyContext = (base: ExecutedAction): ExecutedAction => {
      const channelSuffix = config.channel ? ` via ${config.channel}` : '';
      const targetSuffix = context.entityName ? ` para ${context.entityName}` : '';
      const metadataSuffix = context.metadata && Object.keys(context.metadata).length > 0 ? ' com metadados' : '';
      return {
        ...base,
        result: `${base.result}${channelSuffix}${targetSuffix}${metadataSuffix}`.trim(),
      };
    };

    return applyContext(actionHandlers[action]());
  }

  // ============ RULE CRUD METHODS ============

  /**
   * Get all rules
   */
  getRules(): AutomationRule[] {
    return [...this.rules];
  }

  /**
   * Get a specific rule by ID
   */
  getRule(id: string): AutomationRule | undefined {
    return this.rules.find((r) => r.id === id);
  }

  /**
   * Create a new rule
   */
  createRule(input: CreateAutomationRuleInput): AutomationRule {
    const newRule: AutomationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      ...input,
      enabled: input.enabled ?? true,
      createdAt: new Date().toISOString(),
    };

    this.rules.push(newRule);
    console.log(`[AutomationEngine] Rule created: ${newRule.name}`);
    return newRule;
  }

  /**
   * Update an existing rule
   */
  updateRule(id: string, input: UpdateAutomationRuleInput): AutomationRule | null {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index === -1) {
      console.log(`[AutomationEngine] Rule not found: ${id}`);
      return null;
    }

    const updatedRule: AutomationRule = {
      ...this.rules[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.rules[index] = updatedRule;
    console.log(`[AutomationEngine] Rule updated: ${updatedRule.name}`);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  deleteRule(id: string): boolean {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index === -1) {
      console.log(`[AutomationEngine] Rule not found: ${id}`);
      return false;
    }

    const deletedRule = this.rules.splice(index, 1)[0];
    console.log(`[AutomationEngine] Rule deleted: ${deletedRule.name}`);
    return true;
  }

  /**
   * Toggle a rule's enabled status
   */
  toggleRule(id: string): AutomationRule | null {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) {
      console.log(`[AutomationEngine] Rule not found: ${id}`);
      return null;
    }

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    console.log(`[AutomationEngine] Rule toggled: ${rule.name} -> ${rule.enabled ? 'enabled' : 'disabled'}`);
    return rule;
  }

  // ============ EVENT METHODS ============

  /**
   * Get all events
   */
  getEvents(limit?: number): AutomationEvent[] {
    const events = [...this.events];
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Get events by entity
   */
  getEventsByEntity(entityType: string, entityId: string): AutomationEvent[] {
    return this.events.filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    );
  }

  /**
   * Get events by rule
   */
  getEventsByRule(ruleId: string): AutomationEvent[] {
    return this.events.filter((e) => e.ruleId === ruleId);
  }

  /**
   * Get events by date range
   */
  getEventsByDateRange(startDate: Date, endDate: Date): AutomationEvent[] {
    return this.events.filter((e) => {
      const eventDate = new Date(e.triggeredAt);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  // ============ STATISTICS ============

  /**
   * Get automation statistics
   */
  getStats(): AutomationStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const eventsToday = this.events.filter(
      (e) => new Date(e.triggeredAt) >= todayStart
    ).length;

    const eventsThisWeek = this.events.filter(
      (e) => new Date(e.triggeredAt) >= weekStart
    ).length;

    const eventsThisMonth = this.events.filter(
      (e) => new Date(e.triggeredAt) >= monthStart
    ).length;

    const successfulEvents = this.events.filter((e) => e.status === 'success').length;
    const successRate = this.events.length > 0
      ? (successfulEvents / this.events.length) * 100
      : 100;

    // Find most active rule
    const ruleEventCounts = new Map<string, number>();
    this.events.forEach((e) => {
      ruleEventCounts.set(e.ruleId, (ruleEventCounts.get(e.ruleId) || 0) + 1);
    });

    let mostActiveRule: { id: string; name: string; eventCount: number } | undefined;
    let maxCount = 0;
    ruleEventCounts.forEach((count, ruleId) => {
      if (count > maxCount) {
        maxCount = count;
        const rule = this.rules.find((r) => r.id === ruleId);
        if (rule) {
          mostActiveRule = { id: ruleId, name: rule.name, eventCount: count };
        }
      }
    });

    // Action breakdown
    const actionBreakdown: Record<AutomationAction, number> = {
      send_notification: 0,
      generate_lesson_plan: 0,
      generate_summary: 0,
      generate_homework: 0,
      create_invoice: 0,
      send_reminder: 0,
      update_calendar: 0,
      log_event: 0,
    };

    this.events.forEach((e) => {
      e.actionsExecuted.forEach((a) => {
        actionBreakdown[a.action]++;
      });
    });

    // Trigger breakdown
    const triggerBreakdown: Record<AutomationTrigger, number> = {
      class_scheduled: 0,
      class_starting_soon: 0,
      class_started: 0,
      class_ended: 0,
      class_cancelled: 0,
      payment_due_soon: 0,
      payment_overdue: 0,
      payment_received: 0,
      student_birthday: 0,
      student_inactive: 0,
      homework_due: 0,
      report_time: 0,
    };

    this.events.forEach((e) => {
      triggerBreakdown[e.trigger]++;
    });

    return {
      totalRules: this.rules.length,
      activeRules: this.rules.filter((r) => r.enabled).length,
      eventsToday,
      eventsThisWeek,
      eventsThisMonth,
      successRate: Math.round(successRate * 100) / 100,
      mostActiveRule,
      actionBreakdown,
      triggerBreakdown,
    };
  }

  // ============ EVENT LISTENERS ============

  /**
   * Add event listener
   */
  addEventListener(
    eventType: string,
    callback: (event: AutomationEvent) => void
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: string,
    callback: (event: AutomationEvent) => void
  ): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: AutomationEvent): void {
    // Notify specific trigger listeners
    const triggerListeners = this.listeners.get(event.trigger) || [];
    triggerListeners.forEach((cb) => cb(event));

    // Notify 'all' listeners
    const allListeners = this.listeners.get('all') || [];
    allListeners.forEach((cb) => cb(event));
  }

  // ============ RESET FOR TESTING ============

  /**
   * Reset to default state (for testing)
   */
  reset(): void {
    this.stop();
    this.rules = [...defaultRules];
    this.events = [];
    this.listeners.clear();
    this.generateMockEvents();
    console.log('[AutomationEngine] Reset to default state');
  }

  /**
   * Generate mock events for demo purposes
   */
  private generateMockEvents(): void {
    const now = new Date();
    const mockEvents: AutomationEvent[] = [
      {
        id: 'event_mock_1',
        ruleId: 'rule_1',
        ruleName: 'Lembrete de Aula (30 min antes)',
        trigger: 'class_starting_soon',
        triggeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        entityType: 'class',
        entityId: '104',
        entityName: 'Cinemática - Movimento Uniforme',
        actionsExecuted: [
          { action: 'send_notification', executedAt: new Date().toISOString(), success: true, result: 'WhatsApp enviado' },
          { action: 'log_event', executedAt: new Date().toISOString(), success: true, result: 'Registrado' },
        ],
        status: 'success',
      },
      {
        id: 'event_mock_2',
        ruleId: 'rule_2',
        ruleName: 'Lembrete de Pagamento (5 dias antes)',
        trigger: 'payment_due_soon',
        triggeredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        entityType: 'payment',
        entityId: '206',
        entityName: 'Maria Santos - Dezembro',
        actionsExecuted: [
          { action: 'send_reminder', executedAt: new Date().toISOString(), success: true, result: 'Email enviado' },
          { action: 'log_event', executedAt: new Date().toISOString(), success: true, result: 'Registrado' },
        ],
        status: 'success',
      },
      {
        id: 'event_mock_3',
        ruleId: 'rule_6',
        ruleName: 'Gerar Resumo Pos-Aula',
        trigger: 'class_ended',
        triggeredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        entityType: 'class',
        entityId: '102',
        entityName: 'Funcoes Trigonometricas',
        actionsExecuted: [
          { action: 'generate_summary', executedAt: new Date().toISOString(), success: true, result: 'Resumo gerado com IA' },
          { action: 'send_notification', executedAt: new Date().toISOString(), success: true, result: 'Email enviado' },
          { action: 'log_event', executedAt: new Date().toISOString(), success: true, result: 'Registrado' },
        ],
        status: 'success',
      },
      {
        id: 'event_mock_4',
        ruleId: 'rule_7',
        ruleName: 'Preparar Plano de Aula',
        trigger: 'class_scheduled',
        triggeredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        entityType: 'class',
        entityId: '106',
        entityName: 'Geometria Plana',
        actionsExecuted: [
          { action: 'generate_lesson_plan', executedAt: new Date().toISOString(), success: true, result: 'Plano gerado' },
          { action: 'update_calendar', executedAt: new Date().toISOString(), success: true, result: 'Calendario atualizado' },
          { action: 'log_event', executedAt: new Date().toISOString(), success: true, result: 'Registrado' },
        ],
        status: 'success',
      },
      {
        id: 'event_mock_5',
        ruleId: 'rule_3',
        ruleName: 'Cobranca de Pagamento Atrasado',
        trigger: 'payment_overdue',
        triggeredAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        entityType: 'payment',
        entityId: '208',
        entityName: 'Ana Costa - Dezembro',
        actionsExecuted: [
          { action: 'send_notification', executedAt: new Date().toISOString(), success: true, result: 'WhatsApp enviado' },
          { action: 'create_invoice', executedAt: new Date().toISOString(), success: false, error: 'Servico indisponivel' },
          { action: 'log_event', executedAt: new Date().toISOString(), success: true, result: 'Registrado' },
        ],
        status: 'partial',
      },
    ];

    this.events = mockEvents;
  }
}

// ============ SINGLETON INSTANCE ============

// Create and export a singleton instance
export const automationEngine = new AutomationEngine();

// Export the class for testing purposes
export { AutomationEngine };

// Export default rules for reference
export { defaultRules };
