import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Plus,
  TrendingUp,
  Users,
  Video,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsAPI, paymentsAPI, classesAPI } from '../lib/api';
import { createDashboardMockData } from '../mocks/demoData';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from './Common';
import { FadeContent } from './ui/Animations';
import type { Aluno, Aula } from '../types';

interface DashboardStats {
  students: {
    totalStudents?: number;
    totalMonthlyRevenue?: number;
    pendingPayments?: number;
  };
  payments: {
    monthlyRevenue?: number;
    yearlyRevenue?: number;
    pendingAmount?: number;
    lateAmount?: number;
    pendingCount?: number;
    lateCount?: number;
  };
}

interface DashboardProps {
  onNavegar: (tab: string) => void;
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
}

const formatCurrency = (value: number) => (
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  })
);

const formatFullDate = (date: Date) => (
  date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
);

const getClassKey = (aula: Aula) => aula.id || aula._id || `${aula.title}-${aula.scheduledAt}`;

const DashboardStatCard = ({ title, value, description, icon, onClick }: StatCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="nexus-metric-card h-full text-left transition-transform duration-200 hover:-translate-y-[2px]"
  >
    <div className="flex items-center justify-between gap-4">
      <div className="rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-[var(--brand-indigo)]">
        {icon}
      </div>
      <ArrowUpRight className="h-4 w-4 text-[var(--text-soft)]" />
    </div>

    <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--text-soft)]">
      {title}
    </p>
    <p className="nexus-metric-value mt-3">{value}</p>
    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
      {description}
    </p>
  </button>
);

/**
 * Dashboard principal do professor. A lógica de dados permanece a mesma, mas a
 * apresentação foi reorganizada para destacar decisão, ritmo do dia e leitura
 * operacional antes dos detalhes.
 */
