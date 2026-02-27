import { CheckCircle2, Circle, Clock, AlertCircle, ChevronRight } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  type: 'homework' | 'exercise' | 'reading' | 'quiz';
  subject: string;
  dueDate: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface ActivitiesCardProps {
  activities: Activity[];
  onViewAll?: () => void;
  onToggleComplete?: (activityId: string) => void;
}

export const ActivitiesCard = ({
  activities,
  onViewAll,
  onToggleComplete
}: ActivitiesCardProps) => {
  const pendingActivities = activities.filter(a => !a.completed);
  const completedActivities = activities.filter(a => a.completed);

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      homework: 'Tarefa',
      exercise: 'Exercício',
      reading: 'Leitura',
      quiz: 'Quiz'
    };
    return icons[type] || type;
  };

  const getActivityTypeLabel = (type: Activity['type']) => {
    const labels = {
      homework: 'Tarefa',
      exercise: 'Exercício',
      reading: 'Leitura',
      quiz: 'Quiz'
    };
    return labels[type] || 'Atividade';
  };

  const getPriorityColor = (priority?: Activity['priority']) => {
    if (!priority) return 'bg-gray-100 text-gray-600';
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[priority];
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Atrasado';
    if (diffHours < 24) return `Em ${diffHours}h`;
    if (diffDays < 7) return `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
            Atividades
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {pendingActivities.length}{' '}
            <span className="text-base font-normal text-gray-500">pendentes</span>
          </p>
        </div>
        <div className="p-3 bg-indigo-100 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-indigo-600" />
        </div>
      </div>

      {/* Lista de Atividades Pendentes */}
      <div className="space-y-3 mb-6">
        {pendingActivities.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Tudo em dia! 🎉</p>
            <p className="text-sm text-gray-500 mt-1">Nenhuma atividade pendente</p>
          </div>
        ) : (
          pendingActivities.slice(0, 5).map(activity => (
            <div
              key={activity.id}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
              onClick={() => onToggleComplete?.(activity.id)}
            >
              {/* Checkbox */}
              <button className="mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110">
                <Circle className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </button>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                      {activity.title}
                    </h4>
                  </div>
                  {activity.priority && (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getPriorityColor(
                        activity.priority
                      )}`}
                    >
                      {activity.priority === 'high' && 'Alta'}
                      {activity.priority === 'medium' && 'Média'}
                      {activity.priority === 'low' && 'Baixa'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 rounded-md font-medium">
                    {activity.subject}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded-md">
                    {getActivityTypeLabel(activity.type)}
                  </span>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                      isOverdue(activity.dueDate)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isOverdue(activity.dueDate) ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    <span className="font-medium">{formatDueDate(activity.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Atividades Concluídas */}
      {completedActivities.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">
              Concluídas ({completedActivities.length})
            </span>
          </div>
          <div className="space-y-2">
            {completedActivities.slice(0, 3).map(activity => (
              <div
                key={activity.id}
                className="flex items-center gap-2 text-sm text-gray-500 opacity-75"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="line-through truncate">{activity.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ver Todas */}
      {activities.length > 5 && (
        <button
          onClick={onViewAll}
          className="w-full mt-4 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <span>Ver todas ({activities.length})</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ActivitiesCard;
