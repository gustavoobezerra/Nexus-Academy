import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI } from '../../lib/api';
import { SearchableMultiSelect } from '../ui/SearchableSelect';
import type { Aluno, Pagamento, StudentGroup } from '../../types';

type TeacherStudentGroupsWorkspaceProps = {
  students: Aluno[];
  payments: Pagamento[];
  studentGroups: StudentGroup[];
  onRefresh: () => Promise<void>;
};

const palette = ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#a855f7'];

/**
 * Workspace de grupos persistidos do AI Hub.
 *
 * Os grupos passam a existir no backend e são reutilizados por criação de
 * atividade, comunicação e recortes operacionais do professor.
 */
export const TeacherStudentGroupsWorkspace = ({
  students,
  payments,
  studentGroups,
  onRefresh
}: TeacherStudentGroupsWorkspaceProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [color, setColor] = useState(palette[0]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const aiSuggestions = useMemo(() => {
    const suggestions: Array<Omit<StudentGroup, 'id'>> = [];
    const byGrade = new Map<string, string[]>();
    const paymentSensitiveIds = new Set(
      payments
        .filter((payment) => ['late', 'overdue', 'pending'].includes(payment.status))
        .map((payment) => payment.studentId || '')
    );

    for (const student of students) {
      const grade = student.grade || 'Sem série';
      const currentIds = byGrade.get(grade) || [];
      currentIds.push(student._id || student.id || '');
      byGrade.set(grade, currentIds);
    }

    for (const [grade, studentIds] of byGrade.entries()) {
      if (studentIds.length >= 2) {
        suggestions.push({
          name: `Turma ${grade}`,
          description: `Agrupamento automático por série para atividades direcionadas em ${grade}.`,
          color: '#4f46e5',
          studentIds,
          suggestedByAI: true
        });
      }
    }

    const financeGroupIds = students
      .map((student) => student._id || student.id || '')
      .filter((studentId) => paymentSensitiveIds.has(studentId));

    if (financeGroupIds.length >= 2) {
      suggestions.push({
        name: 'Financeiro sensível',
        description: 'Alunos com pagamentos pendentes ou atrasados para ações de acompanhamento.',
        color: '#f59e0b',
        studentIds: financeGroupIds,
        suggestedByAI: true
      });
    }

    return suggestions.filter((suggestion) => (
      !studentGroups.some((group) => group.name.toLowerCase() === suggestion.name.toLowerCase())
    ));
  }, [payments, studentGroups, students]);

  const createGroup = async (payload: Omit<StudentGroup, 'id'>) => {
    setSaving(true);

    try {
      await aiAPI.createStudentGroup(payload);
      toast.success(`Grupo "${payload.name}" criado.`);
      setName('');
      setDescription('');
      setSelectedStudentIds([]);
      setColor(palette[0]);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar grupo.');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    setDeletingId(groupId);

    try {
      await aiAPI.deleteStudentGroup(groupId);
      toast.success('Grupo removido.');
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover grupo.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
      <div className="space-y-5">
        <div className="nexus-panel rounded-[2rem] p-6">
          <p className="nexus-kicker">Novo grupo</p>
          <h2 className="mt-2 text-3xl leading-none">Persistir grupos reutilizáveis para o AI Hub.</h2>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Nome</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className="nexus-input" placeholder="Ex: Reforço de algebra" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Descrição</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="nexus-input min-h-[7rem] resize-y" placeholder="Como este grupo será usado no AI Hub?" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-strong)]">Cor</label>
              <div className="flex flex-wrap gap-3">
                {palette.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setColor(tone)}
                    className={`h-9 w-9 rounded-full border-2 ${color === tone ? 'border-[var(--text-strong)]' : 'border-transparent'}`}
                    style={{ backgroundColor: tone }}
                    aria-label={`Selecionar cor ${tone}`}
                  />
                ))}
              </div>
            </div>

            <SearchableMultiSelect
              label="Alunos do grupo"
              placeholder="Buscar por aluno, série ou matéria..."
              options={students.map((student) => ({
                id: student._id || student.id || '',
                label: student.name,
                description: `${student.grade} • ${student.subject || 'Matéria não informada'}`,
                meta: `Pagamento ${student.paymentStatus || 'pendente'}`,
                group: 'Base ativa',
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
              helperText="Clique no campo para ver a base ativa e filtre por nome, série, matéria ou fraqueza registrada."
              emptyLabel="Nenhum aluno ativo encontrado para criar grupo."
            />

            <button
              type="button"
              onClick={() => void createGroup({ name, description, color, studentIds: selectedStudentIds, suggestedByAI: false })}
              disabled={saving || !name.trim() || selectedStudentIds.length === 0}
              className="nexus-button-primary disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              Criar grupo
            </button>
          </div>
        </div>

        <div className="nexus-panel rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-[var(--brand-indigo)]" />
            <div>
              <p className="nexus-kicker">Sugestões da base</p>
              <h3 className="mt-2 text-2xl leading-none">Agrupamentos úteis para começar rápido</h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {aiSuggestions.length === 0 ? (
              <div className="nexus-panel rounded-[1.4rem] px-4 py-5 text-sm text-[var(--text-muted)]">
                Nenhuma sugestão nova no momento.
              </div>
            ) : (
              aiSuggestions.map((suggestion) => (
                <article key={suggestion.name} className="nexus-panel rounded-[1.4rem] px-4 py-4">
                  <p className="font-semibold text-[var(--text-strong)]">{suggestion.name}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{suggestion.description}</p>
                  <button
                    type="button"
                    onClick={() => void createGroup(suggestion)}
                    disabled={saving}
                    className="nexus-button-secondary mt-4"
                  >
                    Usar sugestão
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="nexus-panel rounded-[2rem] p-6">
        <p className="nexus-kicker">Grupos salvos</p>
        <h2 className="mt-2 text-3xl leading-none">Segmentos prontos para reutilizar</h2>

        <div className="mt-6 space-y-3">
          {studentGroups.length === 0 ? (
            <div className="nexus-panel rounded-[1.4rem] px-4 py-5 text-sm text-[var(--text-muted)]">
              Nenhum grupo persistido ainda.
            </div>
          ) : (
            studentGroups.map((group) => (
              <article key={group.id} className="nexus-panel rounded-[1.5rem] px-5 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: group.color }} />
                      <p className="font-semibold text-[var(--text-strong)]">{group.name}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                      {group.description || `${group.studentIds.length} aluno(s) nesse grupo.`}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      {group.studentIds.length} aluno(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteGroup(group.id)}
                    disabled={deletingId === group.id}
                    className="nexus-button-ghost text-red-500"
                  >
                    {deletingId === group.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Remover
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TeacherStudentGroupsWorkspace;
