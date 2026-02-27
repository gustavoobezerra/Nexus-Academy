import { TrendingUp, Target, Trophy, Star, Zap } from 'lucide-react';

interface ProgressCardProps {
  currentProgress: number; // 0-100
  goalProgress: number; // 0-100
  hoursStudied: number;
  hoursGoal: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export const ProgressCard = ({
  currentProgress,
  goalProgress,
  hoursStudied,
  hoursGoal,
  level,
  xp,
  xpToNextLevel
}: ProgressCardProps) => {
  const hoursRemaining = Math.max(0, hoursGoal - hoursStudied);
  const xpPercentage = (xp / xpToNextLevel) * 100;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Seu Progresso
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full border border-yellow-200">
          <Trophy className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-bold text-yellow-700">Nível {level}</span>
        </div>
      </div>

      {/* Progresso Semanal */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso Semanal</span>
          <span className="text-2xl font-bold text-emerald-600">{currentProgress}%</span>
        </div>

        {/* Barra de progresso */}
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${currentProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
          {/* Linha da meta */}
          <div
            className="absolute inset-y-0 w-1 bg-yellow-400 shadow-md"
            style={{ left: `${goalProgress}%` }}
            title={`Meta: ${goalProgress}%`}
          >
            <Target className="absolute -top-3 -left-2 w-5 h-5 text-yellow-500" />
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Início</span>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-yellow-500" />
            <span>Meta: {goalProgress}%</span>
          </div>
          <span>100%</span>
        </div>
      </div>

      {/* Horas Estudadas */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Horas esta semana</span>
          <Zap className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-600">{hoursStudied}</span>
          <span className="text-lg text-gray-500">/ {hoursGoal}h</span>
        </div>
        {hoursRemaining > 0 && (
          <p className="text-xs text-gray-600 mt-2">
            Faltam <strong className="text-blue-600">{hoursRemaining}h</strong> para atingir sua meta
          </p>
        )}
        {hoursStudied >= hoursGoal && (
          <p className="text-xs text-emerald-600 mt-2 font-semibold">
            Meta atingida! Parabéns!
          </p>
        )}
      </div>

      {/* XP e Próximo Nível */}
      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">Experiência (XP)</span>
          </div>
          <span className="text-sm font-bold text-purple-600">
            {xp} / {xpToNextLevel} XP
          </span>
        </div>

        {/* Barra de XP */}
        <div className="relative h-3 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(xpPercentage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse" />
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          {xpToNextLevel - xp} XP para o próximo nível
        </p>
      </div>

      {/* Motivação */}
      <div className="mt-6 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white text-center">
        <p className="text-sm font-medium">
          {currentProgress >= goalProgress
            ? 'Você está no caminho certo!'
            : 'Continue assim! Você consegue!'}
        </p>
      </div>
    </div>
  );
};

export default ProgressCard;
