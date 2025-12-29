import { useState } from 'react';
import { 
  Star, Trophy, Gift, Zap, Award, Lock, Unlock, 
  Target, Flame, BookOpen, Activity
} from 'lucide-react';

interface StudentPoints {
  studentId: string;
  studentName: string;
  totalPoints: number;
  level: number;
  achievements: string[];
  lastUpdate: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  available: boolean;
}

interface Activity {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  description: string;
  points: number;
  date: string;
  icon: string;
}

const getIconComponent = (iconName: string, size: number = 20, color: string = 'currentColor') => {
  const icons: { [key: string]: any } = {
    star: <Star size={size} color={color} />,
    trophy: <Trophy size={size} color={color} />,
    gift: <Gift size={size} color={color} />,
    zap: <Zap size={size} color={color} />,
    award: <Award size={size} color={color} />,
    check: <Unlock size={size} color={color} />,
    book: <BookOpen size={size} color={color} />
  };
  return icons[iconName] || <Award size={size} color={color} />;
};

const LevelBadge = ({ level }: { level: number }) => {
  const levelNames = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Lendário', 'Épico', 'Supremo'];
  const levelColors = [
    'from-orange-400 to-orange-600',
    'from-slate-400 to-slate-600',
    'from-yellow-400 to-yellow-600',
    'from-purple-400 to-purple-600',
    'from-blue-400 to-blue-600',
    'from-pink-400 to-pink-600',
    'from-red-400 to-red-600',
    'from-indigo-600 to-purple-600'
  ];

  return (
    <div className={`bg-gradient-to-r ${levelColors[Math.min(level - 1, 7)]} text-white px-4 py-2 rounded-full inline-flex items-center gap-2 font-bold`}>
      <Trophy size={18} />
      <span>Nível {level} - {levelNames[Math.min(level - 1, 7)]}</span>
    </div>
  );
};

const AchievementBadge = ({ name, icon }: { name: string; icon: string }) => {
  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all">
      <div className="bg-gradient-to-br from-indigo-400 to-purple-500 p-3 rounded-xl mb-2">
        {getIconComponent(icon, 24, 'white')}
      </div>
      <p className="font-semibold text-slate-800 dark:text-white text-sm">{name}</p>
    </div>
  );
};