export const Dashboard = ({ onNavegar }: DashboardProps) => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    students: {},
    payments: {}
  });
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [usandoDadosExemplo, setUsandoDadosExemplo] = useState(false);

  useEffect(() => {
    const buscarDados = async () => {
      setCarregando(true);

      try {
        const [studentStats, paymentStats, studentsResponse, classesResponse] = await Promise.all([
          studentsAPI.getStats(),
          paymentsAPI.getStats(),
          studentsAPI.getAll(),
          classesAPI.getAll()
        ]);

        setStats({
          students: studentStats.stats || {},
          payments: paymentStats.stats || {}
        });
        setAlunos(studentsResponse.students || []);
        setAulas(classesResponse.classes || []);
        setUsandoDadosExemplo(false);
      } catch (error) {
        console.error('Dashboard fetch error', error);
        const demoData = createDashboardMockData();
        setStats(demoData.stats);
        setAlunos(demoData.students);
        setAulas(demoData.classes);
        setUsandoDadosExemplo(true);
        toast('API indisponivel. Exibindo dados de exemplo no dashboard.', {
          icon: 'i',
          id: 'dashboard-demo-data'
        });
      } finally {
        setCarregando(false);
      }
    };

    void buscarDados();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Professor';

  const aulasHoje = useMemo(() => {
    const hoje = new Date().toDateString();
    return aulas.filter((aula) => new Date(aula.scheduledAt).toDateString() === hoje);
  }, [aulas]);

  const proximasAulas = useMemo(() => {
    const agora = new Date();

    return aulas
      .filter((aula) => new Date(aula.scheduledAt) >= agora && aula.status === 'scheduled')
      .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime())
      .slice(0, 5);
  }, [aulas]);

  const alunosPorStatus = useMemo(() => ({
    emDia: alunos.filter((aluno) => aluno.paymentStatus === 'paid').length,
    pendente: alunos.filter((aluno) => aluno.paymentStatus === 'pending').length,
    atrasado: alunos.filter((aluno) => aluno.paymentStatus === 'late').length
  }), [alunos]);

  const percentualEmDia = useMemo(() => {
    if (alunos.length === 0) {
      return 0;
    }

    return (alunosPorStatus.emDia / alunos.length) * 100;
  }, [alunos.length, alunosPorStatus.emDia]);

  const proximaAula = proximasAulas[0];
  const pendenciasFinanceiras = alunosPorStatus.pendente + alunosPorStatus.atrasado;

  if (carregando) {
    return (
      <div className="space-y-6 p-5 md:p-8 lg:p-10">
        <Skeleton className="h-60 w-full rounded-[2rem]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-52 w-full rounded-[1.8rem]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Skeleton className="h-[28rem] w-full rounded-[2rem]" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-[2rem]" />
            <Skeleton className="h-64 w-full rounded-[2rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-5 md:p-8 lg:p-10">
      <FadeContent delay={0} duration={0.45}>
        <section className="nexus-panel-strong nexus-rule-card rounded-[2.2rem] p-6 md:p-8 lg:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="nexus-kicker">Painel do professor</p>
              <h1 className="mt-4 text-[clamp(2.7rem,5vw,4.8rem)] leading-[0.94]">
                Bem-vindo, {firstName}.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)] md:text-lg">
                Hoje você acompanha {aulasHoje.length} aula(s), {alunos.length} aluno(s)
                ativos e um panorama financeiro resumido em uma única leitura.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => onNavegar('aulas')} className="nexus-button-primary">
                <Plus className="h-5 w-5" />
                Nova Aula
              </button>
              <button type="button" onClick={() => onNavegar('students')} className="nexus-button-secondary">
                <Users className="h-5 w-5" />
                Ver alunos
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.7rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
              <p className="nexus-kicker">Hoje</p>
              <p className="mt-4 text-lg font-semibold capitalize text-[var(--text-strong)]">
                {formatFullDate(new Date())}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                O painel prioriza agenda, fluxo de caixa e base ativa para leitura rápida.
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
              <p className="nexus-kicker">Próxima aula</p>
              <p className="mt-4 text-lg font-semibold text-[var(--text-strong)]">
                {proximaAula
                  ? `${proximaAula.title} às ${new Date(proximaAula.scheduledAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  : 'Nenhuma aula agendada'}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {proximaAula
                  ? `${proximaAula.studentName} • ${proximaAula.grade}`
                  : 'Sua agenda está livre. Use o botão acima para organizar a próxima sessão.'}
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
              <p className="nexus-kicker">Atenção do dia</p>
              <p className="mt-4 text-lg font-semibold text-[var(--text-strong)]">
                {pendenciasFinanceiras > 0
                  ? `${pendenciasFinanceiras} pendência(s) financeira(s)`
                  : 'Fluxo financeiro estável'}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {pendenciasFinanceiras > 0
                  ? 'Há cobranças em aberto que merecem acompanhamento direto.'
                  : 'Nenhuma cobrança pendente exige ação imediata neste momento.'}
              </p>
            </div>
          </div>
        </section>
      </FadeContent>

      {usandoDadosExemplo && (
        <FadeContent delay={0.04} duration={0.35}>
          <section className="nexus-panel rounded-[1.8rem] border border-[rgba(79,70,229,0.18)] p-5">
            <p className="nexus-kicker">Modo demonstracao</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              A API local nao respondeu a tempo e o dashboard carregou dados mock
              para manter a navegacao funcional enquanto o backend e ajustado.
            </p>
          </section>
        </FadeContent>
      )}

      {alunosPorStatus.atrasado > 0 && (
        <FadeContent delay={0.08} duration={0.4}>
          <section className="nexus-panel rounded-[1.8rem] border border-[rgba(239,68,68,0.18)] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-[1rem] bg-[rgba(239,68,68,0.12)] p-3 text-[var(--brand-red)]">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[var(--text-strong)]">
                    {alunosPorStatus.atrasado} aluno(s) com atraso financeiro
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    Total em aberto: {formatCurrency(stats.payments.pendingAmount || 0)}.
                  </p>
                </div>
              </div>

              <button type="button" onClick={() => onNavegar('finance')} className="nexus-button-secondary">
                Resolver no financeiro
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </FadeContent>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Base ativa"
          value={`${stats.students.totalStudents || 0}`}
          description={`${alunosPorStatus.emDia} aluno(s) com pagamento em dia e vínculo ativo.`}
          icon={<Users className="h-5 w-5" />}
          onClick={() => onNavegar('students')}
        />
        <DashboardStatCard
          title="Receita mensal"
          value={formatCurrency(stats.payments.monthlyRevenue || 0)}
          description={`Potencial total estimado: ${formatCurrency(stats.students.totalMonthlyRevenue || 0)}.`}
          icon={<TrendingUp className="h-5 w-5" />}
          onClick={() => onNavegar('finance')}
        />
        <DashboardStatCard
          title="Aulas hoje"
          value={`${aulasHoje.length}`}
          description={`${proximasAulas.length} aula(s) ainda aparecem como agendadas.`}
          icon={<Video className="h-5 w-5" />}
          onClick={() => onNavegar('aulas')}
        />
        <DashboardStatCard
          title="A receber"
          value={formatCurrency(stats.payments.pendingAmount || 0)}
          description={`${stats.payments.pendingCount || 0} cobrança(s) aguardando ação.`}
          icon={<Wallet className="h-5 w-5" />}
          onClick={() => onNavegar('finance')}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <FadeContent delay={0.16} duration={0.45}>
          <div className="nexus-panel rounded-[2rem] p-6 md:p-8">
            <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="nexus-kicker">Agenda do dia</p>
                <h2 className="mt-3 text-4xl leading-none">Aulas de hoje</h2>
              </div>
              <button type="button" onClick={() => onNavegar('aulas')} className="nexus-button-ghost self-start md:self-auto">
                Ver agenda completa
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {aulasHoje.length === 0 ? (
                <div className="rounded-[1.8rem] border border-dashed border-[var(--border-soft)] p-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-[var(--text-soft)]" />
                  <p className="mt-5 text-xl font-semibold text-[var(--text-strong)]">
                    Nenhuma aula para hoje
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Sua agenda está aberta. Você pode programar a próxima aula quando quiser.
                  </p>
                </div>
              ) : (
                aulasHoje.map((aula) => (
                  <article
                    key={getClassKey(aula)}
                    className="rounded-[1.8rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex min-w-[74px] flex-col items-center rounded-[1.3rem] border border-[var(--border-soft)] bg-[var(--surface-strong)] px-3 py-3 text-center">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                            {new Date(aula.scheduledAt).toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </span>
                          <span className="mt-2 text-xl font-semibold text-[var(--text-strong)]">
                            {new Date(aula.scheduledAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-3xl leading-none">{aula.title}</h3>
                            {aula.isLive && (
                              <span className="rounded-full bg-[rgba(239,68,68,0.12)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--brand-red)]">
                                Ao vivo
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                            {aula.studentName} • {aula.grade} • {aula.duration} min
                          </p>
                        </div>
                      </div>

                      <button type="button" onClick={() => onNavegar('aulas')} className="nexus-button-secondary">
                        {aula.isLive ? 'Abrir aula' : 'Ir para aulas'}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </FadeContent>

        <div className="space-y-6">
          <FadeContent delay={0.22} duration={0.45}>
            <section className="nexus-panel rounded-[2rem] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-[var(--brand-cyan)]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="nexus-kicker">Saúde operacional</p>
                  <h2 className="mt-2 text-3xl leading-none">Resumo do ciclo</h2>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-muted)]">
                    <span>Retenção financeira</span>
                    <span className="text-[var(--text-strong)]">{percentualEmDia.toFixed(0)}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(79,70,229,0.08)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-indigo)] transition-all duration-700"
                      style={{ width: `${percentualEmDia}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                    <p className="nexus-kicker">Em dia</p>
                    <p className="mt-4 text-3xl leading-none">{alunosPorStatus.emDia}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Aluno(s) com cobrança regular.</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                    <p className="nexus-kicker">Pendências</p>
                    <p className="mt-4 text-3xl leading-none">{pendenciasFinanceiras}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Cobranças que pedem acompanhamento.</p>
                  </div>
                </div>
              </div>
            </section>
          </FadeContent>

          <FadeContent delay={0.28} duration={0.45}>
            <section className="nexus-panel rounded-[2rem] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-[var(--brand-indigo)]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="nexus-kicker">Fila do dia</p>
                  <h2 className="mt-2 text-3xl leading-none">Próximas aulas</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {proximasAulas.length === 0 ? (
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Nenhuma aula agendada. A próxima atualização aparecerá aqui assim que a agenda for preenchida.
                  </p>
                ) : (
                  proximasAulas.map((aula) => (
                    <article
                      key={getClassKey(aula)}
                      className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-[var(--text-strong)]">{aula.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                            {aula.studentName} • {aula.grade}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[var(--brand-indigo)]">
                            {new Date(aula.scheduledAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--text-soft)]">
                            {aula.duration} min
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </FadeContent>
        </div>
      </section>
    </div>
  );
};
