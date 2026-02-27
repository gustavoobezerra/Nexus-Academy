import { useEffect, useState } from 'react';
import { portalAPI } from '../../lib/api';
import StudentHeader from './StudentHeader';
import NextClassCard from './NextClassCard';
import ProgressCard from './ProgressCard';
import ActivitiesCard from './ActivitiesCard';
import toast from 'react-hot-toast';

interface StudentDashboardNewProps {
  onJoinClass?: (classId: string) => void;
}

export const StudentDashboardNew = ({ onJoinClass }: StudentDashboardNewProps) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [nextClass, setNextClass] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Carregar dados em paralelo usando API centralizada
      const [profileData, classesData] = await Promise.all([
        portalAPI.getProfile(),
        portalAPI.getClasses({ limit: 1 })
      ]);

      setStudent(profileData.student);

      // Definir próxima aula (a primeira da lista)
      if (classesData.classes && classesData.classes.length > 0) {
        setNextClass(classesData.classes[0]);
      }

      // Mock de atividades (em produção, viria do backend)
      setActivities([
        {
          id: '1',
          title: 'Resolver lista de equações do 2º grau',
          type: 'homework',
          subject: 'Matemática',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
          completed: false,
          priority: 'high'
        },
        {
          id: '2',
          title: 'Ler capítulo 5 - Propriedades da matéria',
          type: 'reading',
          subject: 'Química',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 dia
          completed: false,
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Quiz sobre verbos irregulares',
          type: 'quiz',
          subject: 'Inglês',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
          completed: false,
          priority: 'low'
        },
        {
          id: '4',
          title: 'Exercícios de interpretação de texto',
          type: 'exercise',
          subject: 'Português',
          dueDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Atrasado
          completed: true,
          priority: 'high'
        }
      ]);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      // Erro já tratado pelo interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivity = (activityId: string) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === activityId
          ? { ...activity, completed: !activity.completed }
          : activity
      )
    );
    toast.success('Atividade atualizada!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando seu dashboard...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  // Calcular métricas de progresso (mock - em produção viria do backend)
  const progressMetrics = {
    currentProgress: 75,
    goalProgress: 80,
    hoursStudied: 12,
    hoursGoal: 15,
    level: 5,
    xp: 1250,
    xpToNextLevel: 2000
  };

  // Calcular streak (dias consecutivos estudando)
  const streak = 7; // Mock - em produção viria do backend

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <StudentHeader
          studentName={student.name || 'Aluno'}
          streak={streak}
          teacherName={student.teacherName || 'Professor'}
          teacherOnline={true}
          photoUrl={student.photoUrl}
        />

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Próxima Aula */}
          {nextClass ? (
            <NextClassCard
              subject={nextClass.subject || 'Matemática'}
              title={nextClass.title || 'Aula'}
              scheduledAt={nextClass.scheduledAt || new Date().toISOString()}
              duration={nextClass.duration || 60}
              isOnline={true}
              materials={[
                { name: 'Lista de exercícios.pdf', type: 'pdf' },
                { name: 'Vídeo de revisão', type: 'video' },
                { name: 'Link da sala', type: 'link' }
              ]}
              onJoin={() => onJoinClass?.(nextClass._id || nextClass.id)}
            />
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center justify-center">
              <div className="text-center py-8">
                <p className="text-gray-500 font-medium">Nenhuma aula agendada</p>
                <p className="text-sm text-gray-400 mt-2">
                  Entre em contato com seu professor
                </p>
              </div>
            </div>
          )}

          {/* Card Progresso */}
          <ProgressCard {...progressMetrics} />

          {/* Card Atividades */}
          <ActivitiesCard
            activities={activities}
            onToggleComplete={handleToggleActivity}
            onViewAll={() => toast('Funcionalidade em desenvolvimento')}
          />
        </div>

        {/* Cards Adicionais em desenvolvimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder - Calendário */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <p className="text-gray-500 font-medium">Calendário</p>
              <p className="text-sm text-gray-400 mt-2">Em desenvolvimento</p>
            </div>
          </div>

          {/* Placeholder - Materiais */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <p className="text-gray-500 font-medium">Materiais</p>
              <p className="text-sm text-gray-400 mt-2">Em desenvolvimento</p>
            </div>
          </div>

          {/* Placeholder - Conquistas */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <p className="text-gray-500 font-medium">Conquistas</p>
              <p className="text-sm text-gray-400 mt-2">Em desenvolvimento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardNew;
