// ============ AUTOMATION SYSTEM TYPES ============

/**
 * Triggers that can initiate automation rules
 */
export type AutomationTrigger =
  | 'class_scheduled'      // When a new class is scheduled
  | 'class_starting_soon'  // X minutes before class starts
  | 'class_started'        // When class begins
  | 'class_ended'          // When class ends
  | 'class_cancelled'      // When class is cancelled
  | 'payment_due_soon'     // X days before payment due
  | 'payment_overdue'      // When payment is overdue
  | 'payment_received'     // When payment is confirmed
  | 'student_birthday'     // On student's birthday
  | 'student_inactive'     // When student has no activity for X days
  | 'homework_due'         // When homework deadline approaches
  | 'report_time';         // Time for periodic reports

/**
 * Actions that can be executed by automation rules
 */
export type AutomationAction =
  | 'send_notification'    // Send email/WhatsApp/SMS notification
  | 'generate_lesson_plan' // Auto-generate lesson plan with AI
  | 'generate_summary'     // Generate class summary with AI
  | 'generate_homework'    // Auto-generate homework exercises
  | 'create_invoice'       // Create payment invoice
  | 'send_reminder'        // Send reminder notification
  | 'update_calendar'      // Update calendar/schedule
  | 'log_event';           // Log event for analytics

/**
 * Configuration for trigger timing and conditions
 */
export interface TriggerConfig {
  // For time-based triggers (class_starting_soon, payment_due_soon)
  minutesBefore?: number;
  daysBefore?: number;

  // For inactivity triggers
  inactiveDays?: number;

  // For report triggers
  schedule?: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timeOfDay?: string; // HH:mm format

  // Filtering conditions
  studentIds?: string[];
  subjects?: string[];
  grades?: string[];
}

/**
 * Configuration for action execution
 */
export interface ActionConfig {
  // For notifications
  channel?: 'email' | 'whatsapp' | 'sms' | 'in_app';
  templateId?: string;
  recipientType?: 'student' | 'parent' | 'both';

  // For AI generation
  aiModel?: string;
  includeContext?: boolean;

  // For invoices
  includeLateFee?: boolean;

  // For calendar updates
  calendarType?: 'google' | 'outlook' | 'internal';

  // Custom message template
  messageTemplate?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * Automation rule definition
 */
export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  triggerConfig: TriggerConfig;
  actions: AutomationAction[];
  actionConfig: ActionConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Record of an automation event that was triggered
 */
export interface AutomationEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: AutomationTrigger;
  triggeredAt: string;
  entityType: 'class' | 'student' | 'payment' | 'system';
  entityId: string;
  entityName?: string;
  actionsExecuted: ExecutedAction[];
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

/**
 * Record of an action that was executed
 */
export interface ExecutedAction {
  action: AutomationAction;
  executedAt: string;
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Statistics for the automation system
 */
export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  successRate: number;
  mostActiveRule?: {
    id: string;
    name: string;
    eventCount: number;
  };
  actionBreakdown: Record<AutomationAction, number>;
  triggerBreakdown: Record<AutomationTrigger, number>;
}

/**
 * Input for creating a new automation rule
 */
export interface CreateAutomationRuleInput {
  name: string;
  description: string;
  trigger: AutomationTrigger;
  triggerConfig: TriggerConfig;
  actions: AutomationAction[];
  actionConfig: ActionConfig;
  enabled?: boolean;
}

/**
 * Input for updating an existing automation rule
 */
export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  trigger?: AutomationTrigger;
  triggerConfig?: TriggerConfig;
  actions?: AutomationAction[];
  actionConfig?: ActionConfig;
  enabled?: boolean;
}
