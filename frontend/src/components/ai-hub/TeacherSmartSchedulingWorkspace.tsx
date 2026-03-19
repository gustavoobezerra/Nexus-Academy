import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI, classesAPI } from '../../lib/api';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { Aluno, Aula, SmartScheduleSuggestion } from '../../types';

type TeacherSmartSchedulingWorkspaceProps = {
  students: Aluno[];
  classes: Aula[];
  onRefresh: () => Promise<void>;
};

const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

/**
 * Agendamento inteligente com dados reais do professor.
 *
 * As sugestões são calculadas no cliente a partir do histórico carregado e a
 * confirmação cria uma aula real no backend usando a API principal de classes.
 */
export const TeacherSmartSchedulingWorkspace = ({
  students,
  classes,
  onRefresh
}: TeacherSmartSchedulingWorkspaceProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [suggestions, setSuggestions] = useState<SmartScheduleSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [subjectSuggestion, setSubjectSuggestion] = useState<{
    providerMode: 'live' | 'fallback';
    confidence: number;
    subject: string;
    topic: string;
    explanation: string;
    evidence: string[];
  } | null>(null);

  const selectedStudent = useMemo(() => (
    students.find((student) => (student._id || student.id) === selectedStudentId)
  ), [selectedStudentId, students]);

  useEffect(() => {
    if (!selectedStudent) {
      return;
    }

    setSubject((currentSubject) => currentSubject || selectedStudent.subject || '');
  }, [selectedStudent]);

  const suggestSubject = async () => {
    if (!selectedStudentId) {
      toast.error('Selecione um aluno para pedir a sugestão pedagógica.');
      return;
    }

    setIsSuggesting(true);

    try {
      const response = await aiAPI.getStudentSubjectSuggestion(selectedStudentId);
      setSubjectSuggestion({
        providerMode: response.providerMode,
        confidence: response.confidence,
        subject: response.suggestion.subject,
        topic: response.suggestion.topic,
        explanation: response.suggestion.explanation,
        evidence: response.suggestion.evidence
      });
      setSubject(response.suggestion.subject);
      setTopic(response.suggestion.topic);
      setClassTitle((currentTitle) => currentTitle || `${response.suggestion.subject} - ${response.suggestion.topic}`);
      toast.success('Sugestão pedagógica aplicada ao formulário.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao sugerir a matéria.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const generateSuggestions = () => {
    if (!selectedStudent) {
      toast.error('Selecione um aluno primeiro.');
      return;
    }

    setIsAnalyzing(true);
    setSuggestions([]);

    window.setTimeout(() => {
      const studentHistory = classes
        .filter((classData) => classData.studentId === selectedStudentId)
        .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime());

      const hourFrequency = new Map<number, number>();
      const weekdayFrequency = new Map<number, number>();

      for (const classData of studentHistory) {
        const date = new Date(classData.scheduledAt);
        hourFrequency.set(date.getHours(), (hourFrequency.get(date.getHours()) || 0) + 1);
        weekdayFrequency.set(date.getDay(), (weekdayFrequency.get(date.getDay()) || 0) + 1);
      }

      const preferredHours = [...hourFrequency.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([hour]) => hour);
      const preferredWeekdays = [...weekdayFrequency.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([weekday]) => weekday);
      const baselineHours = preferredHours.length > 0 ? preferredHours : [9, 14, 18];

      const nextSuggestions: SmartScheduleSuggestion[] = [];

      for (let offset = 1; offset <= 18; offset += 1) {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        date.setSeconds(0, 0);

        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }

        for (const hour of baselineHours) {
          const suggestionDate = new Date(date);
          suggestionDate.setHours(hour, 0, 0, 0);

          const hasConflict = classes.some((classData) => {
            const currentDate = new Date(classData.scheduledAt);
            return Math.abs(currentDate.getTime() - suggestionDate.getTime()) < duration * 60 * 1000;
          });

          if (hasConflict) {
            continue;
          }

          let score = 45;
          const reasons = [];

          if (preferredHours.includes(hour)) {
            score += 20;
            reasons.push('horário frequente do aluno');
          }

          if (preferredWeekdays.includes(date.getDay())) {
            score += 20;
            reasons.push('dia recorrente no histórico');
          }

          if (date.getDay() >= 2 && date.getDay() <= 4) {
            score += 10;
            reasons.push('meio da semana tende a ter melhor regularidade');
          }

          nextSuggestions.push({
            date: suggestionDate.toISOString().split('T')[0],
            time: `${String(hour).padStart(2, '0')}:00`,
            score,
            reason: reasons.join(', ') || 'janela livre na agenda',
            conflicts: [],
            studentPreference: preferredHours.includes(hour) || preferredWeekdays.includes(date.getDay()),
            teacherAvailability: true
          });
        }
      }

      setSuggestions(nextSuggestions.sort((left, right) => right.score - left.score).slice(0, 8));
      setIsAnalyzing(false);
    }, 800);
  };

  const scheduleClass = async (suggestion: SmartScheduleSuggestion) => {
    if (!selectedStudent || !classTitle.trim() || !subject.trim()) {
      toast.error('Defina aluno, título e matéria antes de criar a aula.');
      return;
    }

    setIsScheduling(true);

    try {
      await classesAPI.create({
        title: classTitle.trim(),
        studentId: selectedStudentId,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        grade: selectedStudent.grade,
        scheduledAt: new Date(`${suggestion.date}T${suggestion.time}:00`).toISOString(),
        duration,
        status: 'scheduled',
        isLive: false
      });

      toast.success(`Aula criada para ${selectedStudent.name}.`);
      setSuggestions([]);
      setClassTitle('');
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar a aula.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
      <div className="nexus-panel rounded-[2rem] p-6">
        <p className="nexus-kicker">Agendamento inteligente</p>
        <h2 className="mt-2 text-3xl leading-none">Sugerir janelas e criar a aula de verdade.</h2>

        <div className="mt-6 space-y-5">
          <SearchableSelect
            label="Aluno"
            placeholder="Buscar aluno..."
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
            value={selectedStudentId}
            onChange={(value) => {
              setSelectedStudentId(value);
              setSubjectSuggestion(null);
            }}
            helperText="Ao focar, aparecem alunos ativos; ao digitar, filtra por nome, série, matéria e dificuldades registradas."
            emptyLabel="Nenhum aluno disponível para agendamento."
          />

          <div className="grid gap-4 md:grid-cols-[1fr,auto]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Matéria</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="nexus-input"
                placeholder="Ex: Matemática"
              />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={suggestSubject} disabled={!selectedStudentId || isSuggesting} className="nexus-button-secondary disabled:opacity-50">
                {isSuggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Sugerir matéria
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Tópico da aula</label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="nexus-input"
              placeholder="Ex: Frações equivalentes"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Título da aula</label>
            <input
              value={classTitle}
              onChange={(event) => setClassTitle(event.target.value)}
              className="nexus-input"
              placeholder="Ex: Matemática - revisão guiada"
            />
          </div>

          {subjectSuggestion ? (
            <div className="nexus-panel rounded-[1.4rem] px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="nexus-chip">confiança {subjectSuggestion.confidence}%</span>
                <span className="nexus-chip">{subjectSuggestion.providerMode}</span>
              </div>
              <p className="mt-3 font-semibold text-[var(--text-strong)]">
                {subjectSuggestion.subject} • {subjectSuggestion.topic}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{subjectSuggestion.explanation}</p>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                {subjectSuggestion.evidence.map((evidence) => (
                  <p key={evidence}>• {evidence}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Duração</label>
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="nexus-input">
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
              <option value={120}>120 minutos</option>
            </select>
          </div>

          <button type="button" onClick={generateSuggestions} disabled={isAnalyzing} className="nexus-button-primary disabled:opacity-50">
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gerar sugestões
          </button>
        </div>
      </div>

      <div className="nexus-panel rounded-[2rem] p-6">
        <div className="flex items-center gap-3">
          <CalendarClock size={18} className="text-[var(--brand-indigo)]" />
          <div>
            <p className="nexus-kicker">Sugestões ranqueadas</p>
            <h3 className="mt-2 text-3xl leading-none">Melhores janelas para o aluno selecionado</h3>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {suggestions.length === 0 ? (
            <div className="nexus-panel rounded-[1.5rem] px-4 py-5 text-sm text-[var(--text-muted)]">
              Gere as sugestões para ver os próximos encaixes livres e pontuados.
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <article key={`${suggestion.date}-${suggestion.time}`} className="nexus-panel rounded-[1.5rem] px-5 py-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--text-strong)]">
                      {weekdayNames[new Date(`${suggestion.date}T00:00:00`).getDay()]}, {new Date(`${suggestion.date}T00:00:00`).toLocaleDateString('pt-BR')} às {suggestion.time}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{suggestion.reason}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="nexus-chip">{suggestion.score} pts</span>
                    <button
                      type="button"
                      onClick={() => void scheduleClass(suggestion)}
                      disabled={isScheduling}
                      className="nexus-button-secondary disabled:opacity-50"
                    >
                      {isScheduling ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Criar aula
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TeacherSmartSchedulingWorkspace;
