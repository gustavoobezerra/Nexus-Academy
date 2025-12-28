import React, { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Clock, AlertCircle, CheckCircle, TrendingDown, Calendar } from 'lucide-react';
import api from '../lib/api';
import type { TeacherAnalytics, StudentPaymentStatus } from '../types';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subtext, color }) => {
  const colorMap = {
    indigo: 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400 shadow-indigo-500/5',
    cyan: 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400 shadow-cyan-500/5',
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5',
    amber: 'bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-amber-500/5',
    rose: 'bg-rose-500/5 border-rose-500/20 text-rose-400 shadow-rose-500/5'
  };

  return (
    <div className={`${colorMap[color]} border rounded-[2rem] p-6 transition-all hover:scale-[1.02] hover:bg-white/5 shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-xs font-black uppercase tracking-widest">{label}</span>
        <div className="p-2 bg-white/5 rounded-xl">{icon}</div>
      </div>
      <div className="text-3xl font-black text-white mb-1 tracking-tight">{value}</div>
      {subtext && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{subtext}</p>}
    </div>
  );
};

interface AlertBoxProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: 'warning' | 'alert' | 'success';
}

const AlertBox: React.FC<AlertBoxProps> = ({ icon, title, description, type }) => {
  const typeMap = {
    warning: 'bg-amber-900/20 border-amber-700 text-amber-300',
    alert: 'bg-rose-900/20 border-rose-700 text-rose-300',
    success: 'bg-emerald-900/20 border-emerald-700 text-emerald-300'
  };

  return (
    <div className={`${typeMap[type]} border rounded-lg p-4 flex items-start gap-3`}>
      {icon}
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-gray-300 mt-1">{description}</p>
      </div>
    </div>
  );
};

type TabType = 'overview' | 'financial' | 'retention' | 'operational' | 'pedagogical';

const TeacherAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<StudentPaymentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/teacher');
      const paymentResponse = await api.get('/analytics/student-payments');
      setAnalytics(response.data);
      setPaymentStatus(paymentResponse.data);
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white p-8">Carregando analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-white p-8">Dados não disponíveis</div>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-10 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Dashboard de <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Analytics</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Métricas de crescimento para sua jornada independente</p>
          <div className="flex items-center gap-2 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Clock size={12}/> Última atualização: {new Date(analytics.lastUpdated).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap bg-white/5 p-2 rounded-2xl w-fit border border-white/5">
        {(['overview', 'financial', 'retention', 'operational', 'pedagogical'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'overview' && 'Visão Geral'}
            {tab === 'financial' && 'Finanças'}
            {tab === 'retention' && 'Retenção'}
            {tab === 'operational' && 'Operacional'}
            {tab === 'pedagogical' && 'Pedagógico'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<DollarSign className="text-indigo-400" size={20} />}
              label="Receita este mês"
              value={`R$ ${analytics.financial.monthlyRevenue.toFixed(2)}`}
              subtext={`${analytics.financial.paymentRate.toFixed(0)}% dos alunos ativos`}
              color="indigo"
            />
            <MetricCard
              icon={<Users className="text-cyan-400" size={20} />}
              label="Alunos Ativos"
              value={analytics.financial.activeStudents}
              subtext={`${analytics.financial.inactiveStudents} inativos`}
              color="cyan"
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" size={20} />}
              label="Previsão Mensal"
              value={`R$ ${analytics.financial.expectedMonthlyRevenue.toFixed(2)}`}
              subtext={`Ticket: R$ ${analytics.financial.averageTicket.toFixed(2)}`}
              color="emerald"
            />
            <MetricCard
              icon={<AlertCircle className="text-amber-400" size={20} />}
              label="Pagamentos Atrasados"
              value={analytics.financial.overduePayments}
              subtext={`Ação necessária`}
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AlertBox
              icon={<AlertCircle className="text-amber-400" size={20} />}
              title="Alunos em Risco"
              description={`${analytics.retention.atRiskStudents.length} alunos podem abandonar em breve`}
              type="warning"
            />
            <AlertBox
              icon={<Clock className="text-cyan-400" size={20} />}
              title="Ocupação"
              description={`${analytics.timeManagement.occupancyRate.toFixed(0)}% do tempo alocado com aulas`}
              type="success"
            />
            <AlertBox
              icon={<TrendingUp className="text-emerald-400" size={20} />}
              title="Desempenho Geral"
              description={`Média: ${analytics.pedagogical.averagePerformance.toFixed(1)}/100 - Melhoria: ${analytics.pedagogical.improvementRate.toFixed(0)}%`}
              type="success"
            />
          </div>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<DollarSign className="text-indigo-400" size={20} />}
              label="Receita Total"
              value={`R$ ${analytics.financial.totalRevenue.toFixed(2)}`}
              color="indigo"
            />
            <MetricCard
              icon={<DollarSign className="text-cyan-400" size={20} />}
              label="Receita Mensal"
              value={`R$ ${analytics.financial.monthlyRevenue.toFixed(2)}`}
              subtext={`${analytics.financial.paymentRate.toFixed(0)}% de taxa`}
              color="cyan"
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" size={20} />}
              label="Ticket Médio"
              value={`R$ ${analytics.financial.averageTicket.toFixed(2)}`}
              subtext={`${analytics.financial.activeStudents} alunos ativos`}
              color="emerald"
            />
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
              <DollarSign className="text-indigo-400" size={24} />
              Status de Pagamento por Aluno
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-3">
                <thead className="text-slate-500 uppercase font-black text-[10px] tracking-widest">
                  <tr>
                    <th className="text-left py-2 px-4">Aluno</th>
                    <th className="text-right py-2 px-4">Mensalidade</th>
                    <th className="text-center py-2 px-4">Status</th>
                    <th className="text-right py-2 px-4">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentStatus.slice(0, 10).map((student) => (
                    <tr key={student.studentId} className="group hover:bg-white/5 transition-all">
                      <td className="py-4 px-4 font-bold text-white bg-white/5 rounded-l-2xl group-hover:bg-indigo-500/10 transition-all">{student.studentName}</td>
                      <td className="py-4 px-4 text-right font-black text-slate-300 bg-white/5 group-hover:bg-indigo-500/10 transition-all">R$ {student.monthlyFee.toFixed(2)}</td>
                      <td className="py-4 px-4 text-center bg-white/5 group-hover:bg-indigo-500/10 transition-all">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          student.currentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          student.currentStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {student.currentStatus === 'paid' && 'Pago'}
                          {student.currentStatus === 'pending' && 'Aguardando'}
                          {student.currentStatus === 'late' && `Atrasado ${student.daysOverdue}d`}
                          {student.currentStatus === 'overdue' && `Vencido ${student.daysOverdue}d`}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right bg-white/5 rounded-r-2xl group-hover:bg-indigo-500/10 transition-all">
                        {student.currentStatus !== 'paid' && (
                          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Cobrar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<Users className="text-cyan-400" size={20} />}
              label="Alunos Ativos"
              value={analytics.retention.activeStudents}
              color="cyan"
            />
            <MetricCard
              icon={<TrendingDown className="text-rose-400" size={20} />}
              label="Evasão Total"
              value={analytics.retention.totalChurn}
              subtext={`${analytics.retention.churnRate.toFixed(1)}% taxa`}
              color="rose"
            />
            <MetricCard
              icon={<AlertCircle className="text-amber-400" size={20} />}
              label="Alunos em Risco"
              value={analytics.retention.atRiskStudents.length}
              subtext="Ação recomendada"
              color="amber"
            />
          </div>

          {analytics.retention.atRiskStudents.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">⚠️ Alunos em Risco</h3>
              <div className="space-y-4">
                {analytics.retention.atRiskStudents.map((student) => (
                  <div key={student.studentId} className="bg-slate-700/50 border border-rose-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{student.studentName}</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Motivo: {student.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-rose-900 text-rose-300 px-3 py-1 rounded-full text-sm font-bold">
                          {student.riskScore}% risco
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-amber-300 mb-3">💡 {student.recommendation}</p>
                    {student.lastActivityDate && (
                      <p className="text-xs text-gray-400">Última atividade: {student.daysInactive} dias atrás</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'operational' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Clock className="text-indigo-400" size={20} />}
              label="Horas esta Semana"
              value={analytics.timeManagement.weeklyHours}
              color="indigo"
            />
            <MetricCard
              icon={<Calendar className="text-cyan-400" size={20} />}
              label="Horas este Mês"
              value={analytics.timeManagement.monthlyHours}
              color="cyan"
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" size={20} />}
              label="Taxa de Ocupação"
              value={`${analytics.timeManagement.occupancyRate.toFixed(0)}%`}
              color="emerald"
            />
            <MetricCard
              icon={<AlertCircle className="text-amber-400" size={20} />}
              label="Slots Disponíveis"
              value={analytics.timeManagement.availableSlots}
              subtext="Para agendar"
              color="amber"
            />
          </div>

          {analytics.timeManagement.suggestedSlots.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">💡 Horários Sugeridos para Aulas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analytics.timeManagement.suggestedSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    className="bg-slate-700 hover:bg-slate-600 border border-cyan-700 rounded-lg p-4 text-left transition"
                  >
                    <p className="font-semibold text-white">{slot}</p>
                    <p className="text-xs text-gray-400 mt-1">Clique para agendar</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pedagogical' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" size={20} />}
              label="Desempenho Médio"
              value={`${analytics.pedagogical.averagePerformance.toFixed(1)}`}
              subtext="/100"
              color="emerald"
            />
            <MetricCard
              icon={<CheckCircle className="text-cyan-400" size={20} />}
              label="Taxa de Melhoria"
              value={`${analytics.pedagogical.improvementRate.toFixed(0)}%`}
              subtext="Alunos evoluindo"
              color="cyan"
            />
          </div>

          {analytics.pedagogical.topicsDifficulty.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Tópicos com Dificuldade</h3>
              <div className="space-y-3">
                {analytics.pedagogical.topicsDifficulty.map((topic, idx) => (
                  <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{topic.topic}</h4>
                      <span className="text-xs font-bold bg-amber-900 text-amber-300 px-3 py-1 rounded-full">
                        {topic.count} erros
                      </span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-2 rounded-full"
                        style={{ width: `${Math.min(topic.difficulty * 10, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Dificuldade: {topic.difficulty.toFixed(1)}/10</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Desempenho por Aluno</h3>
            <div className="space-y-2">
              {analytics.pedagogical.studentsByPerformance.slice(0, 8).map((student, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg">
                  <span className="text-white font-medium text-sm">{student.studentName}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${
                      student.score >= 80 ? 'text-emerald-400' :
                      student.score >= 60 ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {student.score.toFixed(0)}/100
                    </span>
                    <span className="text-xs">
                      {student.trend === 'up' && '📈 Subindo'}
                      {student.trend === 'down' && '📉 Caindo'}
                      {student.trend === 'stable' && '➡️ Estável'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAnalyticsDashboard;
