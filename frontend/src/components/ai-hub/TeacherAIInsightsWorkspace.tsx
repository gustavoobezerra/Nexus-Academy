import { useMemo, useState } from 'react';
import { AlertTriangle, Brain, CheckCircle2, CircleDollarSign, TrendingUp } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { Activity, Aluno, Aula, Pagamento, StudentLearningSnapshot, TeacherWorkspaceData } from '../../types';

type TeacherAIInsightsWorkspaceProps = {
  students: Aluno[];
  classes: Aula[];
  payments: Pagamento[];
  activities: Array<Activity & { studentName?: string; classTitle?: string }>;
  learningSnapshots: StudentLearningSnapshot[];
  counts: TeacherWorkspaceData['counts'];
  windows?: TeacherWorkspaceData['windows'];
};

const daysSince = (dateValue?: string) => {
  if (!dateValue) {
    return 999;
  }

  const date = new Date(dateValue);
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
};

/**
 * Painel de insights do AI Hub.
 *
 * A análise aqui é feita sobre os dados reais carregados do backend e expõe
 * critérios claros para o professor agir, em vez de telas vazias ou métricas
 * opacas.
 */
export const TeacherAIInsightsWorkspace = ({
  students,
  classes,
  payments,
  activities,
  learningSnapshots,
  counts,
  windows
}: TeacherAIInsightsWorkspaceProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const usingOperationalWindow = Boolean(
    windows?.classesTruncated ||
    windows?.paymentsTruncated ||
    windows?.activitiesTruncated
  );

  const snapshotsByStudent = useMemo(() => (
    new Map(learningSnapshots.map((snapshot) => [snapshot.studentId, snapshot]))
  ), [learningSnapshots]);

  const insightRows = useMemo(() => {
    return students.map((student) => {
      const studentId = student._id || student.id || '';
      const studentClasses = classes.filter((classData) => classData.studentId === studentId);
      const completedClasses = studentClasses.filter((classData) => classData.status === 'completed');
      const studentPayments = payments.filter((payment) => payment.studentId === studentId);
      const studentActivities = activities.filter((activity) => activity.student === studentId);

      const latestClass = [...completedClasses].sort((left, right) => (
        new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime()
      ))[0];
      const snapshot = snapshotsByStudent.get(studentId);

      const latePayments = studentPayments.filter((payment) => ['late', 'overdue', 'pending'].includes(payment.status));
      const pendingActivities = studentActivities.filter((activity) => activity.status === 'published' || activity.status === 'draft');
      const inactivityDays = daysSince(latestClass?.scheduledAt);
      const weakestTopic = snapshot?.weakestTopics?.[0];
      const weakestSubject = snapshot?.weakestSubjects?.[0];

      let riskScore = 0;
      if (student.performance?.overall !== undefined && student.performance.overall < 70) riskScore += 25;
      if (latePayments.length > 0) riskScore += 20;
      if (pendingActivities.length > 1) riskScore += 10;
      if (inactivityDays > 20) riskScore += 25;
      if (studentClasses.length === 0) riskScore += 20;
      if ((snapshot?.objectiveAccuracy ?? 100) < 70) riskScore += 18;
      if ((snapshot?.pronunciationAverage ?? 100) < 75) riskScore += 12;

      const riskLevel = riskScore >= 60 ? 'alto' : riskScore >= 35 ? 'medio' : 'baixo';

      return {
        student,
        riskScore,
        riskLevel,
        inactivityDays,
        latePayments: latePayments.length,
        pendingActivities: pendingActivities.length,
        lastClassTitle: latestClass?.title || 'Sem aula concluída',
        weakestSubject,
        weakestTopic,
        learningSignals: snapshot?.totalSignals || 0,
        nextAction: riskScore >= 60
          ? `Contato imediato e reforço focado em ${weakestTopic?.label || weakestSubject?.label || 'base recente'}`
          : riskScore >= 35
            ? `Revisar frequência e praticar ${weakestTopic?.label || weakestSubject?.label || 'conteúdo recente'}`
            : 'Manter cadência e elevar desafio'
      };
    }).sort((left, right) => right.riskScore - left.riskScore);
  }, [activities, classes, payments, snapshotsByStudent, students]);

  const filteredRows = selectedStudentId
    ? insightRows.filter((row) => (row.student._id || row.student.id) === selectedStudentId)
    : insightRows;

  const headlineMetrics = useMemo(() => ({
    critical: insightRows.filter((row) => row.riskLevel === 'alto').length,
    medium: insightRows.filter((row) => row.riskLevel === 'medio').length,
    pendingPayments: insightRows.filter((row) => row.latePayments > 0).length,
    healthy: insightRows.filter((row) => row.riskLevel === 'baixo').length
  }), [insightRows]);

  return (
    <section className="space-y-5">
      {usingOperationalWindow ? (
        <div className="rounded-[1.4rem] border border-amber-400/25 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
          Estes insights usam a janela operacional carregada no AI Hub: {windows?.classesLoaded ?? classes.length} de {counts.classes} aula(s),
          {windows?.paymentsLoaded ?? payments.length} de {counts.payments} pagamento(s) e {windows?.activitiesLoaded ?? activities.length} de {counts.activities} atividade(s).
          Se a carteira do professor for maior, a priorização abaixo representa uma amostra recente, não o histórico completo.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Risco alto', value: headlineMetrics.critical, icon: AlertTriangle, tone: 'text-rose-500' },
          { label: 'Risco médio', value: headlineMetrics.medium, icon: Brain, tone: 'text-amber-500' },
          { label: 'Pagamentos sensíveis', value: headlineMetrics.pendingPayments, icon: CircleDollarSign, tone: 'text-[var(--brand-indigo)]' },
          { label: 'Base estável', value: headlineMetrics.healthy, icon: CheckCircle2, tone: 'text-emerald-500' }
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="nexus-metric-card">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-muted)]">{metric.label}</p>
                <Icon size={18} className={metric.tone} />
              </div>
              <p className="nexus-metric-value mt-4">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr,1.2fr]">
        <div className="nexus-panel rounded-[2rem] p-6">
          <p className="nexus-kicker">Filtro e leitura</p>
          <h2 className="mt-2 text-3xl leading-none">Prioridade por aluno</h2>

          <div className="mt-6 space-y-5">
            <SearchableSelect
              label="Filtrar aluno"
              placeholder="Buscar aluno..."
              options={students.map((student) => ({
                id: student._id || student.id || '',
                label: student.name,
                description: `${student.grade} • desempenho ${student.performance?.overall || 0}%`,
                meta: student.subject || 'Sem matéria principal',
                group: 'Alunos ativos',
                keywords: [
                  student.subject || '',
                  student.grade || '',
                  ...(snapshotsByStudent.get(student._id || student.id || '')?.weakestTopics || []).map((topic) => topic.label)
                ],
                recent: true
              }))}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              emptyLabel="Nenhum aluno ativo encontrado."
            />

            <div className="nexus-panel rounded-[1.5rem] px-5 py-5">
              <p className="nexus-kicker">Critérios usados</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
                <p><strong className="text-[var(--text-strong)]">Desempenho:</strong> abaixo de 70% eleva prioridade.</p>
                <p><strong className="text-[var(--text-strong)]">Inatividade:</strong> muitos dias sem aula aumentam risco.</p>
                <p><strong className="text-[var(--text-strong)]">Financeiro:</strong> pagamentos pendentes entram como sinal operacional.</p>
                <p><strong className="text-[var(--text-strong)]">Atividades:</strong> acúmulo sem fechamento sinaliza atrito no fluxo.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="nexus-panel rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <TrendingUp size={18} className="text-[var(--brand-indigo)]" />
            <div>
              <p className="nexus-kicker">Insights explicáveis</p>
              <h3 className="mt-2 text-3xl leading-none">Ações sugeridas com base na operação real</h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {filteredRows.length === 0 ? (
              <div className="nexus-panel rounded-[1.5rem] px-4 py-5 text-sm text-[var(--text-muted)]">
                Nenhum aluno correspondente ao filtro selecionado.
              </div>
            ) : (
              filteredRows.map((row) => (
                <article key={row.student._id || row.student.id} className="nexus-panel rounded-[1.5rem] px-5 py-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--text-strong)]">{row.student.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {row.student.grade} • {row.student.subject || 'Matéria não informada'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="nexus-chip">risco {row.riskLevel}</span>
                      <span className="nexus-chip">{row.riskScore} pts</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-strong)]">Última aula</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{row.lastClassTitle}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-strong)]">Próxima ação</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{row.nextAction}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Inatividade</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{row.inactivityDays} dias</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Pagamentos sensíveis</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{row.latePayments}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Atividades abertas</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{row.pendingActivities}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Sinais</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{row.learningSignals}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Maior atrito</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">{row.weakestTopic?.label || 'Sem atrito mapeado'}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Área prioritária</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">{row.weakestSubject?.label || row.student.subject || 'Sem área principal'}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TeacherAIInsightsWorkspace;
