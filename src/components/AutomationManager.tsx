import React, { useState, useEffect } from 'react';
import {
  Zap,
  Settings,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  Calendar,
  CreditCard,
  Gift,
  AlertTriangle,
  FileText,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { automationEngine } from '../services/automationEngine';
import type {
  AutomationRule,
  AutomationEvent,
  AutomationStats,
  AutomationTrigger,
} from '../types/automation';

type TabType = 'rules' | 'events' | 'stats';

const AutomationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setLoading(true);
      setRules(automationEngine.getRules());
      setEvents(automationEngine.getEvents());
      setStats(automationEngine.getStats());
    } catch (error) {
      console.error('Erro ao carregar dados de automacao:', error);
      toast.error('Erro ao carregar dados de automacao');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRule = automationEngine.toggleRule(ruleId);
    if (updatedRule) {
      setRules(automationEngine.getRules());
      setStats(automationEngine.getStats());
      toast.success(
        updatedRule.enabled ? 'Regra ativada!' : 'Regra desativada!'
      );
    }
  };

  const handleTestRule = async (rule: AutomationRule) => {
    toast.loading('Testando regra...', { id: 'test-rule' });
    try {
      await automationEngine.fireTrigger(
        rule.trigger,
        'system',
        'test',
        'Teste Manual'
      );
      setEvents(automationEngine.getEvents());
      setStats(automationEngine.getStats());
      toast.success('Regra testada com sucesso!', { id: 'test-rule' });
    } catch (error) {
      toast.error('Erro ao testar regra', { id: 'test-rule' });
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta regra?')) {
      const deleted = automationEngine.deleteRule(ruleId);
      if (deleted) {
        setRules(automationEngine.getRules());
        setStats(automationEngine.getStats());
        toast.success('Regra excluida!');
      }
    }
  };

  const handleEditRule = (ruleId: string) => {
    // TODO: Implement edit modal
    toast('Funcao de edicao em desenvolvimento', { icon: '🔧' });
    console.log('Edit rule:', ruleId);
  };

  const handleNewRule = () => {
    // TODO: Implement create modal
    toast('Funcao de criacao em desenvolvimento', { icon: '🔧' });
  };

  const getTriggerIcon = (trigger: AutomationTrigger) => {
    switch (trigger) {
      case 'class_scheduled':
      case 'class_starting_soon':
      case 'class_started':
      case 'class_ended':
      case 'class_cancelled':
        return <Calendar className="w-5 h-5" />;
      case 'payment_due_soon':
      case 'payment_overdue':
      case 'payment_received':
        return <CreditCard className="w-5 h-5" />;
      case 'student_birthday':
        return <Gift className="w-5 h-5" />;
      case 'student_inactive':
        return <AlertTriangle className="w-5 h-5" />;
      case 'homework_due':
        return <FileText className="w-5 h-5" />;
      case 'report_time':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTriggerLabel = (trigger: AutomationTrigger): string => {
    const labels: Record<AutomationTrigger, string> = {
      class_scheduled: 'Aula Agendada',
      class_starting_soon: 'Aula Proxima',
      class_started: 'Aula Iniciada',
      class_ended: 'Aula Finalizada',
      class_cancelled: 'Aula Cancelada',
      payment_due_soon: 'Pagamento Proximo',
      payment_overdue: 'Pagamento Atrasado',
      payment_received: 'Pagamento Recebido',
      student_birthday: 'Aniversario',
      student_inactive: 'Aluno Inativo',
      homework_due: 'Tarefa Pendente',
      report_time: 'Hora do Relatorio',
    };
    return labels[trigger] || trigger;
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min atras`;
    if (diffHours < 24) return `${diffHours}h atras`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atras`;
    return formatDateTime(isoString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-purple-400 text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Motor de Automacao</h1>
        </div>
        <p className="text-slate-400">
          Automatize tarefas repetitivas e economize tempo com regras inteligentes
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Regras Ativas</span>
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.activeRules}
              <span className="text-slate-500 text-lg font-normal">
                /{stats.totalRules}
              </span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Eventos Hoje</span>
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.eventsToday}</div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Esta Semana</span>
              <Calendar className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.eventsThisWeek}</div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Taxa de Sucesso</span>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.successRate}%</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Regras
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'events'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Historico
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'stats'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Estatisticas
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleNewRule}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Regra
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma regra de automacao configurada</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-slate-800 border rounded-xl p-5 transition-all ${
                  rule.enabled
                    ? 'border-slate-700'
                    : 'border-slate-700/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`p-2 rounded-lg ${
                        rule.enabled
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {getTriggerIcon(rule.trigger)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{rule.name}</h3>
                      <p className="text-slate-400 text-sm mb-3">{rule.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md">
                          {getTriggerLabel(rule.trigger)}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-md">
                          {rule.actions.length} acoes
                        </span>
                        {rule.actionConfig.channel && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">
                            {rule.actionConfig.channel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                      title={rule.enabled ? 'Desativar' : 'Ativar'}
                    >
                      {rule.enabled ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleTestRule(rule)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      title="Testar"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditRule(rule.id)}
                      className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum evento de automacao registrado</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                      {getTriggerIcon(event.trigger)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{event.ruleName}</h3>
                      {event.entityName && (
                        <p className="text-slate-400 text-sm">{event.entityName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                        event.status === 'success'
                          ? 'bg-green-500/20 text-green-400'
                          : event.status === 'partial'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {event.status === 'success' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : event.status === 'partial' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {event.status === 'success'
                        ? 'Sucesso'
                        : event.status === 'partial'
                        ? 'Parcial'
                        : 'Falhou'}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">
                      {formatRelativeTime(event.triggeredAt)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <p className="text-slate-500 text-xs mb-2">Acoes executadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {event.actionsExecuted.map((action, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                          action.success
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {action.success ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {action.action.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Resumo Geral
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.totalRules}</p>
                <p className="text-slate-400 text-sm">Total de Regras</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{stats.activeRules}</p>
                <p className="text-slate-400 text-sm">Regras Ativas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.eventsToday}</p>
                <p className="text-slate-400 text-sm">Eventos Hoje</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{stats.eventsThisWeek}</p>
                <p className="text-slate-400 text-sm">Esta Semana</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.successRate}%</p>
                <p className="text-slate-400 text-sm">Taxa de Sucesso</p>
              </div>
            </div>
          </div>

          {/* Time Saved */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-700/50 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-pink-400" />
              Economia de Tempo Estimada
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-white">
                {stats.eventsThisWeek * 5}
              </div>
              <div>
                <p className="text-white font-medium">minutos esta semana</p>
                <p className="text-slate-400 text-sm">
                  Baseado em ~5 minutos por tarefa automatizada
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-purple-400">
                  {Math.round((stats.eventsThisWeek * 5) / 60)}h
                </p>
                <p className="text-slate-400 text-xs">Por semana</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-pink-400">
                  {Math.round((stats.eventsThisMonth * 5) / 60)}h
                </p>
                <p className="text-slate-400 text-xs">Por mes</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">
                  {Math.round((stats.eventsThisMonth * 5 * 12) / 60)}h
                </p>
                <p className="text-slate-400 text-xs">Por ano (estimado)</p>
              </div>
            </div>
          </div>

          {/* Productivity Tip */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Dica de Produtividade
            </h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-slate-300">
                {stats.activeRules < stats.totalRules
                  ? `Voce tem ${stats.totalRules - stats.activeRules} regra(s) desativada(s). Considere ativa-las para maximizar sua automacao!`
                  : stats.eventsThisWeek < 10
                  ? 'Configure mais gatilhos para aproveitar ao maximo o motor de automacao!'
                  : 'Excelente! Suas automacoes estao funcionando bem. Continue monitorando a taxa de sucesso.'}
              </p>
            </div>
          </div>

          {/* Most Active Rule */}
          {stats.mostActiveRule && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Regra Mais Ativa</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{stats.mostActiveRule.name}</p>
                  <p className="text-slate-400 text-sm">
                    {stats.mostActiveRule.eventCount} eventos disparados
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutomationManager;
