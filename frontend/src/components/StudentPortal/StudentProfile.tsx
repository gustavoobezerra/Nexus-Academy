import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Target, Edit3, Save, Plus, Trash2, CheckCircle,
  Clock, Calendar, ArrowLeft, Sparkles, Award, TrendingUp,
  Brain, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FadeContent, StaggerContainer, StaggerItem } from '../ui/Animations';
import { portalAPI } from '../../lib/api';

interface Goal {
  _id?: string;
  title: string;
  description: string;
  targetDate: string | null;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  createdAt?: string;
}

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  grade: string;
  subject: string;
  points: number;
  level: number;
  performance: { overall: number; trend: string };
  profile: {
    description: string;
    avatar: string | null;
    interests: string[];
  };
  goals: Goal[];
  onboarding: {
    completed: boolean;
    answers: {
      learningPurpose: string;
      currentLevel: string;
      targetTimeframe: string;
      studyHoursPerWeek: number;
      preferredSchedule: string;
      learningStyle: string;
    };
  };
}

const LEVEL_NAMES: Record<string, string> = {
  beginner: 'Iniciante',
  elementary: 'Básico',
  intermediate: 'Intermediário',
  upper_intermediate: 'Intermediário-Avançado',
  advanced: 'Avançado',
  fluent: 'Fluente'
};

const LEARNING_STYLE_NAMES: Record<string, string> = {
  visual: 'Visual',
  auditory: 'Auditivo',
  reading: 'Leitura/Escrita',
  kinesthetic: 'Prático',
  mixed: 'Misto'
};

