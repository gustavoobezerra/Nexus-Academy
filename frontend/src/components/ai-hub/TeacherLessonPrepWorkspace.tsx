import { useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, ClipboardPenLine, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI } from '../../lib/api';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { Aula, Aluno, LessonPreparation } from '../../types';

type TeacherLessonPrepWorkspaceProps = {
  classes: Aula[];
  students: Aluno[];
  lessonPreparations: Array<LessonPreparation & { studentName?: string; classTitle?: string }>;
  onRefresh: () => Promise<void>;
};

/**
 * Workspace real de preparação automática.
 *
 * O professor escolhe uma aula existente, gera o plano persistido, revisa e
 * aprova. A preparação resultante fica vinculada à aula no backend.
 */
export const TeacherLessonPrepWorkspace = ({
  classes,
  students,
  lessonPreparations,
  onRefresh
}: TeacherLessonPrepWorkspaceProps) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPreparationId, setSelectedPreparationId] = useState('');
  const [latestPreparation, setLatestPreparation] = useState<(LessonPreparation & { studentName?: string; classTitle?: string }) | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const refreshInBackground = async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('Erro ao sincronizar preparacoes:', error);
    }
  };

  const eligibleClasses = useMemo(() => (
    classes.filter((classData) => classData.status !== 'cancelled')
  ), [classes]);

  const currentPreparation = useMemo(() => (
    lessonPreparations.find((preparation) => preparation._id === selectedPreparationId || preparation.id === selectedPreparationId)
  ), [lessonPreparations, selectedPreparationId]);

  const optimisticPreparation = latestPreparation
    && (latestPreparation._id === selectedPreparationId || latestPreparation.id === selectedPreparationId)
      ? latestPreparation
      : null;

  const activePreparation = currentPreparation || optimisticPreparation || lessonPreparations[0] || null;

  const generatePreparation = async () => {
    if (!selectedClassId) {
      toast.error('Selecione uma aula primeiro.');
      return;
    }

    setIsGenerating(true);
    setSelectedPreparationId('');

    try {
      const response = await aiAPI.generateLessonPreparation(selectedClassId);
      setLatestPreparation(response.preparation);
      setSelectedPreparationId(response.preparation._id || response.preparation.id || '');
      toast.success(`Plano criado em modo ${response.providerMode === 'live' ? 'ao vivo' : 'fallback'}.`);
      void refreshInBackground();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar a preparação.');
    } finally {
      setIsGenerating(false);
    }
  };

  const approvePreparation = async () => {
    if (!activePreparation?._id && !activePreparation?.id) {
      return;
    }

    setIsApproving(true);

    try {
      const response = await aiAPI.reviewLessonPreparation(activePreparation._id || activePreparation.id || '', {
        approved: true,
        notes: 'Plano aprovado a partir do AI Hub.',
        modifications: []
      });

      setLatestPreparation(response.preparation);
      setSelectedPreparationId(response.preparation._id || response.preparation.id || '');
      toast.success('Plano aprovado e vinculado à aula.');
      void refreshInBackground();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao aprovar o plano.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
      <div className="space-y-5">
        <div className="nexus-panel rounded-[2rem] p-6">
          <p className="nexus-kicker">Preparação automática</p>
          <h2 className="mt-2 text-3xl leading-none">Gerar plano completo a partir de uma aula real.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            O plano fica persistido, pode ser revisado e é anexado à aula no backend quando for aprovado.
          </p>

          <div className="mt-6 space-y-5">
            <SearchableSelect
              label="Aula para preparar"
              placeholder="Buscar por aula, aluno ou matéria..."
              options={eligibleClasses.map((classData) => ({
                id: classData._id || classData.id || '',
                label: classData.title,
                description: `${classData.studentName} • ${classData.subject || 'Matéria não informada'}`,
                meta: `${classData.grade || 'Sem série'} • ${new Date(classData.scheduledAt).toLocaleDateString('pt-BR')}`,
                group: 'Aulas recentes',
                keywords: [
                  classData.studentName || '',
                  classData.subject || '',
                  classData.grade || '',
                  classData.topic || '',
                  classData.notes || ''
                ],
                recent: true
              }))}
              value={selectedClassId}
              onChange={setSelectedClassId}
              helperText="Ao focar, o campo mostra aulas recentes; ao digitar, filtra por título, aluno, matéria, série e tópico."
              emptyLabel="Nenhuma aula disponível para preparação."
            />

            <button type="button" onClick={generatePreparation} disabled={isGenerating} className="nexus-button-primary disabled:opacity-50">
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Gerar preparação
            </button>
          </div>
        </div>

        <div className="nexus-panel rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <BookOpenCheck size={18} className="text-[var(--brand-indigo)]" />
            <div>
              <p className="nexus-kicker">Planos recentes</p>
              <h3 className="mt-2 text-2xl leading-none">Selecione um plano salvo</h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {lessonPreparations.length === 0 ? (
              <div className="nexus-panel rounded-[1.4rem] px-4 py-5 text-sm text-[var(--text-muted)]">
                Nenhuma preparação foi gerada ainda.
              </div>
            ) : (
              lessonPreparations.map((preparation) => {
                const preparationId = preparation._id || preparation.id || '';
                const selected = preparationId === (activePreparation?._id || activePreparation?.id || '');

                return (
                  <button
                    key={preparationId}
                    type="button"
                    onClick={() => {
                      setSelectedPreparationId(preparationId);
                      setLatestPreparation(null);
                    }}
                    className={`nexus-panel w-full rounded-[1.4rem] px-4 py-4 text-left transition ${
                      selected ? 'border-[rgba(79,70,229,0.26)] bg-[rgba(79,70,229,0.1)]' : ''
                    }`}
                  >
                    <p className="font-semibold text-[var(--text-strong)]">{preparation.classTitle || preparation.topic}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {preparation.studentName || students.find((student) => (student._id || student.id) === preparation.student)?.name || 'Aluno'}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      {preparation.status} • {preparation.aiMetadata?.providerMode || 'fallback'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="nexus-panel rounded-[2rem] p-6">
        {!activePreparation ? (
          <div className="flex min-h-[32rem] items-center justify-center">
            <div className="max-w-lg text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(79,70,229,0.12)] text-[var(--brand-indigo)]">
                <ClipboardPenLine size={24} />
              </div>
              <h3 className="mt-5 text-3xl">{isGenerating ? 'Gerando novo plano...' : 'Nenhum plano selecionado.'}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {isGenerating
                  ? 'O AI Hub está preparando a estrutura completa da aula com base no contexto real selecionado.'
                  : 'Gere ou selecione uma preparação para visualizar a estrutura detalhada da aula.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="nexus-kicker">Plano ativo</p>
                <h2 className="mt-2 text-3xl leading-none">{activePreparation.topic}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  {activePreparation.studentName || students.find((student) => (student._id || student.id) === activePreparation.student)?.name} • {activePreparation.classTitle || 'Aula vinculada'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="nexus-chip">
                  <Sparkles size={14} />
                  {activePreparation.aiMetadata?.providerMode || 'fallback'}
                </span>
                <span className="nexus-chip">
                  <CheckCircle2 size={14} />
                  {activePreparation.status}
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="nexus-panel rounded-[1.5rem] px-5 py-5">
                <p className="nexus-kicker">Objetivos</p>
                <div className="mt-4 space-y-3">
                  {activePreparation.objectives.map((objective) => (
                    <div key={objective.objective} className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="font-semibold text-[var(--text-strong)]">{objective.objective}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{objective.priority}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="nexus-panel rounded-[1.5rem] px-5 py-5">
                <p className="nexus-kicker">Estrutura da aula</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Aquecimento', duration: activePreparation.structure.warmup.duration, description: activePreparation.structure.warmup.description },
                    { label: 'Conteúdo principal', duration: activePreparation.structure.mainContent.duration, description: activePreparation.structure.mainContent.keyPoints?.join(', ') || activePreparation.structure.mainContent.description },
                    { label: 'Prática', duration: activePreparation.structure.practice.duration, description: activePreparation.structure.practice.exercises.map((exercise) => exercise.description).join(', ') },
                    { label: 'Revisão', duration: activePreparation.structure.review.duration, description: activePreparation.structure.review.keyTakeaways.join(', ') }
                  ].map((phase) => (
                    <div key={phase.label} className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--text-strong)]">{phase.label}</p>
                        <span className="nexus-chip">{phase.duration} min</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{phase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="nexus-panel rounded-[1.5rem] px-5 py-5">
                <p className="nexus-kicker">Materiais</p>
                <div className="mt-4 space-y-3">
                  {activePreparation.materials.map((material) => (
                    <div key={`${material.type}-${material.title}`} className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <p className="font-semibold text-[var(--text-strong)]">{material.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{material.description || material.type}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="nexus-panel rounded-[1.5rem] px-5 py-5">
                <p className="nexus-kicker">Diferenciação</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
                  <p><strong className="text-[var(--text-strong)]">Para alunos com dificuldade:</strong> {activePreparation.differentiation.forStruggling.join(', ')}</p>
                  <p><strong className="text-[var(--text-strong)]">Para avançados:</strong> {activePreparation.differentiation.forAdvanced.join(', ')}</p>
                  <p><strong className="text-[var(--text-strong)]">Avaliação formativa:</strong> {activePreparation.assessmentPlan.formative.join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={approvePreparation} disabled={isApproving || activePreparation.status === 'ready'} className="nexus-button-primary disabled:opacity-50">
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Aprovar plano
              </button>
              <span className="nexus-chip">
                Confiança {activePreparation.aiMetadata?.confidence || 0}%
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TeacherLessonPrepWorkspace;
