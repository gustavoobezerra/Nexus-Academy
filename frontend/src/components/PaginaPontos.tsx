import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Gift,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsAPI } from '../lib/api';
import { createDashboardMockData } from '../mocks/demoData';
import {
  buildStudentActivities,
  buildStudentPointsSnapshot,
  createRewardCatalog,
  POINTS_ACTIONS,
  type PointsAction,
  type RewardItem,
  type StudentActivityEntry
} from '../mocks/gamificationData';
import type { Aluno } from '../types';

type LoadState = 'idle' | 'loading' | 'ready';

const actionToneClasses: Record<PointsAction['tone'], string> = {
  neutral: 'border-white/12 bg-white/[0.03] text-slate-100 hover:border-indigo-400/40 hover:bg-indigo-500/10',
  accent: 'border-indigo-400/30 bg-indigo-500/12 text-indigo-100 hover:border-indigo-300 hover:bg-indigo-500/18',
  success: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/18'
};

const rewardIcon = (icon: string) => {
  switch (icon) {
    case 'star':
      return <Star size={18} />;
    case 'zap':
      return <Zap size={18} />;
    case 'trophy':
      return <Trophy size={18} />;
    default:
      return <Gift size={18} />;
  }
};

/**
 * A plataforma ainda nao possui um extrato historico de gamificacao no backend.
 * Esta tela mistura dados reais dos alunos com um contexto mock consistente
 * para manter a operacao do professor utilizavel agora.
 */
