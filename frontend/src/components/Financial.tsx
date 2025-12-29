import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { paymentsAPI } from '../lib/api';
import { Skeleton, ModalConfirmacao } from './Common';
import { statusColors } from '../lib/colors';
import type { Pagamento } from '../types';

const FinancialPage = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [confirmPayment, setConfirmPayment] = useState<Pagamento | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'pago' | 'pendente' | 'atrasado'>('todos');

  useEffect(() => { buscar(); }, []);

  const buscar = async () => {
    setCarregando(true);
    try {
      const res = await paymentsAPI.getAll();
      setPagamentos(res.data.payments || []);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      setPagamentos([]);
    } finally { 
      setCarregando(false); 
    }
  };

  const marcarPago = async (p: Pagamento) => {
    if (!p._id && !p.id) {
      toast.error('ID de pagamento inválido');
      return;
    }

    try {
      await paymentsAPI.update(p._id || p.id || '', { status: 'paid' });
      toast.success('Pagamento registrado com sucesso');
      buscar();
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const filtrados = pagamentos.filter(p => {
    if (filtro === 'pago') return p.status === 'paid';
    if (filtro === 'pendente') return p.status === 'pending';
    if (filtro === 'atrasado') return p.status === 'late' || p.status === 'overdue';
    return true;
  });

  const stats = {
    total: pagamentos.reduce((sum, p) => sum + (p.amount || 0), 0),
    pago: pagamentos.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
    pendente: pagamentos.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
    atrasado: pagamentos.filter(p => p.status === 'late' || p.status === 'overdue').reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  if (carregando) return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 mb-4"/>
      <Skeleton className="h-20 w-full mb-4"/>
      <Skeleton className="h-12 w-full"/>
    </div>
  );

  const getStatusBadge = (status: string) => {
    const colors = statusColors[status as keyof typeof statusColors] || statusColors.pending;
    return colors;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ModalConfirmacao
        aberto={!!confirmPayment}
        titulo="Confirmar pagamento"
        mensagem={`Marcar pagamento de R$ ${confirmPayment?.amount?.toFixed(2)} de ${confirmPayment?.studentName} como pago?`}
        onConfirmar={() => {
          if (confirmPayment) marcarPago(confirmPayment);
          setConfirmPayment(null);
        }}
        onCancelar={() => setConfirmPayment(null)}
        corBotao="green"
      />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">Financeiro</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerenciar pagamentos dos alunos</p>
        </div>
        <button
          onClick={buscar}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors text-gray-900 dark:text-white"
        >
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Faturado</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-700">
          <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2"><Check size={16}/> Recebidos</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-700">
          <p className="text-amber-700 dark:text-amber-400 text-sm font-medium flex items-center gap-2"><Clock size={16}/> Pendentes</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats.pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl shadow-sm border border-red-200 dark:border-red-700">
          <p className="text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2"><AlertCircle size={16}/> Atrasados</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
            {stats.atrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['todos', 'pago', 'pendente', 'atrasado'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filtro === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-white'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'pago' ? 'Pago' : f === 'pendente' ? 'Pendente' : 'Atrasado'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <CreditCard size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4"/>
            <p className="text-gray-500 dark:text-gray-400">Nenhum pagamento encontrado</p>
          </div>
        ) : (
          filtrados.map(p => {
            const color = getStatusBadge(p.status);
            return (
              <div
                key={p.id || p._id}
                className={`${color.bg} p-4 rounded-xl shadow-sm border-2 ${color.border} hover:shadow-md transition-shadow`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className={`font-semibold ${color.text}`}>{p.studentName || 'Aluno desconhecido'}</div>
                    <div className={`text-sm ${color.text} opacity-80`}>
                      Vencimento: {new Date(p.dueDate).toLocaleDateString('pt-BR')} · {p.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.status === 'paid' ? (
                      <span className={`flex items-center gap-2 px-4 py-2 rounded-lg ${color.bg} ${color.text} font-medium`}>
                        <Check size={18}/> Pago
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmPayment(p)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                      >
                        Marcar Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FinancialPage;