const ProgressBar = ({ current, total, label }: { current: number; total: number; label: string }) => {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-100">{label}</span>
        <span className="text-sm font-bold text-white">{current}/{total}</span>
      </div>
      <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-white to-indigo-200 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const PaginaPontos = ({ studentPoints, activities, rewards }: { 
  studentPoints: StudentPoints | null; 
  activities: Activity[];
  rewards: Reward[];
}) => {
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  const [resgateModalAberto, setResgateModalAberto] = useState<Reward | null>(null);

  if (!studentPoints) {
    return (
      <div className="p-4 md:p-6 text-center py-16">
        <Trophy size={64} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500 text-lg">Selecione um aluno para ver seus pontos</p>
      </div>
    );
  }

  const proximoLevelPontos = studentPoints.level * 500;
  const pontosParaProximo = proximoLevelPontos - studentPoints.totalPoints;

  const studentActivities = activities.filter(a => a.studentId === studentPoints.studentId);
  const atividadesRecentes = studentActivities.slice(0, 10);

  const rewardsDisponiveis = rewards.filter(r => r.points <= studentPoints.totalPoints);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header com Perfil */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-4xl font-bold mb-3">{studentPoints.studentName}</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div>
                <p className="text-indigo-100 text-sm">Pontos Totais</p>
                <p className="text-5xl font-black text-white">{studentPoints.totalPoints}</p>
              </div>
              <div className="h-16 w-px bg-white/30 hidden sm:block"></div>
              <div>
                <LevelBadge level={studentPoints.level} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm mb-2">Progresso para Próximo Nível</p>
            <div className="text-3xl font-bold">{Math.max(pontosParaProximo, 0)}</div>
            <p className="text-indigo-200 text-xs">Pontos faltando</p>
          </div>
        </div>

        {/* Progress Bar para próximo nível */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <ProgressBar 
            current={studentPoints.totalPoints} 
            total={proximoLevelPontos}
            label={`Nível ${studentPoints.level} → Nível ${studentPoints.level + 1}`}
          />
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {[
          { id: 'visao-geral', label: 'Visão Geral', icon: Target },
          { id: 'conquistas', label: 'Conquistas', icon: Trophy },
          { id: 'atividades', label: 'Atividades', icon: Activity },
          { id: 'recompensas', label: 'Recompensas', icon: Gift }
        ].map(aba => {
          const Icon = aba.icon;
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-all whitespace-nowrap ${
                abaAtiva === aba.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              {aba.label}
            </button>
          );
        })}
      </div>

      {/* VISÃO GERAL */}
      {abaAtiva === 'visao-geral' && (
        <div className="space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-700 dark:text-slate-300 font-semibold">Aulas Completas</h3>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                  <Award className="text-green-600 dark:text-green-400" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{studentActivities.filter(a => a.type === 'class_completed').length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Aulas finalizadas com sucesso</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-700 dark:text-slate-300 font-semibold">Exercícios Resolvidos</h3>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <Zap className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{studentActivities.filter(a => a.type === 'exercise_submitted').length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Exercícios enviados</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-700 dark:text-slate-300 font-semibold">Conquistas</h3>
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                  <Trophy className="text-amber-600 dark:text-amber-400" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{studentPoints.achievements.length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Desbloqueadas</p>
            </div>
          </div>

          {/* Streaks e Metas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-500 p-3 rounded-lg">
                  <Flame className="text-white" size={24} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Sequência de Atividade</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-black text-orange-600 dark:text-orange-400">7 dias</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Sequência atual ativa</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Continue participando para manter a sequência!</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 p-3 rounded-lg">
                  <Target className="text-white" size={24} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Meta da Semana</h3>
              </div>
              <div className="space-y-3">
                <ProgressBar current={3} total={5} label="Aulas da semana" />
                <p className="text-xs text-slate-500">Faltam 2 aulas para ganhar 250 pontos bônus!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONQUISTAS */}
      {abaAtiva === 'conquistas' && (
        <div className="space-y-6">
          {studentPoints.achievements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Lock size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Nenhuma conquista desbloqueada ainda</p>
              <p className="text-slate-400 text-sm mt-2">Complete aulas e exercícios para desbloquear</p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-800">Conquistas Desbloqueadas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {studentPoints.achievements.map(achievement => (
                  <AchievementBadge 
                    key={achievement} 
                    name={achievement} 
                    icon="trophy"
                  />
                ))}
              </div>
            </>
          )}

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Próximas Conquistas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {['Presença Perfeita', 'Estudioso', 'Superstar', 'Mestre'].map(name => (
                <div key={name} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-slate-200 dark:border-slate-700 opacity-50 flex flex-col items-center justify-center text-center">
                  <Lock className="text-slate-400 mb-2" size={24} />
                  <p className="font-semibold text-slate-600 text-sm">{name}</p>
                  <p className="text-xs text-slate-400 mt-1">Bloqueado</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATIVIDADES */}
      {abaAtiva === 'atividades' && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800">Histórico de Atividades</h3>
          {atividadesRecentes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Activity size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Nenhuma atividade registrada</p>
            </div>
          ) : (
            atividadesRecentes.map(activity => (
              <div key={activity.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${
                    activity.points > 0 
                      ? 'bg-green-100' 
                      : 'bg-orange-100'
                  }`}>
                    {getIconComponent(activity.icon, 20, activity.points > 0 ? '#16a34a' : '#ea580c')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(activity.date).toLocaleDateString('pt-BR', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className={`text-lg font-bold flex-shrink-0 ${
                    activity.points > 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {activity.points > 0 ? '+' : ''}{activity.points}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RECOMPENSAS */}
      {abaAtiva === 'recompensas' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Gift className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-blue-900">Resgate de Recompensas</p>
              <p className="text-sm text-blue-700 mt-1">Você tem <span className="font-bold">{studentPoints.totalPoints} pontos</span> disponíveis para resgate</p>
            </div>
          </div>

          {rewardsDisponiveis.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Lock size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Nenhuma recompensa disponível</p>
              <p className="text-slate-400 text-sm mt-2">Acumule pontos para desbloquear recompensas</p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-800">Recompensas Disponíveis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewardsDisponiveis.map(reward => (
                  <div 
                    key={reward.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-green-200 dark:border-green-700 hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                          {getIconComponent(reward.icon, 24, '#16a34a')}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{reward.name}</h4>
                          <p className="text-sm text-slate-500">{reward.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <span className="flex items-center gap-2 text-lg font-bold text-indigo-600">
                        <Star size={18} />
                        {reward.points} pontos
                      </span>
                      <button
                        onClick={() => setResgateModalAberto(reward)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        Resgatar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Recompensas Bloqueadas */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Próximas Recompensas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.filter(r => r.points > studentPoints.totalPoints).slice(0, 2).map(reward => (
                <div 
                  key={reward.id}
                  className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-300 opacity-60"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-200 p-3 rounded-lg">
                        <Lock className="text-slate-500" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-600">{reward.name}</h4>
                        <p className="text-sm text-slate-500">{reward.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                    <span className="flex items-center gap-2 text-lg font-bold text-slate-500">
                      <Star size={18} />
                      {reward.points} pontos
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      +{reward.points - studentPoints.totalPoints}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resgate */}
      {resgateModalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-4 rounded-2xl inline-block mb-4">
                {getIconComponent(resgateModalAberto.icon, 40, 'white')}
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{resgateModalAberto.name}</h3>
              <p className="text-slate-600 mt-2">{resgateModalAberto.description}</p>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-center">
              <p className="text-slate-600 text-sm">Custo em Pontos</p>
              <p className="text-3xl font-bold text-indigo-600 flex items-center justify-center gap-2 mt-2">
                <Star size={28} />
                {resgateModalAberto.points}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // Aqui você implementaria a lógica de resgate
                  alert(`Recompensa "${resgateModalAberto.name}" resgatada com sucesso!`);
                  setResgateModalAberto(null);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Confirmar Resgate
              </button>
              <button
                onClick={() => setResgateModalAberto(null)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
