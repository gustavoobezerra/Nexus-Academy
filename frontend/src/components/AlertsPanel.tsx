import React, { useState, useEffect } from 'react';
import {
  Bell, X, DollarSign, Gift, AlertTriangle,
  Clock, CheckCircle, ArrowRight, Trash2, UserPlus, GraduationCap, RefreshCw
} from 'lucide-react';
import { alertService, type Alert } from '../services/alertService';
import toast from 'react-hot-toast';

interface AlertsPanelProps {
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ onClose, onNavigate }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setLoading(true);
      try {
        const fetchedAlerts = await alertService.fetchAlerts();
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setAlerts(fetchedAlerts.filter(a => !a.dismissedAt));
      } catch (error) {
        console.error('Erro ao carregar alertas:', error);
        setAlerts(alertService.getAlerts());
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const handleDismiss = async (id: string) => {
    await alertService.dismissAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success('Alerta removido');
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const fetchedAlerts = await alertService.fetchAlerts();
      setAlerts(fetchedAlerts.filter(a => !a.dismissedAt));
      toast.success('Alertas atualizados');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (alert: Alert) => {
    if (alert.actionRoute) {
      onNavigate(alert.actionRoute);
    }
    handleDismiss(alert.id);
    onClose();
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'payment_overdue':
      case 'payment_due_soon':
        return <DollarSign className="text-amber-500" />;
      case 'student_birthday':
        return <Gift className="text-pink-500" />;
      case 'student_inactive':
        return <AlertTriangle className="text-orange-500" />;
      case 'class_starting_soon':
        return <Clock className="text-blue-500" />;
      case 'new_student':
      case 'student_onboarding':
        return <UserPlus className="text-emerald-500" />;
      case 'student':
        return <GraduationCap className="text-indigo-500" />;
      default:
        return <Bell className="text-indigo-500" />;
    }
  };

  return (
    <div className="absolute top-16 right-0 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell size={18} className="text-indigo-500" />
          Central de Alertas
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={16} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw size={30} className="text-indigo-500 mx-auto mb-3 animate-spin opacity-50" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Carregando alertas...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3 opacity-20" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tudo em dia! Nenhum alerta pendente.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.priority === 'high'
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex gap-3">
                <div className={`p-2 rounded-lg h-fit ${
                  alert.priority === 'high' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-white dark:bg-slate-800 shadow-sm'
                }`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{alert.title}</h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={() => handleAction(alert)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {alert.actionLabel || 'Ver detalhes'} <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Descartar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <button
            onClick={async () => {
              await alertService.markAllAsRead();
              setAlerts([]);
              toast.success('Todos os alertas marcados como lidos');
            }}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Marcar tudo como lido
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
