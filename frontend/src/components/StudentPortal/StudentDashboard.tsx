import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, BookOpen, Calendar, Trophy, MessageCircle,
  Bell, User, LogOut, Menu, Sun, Moon, Video,
  TrendingUp, Clock, Target, Mic, Gamepad2, Link, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiService from '../../services/api.service';
import { clearSensitiveData } from '../../utils/security';
import { StudentActivitiesWorkspace } from './StudentActivitiesWorkspace';
import { StudentChat } from './StudentChat';
import BrandLogo from '../BrandLogo';
import { useTheme } from '../../context/ThemeContext';
import { portalAPI } from '../../lib/api';
import { createDemoPortalNotifications } from '../../mocks/gamificationData';
import type { PortalActivitySummary, PortalNotification } from '../../types';

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
  teacher?: {
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
}

interface Class {
  _id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetingLink?: string;
}

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [activities, setActivities] = useState<PortalActivitySummary[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadMessages = 0;
  const [teacherLinkInput, setTeacherLinkInput] = useState('');
  const [joiningTeacher, setJoiningTeacher] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchNotifications(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentRes, activitiesRes, classesRes] = await Promise.all([
        apiService.get('/portal/me'),
        portalAPI.getActivities(),
        apiService.get('/portal/classes')
      ]);

      const activitiesData = Array.isArray((activitiesRes as any)?.activities)
        ? (activitiesRes as any).activities
        : [];
      const classesData = Array.isArray(classesRes)
        ? classesRes
        : ((classesRes as any)?.classes || []);

      setStudent(studentRes as any);
      setActivities(activitiesData as any);
      setClasses(classesData as any);
      await fetchNotifications(true);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudentData();
  }, [fetchStudentData]);

  const fetchNotifications = async (silent: boolean = false) => {
    try {
      const response = await portalAPI.getNotifications({ limit: 6 }) as {
        notifications?: PortalNotification[];
        unreadCount?: number;
      };

      const nextNotifications = Array.isArray(response?.notifications)
        ? response.notifications
        : [];

      setNotifications(nextNotifications);
      setNotificationCount(
        typeof response?.unreadCount === 'number'
          ? response.unreadCount
          : nextNotifications.filter((notification) => !notification.readAt).length
      );
    } catch (error) {
      console.error('Erro ao carregar notificacoes do portal:', error);

      if (!silent && import.meta.env.DEV) {
        const demoNotifications = createDemoPortalNotifications();
        setNotifications(demoNotifications);
        setNotificationCount(demoNotifications.length);
      }
    }
  };

  const parseSlugFromInput = (input: string): string | null => {
    const trimmed = input.trim();
    const urlMatch = trimmed.match(/\/professor\/([a-z0-9-]+)/i);
    if (urlMatch) return urlMatch[1].toLowerCase();
    if (/^[a-z0-9-]+$/.test(trimmed.toLowerCase()) && trimmed.length >= 2) return trimmed.toLowerCase();
    return null;
  };

  const handleJoinTeacher = async () => {
    const slug = parseSlugFromInput(teacherLinkInput);
    if (!slug) {
      toast.error('Link inválido. Cole o link do professor (ex: nexus.app/professor/nome-professor)');
      return;
    }
    setJoiningTeacher(true);
    try {
      const result = await apiService.post('/portal/join-teacher', { slug }) as any;
      if (result.success) {
        toast.success(result.message || 'Vinculado ao professor com sucesso!');
        setTeacherLinkInput('');
        await fetchStudentData();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao vincular ao professor. Verifique o link.';
      toast.error(msg);
    } finally {
      setJoiningTeacher(false);
    }
  };

  const handleLogout = () => {
    clearSensitiveData();
    toast.success('Logout realizado com sucesso!');
    navigate('/portal/login');
  };

  const openLiveClass = (cls: Class) => {
    const search = new URLSearchParams({
      classId: cls._id,
      className: cls.title,
      teacherName: student?.teacher?.name || 'Professor'
    });

    navigate(`/portal/live-class?${search.toString()}`);
  };

  const handleOpenNotification = async (notification: PortalNotification) => {
    try {
      if (!notification.readAt) {
        await portalAPI.markNotificationRead(notification.id);
      }
    } catch (error) {
      console.error('Erro ao marcar notificacao:', error);
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((currentNotification) =>
        currentNotification.id === notification.id
          ? { ...currentNotification, readAt: new Date().toISOString(), status: 'read' }
          : currentNotification
      )
    );
    setNotificationCount((currentCount) => Math.max(currentCount - (notification.readAt ? 0 : 1), 0));

    const route = notification.route || (notification.gameId ? `/portal/hangman?gameId=${notification.gameId}` : '/portal/hangman');
    navigate(route);
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
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white p-4 flex flex-col transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="sm:hidden">
            <BrandLogo variant="mark" theme="dark" size="md" />
          </div>
          <div className="hidden sm:flex">
            <BrandLogo variant="horizontal" theme="dark" size="md" />
          </div>
          <p className="text-xs text-gray-400">Portal do Aluno</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive
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
                {notificationCount > 0 && (
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
              <DashboardContent
                student={student}
                activities={activities}
                isDark={isDark}
                onOpenChat={() => setActiveTab('chat')}
                onNavigate={(path: string) => navigate(path)}
                teacherLinkInput={teacherLinkInput}
                onTeacherLinkChange={setTeacherLinkInput}
                onJoinTeacher={handleJoinTeacher}
                joiningTeacher={joiningTeacher}
                notifications={notifications}
                onOpenNotification={handleOpenNotification}
              />
            )}
            {activeTab === 'classes' && (
              <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Minhas Aulas</h3>
                {classes.length === 0 ? (
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nenhuma aula agendada</p>
                ) : (
                  <div className="space-y-3">
                    {classes.map((cls: Class) => (
                      <div key={cls._id} className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{cls.title}</p>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {new Date(cls.scheduledAt).toLocaleDateString('pt-BR')} • {cls.duration}min
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                cls.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                  cls.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-blue-500/20 text-blue-400'
                              }`}>
                              {cls.status === 'completed'
                                ? 'Concluída'
                                : cls.status === 'cancelled'
                                  ? 'Cancelada'
                                  : cls.status === 'in_progress'
                                    ? 'Ao vivo'
                                    : 'Agendada'}
                            </span>
                            {cls.status === 'in_progress' && (
                              <button
                                onClick={() => openLiveClass(cls)}
                                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                              >
                                Entrar na aula
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'activities' && (
              <StudentActivitiesWorkspace activities={activities} isDark={isDark} onRefresh={fetchStudentData} />
            )}
            {activeTab === 'calendar' && (
              <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Calendário</h3>
                {classes.length === 0 ? (
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nenhum evento no calendário</p>
                ) : (
                  <div className="space-y-3">
                    {classes.filter((c: Class) => c.status === 'scheduled').map((cls: Class) => (
                      <div key={cls._id} className={`p-4 rounded-lg border-l-4 border-indigo-500 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{cls.title}</p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {new Date(cls.scheduledAt).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'performance' && (
              <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Meu Desempenho</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                    <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{student.performance?.overall || 0}%</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Desempenho Geral</p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                    <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{student.points || 0}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pontos Totais</p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}>
                    <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Nível {student.level || 1}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nível Atual</p>
                  </div>
                </div>
                <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tendência</p>
                  <p className={`text-lg font-bold ${student.performance?.trend === 'up' ? 'text-green-500' :
                      student.performance?.trend === 'down' ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                    {student.performance?.trend === 'up' ? '↑ Em alta' : student.performance?.trend === 'down' ? '↓ Em queda' : '→ Estável'}
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'chat' && (
              <ChatContent student={student} teacher={student.teacher ?? null} isDark={isDark} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Dashboard Content Component
interface DashboardContentProps {
  student: StudentData;
  activities: PortalActivitySummary[];
  isDark: boolean;
  onOpenChat: () => void;
  onNavigate: (path: string) => void;
  teacherLinkInput: string;
  onTeacherLinkChange: (v: string) => void;
  onJoinTeacher: () => void;
  joiningTeacher: boolean;
  notifications: PortalNotification[];
  onOpenNotification: (notification: PortalNotification) => void;
}

const DashboardContent = ({
  student,
  activities,
  isDark,
  onOpenChat,
  onNavigate,
  teacherLinkInput,
  onTeacherLinkChange,
  onJoinTeacher,
  joiningTeacher,
  notifications,
  onOpenNotification
}: DashboardContentProps) => {
  const hangmanInvites = notifications.filter((notification) => notification.kind === 'hangman_invite');
  const primaryHangmanRoute = hangmanInvites[0]?.route || (hangmanInvites[0]?.gameId ? `/portal/hangman?gameId=${hangmanInvites[0]?.gameId}` : '/portal/hangman');

  return (
  <div className="space-y-6">
    {/* Aviso: aluno sem professor vinculado */}
    {!student.teacher && (
      <div className="bg-amber-900/30 border border-amber-600 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-amber-300 text-lg">Você não está vinculado a nenhum professor</h3>
            <p className="text-amber-200/80 text-sm mt-1">
              Peça o link do seu professor e cole abaixo para entrar na turma dele e ter acesso às aulas, atividades e muito mais.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
            <input
              type="text"
              value={teacherLinkInput}
              onChange={(e) => onTeacherLinkChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !joiningTeacher && onJoinTeacher()}
              placeholder="Cole o link do professor (ex: nexus.app/professor/joao-silva)"
              className="w-full pl-9 pr-4 py-2.5 bg-amber-950/50 border border-amber-600 rounded-lg text-white placeholder-amber-400/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={onJoinTeacher}
            disabled={joiningTeacher || !teacherLinkInput.trim()}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {joiningTeacher ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Link size={16} />
            )}
            {joiningTeacher ? 'Entrando...' : 'Entrar na turma'}
          </button>
        </div>
      </div>
    )}
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

    {hangmanInvites.length > 0 && (
      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-xl border p-6 shadow-lg`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.24em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Convites ativos
            </p>
            <h3 className={`mt-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              O professor chamou voce para a Forca
            </h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Entre pela notificacao correta para cair direto na rodada que foi enviada para voce.
            </p>
          </div>
          <button
            onClick={() => onNavigate(primaryHangmanRoute)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
          >
            <Gamepad2 size={18} />
            Abrir jogo
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {hangmanInvites.map((notification) => (
            <button
              key={notification.id}
              onClick={() => onOpenNotification(notification)}
              className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                notification.readAt
                  ? isDark
                    ? 'border-slate-800 bg-slate-950'
                    : 'border-slate-200 bg-slate-50'
                  : 'border-rose-400/30 bg-rose-500/10'
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{notification.title}</p>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{notification.message}</p>
                </div>
                <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {notification.category || 'Forca'} • {notification.turnDurationSeconds || 20}s
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Quick Actions */}
    <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        Ações Rápidas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('/portal/pronunciation-test')}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <Mic size={20} />
          <div className="text-left">
            <p className="font-bold text-sm">Teste de Pronúncia</p>
            <p className="text-xs opacity-90">Pratique e receba feedback com IA</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate(primaryHangmanRoute)}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <Gamepad2 size={20} />
          <div className="text-left">
            <p className="font-bold text-sm">Jogo da Forca</p>
            <p className="text-xs opacity-90">{hangmanInvites.length > 0 ? 'Abrir convite enviado pelo professor' : 'Treine vocabulário com a turma'}</p>
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
    {student.teacher && (
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
              {student.teacher.name}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {student.teacher.email}
            </p>
          </div>
        </div>
      </div>
    )}

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
          {activities.slice(0, 5).map((activity) => (
            <div key={activity._id} className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {activity.title}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tipo: {activity.type} • {activity.totalQuestions} questão(ões)
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'graded'
                    ? 'bg-green-500/20 text-green-400'
                    : activity.status === 'completed'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {activity.status === 'graded'
                    ? 'Corrigida'
                    : activity.status === 'completed'
                      ? 'Enviada'
                      : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

// Chat Content Component
interface ChatContentProps {
  student: StudentData;
  teacher: StudentData['teacher'] | null;
  isDark: boolean;
}

const ChatContent = ({ student, teacher, isDark }: ChatContentProps) => (
  <div className="h-[calc(100vh-12rem)]">
    <StudentChat student={student} teacher={teacher} isDark={isDark} />
  </div>
);

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDark: boolean;
  small?: boolean;
}

const StatCard = ({ icon, label, value, isDark, small = false }: StatCardProps) => (
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

