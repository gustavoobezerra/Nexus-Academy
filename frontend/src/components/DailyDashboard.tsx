import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, AlertTriangle, CheckCircle,
  ArrowRight, Users, TrendingUp, Zap,
  MessageSquare, DollarSign, Gift, ChevronRight, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Aula } from '../types';

interface DailyDashboardProps {
  onNavegar?: (tab: string) => void;
}

export const DailyDashboard: React.FC<DailyDashboardProps> = ({ onNavegar }) => {
  const [aulasHoje, setAulasHoje] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAulas: 0,
    concluidas: 0,
    faturamento: 0,
    alunosAtivos: 0
  });

  useEffect(() => {
    loadDailyData();
  }, []);

  const loadDailyData = () => {
    setLoading(true);
    // Em um app real, buscaria da API filtrando por data de hoje
    // Aqui usamos mock simulado
    setTimeout(() => {
      const mockAulas: Aula[] = [
        {
          id: '1',
          _id: '1',
          title: 'Aula de Matemática',
          studentId: 's1',
          studentName: 'João Silva',
          subject: 'Matemática',
          scheduledAt: new Date().toISOString(),
          duration: 60,
          status: 'scheduled',
          grade: '9º Ano',
          isLive: false
        },
        {
          id: '2',
          _id: '2',
          title: 'Aula de Física',
          studentId: 's2',
          studentName: 'Maria Oliveira',
          subject: 'Física',
          scheduledAt: new Date(Date.now() + 7200000).toISOString(),
          duration: 60,
          status: 'scheduled',
          grade: '2º EM',
          isLive: false
        }
      ];

      setAulasHoje(mockAulas);
      setStats({
        totalAulas: 5,
        concluidas: 2,
        faturamento: 450,
        alunosAtivos: 12
      });
      setLoading(false);
    }, 800);
  };

  const handleStartClass = (aula: Aula) => {
    toast.success(`Iniciando aula com ${aula.studentName}`);
    if (onNavegar) onNavegar('aulas');
  };

  const handleSendPaymentReminder = () => {
    toast.success('Lembrete de pagamento enviado com sucesso!');
  };

  const handleSendBirthdayGreeting = () => {
    toast.success('Mensagem de parabéns enviada com sucesso!');
  };

  const handleSendInactiveReminder = () => {
    toast.success('Lembrete de inatividade enviado!');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Bom dia, Professor! <span className="text-4xl">👋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavegar?.('smart-schedule')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 font-medium text-sm flex items-center gap-2"
          >
            <Zap size={18} />
            Agendamento Inteligente
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Calendar size={20} />
            </div>
            <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">+2 hoje</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Aulas Hoje</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalAulas}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">40% concluído</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Concluídas</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.concluidas}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">Mês atual</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Faturamento</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">R$ {stats.faturamento}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Users size={20} />
            </div>
            <span className="text-xs font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-full">Ativos</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Alunos</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.alunosAtivos}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Classes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="text-indigo-500" /> Próximas Aulas
            </h3>
            <button
              onClick={() => onNavegar?.('aulas')}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-1"
            >
              Ver todas <ArrowRight size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {aulasHoje.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400">Nenhuma aula agendada para hoje.</p>
              </div>
            ) : (
              aulasHoje.map((aula) => (
                <div key={aula.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-indigo-500/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <span className="text-xs font-bold uppercase">{new Date(aula.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{aula.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{aula.studentName} • {aula.grade}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartClass(aula)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl transition-all font-bold text-sm opacity-0 group-hover:opacity-100"
                  >
                    Iniciar
                  </button>
                </div>
              ))
            )}
          </div>

          {/* AI Insights Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap size={100} />
            </div>
            <div className="relative">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp size={24} /> Insight da IA
              </h3>
              <p className="text-indigo-100 mb-4 max-w-md">
                Você tem 3 aulas de Matemática hoje. A IA preparou os materiais e identificou que João Silva teve dificuldades com frações na última aula.
              </p>
              <button
                onClick={() => onNavegar?.('ai-insights')}
                className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg"
              >
                Ver Análise Completa
              </button>
            </div>
          </div>
        </div>

        {/* Alerts & Actions SidePanel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Alertas</h3>
            <span className="w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
          </div>

          <div className="space-y-3">
            {/* Alerta de Pagamento */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3">
              <div className="mt-1 p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg h-fit">
                <DollarSign size={18} />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm">Pagamento Atrasado</h4>
                <p className="text-xs text-amber-800/70 dark:text-amber-400/70 mt-0.5">Maria Oliveira (Atraso de 2 dias)</p>
                <button onClick={handleSendPaymentReminder} className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors">Enviar Lembrete</button>
              </div>
            </div>

            {/* Alerta de Aniversário */}
            <div className="bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-900/30 p-4 rounded-2xl flex gap-3">
              <div className="mt-1 p-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg h-fit">
                <Gift size={18} />
              </div>
              <div>
                <h4 className="font-bold text-pink-900 dark:text-pink-400 text-sm">Aniversário Hoje!</h4>
                <p className="text-xs text-pink-800/70 dark:text-pink-400/70 mt-0.5">Carlos Eduardo faz 15 anos.</p>
                <button onClick={handleSendBirthdayGreeting} className="mt-2 text-xs font-bold text-pink-600 dark:text-pink-400 underline hover:text-pink-700 dark:hover:text-pink-300 transition-colors">Enviar Parabéns</button>
              </div>
            </div>

            {/* Alerta de Inatividade */}
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex gap-3">
              <div className="mt-1 p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg h-fit">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Aluno Inativo</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ana Clara não agenda aulas há 14 dias.</p>
                <button onClick={handleSendInactiveReminder} className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Entrar em Contato</button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onNavegar?.('aulas')}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Plus className="text-indigo-500" size={18} /> Agendar Nova Aula
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
              <button
                onClick={() => onNavegar?.('finance')}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="text-emerald-500" size={18} /> Registrar Pagamento
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
              <button
                onClick={() => onNavegar?.('automation')}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-blue-500" size={18} /> Enviar Comunicado
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyDashboard;
