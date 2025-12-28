import { useState, useEffect, useCallback } from 'react';
import { automationEngine } from '../services/automationEngine';
import type {
  AutomationRule,
  AutomationEvent,
  AutomationStats,
  AutomationTrigger,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from '../types/automation';

export function useAutomation() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setRules(automationEngine.getRules());
    setEvents(automationEngine.getEvents());
    setStats(automationEngine.getStats());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    automationEngine.start();

    let frameId: number | null = null;
    frameId = requestAnimationFrame(() => {
      refresh();
    });

    // Atualizar a cada 30 segundos
    const interval = setInterval(refresh, 30000);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      clearInterval(interval);
      // We don't necessarily want to stop the engine when the hook unmounts
      // if it's supposed to run globally, but for now we follow the plan.
      automationEngine.stop();
    };
  }, [refresh]);

  const toggleRule = useCallback((id: string) => {
    automationEngine.toggleRule(id);
    refresh();
  }, [refresh]);

  const deleteRule = useCallback((id: string) => {
    automationEngine.deleteRule(id);
    refresh();
  }, [refresh]);

  const createRule = useCallback((rule: CreateAutomationRuleInput) => {
    const newRule = automationEngine.createRule(rule);
    refresh();
    return newRule;
  }, [refresh]);

  const updateRule = useCallback((id: string, updates: UpdateAutomationRuleInput) => {
    const updated = automationEngine.updateRule(id, updates);
    refresh();
    return updated;
  }, [refresh]);

  const fireTrigger = useCallback(async (
    trigger: AutomationTrigger,
    entityType: 'class' | 'student' | 'payment' | 'system',
    entityId: string,
    entityName?: string,
    metadata?: Record<string, unknown>
  ) => {
    const event = await automationEngine.fireTrigger(trigger, entityType, entityId, entityName, metadata);
    refresh();
    return event;
  }, [refresh]);

  return {
    rules,
    events,
    stats,
    isLoading,
    refresh,
    toggleRule,
    deleteRule,
    createRule,
    updateRule,
    fireTrigger
  };
}

export default useAutomation;
