import { useState, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, Calendar, Trophy, MessageCircle,
  Bell, User, LogOut, Menu, Sun, Moon, Video, FileText,
  TrendingUp, Clock, Target, Award, Mic
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiService from '../../services/api.service';
import { StudentChat } from './StudentChat';

interface StudentData {
  _id: string;
  name: string;
  email: string;
  grade: string;
  subject: string;
  performance: {
    overall: number;
    trend: 'up' | 'down' | 'stable';
  };
  points: number;
  level: number;
  nextClass?: string;
  teacher: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface Activity {
  _id: string;
  title: string;
  type: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'late';
}

interface Class {
  _id: string;
  title: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [studentRes, activitiesRes, classesRes] = await Promise.all([
        apiService.get('/portal/me'),
        apiService.get('/portal/activities'),
        apiService.get('/portal/classes')
      ]);

      setStudent(studentRes as any);
      setActivities(activitiesRes as any);
      setClasses(classesRes as any);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentData');
    toast.success('Logout realizado com sucesso!');
    navigate('/portal/login');
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg">Erro ao carregar dados</p>
          <button
            onClick={() => navigate('/portal/login')}
            className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Minhas Aulas', icon: Video },
    { id: 'activities', label: 'Atividades', icon: BookOpen },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'performance', label: 'Desempenho', icon: TrendingUp },
    { id: 'chat', label: 'Falar com Professor', icon: MessageCircle }
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`hidden md:flex fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white p-4 flex-col transform transition-transform duration-300 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="font-bold text-xl text-white">N</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">Portal do Aluno</h1>
            <p className="text-xs text-gray-400">Nexus Academy</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.id === 'chat' && unreadMessages > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
          <div className="px-4 py-3 bg-slate-800 rounded-xl">
            <p className="text-xs text-gray-400">Aluno</p>
            <p className="text-sm font-medium text-white truncate">{student.name}</p>
            <p className="text-xs text-gray-500 truncate">{student.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 font-medium transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMenuOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
        >
          <Menu size={24} />
        </button>

        {/* Header */}
        <header className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b p-4 md:p-6 sticky top-0 z-10 shadow-sm`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {activeTab === 'dashboard' ? 'Meu Painel' :
                 activeTab === 'classes' ? 'Minhas Aulas' :
                 activeTab === 'activities' ? 'Atividades' :
                 activeTab === 'calendar' ? 'Calendário' :
                 activeTab === 'performance' ? 'Meu Desempenho' :
                 activeTab === 'chat' ? 'Chat com Professor' : 'Portal do Aluno'}
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Olá, {student.name}! 👋
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-xl hover:bg-slate-700 transition-colors">
                <Bell size={22} className="text-slate-400" />
                {unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <User className="text-white" size={24} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className={`min-h-full p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            {activeTab === 'dashboard' && (
              <DashboardContent student={student} activities={activities} classes={classes} isDark={isDark} onOpenChat={() => setActiveTab('chat')} />
            )}
            {activeTab === 'chat' && (
              <ChatContent student={student} teacher={student.teacher} isDark={isDark} />
            )}
            {/* Outros tabs serão implementados */}
          </div>
        </main>
      </div>
    </div>
  );
};

// Dashboard Content Component
const DashboardContent = ({ student, activities, classes, isDark, onOpenChat }: unknown) => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Trophy className="text-yellow-500" />}
        label="Pontos"
        value={student.points || 0}
        isDark={isDark}
      />
      <StatCard
        icon={<Target className="text-indigo-500" />}
        label="Nível"
        value={student.level || 1}
        isDark={isDark}
      />
      <StatCard
        icon={<TrendingUp className="text-green-500" />}
        label="Desempenho"
        value={`${student.performance?.overall || 0}%`}
        isDark={isDark}
      />
      <StatCard
        icon={<Clock className="text-blue-500" />}
        label="Próxima Aula"
        value={student.nextClass || 'Não agendada'}
        isDark={isDark}
        small
      />
    </div>

    {/* Quick Actions */}
    <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        Ações Rápidas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => window.location.href = '/portal/pronunciation-test'}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <Mic size={20} />
          <div className="text-left">
            <p className="font-bold text-sm">Teste de Pronúncia</p>
            <p className="text-xs opacity-90">Pratique e receba feedback com IA</p>
          </div>
        </button>
        <button
          onClick={onOpenChat}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <MessageCircle size={20} />
          <div className="text-left">
            <p className="font-bold text-sm">Chat com Professor</p>
            <p className="text-xs opacity-90">Tire suas dúvidas em tempo real</p>
          </div>
        </button>
      </div>
    </div>

    {/* Teacher Info */}
    <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        Seu Professor
      </h3>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <User className="text-white" size={32} />
        </div>
        <div>
          <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {student.teacher?.name || 'Professor'}
          </p>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {student.teacher?.email || ''}
          </p>
        </div>

      </div>
    </div>

    {/* Recent Activities */}
    <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        Atividades Recentes
      </h3>
      {activities.length === 0 ? (
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
          Nenhuma atividade pendente
        </p>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity: Activity) => (
            <div key={activity._id} className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {activity.title}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tipo: {activity.type}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  activity.status === 'late' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {activity.status === 'completed' ? 'Concluída' :
                   activity.status === 'late' ? 'Atrasada' : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// Chat Content Component
const ChatContent = ({ student, teacher, isDark }: unknown) => (
  <div className="h-[calc(100vh-12rem)]">
    <StudentChat student={student} teacher={teacher} isDark={isDark} />
  </div>
);

// Stat Card Component
const StatCard = ({ icon, label, value, isDark, small = false }: unknown) => (
  <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</p>
        <p className={`${small ? 'text-base' : 'text-2xl'} font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {value}
        </p>
      </div>
    </div>
  </div>
);

export default StudentDashboard;
