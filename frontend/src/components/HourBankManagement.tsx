import React, { useState, useEffect } from 'react';
import { Clock, TrendingDown, AlertTriangle, CheckCircle, Plus, History, Calendar, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HourBank, HourBankAlert, Aluno } from '../types';

interface HourBankManagementProps {
  students?: Aluno[];
}

export const HourBankManagement: React.FC<HourBankManagementProps> = ({ students = [] }) => {
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [hourBanks, setHourBanks] = useState<HourBank[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'add' | 'history'>('overview');
  const [newHours, setNewHours] = useState({
    hours: 0,
    type: 'purchase' as 'purchase' | 'bonus',
    description: ''
  });

  // Mock data - em produção viria da API
  useEffect(() => {
    const mockHourBanks: HourBank[] = students.map(student => ({
      _id: `hb_${student._id}`,
      student: student._id || '',
      studentName: student.name,
      totalHoursPurchased: student._id === '1' ? 12 : student._id === '3' ? 8 : 4,
      hoursConsumed: student._id === '1' ? 9 : student._id === '3' ? 7.5 : 1.5,
      hoursRemaining: student._id === '1' ? 3 : student._id === '3' ? 0.5 : 2.5,
      packageType: student._id === '1' ? 'monthly_12h' : student._id === '3' ? 'monthly_8h' : 'monthly_4h',
      renewalDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      history: [
        {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'purchase',
          hours: student._id === '1' ? 12 : student._id === '3' ? 8 : 4,
          description: 'Pacote mensal'
        },
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'consumption',
          hours: -1,
          classId: 'class_101',
          className: 'Matemática - Equações',
          description: 'Aula concluída'
        }
      ],
      alerts: student._id === '3' ? [
        {
          type: 'low_hours_10',
          sentAt: new Date().toISOString(),
          acknowledged: false
        }
      ] : [],
      autoRenew: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }));
    setHourBanks(mockHourBanks);
  }, [students]);

  const selectedHourBank = hourBanks.find(hb => hb.student === selectedStudent);

  const getAlertIcon = (type: HourBankAlert['type']) => {
    switch (type) {
      case 'hours_depleted':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'low_hours_10':
        return <AlertTriangle className="text-orange-500" size={20} />;
      case 'low_hours_25':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'renewal_reminder':
        return <Calendar className="text-blue-500" size={20} />;
      default:
        return <AlertTriangle className="text-gray-500" size={20} />;
    }
  };

  const getAlertMessage = (type: HourBankAlert['type']) => {
    switch (type) {
      case 'hours_depleted':
        return 'Horas esgotadas! Adicione mais horas para continuar agendando aulas.';
      case 'low_hours_10':
        return 'Restam menos de 10% das horas. Considere renovar o pacote.';
      case 'low_hours_25':
        return 'Restam menos de 25% das horas. Planeje a renovação em breve.';
      case 'renewal_reminder':
        return 'Renovação automática agendada para breve.';
      default:
        return 'Alerta do banco de horas';
    }
  };

  const handleAddHours = () => {
    if (!selectedStudent || newHours.hours <= 0) {
      toast.error('Selecione um aluno e defina a quantidade de horas');
      return;
    }

    const updatedBanks = hourBanks.map(hb => {
      if (hb.student === selectedStudent) {
        return {
          ...hb,
          totalHoursPurchased: hb.totalHoursPurchased + newHours.hours,
          hoursRemaining: hb.hoursRemaining + newHours.hours,
          history: [
            {
              date: new Date().toISOString(),
              type: newHours.type,
              hours: newHours.hours,
              description: newHours.description || `${newHours.type === 'purchase' ? 'Compra' : 'Bônus'} de ${newHours.hours} horas`
            },
            ...hb.history
          ],
          updatedAt: new Date().toISOString()
        };
      }
      return hb;
    });

    setHourBanks(updatedBanks);
    toast.success(`${newHours.hours} horas adicionadas com sucesso!`);
    setNewHours({ hours: 0, type: 'purchase', description: '' });
    setActiveTab('overview');
  };

  const acknowledgeAlert = (alertIndex: number) => {
    if (!selectedHourBank) return;

    const updatedBanks = hourBanks.map(hb => {
      if (hb.student === selectedStudent) {
        const updatedAlerts = [...hb.alerts];
        updatedAlerts[alertIndex] = { ...updatedAlerts[alertIndex], acknowledged: true };
        return { ...hb, alerts: updatedAlerts };
      }
      return hb;
    });

    setHourBanks(updatedBanks);
    toast.success('Alerta confirmado');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-purple-400 mb-2">⏰ Banco de Horas</h1>
        <p className="text-gray-400">Gestão inteligente de horas contratadas e consumidas por aluno</p>
      </div>

      {/* Seletor de Aluno */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Selecionar Aluno</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full md:w-96 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Escolha um aluno...</option>
          {students.map(student => (
            <option key={student._id} value={student._id}>
              {student.name} - {student.grade}
            </option>
          ))}
        </select>
      </div>

      {selectedHourBank && (
        <>
          {/* Alertas Ativos */}
          {selectedHourBank.alerts.filter(a => !a.acknowledged).length > 0 && (
            <div className="mb-6 space-y-3">
              {selectedHourBank.alerts.filter(a => !a.acknowledged).map((alert, index) => (
                <div key={index} className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-700 rounded-xl p-4 flex items-start gap-4">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="font-semibold text-white">{getAlertMessage(alert.type)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.sentAt).toLocaleDateString('pt-BR')} às {new Date(alert.sentAt).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(selectedHourBank.alerts.indexOf(alert))}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition"
                  >
                    OK
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cards de Visão Geral */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium">Total Contratado</h3>
                <Package className="text-blue-400" size={24} />
              </div>
              <p className="text-3xl font-bold text-white">{selectedHourBank.totalHoursPurchased}h</p>
              <p className="text-xs text-gray-500 mt-1">Pacote: {selectedHourBank.packageType.replace('monthly_', '').replace('h', ' horas/mês')}</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium">Horas Consumidas</h3>
                <TrendingDown className="text-orange-400" size={24} />
              </div>
              <p className="text-3xl font-bold text-white">{selectedHourBank.hoursConsumed}h</p>
              <p className="text-xs text-gray-500 mt-1">
                {((selectedHourBank.hoursConsumed / selectedHourBank.totalHoursPurchased) * 100).toFixed(0)}% utilizado
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium">Horas Restantes</h3>
                <Clock className="text-green-400" size={24} />
              </div>
              <p className="text-3xl font-bold text-white">{selectedHourBank.hoursRemaining}h</p>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full ${
                    selectedHourBank.hoursRemaining / selectedHourBank.totalHoursPurchased < 0.1
                      ? 'bg-red-500'
                      : selectedHourBank.hoursRemaining / selectedHourBank.totalHoursPurchased < 0.25
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${(selectedHourBank.hoursRemaining / selectedHourBank.totalHoursPurchased) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium">Renovação</h3>
                <Calendar className="text-purple-400" size={24} />
              </div>
              <p className="text-lg font-bold text-white">
                {new Date(selectedHourBank.renewalDate).toLocaleDateString('pt-BR')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle size={16} className={selectedHourBank.autoRenew ? 'text-green-400' : 'text-gray-500'} />
                <p className="text-xs text-gray-400">{selectedHourBank.autoRenew ? 'Auto-renovação ativa' : 'Renovação manual'}</p>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mb-6 border-b border-slate-700">
            {[
              { id: 'overview', label: 'Visão Geral', icon: Clock },
              { id: 'add', label: 'Adicionar Horas', icon: Plus },
              { id: 'history', label: 'Histórico', icon: History }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} />
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Conteúdo das Abas */}
          {activeTab === 'overview' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Resumo do Banco de Horas</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-gray-400">Aluno:</span>
                  <span className="font-semibold">{selectedHourBank.studentName}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-gray-400">Pacote Atual:</span>
                  <span className="font-semibold">
                    {selectedHourBank.packageType.replace('monthly_', '').replace('h', ' horas/mês').replace('custom', 'Personalizado')}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-gray-400">Taxa de Utilização:</span>
                  <span className="font-semibold">
                    {((selectedHourBank.hoursConsumed / selectedHourBank.totalHoursPurchased) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-gray-400">Média de Horas/Aula:</span>
                  <span className="font-semibold">
                    {selectedHourBank.history.filter(h => h.type === 'consumption').length > 0
                      ? (Math.abs(selectedHourBank.history.filter(h => h.type === 'consumption').reduce((sum, h) => sum + h.hours, 0)) /
                         selectedHourBank.history.filter(h => h.type === 'consumption').length).toFixed(1)
                      : '0'}h
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Aulas Restantes (estimativa):</span>
                  <span className="font-semibold">
                    {Math.floor(selectedHourBank.hoursRemaining / 1)} aulas de 1h
                  </span>
                </div>
              </div>

              {selectedHourBank.hoursRemaining < 2 && (
                <div className="mt-6 bg-orange-900/30 border border-orange-700 rounded-lg p-4">
                  <p className="text-orange-300 font-semibold">⚠️ Atenção!</p>
                  <p className="text-gray-300 text-sm mt-1">
                    O aluno tem apenas {selectedHourBank.hoursRemaining}h restantes. Considere adicionar mais horas para continuar com as aulas.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm transition"
                  >
                    Adicionar Horas Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-6">Adicionar Horas ao Banco</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade de Horas</label>
                  <input
                    type="number"
                    value={newHours.hours || ''}
                    onChange={(e) => setNewHours({ ...newHours, hours: Number(e.target.value) })}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: 4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Adição</label>
                  <select
                    value={newHours.type}
                    onChange={(e) => setNewHours({ ...newHours, type: e.target.value as 'purchase' | 'bonus' })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="purchase">💳 Compra (pagamento do aluno)</option>
                    <option value="bonus">🎁 Bônus (cortesia)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição (opcional)</label>
                  <input
                    type="text"
                    value={newHours.description}
                    onChange={(e) => setNewHours({ ...newHours, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Pacote mensal de abril"
                  />
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Pacotes Sugeridos:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { hours: 4, label: 'Básico - 4h', desc: '~4 aulas de 1h' },
                      { hours: 8, label: 'Intermediário - 8h', desc: '~8 aulas de 1h' },
                      { hours: 12, label: 'Avançado - 12h', desc: '~12 aulas de 1h' }
                    ].map(pkg => (
                      <button
                        key={pkg.hours}
                        onClick={() => setNewHours({ ...newHours, hours: pkg.hours })}
                        className="bg-slate-600 hover:bg-slate-500 rounded-lg p-3 text-left transition"
                      >
                        <p className="font-semibold">{pkg.label}</p>
                        <p className="text-xs text-gray-400">{pkg.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddHours}
                  disabled={newHours.hours <= 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar {newHours.hours > 0 ? `${newHours.hours} horas` : 'Horas'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-6">Histórico de Movimentações</h3>

              {selectedHourBank.history.length === 0 ? (
                <div className="text-center py-12">
                  <History size={48} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedHourBank.history.map((item, index) => (
                    <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            item.type === 'purchase' ? 'bg-blue-900/50' :
                            item.type === 'consumption' ? 'bg-red-900/50' :
                            item.type === 'bonus' ? 'bg-green-900/50' :
                            'bg-gray-900/50'
                          }`}>
                            {item.type === 'purchase' && <Package size={20} className="text-blue-400" />}
                            {item.type === 'consumption' && <TrendingDown size={20} className="text-red-400" />}
                            {item.type === 'bonus' && <Plus size={20} className="text-green-400" />}
                            {item.type === 'refund' && <Plus size={20} className="text-yellow-400" />}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {item.type === 'purchase' && 'Compra de Horas'}
                              {item.type === 'consumption' && 'Consumo de Horas'}
                              {item.type === 'bonus' && 'Bônus de Horas'}
                              {item.type === 'refund' && 'Reembolso de Horas'}
                            </p>
                            {item.description && <p className="text-sm text-gray-400">{item.description}</p>}
                            {item.className && <p className="text-xs text-gray-500 mt-1">Aula: {item.className}</p>}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.date).toLocaleDateString('pt-BR')} às {new Date(item.date).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          item.hours > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.hours > 0 ? '+' : ''}{item.hours}h
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedStudent && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Clock size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">Selecione um aluno para visualizar o banco de horas</p>
        </div>
      )}
    </div>
  );
};

export default HourBankManagement;
