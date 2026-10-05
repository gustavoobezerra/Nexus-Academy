import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, DollarSign, Filter, Download } from 'lucide-react';
import { Skeleton } from './Common';
import type { Pagamento } from '../types';
import { paymentsAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface ChartData {
  name: string;
  value: number;
  amount?: number;
}

const FinancialAnalytics = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroMes, setFiltroMes] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    buscar();
  }, []);

  const buscar = async () => {
    setCarregando(true);
    try {
      const res = await paymentsAPI.getAll();
      setPagamentos(res.data.payments || []);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      toast.error('Erro ao buscar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Dados filtrados
  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter(p => {
      const pMes = new Date(p.dueDate).toISOString().slice(0, 7);
      return pMes === filtroMes;
    });
  }, [pagamentos, filtroMes]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalFaturado = pagamentosFiltrados
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalPendente = pagamentosFiltrados
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalAtrasado = pagamentosFiltrados
      .filter(p => p.status === 'late' || p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const quantidadeAlunos = new Set(pagamentosFiltrados.map(p => p.studentId)).size;

    const taxaRecebimento = pagamentosFiltrados.length > 0
      ? Math.round((pagamentosFiltrados.filter(p => p.status === 'paid').length / pagamentosFiltrados.length) * 100)
      : 0;

    return { totalFaturado, totalPendente, totalAtrasado, quantidadeAlunos, taxaRecebimento };
  }, [pagamentosFiltrados]);

  // Dados para gráfico de status
  const statusData = useMemo(() => [
    { name: 'Pago', value: pagamentosFiltrados.filter(p => p.status === 'paid').length, amount: stats.totalFaturado },
    { name: 'Pendente', value: pagamentosFiltrados.filter(p => p.status === 'pending').length, amount: stats.totalPendente },
    { name: 'Atrasado', value: pagamentosFiltrados.filter(p => p.status === 'late' || p.status === 'overdue').length, amount: stats.totalAtrasado }
  ], [pagamentosFiltrados, stats]);

  // Dados para gráfico de receita ao longo do mês
  const dadosReceita = useMemo(() => {
    const data: ChartData[] = [];
    const [ano, mes] = filtroMes.split('-').map(Number);
    // Get last day of the filtered month
    const ultimoDia = new Date(ano, mes, 0).getDate();

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataStr = `${filtroMes}-${String(dia).padStart(2, '0')}`;
      const recebidoNoDia = pagamentosFiltrados
        .filter(p => p.status === 'paid' && p.paidAt?.slice(0, 10) === dataStr)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      if (recebidoNoDia > 0) {
        data.push({
          name: `Dia ${dia}`,
          value: recebidoNoDia,
          amount: recebidoNoDia
        });
      }
    }
    return data;
  }, [pagamentosFiltrados, filtroMes]);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  if (carregando) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const exportarDados = () => {
    const headers = ['Aluno', 'Valor', 'Data Vencimento', 'Status'];
    const rows = pagamentosFiltrados.map(p => [
      `"${(p.studentName || 'Não informado').replace(/"/g, '""')}"`,
      (p.amount || 0).toFixed(2),
      new Date(p.dueDate).toLocaleDateString('pt-BR'),
      p.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financeiro-${filtroMes}.csv`);
    link.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Análise Financeira</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Dashboard completo de receitas e despesas</p>
        </div>
        <button
          onClick={exportarDados}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Filter size={16} className="inline mr-2" />
            Período
          </label>
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        <button
          onClick={buscar}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-6 rounded-xl border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Faturado</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                R$ {stats.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 dark:bg-green-700 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-green-700 dark:text-green-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900 dark:to-amber-900 p-6 rounded-xl border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pendente</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">
                R$ {stats.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-200 dark:bg-yellow-700 rounded-lg flex items-center justify-center">
              <Calendar size={24} className="text-yellow-700 dark:text-yellow-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900 dark:to-rose-900 p-6 rounded-xl border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Atrasado</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-2">
                R$ {stats.totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-200 dark:bg-red-700 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-red-700 dark:text-red-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Taxa de Recebimento</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">{stats.taxaRecebimento}%</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{stats.quantidadeAlunos} alunos</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 dark:bg-blue-700 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-blue-700 dark:text-blue-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Status de Pagamentos */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Status de Pagamentos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: any) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} pagamentos`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras - Receita por Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Receita por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                formatter={(value) => `R$ ${(value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Linha - Evolução de Receita */}
      {dadosReceita.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Evolução de Receita no Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosReceita}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                formatter={(value) => `R$ ${(value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Receita"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de Detalhes */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Detalhes de Pagamentos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-white">Aluno</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-white">Valor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-white">Vencimento</th>
                <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum pagamento neste período
                  </td>
                </tr>
              ) : (
                pagamentosFiltrados.map(p => (
                  <tr key={p.id || p._id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 text-slate-900 dark:text-white">{p.studentName || 'Não informado'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      R$ {(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : p.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}>
                        {p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Atrasado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