export const StudentProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetDate: '' });
  const [_editingGoalId, _setEditingGoalId] = useState<string | null>(null);

  const token = localStorage.getItem('studentToken');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await portalAPI.getProfile() as any;
      setStudent(data.student);
      setDescription(data.student.profile?.description || '');
    } catch (error) {
      // Erro tratado pelo interceptor, usar fallback demo
      const savedStudent = localStorage.getItem('student');
      if (savedStudent) {
        const parsed = JSON.parse(savedStudent);
        setStudent({
          ...parsed,
          profile: { description: '', avatar: null, interests: [] },
          goals: [
            { _id: '1', title: 'Assistir séries sem legenda', description: 'Conseguir entender 80% das séries em inglês', targetDate: null, progress: 35, status: 'active' },
            { _id: '2', title: 'Fazer prova de certificação', description: 'Tirar nota boa no TOEFL', targetDate: '2025-12-01', progress: 20, status: 'active' }
          ],
          onboarding: {
            completed: true,
            answers: {
              learningPurpose: 'Trabalho/Carreira',
              currentLevel: 'intermediate',
              targetTimeframe: '1 ano',
              studyHoursPerWeek: 5,
              preferredSchedule: 'evening',
              learningStyle: 'visual'
            }
          }
        });
        setDescription('');
      }
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/portal/login');
      return;
    }
    loadProfile();

  }, [token, navigate, loadProfile]);

  const saveDescription = async () => {
    try {
      await portalAPI.updateProfile({ description });
      toast.success('Descrição atualizada!');
      setEditingDescription(false);
      if (student) {
        setStudent({
          ...student,
          profile: { ...student.profile, description }
        });
      }
    } catch (error) {
      // Erro já tratado pelo interceptor
      // Fallback demo mode
      toast.success('Descrição atualizada! (demo)');
      setEditingDescription(false);
      if (student) {
        setStudent({
          ...student,
          profile: { ...student.profile, description }
        });
      }
    }
  };

  const addGoal = async () => {
    if (!newGoal.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const data = await portalAPI.createGoal(newGoal) as any;
      toast.success('Meta criada!');
      setShowAddGoal(false);
      setNewGoal({ title: '', description: '', targetDate: '' });
      if (student) {
        setStudent({
          ...student,
          goals: [...student.goals, data.goal]
        });
      }
    } catch (error) {
      console.error('Add goal error:', error);
      // Demo mode
      const demoGoal: Goal = {
        _id: Date.now().toString(),
        title: newGoal.title,
        description: newGoal.description,
        targetDate: newGoal.targetDate || null,
        progress: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      toast.success('Meta criada! (demo)');
      setShowAddGoal(false);
      setNewGoal({ title: '', description: '', targetDate: '' });
      if (student) {
        setStudent({
          ...student,
          goals: [...student.goals, demoGoal]
        });
      }
    }
  };

  const updateGoalProgress = async (goalId: string, progress: number) => {
    try {
      const status = progress >= 100 ? 'completed' : 'active';

      await portalAPI.updateGoal(goalId, { progress, status });

      if (student) {
        setStudent({
          ...student,
          goals: student.goals.map(g =>
            g._id === goalId ? { ...g, progress, status } : g
          )
        });
      }

      if (progress >= 100) {
        toast.success('🎉 Meta concluída! Parabéns!');
      }
    } catch (error) {
      // Erro tratado pelo interceptor, fallback demo
      if (student) {
        const status = progress >= 100 ? 'completed' : 'active';
        setStudent({
          ...student,
          goals: student.goals.map(g =>
            g._id === goalId ? { ...g, progress, status } : g
          )
        });
        if (progress >= 100) {
          toast.success('🎉 Meta concluída! Parabéns!');
        }
      }
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      await portalAPI.deleteGoal(goalId);
      toast.success('Meta excluída');
      if (student) {
        setStudent({
          ...student,
          goals: student.goals.filter(g => g._id !== goalId)
        });
      }
    } catch (error) {
      // Erro tratado pelo interceptor, fallback demo
      toast.success('Meta excluída (demo)');
      if (student) {
        setStudent({
          ...student,
          goals: student.goals.filter(g => g._id !== goalId)
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <p className="text-slate-400">Erro ao carregar perfil</p>
      </div>
    );
  }

  const activeGoals = student.goals.filter(g => g.status === 'active');
  const completedGoals = student.goals.filter(g => g.status === 'completed');

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <FadeContent delay={0} duration={0.4}>
          <button
            onClick={() => navigate('/portal/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm">Voltar ao Dashboard</span>
          </button>
        </FadeContent>

        {/* Profile Header */}
        <FadeContent delay={0.1} duration={0.6}>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/60 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-lg">
                  {student.profile?.avatar ? (
                    <img src={student.profile.avatar} alt={student.name} className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    student.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{student.name}</h1>
                <p className="text-slate-400 text-sm mb-4">{student.email}</p>

                {/* Stats */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Nível</p>
                      <p className="font-semibold">{student.level}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Pontos</p>
                      <p className="font-semibold">{student.points.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Performance</p>
                      <p className="font-semibold">{student.performance.overall}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6 pt-6 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <User size={16} className="text-indigo-400" />
                  Sobre mim
                </h3>
                {!editingDescription && (
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Edit3 size={12} /> Editar
                  </button>
                )}
              </div>

              {editingDescription ? (
                <div className="space-y-3">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Conte um pouco sobre você, seus interesses e objetivos..."
                    rows={3}
                    maxLength={500}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none resize-none text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{description.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingDescription(false);
                          setDescription(student.profile?.description || '');
                        }}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveDescription}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors flex items-center gap-2"
                      >
                        <Save size={14} /> Salvar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  {student.profile?.description || 'Nenhuma descrição adicionada ainda. Clique em editar para adicionar!'}
                </p>
              )}
            </div>
          </div>
        </FadeContent>

        {/* Learning Profile */}
        {student.onboarding?.completed && (
          <FadeContent delay={0.2} duration={0.6}>
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/60 mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Brain className="text-indigo-400" size={20} />
                Meu Perfil de Aprendizado
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Objetivo</p>
                  <p className="font-medium text-sm">{student.onboarding.answers?.learningPurpose || '-'}</p>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nível Atual</p>
                  <p className="font-medium text-sm">{LEVEL_NAMES[student.onboarding.answers?.currentLevel] || '-'}</p>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Meta de Tempo</p>
                  <p className="font-medium text-sm">{student.onboarding.answers?.targetTimeframe || '-'}</p>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Horas por Semana</p>
                  <p className="font-medium text-sm">{student.onboarding.answers?.studyHoursPerWeek || 0}h</p>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estilo de Aprendizado</p>
                  <p className="font-medium text-sm">{LEARNING_STYLE_NAMES[student.onboarding.answers?.learningStyle] || '-'}</p>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Série/Ano</p>
                  <p className="font-medium text-sm">{student.grade}</p>
                </div>
              </div>
            </div>
          </FadeContent>
        )}

        {/* Goals Section */}
        <FadeContent delay={0.3} duration={0.6}>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/60">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target className="text-indigo-400" size={20} />
                Minhas Metas
              </h3>
              <button
                onClick={() => setShowAddGoal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Nova Meta
              </button>
            </div>

            {/* Add Goal Modal */}
            {showAddGoal && (
              <div className="mb-6 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Adicionar Nova Meta</h4>
                  <button
                    onClick={() => setShowAddGoal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Título da meta"
                    className="w-full p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none text-sm"
                  />
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Descrição (opcional)"
                    rows={2}
                    className="w-full p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none text-sm resize-none"
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Data alvo (opcional)</label>
                      <input
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                        className="w-full p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={addGoal}
                      className="self-end px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
                    >
                      Criar Meta
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <Clock size={14} /> Em Andamento ({activeGoals.length})
                </h4>
                <StaggerContainer className="space-y-3" delay={0} staggerDelay={0.05}>
                  {activeGoals.map((goal) => (
                    <StaggerItem key={goal._id}>
                      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h5 className="font-semibold text-white mb-1">{goal.title}</h5>
                            {goal.description && (
                              <p className="text-sm text-slate-400 mb-2">{goal.description}</p>
                            )}
                            {goal.targetDate && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar size={12} />
                                Meta: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteGoal(goal._id!)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Progresso</span>
                            <span className="text-indigo-400 font-medium">{goal.progress}%</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <div className="flex gap-2 mt-3">
                            {[25, 50, 75, 100].map((value) => (
                              <button
                                key={value}
                                onClick={() => updateGoalProgress(goal._id!, value)}
                                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                                  goal.progress >= value
                                    ? 'bg-indigo-500/20 text-indigo-300'
                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {value}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" /> Concluídas ({completedGoals.length})
                </h4>
                <div className="space-y-2">
                  {completedGoals.map((goal) => (
                    <div
                      key={goal._id}
                      className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <CheckCircle size={16} className="text-emerald-400" />
                        </div>
                        <span className="text-sm text-slate-300 line-through opacity-75">{goal.title}</span>
                      </div>
                      <button
                        onClick={() => deleteGoal(goal._id!)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {student.goals.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-400 mb-2">Nenhuma meta definida ainda</p>
                <p className="text-slate-500 text-sm">Clique em "Nova Meta" para começar a acompanhar seu progresso!</p>
              </div>
            )}
          </div>
        </FadeContent>
      </div>
    </div>
  );
};

export default StudentProfilePage;