export const PaginaPontos = () => {
  const [students, setStudents] = useState<Aluno[]>([]);
  const [activities, setActivities] = useState<StudentActivityEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [awardingActionId, setAwardingActionId] = useState<string | null>(null);

  const loadStudents = async () => {
    setLoadState('loading');

    try {
      const response = await studentsAPI.getAll() as { students?: Aluno[] };
      const nextStudents = Array.isArray(response?.students) && response.students.length > 0
        ? response.students
        : createDashboardMockData().students;

      setStudents(nextStudents);
      setActivities(buildStudentActivities(nextStudents));
      setSelectedStudentId((currentSelectedId) => {
        if (currentSelectedId && nextStudents.some((student) => (student._id || student.id) === currentSelectedId)) {
          return currentSelectedId;
        }

        return nextStudents[0]?._id || nextStudents[0]?.id || '';
      });
      setLoadState('ready');
    } catch (error) {
      console.error('Erro ao carregar alunos para pontuacao:', error);
      const fallbackStudents = createDashboardMockData().students;
      setStudents(fallbackStudents);
      setActivities(buildStudentActivities(fallbackStudents));
      setSelectedStudentId(fallbackStudents[0]?.id || '');
      setLoadState('ready');
      toast.error('Nao foi possivel carregar a base real. Exibindo dados de exemplo.');
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const sortedStudents = useMemo(
    () => [...students].sort((left, right) => (right.points || 0) - (left.points || 0)),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return sortedStudents;
    }

    return sortedStudents.filter((student) =>
      student.name.toLowerCase().includes(normalizedSearch) ||
      (student.email || '').toLowerCase().includes(normalizedSearch) ||
      (student.subject || '').toLowerCase().includes(normalizedSearch)
    );
  }, [search, sortedStudents]);

  const selectedStudent = useMemo(() => {
    const lookupId = selectedStudentId || filteredStudents[0]?._id || filteredStudents[0]?.id;
    return students.find((student) => (student._id || student.id) === lookupId) || null;
  }, [filteredStudents, selectedStudentId, students]);

  const selectedSnapshot = useMemo(
    () => (selectedStudent ? buildStudentPointsSnapshot(selectedStudent) : null),
    [selectedStudent]
  );

  const selectedActivities = useMemo(
    () => activities.filter((activity) => activity.studentId === selectedSnapshot?.studentId).slice(0, 6),
    [activities, selectedSnapshot]
  );

  const rewards = useMemo<RewardItem[]>(
    () => createRewardCatalog(selectedSnapshot?.totalPoints || 0),
    [selectedSnapshot]
  );

  const topStudent = sortedStudents[0] || null;
  const averagePoints = sortedStudents.length > 0
    ? Math.round(sortedStudents.reduce((sum, student) => sum + (student.points || 0), 0) / sortedStudents.length)
    : 0;

  const handleAwardPoints = async (action: PointsAction) => {
    if (!selectedStudent || !selectedSnapshot) {
      return;
    }

    const studentId = selectedStudent._id || selectedStudent.id;
    if (!studentId) {
      toast.error('Aluno sem identificador valido para pontuacao.');
      return;
    }

    setAwardingActionId(action.id);

    try {
      await studentsAPI.addPoints(studentId, action.amount, action.id, action.reason);

      const nextStudents = students.map((student) => {
        const currentId = student._id || student.id;
        if (currentId !== studentId) {
          return student;
        }

        const nextPoints = (student.points || 0) + action.amount;
        return {
          ...student,
          points: nextPoints,
          level: student.level || Math.max(1, Math.floor(nextPoints / 250) + 1)
        };
      });

      setStudents(nextStudents);
      setActivities((currentActivities) => [
        {
          id: `${studentId}-${Date.now()}`,
          studentId,
          studentName: selectedStudent.name,
          type: action.id,
          description: action.reason,
          points: action.amount,
          date: new Date().toISOString(),
          icon: action.amount >= 25 ? 'zap' : 'star'
        },
        ...currentActivities
      ]);

      toast.success(`${selectedStudent.name} recebeu ${action.amount} pontos.`);
    } catch (error) {
      console.error('Erro ao pontuar aluno:', error);
      toast.error('Nao foi possivel registrar a pontuacao.');
    } finally {
      setAwardingActionId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[#0b1220] text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
        <div className="grid gap-4 border-b border-white/8 px-5 py-5 md:grid-cols-3 md:px-7">
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Base ativa</p>
            <p className="mt-3 text-3xl font-semibold text-white">{sortedStudents.length}</p>
            <p className="mt-1 text-sm text-slate-400">Alunos prontos para pontuacao</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Media</p>
            <p className="mt-3 text-3xl font-semibold text-white">{averagePoints}</p>
            <p className="mt-1 text-sm text-slate-400">Pontos medios por aluno</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Lider</p>
            <p className="mt-3 text-xl font-semibold text-white">{topStudent?.name || 'Sem dados'}</p>
            <p className="mt-1 text-sm text-slate-400">{topStudent ? `${topStudent.points || 0} pontos acumulados` : 'Nenhum aluno encontrado'}</p>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-5 md:grid-cols-[320px_minmax(0,1fr)] md:px-7">
          <aside className="space-y-4">
            <div className="rounded-[26px] border border-white/10 bg-[#11192a] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Lista de alunos</p>
                  <p className="mt-2 text-lg font-semibold text-white">Pontuar e acompanhar</p>
                </div>
                <button
                  type="button"
                  onClick={loadStudents}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-indigo-400/40 hover:text-white"
                  aria-label="Atualizar alunos"
                >
                  <RefreshCcw size={18} />
                </button>
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-slate-300">
                <Search size={16} className="text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, email ou materia"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>
            </div>

            <div className="max-h-[540px] space-y-3 overflow-y-auto pr-1">
              {loadState === 'loading' && (
                <div className="rounded-[26px] border border-white/10 bg-[#11192a] px-5 py-10 text-center text-sm text-slate-400">
                  Carregando base de alunos...
                </div>
              )}

              {loadState === 'ready' && filteredStudents.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-white/10 bg-[#11192a] px-5 py-10 text-center">
                  <Users size={28} className="mx-auto text-slate-500" />
                  <p className="mt-3 text-sm text-slate-300">Nenhum aluno encontrado para esse filtro.</p>
                </div>
              )}

              {filteredStudents.map((student, index) => {
                const studentId = student._id || student.id || `${student.name}-${index}`;
                const isSelected = studentId === selectedSnapshot?.studentId;

                return (
                  <button
                    key={studentId}
                    type="button"
                    onClick={() => setSelectedStudentId(studentId)}
                    className={`w-full rounded-[26px] border px-4 py-4 text-left transition ${
                      isSelected
                        ? 'border-indigo-400/60 bg-indigo-500/12 shadow-[0_18px_40px_rgba(79,70,229,0.18)]'
                        : 'border-white/10 bg-[#11192a] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{student.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{student.subject || 'Materia nao definida'}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-400">{student.grade}</span>
                      <span className="font-semibold text-white">{student.points || 0} pts</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-6">
            {!selectedSnapshot ? (
              <div className="rounded-[28px] border border-dashed border-white/12 bg-[#11192a] px-6 py-20 text-center">
                <Trophy size={32} className="mx-auto text-slate-500" />
                <p className="mt-4 text-lg font-semibold text-white">Selecione um aluno para pontuar</p>
                <p className="mt-2 text-sm text-slate-400">A lista da esquerda agora mostra a base real do professor.</p>
              </div>
            ) : (
              <>
                <div className="rounded-[30px] border border-white/10 bg-[#11192a] p-6">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Aluno em foco</p>
                      <h2 className="mt-3 text-4xl font-semibold text-white">{selectedSnapshot.studentName}</h2>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Use as acoes rapidas para registrar pontuacao e acompanhe um panorama de recompensas e engajamento.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl border border-white/10 bg-[#0b1220] px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Total</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{selectedSnapshot.totalPoints}</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-[#0b1220] px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Nivel</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{selectedSnapshot.level}</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-[#0b1220] px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Conquistas</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{selectedSnapshot.achievements.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-white/10 bg-[#11192a] p-5">
                      <div className="flex items-center gap-3">
                        <Sparkles size={18} className="text-indigo-300" />
                        <div>
                          <p className="text-sm font-semibold text-white">Acoes rapidas de pontuacao</p>
                          <p className="text-xs text-slate-400">Cada acao atualiza o aluno selecionado e adiciona um registro visivel logo abaixo.</p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {POINTS_ACTIONS.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => handleAwardPoints(action)}
                            disabled={awardingActionId === action.id}
                            className={`rounded-[24px] border px-4 py-4 text-left transition ${actionToneClasses[action.tone]} disabled:cursor-wait disabled:opacity-60`}
                          >
                            <p className="text-sm font-semibold">{action.label}</p>
                            <p className="mt-2 text-3xl font-semibold">+{action.amount}</p>
                            <p className="mt-2 text-xs text-slate-400">{action.reason}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-[#11192a] p-5">
                      <div className="flex items-center gap-3">
                        <Activity size={18} className="text-slate-300" />
                        <div>
                          <p className="text-sm font-semibold text-white">Historico recente</p>
                          <p className="text-xs text-slate-400">Contexto visual gerado a partir dos dados atuais do aluno.</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {selectedActivities.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start justify-between gap-3 rounded-[22px] border border-white/10 bg-[#0b1220] px-4 py-4"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">{entry.description}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {new Date(entry.date).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                              +{entry.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-white/10 bg-[#11192a] p-5">
                      <div className="flex items-center gap-3">
                        <Target size={18} className="text-amber-300" />
                        <div>
                          <p className="text-sm font-semibold text-white">Progresso de nivel</p>
                          <p className="text-xs text-slate-400">Meta sugerida baseada no total de pontos atual.</p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[24px] border border-white/10 bg-[#0b1220] px-4 py-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm text-slate-400">Nivel {selectedSnapshot.level}</p>
                          <p className="text-lg font-semibold text-white">
                            {Math.max(selectedSnapshot.level * 250 - selectedSnapshot.totalPoints, 0)} pts restantes
                          </p>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-indigo-400 transition-all"
                            style={{
                              width: `${Math.min((selectedSnapshot.totalPoints / Math.max(selectedSnapshot.level * 250, 1)) * 100, 100)}%`
                            }}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedSnapshot.achievements.map((achievement) => (
                            <span
                              key={achievement}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200"
                            >
                              {achievement}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-[#11192a] p-5">
                      <div className="flex items-center gap-3">
                        <Gift size={18} className="text-emerald-300" />
                        <div>
                          <p className="text-sm font-semibold text-white">Recompensas sugeridas</p>
                          <p className="text-xs text-slate-400">Catalogo exemplo para orientar o uso da gamificacao.</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {rewards.map((reward) => (
                          <div
                            key={reward.id}
                            className={`rounded-[22px] border px-4 py-4 ${
                              reward.available
                                ? 'border-emerald-400/20 bg-emerald-500/10'
                                : 'border-white/10 bg-[#0b1220]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                                  reward.available ? 'bg-emerald-500/18 text-emerald-100' : 'bg-white/[0.04] text-slate-300'
                                }`}>
                                  {rewardIcon(reward.icon)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{reward.name}</p>
                                  <p className="mt-1 text-xs text-slate-400">{reward.description}</p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-white">{reward.points} pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};
