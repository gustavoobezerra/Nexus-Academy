import { useEffect, useState } from 'react';
import { portalAPI } from '../../lib/api';
import StudentHeader from './StudentHeader';
import NextClassCard from './NextClassCard';
import ProgressCard from './ProgressCard';
import ActivitiesCard from './ActivitiesCard';
import { AIAssistant } from '../AIAssistant';
import { ChatSystem } from '../ChatSystem';
import { Bot, MessageSquare, X, Trophy, Sparkles, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface StudentDashboardCompleteProps {
  onJoinClass?: (classId: string) => void;
}

export const StudentDashboardComplete = ({ onJoinClass }: StudentDashboardCompleteProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [nextClass, setNextClass] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);

  // Estados para modais de features avançadas
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGamification, setShowGamification] = useState(false);

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
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          completed: false,
          priority: 'high'
        },
        {
          id: '2',
          title: 'Ler capítulo 5 - Propriedades da matéria',
          type: 'reading',
          subject: 'Química',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          completed: false,
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Quiz sobre verbos irregulares',
          type: 'quiz',
          subject: 'Inglês',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          completed: false,
          priority: 'low'
        },
        {
          id: '4',
          title: 'Exercícios de interpretação de texto',
          type: 'exercise',
          subject: 'Português',
          dueDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          completed: true,
          priority: 'high'
        }
      ]);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
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
  const streak = 7;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-8 relative">
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
                <p className="text-sm text-gray-400 mt-2">Entre em contato com seu professor</p>
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

        {/* Seção de Features Avançadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card Chat */}
          <button
            onClick={() => setShowChat(true)}
            className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-8 h-8" />
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">BETA</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Chat ao Vivo</h3>
            <p className="text-blue-100 text-sm mb-4">
              Converse com seu professor em tempo real
            </p>
            <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Abrir Chat</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </button>

          {/* Card AI Assistant */}
          <button
            onClick={() => setShowAIAssistant(true)}
            className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Bot className="w-8 h-8" />
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">IA</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Assistente IA</h3>
            <p className="text-purple-100 text-sm mb-4">
              Tire dúvidas com inteligência artificial
            </p>
            <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Iniciar Conversa</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </button>

          {/* Card Gamificação */}
          <button
            onClick={() => toast('Sistema de pontos integrado no card de Progresso!', { duration: 3000 })}
            className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8" />
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">XP</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Conquistas</h3>
            <p className="text-amber-100 text-sm mb-4">
              Nível {progressMetrics.level} • {progressMetrics.xp} XP
            </p>
            <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Ver Progresso</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </button>

          {/* Card Teste de Pronúncia */}
          <button
            onClick={() => navigate('/portal/pronunciation-test')}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Mic className="w-8 h-8" />
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">NOVO</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Pronúncia</h3>
            <p className="text-emerald-100 text-sm mb-4">
              Pratique sua pronúncia com IA
            </p>
            <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Iniciar Teste</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Modal AI Assistant */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6" />
                <h2 className="text-xl font-bold">Assistente IA - Google Gemini</h2>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="h-[calc(100%-4rem)]">
              <AIAssistant />
            </div>
          </div>
        </div>
      )}

      {/* Modal Chat System */}
      {showChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6" />
                <h2 className="text-xl font-bold">Chat em Tempo Real</h2>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="h-[calc(100%-4rem)]">
              <ChatSystem />
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante de Acesso Rápido */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Chat rápido */}
        <button
          onClick={() => setShowChat(true)}
          className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform"
          title="Chat rápido"
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        {/* AI Assistant rápido */}
        <button
          onClick={() => setShowAIAssistant(true)}
          className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform animate-pulse"
          title="Assistente IA"
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default StudentDashboardComplete;
