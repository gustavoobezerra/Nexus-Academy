import { useState, useEffect, useMemo } from 'react';
import { Plus, Video, Users, Wallet, TrendingUp, ArrowUpRight, ChevronRight, Calendar, VideoIcon, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsAPI, paymentsAPI, classesAPI } from '../lib/api';
import { Skeleton } from './Common';
import { FadeContent, StaggerContainer, StaggerItem, GradientText } from './ui/Animations';
import type { Aluno, Aula } from '../types';

export const Dashboard = ({ onNavegar }: { onNavegar: (tab: string) => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { buscarDados(); }, []);

  const buscarDados = async () => {
    setCarregando(true);
    try {
      const [studentStats, paymentStats, studentsRes, classesRes] = await Promise.all([
        studentsAPI.getStats(),
        paymentsAPI.getStats(),
        studentsAPI.getAll(),
        classesAPI.getAll()
      ]);
      setStats({
        students: (studentStats as any)?.stats || {},
        payments: (paymentStats as any)?.stats || {}
      });
      setAlunos((studentsRes as any)?.students || []);
      setAulas((classesRes as any)?.classes || []);
    } catch (error) {
      console.error('Dashboard fetch error', error);
      toast.error('Erro ao carregar dados do dashboard');
      setStats({});
      setAlunos([]);
      setAulas([]);
    } finally {
      setCarregando(false);
    }
  };

  const aulasHoje = useMemo(() => {
    const hoje = new Date().toDateString();
    return aulas.filter(a => new Date(a.scheduledAt).toDateString() === hoje);
  }, [aulas]);

  const proximasAulas = useMemo(() => {
    const agora = new Date();
    return aulas
      .filter(a => new Date(a.scheduledAt) >= agora && a.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [aulas]);

  const alunosPorStatus = useMemo(() => {
    return {
      emDia: alunos.filter(a => a.paymentStatus === 'paid').length,
      pendente: alunos.filter(a => a.paymentStatus === 'pending').length,
      atrasado: alunos.filter(a => a.paymentStatus === 'late').length
    };
  }, [alunos]);

  const percentualEmDia = useMemo(() => {
    if (alunos.length === 0) return 0;
    return (alunosPorStatus.emDia / alunos.length) * 100;
  }, [alunosPorStatus.emDia, alunos.length]);

  if (carregando) return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><Skeleton className="h-96 w-full rounded-2xl" /></div>
        <div><Skeleton className="h-96 w-full rounded-2xl" /></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 space-y-10 bg-[#0f0f13] min-h-screen text-slate-200">
      <FadeContent delay={0} duration={0.5}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Bem-vindo, <GradientText text="Professor" colors={['#818cf8', '#a5b4fc', '#22d3ee', '#818cf8']} animationSpeed={6} />
            </h2>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavegar('aulas')}
              className="flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-xl hover:bg-slate-100 transition-all font-semibold shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <Plus size={20}/> Nova Aula
            </button>
          </div>
        </div>
      </FadeContent>

      {alunosPorStatus.atrasado > 0 && (
        <FadeContent delay={0.1} duration={0.5}>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-5">
            <div className="bg-red-500/20 p-3 rounded-xl"><AlertCircle className="text-red-400" size={24} /></div>
            <div className="flex-1">
              <p className="text-white font-semibold">{alunosPorStatus.atrasado} aluno(s) com pendências</p>
              <p className="text-red-400/80 text-sm">Total em aberto: R$ {(stats?.payments?.pendingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <button onClick={() => onNavegar('finance')} className="bg-red-500/20 hover:bg-red-500/30 text-red-100 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2">
              Resolver <ChevronRight size={16}/>
            </button>
          </div>
        </FadeContent>
      )}

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" delay={0.2} staggerDelay={0.1}>
        <StaggerItem>
          <div onClick={() => onNavegar('students')} className="group bg-slate-900/60 border border-slate-800/60 p-6 rounded-2xl shadow-xl cursor-pointer hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform"><Users size={80}/></div>
            <div className="relative z-10">
              <div className="bg-indigo-500/10 w-11 h-11 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/20 text-indigo-400"><Users size={22}/></div>
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Total Alunos</p>
              <p className="text-3xl font-bold mt-1 text-white">{stats?.students?.totalStudents || 0}</p>
              <div className="mt-3 flex items-center gap-2 text-indigo-400 font-medium text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                {alunosPorStatus.emDia} ativos
              </div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="group bg-slate-900/60 border border-slate-800/60 p-6 rounded-2xl shadow-xl hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform"><TrendingUp size={80}/></div>
            <div className="relative z-10">
              <div className="bg-emerald-500/10 w-11 h-11 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20 text-emerald-400"><TrendingUp size={22}/></div>
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Receita Mensal</p>
              <p className="text-3xl font-bold mt-1 text-white">R$ {(stats?.payments?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              <div className="mt-3 flex items-center gap-1 text-emerald-400 font-medium text-xs">
                <ArrowUpRight size={14}/> Potencial: R$ {(stats?.students?.totalMonthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div onClick={() => onNavegar('aulas')} className="group bg-slate-900/60 border border-slate-800/60 p-6 rounded-2xl shadow-xl cursor-pointer hover:border-purple-500/40 hover:bg-slate-900/80 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform"><Video size={80}/></div>
            <div className="relative z-10">
              <div className="bg-purple-500/10 w-11 h-11 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20 text-purple-400"><Video size={22}/></div>
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Aulas Hoje</p>
              <p className="text-3xl font-bold mt-1 text-white">{aulasHoje.length}</p>
              <div className="mt-3 text-purple-400 font-medium text-xs">{proximasAulas.length} agendadas</div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div onClick={() => onNavegar('finance')} className="group bg-slate-900/60 border border-slate-800/60 p-6 rounded-2xl shadow-xl cursor-pointer hover:border-amber-500/40 hover:bg-slate-900/80 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform"><Wallet size={80}/></div>
            <div className="relative z-10">
              <div className="bg-amber-500/10 w-11 h-11 rounded-xl flex items-center justify-center mb-4 border border-amber-500/20 text-amber-400"><Wallet size={22}/></div>
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">A Receber</p>
              <p className="text-3xl font-bold mt-1 text-white">R$ {(stats?.payments?.pendingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              <div className="mt-3 text-amber-400 font-medium text-xs">{stats?.payments?.pendingCount || 0} pendentes</div>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeContent delay={0.4} duration={0.6} className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-800/60 overflow-hidden">
            <div className="p-6 border-b border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-indigo-500/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-500/10 p-3 rounded-2xl"><Video className="text-indigo-400" size={24}/></div>
                <div>
                  <h3 className="text-xl font-black text-white">Aulas de Hoje</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{aulasHoje.length} sessões planejadas</p>
                </div>
              </div>
              <button onClick={() => onNavegar('aulas')} className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors flex items-center gap-1">
                Ver Agenda <ChevronRight size={18}/>
              </button>
            </div>
            <div className="p-8">
              {aulasHoje.length === 0 ? (
                <div className="text-center py-16 space-y-4 opacity-40">
                  <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto"><Calendar size={40} className="text-slate-400 dark:text-slate-500"/></div>
                  <p className="text-slate-400 dark:text-slate-300 font-bold">Nenhuma aula para hoje</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {aulasHoje.map(aula => (
                    <div key={aula.id} className={`group p-6 rounded-3xl border border-white/5 transition-all hover:bg-white/5 ${aula.isLive ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-800/30'}`}>
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${aula.isLive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                            {aula.isLive ? (
                              <div className="flex flex-col items-center gap-1">
                                <VideoIcon size={24}/>
                                <span className="text-[8px] font-black uppercase tracking-tighter">LIVE</span>
                              </div>
                            ) : (
                              <Clock size={28}/>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-black text-white tracking-tight">{aula.title}</h4>
                              {aula.isLive && (<span className="px-2 py-1 bg-red-500 text-white text-[8px] font-black rounded-lg animate-pulse tracking-widest">AO VIVO</span>)}
                            </div>
                            <p className="text-slate-400 font-bold text-sm mt-0.5">{aula.studentName} • {aula.grade}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs font-black uppercase tracking-widest">
                              <span className="flex items-center gap-1.5 text-indigo-400"><Clock size={14}/>{new Date(aula.scheduledAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                              <span className="text-slate-500">{aula.duration} min</span>
                            </div>
                          </div>
                        </div>
                        <button className={`px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg ${
                          aula.isLive
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                        }`}>
                          {aula.isLive ? 'ENCERRAR' : 'INICIAR'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FadeContent>

        <FadeContent delay={0.5} duration={0.6} className="space-y-6">
          <div className="bg-slate-900/60 rounded-2xl shadow-xl border border-slate-800/60 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform"><BarChart3 size={80}/></div>
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/10 p-2.5 rounded-xl"><BarChart3 className="text-cyan-400" size={20}/></div>
                <h3 className="text-lg font-semibold text-white">Status de Saúde</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <span>Retenção Financeira</span>
                    <span className="text-emerald-400">{percentualEmDia.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-1000"
                      style={{ width: `${percentualEmDia}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Em Dia</p>
                    <p className="text-lg font-bold text-emerald-400">{alunosPorStatus.emDia}</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Pendentes</p>
                    <p className="text-lg font-bold text-amber-400">{alunosPorStatus.pendente + alunosPorStatus.atrasado}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl shadow-xl border border-slate-800/60 overflow-hidden">
            <div className="p-5 border-b border-slate-800/60 flex items-center gap-3 bg-gradient-to-r from-indigo-500/5 to-transparent">
              <div className="bg-indigo-500/10 p-2 rounded-lg"><Calendar className="text-indigo-400" size={18}/></div>
              <h3 className="text-base font-semibold text-white">Próximas Aulas</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {proximasAulas.length === 0 ? (
                <div className="p-6 text-center"><p className="text-slate-500 text-sm">Nenhuma aula agendada</p></div>
              ) : (
                proximasAulas.map(aula => (
                  <div key={aula.id} className="p-4 hover:bg-slate-800/30 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[36px] bg-slate-800/60 p-2 rounded-lg border border-slate-700/30 group-hover:border-indigo-500/30 transition-all">
                          <p className="text-[8px] text-slate-500 uppercase font-semibold">{new Date(aula.scheduledAt).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                          <p className="text-base font-bold text-white leading-none pt-0.5">{new Date(aula.scheduledAt).getDate()}</p>
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{aula.title}</p>
                          <p className="text-xs text-slate-500">{aula.studentName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-indigo-400 text-xs">{new Date(aula.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-slate-600">{aula.duration}m</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </FadeContent>
      </div>
    </div>
  );
};
