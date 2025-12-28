import React, { useState } from 'react';
import {
  Plus, Video, DollarSign, MessageSquare,
  FileText, UserPlus, Zap, X, ChevronRight
} from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (route: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'new-class',
      label: 'Agendar Aula',
      icon: <Video size={20} className="text-indigo-500" />,
      route: 'aulas',
      description: 'Marcar novo horário'
    },
    {
      id: 'new-payment',
      label: 'Registrar Pagamento',
      icon: <DollarSign size={20} className="text-emerald-500" />,
      route: 'finance',
      description: 'Baixa em mensalidade'
    },
    {
      id: 'new-student',
      label: 'Novo Aluno',
      icon: <UserPlus size={20} className="text-blue-500" />,
      route: 'students',
      description: 'Cadastrar no sistema'
    },
    {
      id: 'send-message',
      label: 'Enviar Mensagem',
      icon: <MessageSquare size={20} className="text-purple-500" />,
      route: 'automation',
      description: 'WhatsApp ou E-mail'
    },
    {
      id: 'generate-report',
      label: 'Gerar Relatório',
      icon: <FileText size={20} className="text-amber-500" />,
      route: 'analytics',
      description: 'Desempenho mensal'
    }
  ];

  const handleAction = (route: string) => {
    onNavigate(route);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Action Menu */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={18} className="text-indigo-500 fill-indigo-500" />
              Ações Rápidas
            </h3>
          </div>
          <div className="p-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.route)}
                className="w-full p-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors group"
              >
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{action.label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{action.description}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
          isOpen
            ? 'bg-slate-800 text-white rotate-90'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {isOpen ? <X size={28} /> : <Plus size={32} />}
      </button>
    </div>
  );
};

export default QuickActions;
