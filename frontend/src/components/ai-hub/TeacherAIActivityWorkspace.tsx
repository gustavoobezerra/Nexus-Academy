import { useMemo, useState } from 'react';
import { ClipboardList, Loader2, Send, Sparkles, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI } from '../../lib/api';
import { SearchableMultiSelect, SearchableSelect } from '../ui/SearchableSelect';
import type { Activity, Aula, Aluno, Question, StudentGroup } from '../../types';

type TeacherAIActivityWorkspaceProps = {
  classes: Aula[];
  students: Aluno[];
  studentGroups: StudentGroup[];
  activities: Array<Activity & { studentName?: string; classTitle?: string }>;
  onRefresh: () => Promise<void>;
};

const defaultQuestionMix = {
  multiple_choice: 3,
  true_false: 1,
  essay: 1,
  fill_blank: 1
};

/**
 * Fluxo completo de criação de atividades do AI Hub.
 *
 * O componente gera a atividade, permite revisão e publica de forma real para
 * alunos, grupos ou para toda a base ativa.
 */
export const TeacherAIActivityWorkspace = ({
  classes,
  students,
  studentGroups,
  activities,
  onRefresh
}: TeacherAIActivityWorkspaceProps) => {
  const [mode, setMode] = useState<'class' | 'manual'>('class');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [lessonTopic, setLessonTopic] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [learningObjective, setLearningObjective] = useState('');
  const [questionCount, setQuestionCount] = useState(6);
  const [targetMode, setTargetMode] = useState<'specific' | 'group' | 'all'>('specific');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<{
    title: string;
    description: string;
    questions: Question[];
    batchId: string;
    providerMode: 'live' | 'fallback';
  } | null>(null);

  const completedOrScheduledClasses = useMemo(() => (
    classes.filter((classData) => ['completed', 'scheduled', 'in_progress'].includes(classData.status))
  ), [classes]);

  const selectedClass = useMemo(() => (
    completedOrScheduledClasses.find((classData) => classData._id === selectedClassId || classData.id === selectedClassId)
  ), [completedOrScheduledClasses, selectedClassId]);

  const groupedActivityHistory = useMemo(() => {
    const groups = new Map<string, Array<Activity & { studentName?: string; classTitle?: string }>>();

    for (const activity of activities) {
      const batchId = activity.aiMetadata?.batchId || activity._id || activity.id || `activity-${activity.title}`;
      const currentBatch = groups.get(batchId) || [];
      currentBatch.push(activity);
      groups.set(batchId, currentBatch);
    }

    return [...groups.entries()].map(([batchId, batchActivities]) => ({
      batchId,
      templateTitle: batchActivities[0]?.title || 'Atividade',
      providerMode: batchActivities[0]?.aiMetadata?.providerMode || 'fallback',
      dueDate: batchActivities[0]?.dueDate,
      recipients: batchActivities.map((activity) => activity.studentName || 'Aluno'),
      totalQuestions: batchActivities[0]?.questions?.length || 0,
      createdAt: batchActivities[0]?.createdAt
    })).sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightDate - leftDate;
    });
  }, [activities]);

  const syncClassContext = (classId: string) => {
    setSelectedClassId(classId);

    const nextClass = completedOrScheduledClasses.find((classData) => classData._id === classId || classData.id === classId);
    if (!nextClass) {
      return;
    }

    setSubject(nextClass.subject || '');
    setLessonTopic(nextClass.title || '');
    setDescription(nextClass.notes || '');
    setGradeLevel(nextClass.grade || '');
    if (targetMode === 'specific' && nextClass.studentId) {
      setSelectedStudentIds([nextClass.studentId]);
    }
  };

  const getAssignmentPayload = () => ({
    mode: targetMode,
    studentIds: targetMode === 'specific' ? selectedStudentIds : [],
    groupId: targetMode === 'group' ? selectedGroupId : undefined
  });

  const generateActivity = async () => {
    if (!lessonTopic.trim() || !subject.trim()) {
      toast.error('Preencha pelo menos matéria e tópico da atividade.');
      return;
    }

    if (mode === 'class' && !selectedClassId) {
      toast.error('Selecione uma aula para usar o contexto real.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await aiAPI.generateActivity({
        mode,
        lessonTopic,
        lessonSubject: subject,
        lessonDescription: description,
        classId: selectedClassId,
        gradeLevel,
        learningObjective,
        questionCount,
        questionMix: defaultQuestionMix,
        assignmentTarget: getAssignmentPayload()
      });

      setGeneratedTemplate({
        title: response.activityTemplate.title,
        description: response.activityTemplate.description,
        questions: response.activityTemplate.questions,
        batchId: response.activityTemplate.batchId,
        providerMode: response.providerMode
      });

      if (response.qualityReport?.issues?.length) {
        toast.success('Atividade gerada com ajustes automáticos de qualidade.');
      } else {
        toast.success(`Atividade pronta em modo ${response.providerMode === 'live' ? 'ao vivo' : 'fallback'}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar a atividade.');
    } finally {
      setIsGenerating(false);
    }
  };

  const publishActivity = async () => {
    if (!generatedTemplate) {
      return;
    }

    if (targetMode === 'specific' && selectedStudentIds.length === 0) {
      toast.error('Selecione pelo menos um aluno.');
      return;
    }

    if (targetMode === 'group' && !selectedGroupId) {
      toast.error('Selecione um grupo para publicar.');
      return;
    }

    setIsPublishing(true);

    try {
      const response = await aiAPI.publishActivity({
        title: generatedTemplate.title,
        description: generatedTemplate.description,
        type: 'exercise',
        questions: generatedTemplate.questions,
        dueDate: dueDate || undefined,
        classId: selectedClassId || undefined,
        batchId: generatedTemplate.batchId,
        assignmentTarget: getAssignmentPayload(),
        aiMetadata: {
          sourceTranscript: description,
          topics: [subject, lessonTopic].filter(Boolean),
          generatedAt: new Date().toISOString(),
          providerMode: generatedTemplate.providerMode,
          sourceType: mode,
          batchId: generatedTemplate.batchId,
          targetMode,
          gradeLevel,
          learningObjective,
          reviewed: true,
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'teacher'
        }
      });

      toast.success(`Atividade publicada para ${response.recipients.length} aluno(s).`);
      setGeneratedTemplate(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao publicar a atividade.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
      <div className="space-y-5">
        <div className="nexus-panel rounded-[2rem] p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="nexus-kicker">Criação de atividades</p>
              <h2 className="mt-2 text-3xl leading-none">Gerar, revisar e publicar sem sair do fluxo.</h2>
            </div>
            {generatedTemplate ? (
              <span className="nexus-chip">
                <Sparkles size={14} />
                Template em modo {generatedTemplate.providerMode === 'live' ? 'ao vivo' : 'fallback'}
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('class')}
              className={`nexus-panel rounded-[1.6rem] px-5 py-5 text-left transition ${
                mode === 'class' ? 'border-[rgba(79,70,229,0.26)] bg-[rgba(79,70,229,0.1)]' : ''
              }`}
            >
              <p className="nexus-kicker">modo</p>
              <h3 className="mt-2 text-2xl">A partir de uma aula</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                Usa o contexto de uma aula real já carregada no sistema.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`nexus-panel rounded-[1.6rem] px-5 py-5 text-left transition ${
                mode === 'manual' ? 'border-[rgba(79,70,229,0.26)] bg-[rgba(79,70,229,0.1)]' : ''
              }`}
            >
              <p className="nexus-kicker">modo</p>
              <h3 className="mt-2 text-2xl">Descrição livre</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                Envia o contexto manual completo ao backend para gerar a atividade.
              </p>
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {mode === 'class' ? (
              <SearchableSelect
                label="Aula de referência"
                placeholder="Buscar por título, aluno ou matéria..."
                options={completedOrScheduledClasses.map((classData) => ({
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
                onChange={syncClassContext}
                helperText="Ao focar, você vê as aulas mais recentes; ao digitar, filtra por título, aluno, matéria e série."
                emptyLabel="Nenhuma aula carregada para usar como contexto."
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Matéria</label>
                <input value={subject} onChange={(event) => setSubject(event.target.value)} className="nexus-input" placeholder="Ex: Matemática" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Série ou nível</label>
                <input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="nexus-input" placeholder="Ex: 9o ano" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Tópico principal</label>
              <input value={lessonTopic} onChange={(event) => setLessonTopic(event.target.value)} className="nexus-input" placeholder="Ex: Equações do 2o grau" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Objetivo da atividade</label>
              <input value={learningObjective} onChange={(event) => setLearningObjective(event.target.value)} className="nexus-input" placeholder="Ex: verificar se o aluno consegue aplicar o conceito" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Contexto detalhado da aula</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className="nexus-input min-h-[9rem] resize-y"
                placeholder="Descreva o que foi explicado, quais exemplos foram resolvidos e que dificuldade você quer verificar."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[0.7fr,1.3fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Quantidade</label>
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="nexus-input"
                >
                  <option value={4}>4 questões</option>
                  <option value={5}>5 questões</option>
                  <option value={6}>6 questões</option>
                  <option value={7}>7 questões</option>
                  <option value={8}>8 questões</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Destino</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: 'specific', label: 'Aluno(s)' },
                    { id: 'group', label: 'Grupo' },
                    { id: 'all', label: 'Todos' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTargetMode(option.id as 'specific' | 'group' | 'all')}
                      className={`nexus-panel rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition ${
                        targetMode === option.id ? 'border-[rgba(79,70,229,0.26)] bg-[rgba(79,70,229,0.1)] text-[var(--text-strong)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {targetMode === 'specific' ? (
              <SearchableMultiSelect
                label="Selecionar alunos"
                placeholder="Buscar por aluno, série ou matéria..."
                options={students.map((student) => ({
                  id: student._id || student.id || '',
                  label: student.name,
                  description: `${student.grade} • ${student.subject || 'Matéria não informada'}`,
                  meta: `Desempenho ${student.performance?.overall || 0}%`,
                  group: 'Alunos ativos',
                  keywords: [
                    student.grade || '',
                    student.subject || '',
                    ...(student.performance?.weaknesses || [])
                  ],
                  recent: true
                }))}
                values={selectedStudentIds}
                onChange={setSelectedStudentIds}
                selectedLabel="aluno(s)"
                helperText="Clique no campo para ver sugestões e filtre pela letra, nome, série, matéria ou dificuldade registrada."
                emptyLabel="Nenhum aluno ativo encontrado para publicação."
              />
            ) : null}

            {targetMode === 'group' ? (
              <SearchableSelect
                label="Grupo de destino"
                placeholder="Buscar grupo..."
                options={studentGroups.map((group) => ({
                  id: group.id,
                  label: group.name,
                  description: group.description || `${group.studentIds.length} aluno(s) no grupo`,
                  meta: `${group.studentIds.length} aluno(s)`,
                  group: 'Grupos salvos',
                  keywords: [group.description || '', String(group.studentIds.length)],
                  recent: true
                }))}
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                emptyLabel="Nenhum grupo foi criado ainda."
              />
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={generateActivity} disabled={isGenerating} className="nexus-button-primary disabled:opacity-50">
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Gerar atividade
              </button>
              <div className="nexus-chip">
                <Users size={14} />
                {targetMode === 'all'
                  ? `Publicação para ${students.length} aluno(s)`
                  : targetMode === 'group'
                    ? 'Publicação por grupo'
                    : `${selectedStudentIds.length} aluno(s) selecionado(s)`}
              </div>
            </div>
          </div>
        </div>

        {generatedTemplate ? (
          <div className="nexus-panel rounded-[2rem] p-6 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="nexus-kicker">Revisão</p>
                <h3 className="mt-2 text-3xl leading-none">{generatedTemplate.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{generatedTemplate.description}</p>
              </div>
              <div className="w-full max-w-xs">
                <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Prazo de entrega</label>
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="nexus-input" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {generatedTemplate.questions.map((question) => (
                <article key={question.questionNumber} className="nexus-panel rounded-[1.5rem] px-5 py-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="nexus-chip">Q{question.questionNumber}</span>
                    <span className="nexus-chip">{question.type}</span>
                    <span className="nexus-chip">{question.difficulty}</span>
                    <span className="nexus-chip">{question.points} pts</span>
                  </div>
                  <p className="mt-4 font-semibold text-[var(--text-strong)]">{question.question}</p>
                  {question.options?.length ? (
                    <div className="mt-4 grid gap-2">
                      {question.options.map((option) => (
                        <div key={`${question.questionNumber}-${option.letter}`} className={`rounded-[1rem] border px-4 py-3 text-sm ${
                          option.isCorrect
                            ? 'border-emerald-300/30 bg-emerald-500/10 text-[var(--text-strong)]'
                            : 'border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)]'
                        }`}>
                          <span className="font-bold">{option.letter}.</span> {option.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
                      Gabarito esperado: {question.correctAnswer}
                    </div>
                  )}
                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{question.explanation}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={publishActivity} disabled={isPublishing} className="nexus-button-primary disabled:opacity-50">
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Publicar no portal
              </button>
              <button type="button" onClick={() => setGeneratedTemplate(null)} className="nexus-button-secondary">
                Gerar outra
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="nexus-panel rounded-[2rem] p-6">
        <p className="nexus-kicker">Histórico publicado</p>
        <h3 className="mt-2 text-2xl leading-none">Lotes recentes de atividades</h3>
        <div className="mt-5 space-y-3">
          {groupedActivityHistory.length === 0 ? (
            <div className="nexus-panel rounded-[1.5rem] px-4 py-5 text-sm text-[var(--text-muted)]">
              Nenhuma atividade publicada ainda.
            </div>
          ) : (
            groupedActivityHistory.map((activityBatch) => (
              <article key={activityBatch.batchId} className="nexus-panel rounded-[1.5rem] px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="nexus-chip">
                    <ClipboardList size={14} />
                    {activityBatch.totalQuestions || 'N/D'} questoes
                  </span>
                  <span className="nexus-chip">
                    <Sparkles size={14} />
                    {activityBatch.providerMode}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-[var(--text-strong)]">{activityBatch.templateTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Destinatários: {activityBatch.recipients.join(', ')}
                </p>
                {activityBatch.dueDate ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Prazo {new Date(activityBatch.dueDate).toLocaleDateString('pt-BR')}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </aside>
    </section>
  );
};

export default TeacherAIActivityWorkspace;
