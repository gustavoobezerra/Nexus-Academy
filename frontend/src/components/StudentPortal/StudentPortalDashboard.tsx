import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Calendar, Wallet, Award,
  TrendingUp, Clock, CheckCircle, XCircle, LogOut,
  Menu, X, Target, User, ChevronRight, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { portalAPI, type Aluno, type Aula, type Pagamento, type ApiError } from '../../lib/api';
import BrandLogo from '../BrandLogo';
// import { FadeContent, StaggerContainer, StaggerItem } from '../ui/Animations';

interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  subject: string;
  points: number;
  level: number;
  performance: {
    overall: number;
    trend: string;
  };
}

interface Class {
  _id?: string;
  id?: string;
  title: string;
  subject: string;
  scheduledAt: string;
  duration: number;
  status: string;
  assessmentScore?: number;
}

interface Payment {
  _id?: string;
  id?: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string;
  month: string;
  year: number;
}

export const StudentPortalDashboard = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Determinar aba ativa baseado na URL ou estado
  const getActiveTab = (): 'overview' | 'classes' | 'payments' | 'profile' => {
    const path = location.pathname;
    if (path.includes('/classes')) return 'classes';
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/profile')) return 'profile';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'payments' | 'profile'>(getActiveTab());

  const token = localStorage.getItem('studentToken');

  useEffect(() => {
    if (!token) {
      navigate('/portal/login');
      return;
    }
    loadData();
  }, [token, navigate]);

  const loadData = async () => {
    try {
      // Usar a nova API centralizada - todas as chamadas em paralelo
      const [profileData, classesData, paymentsData] = await Promise.all([
        portalAPI.getProfile(),
        portalAPI.getClasses({ limit: 10 }),
        portalAPI.getPayments()
      ]);

      // Dados já vêm processados pela API
      const profile = profileData.student as Aluno;
      const normalizedClasses = (classesData.classes || []).map((item: Aula): Class => ({
        _id: item._id,
        id: item.id,
        title: item.title,
        subject: item.subject,
        scheduledAt: item.scheduledAt,
        duration: item.duration,
        status: item.status,
        assessmentScore: (item as Aula & { assessmentScore?: number }).assessmentScore
      }));
      const normalizedPayments = (paymentsData.payments || []).map((payment: Pagamento): Payment => ({
        _id: payment._id,
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
        month: payment.month,
        year: payment.year
      }));

      setStudent({
        id: profile.id || profile._id || '',
        name: profile.name,
        email: profile.email || '',
        grade: profile.grade,
        subject: profile.subject || '',
        points: profile.points || 0,
        level: profile.level || 1,
        performance: {
          overall: profile.performance?.overall || 0,
          trend: profile.performance?.trend || 'stable'
        }
      });
      setClasses(normalizedClasses);
      setPayments(normalizedPayments);
    } catch (error: unknown) {
      const apiError = error as Partial<ApiError>;
      console.error('Load data error:', error);
      const message = apiError?.message || 'Erro ao carregar dados. Tente novamente.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('student');
    navigate('/portal/login');
    toast.success('Logout realizado');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  const upcomingClasses = classes.filter(c =>
    new Date(c.scheduledAt) > new Date() && c.status === 'scheduled'
  ).slice(0, 3);

  const recentPayments = payments.slice(0, 5);
  const pendingPayments = payments.filter(p =>
    ['pending', 'late', 'overdue'].includes(p.status)
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <BrandLogo variant="mark" theme="auto" size="sm" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Portal do Aluno
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {student.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {student.grade} • {student.subject}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-200 ease-in-out
        `}>
          <nav className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
              { id: 'classes', label: 'Aulas', icon: BookOpen },
              { id: 'payments', label: 'Pagamentos', icon: Wallet },
              { id: 'profile', label: 'Perfil', icon: GraduationCap },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors
                  ${activeTab === tab.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <Award className="w-8 h-8 text-yellow-500" />
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {student.points}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pontos</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Nível {student.level}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {student.performance.overall}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Desempenho</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    {student.performance.trend === 'up' ? '↑ Melhorando' :
                     student.performance.trend === 'down' ? '↓ Diminuindo' : '→ Estável'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <Calendar className="w-8 h-8 text-blue-500" />
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {upcomingClasses.length}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Próximas Aulas</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    {pendingPayments.length} pagamentos pendentes
                  </p>
                </div>
              </div>

              {/* Upcoming Classes */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Próximas Aulas
                </h2>
                {upcomingClasses.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingClasses.map(cls => (
                      <div
                        key={cls._id}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {cls.title}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(cls.scheduledAt).toLocaleDateString('pt-BR', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Clock className="w-5 h-5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                    Nenhuma aula agendada
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Minhas Aulas
              </h2>
              <div className="space-y-4">
                {classes.map(cls => (
                  <div
                    key={cls._id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {cls.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {cls.subject} • {cls.duration} min
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {new Date(cls.scheduledAt).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cls.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : cls.status === 'cancelled' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-500" />
                        )}
                        {cls.assessmentScore !== undefined && (
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {cls.assessmentScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Meus Pagamentos
              </h2>
              <div className="space-y-4">
                {recentPayments.map(payment => (
                  <div
                    key={payment._id}
                    className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {payment.month}/{payment.year}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        R$ {payment.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${payment.status === 'paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : payment.status === 'overdue'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }
                      `}>
                        {payment.status === 'paid' ? 'Pago' :
                         payment.status === 'overdue' ? 'Vencido' :
                         payment.status === 'late' ? 'Atrasado' : 'Pendente'}
                      </span>
                      {payment.paidAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          Pago em {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && student && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {student.name}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      {student.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Série/Ano</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{student.grade}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Matéria</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{student.subject}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nível</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{student.level}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pontos</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{student.points.toLocaleString()}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/portal/profile')}
                    className="w-full flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">Minhas Metas</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Defina e acompanhe suas metas</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </button>

                  <button
                    onClick={() => navigate('/portal/profile')}
                    className="w-full flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">Editar Perfil</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Atualize sua descrição e interesses</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                  </button>

                  <button
                    onClick={() => navigate('/portal/onboarding')}
                    className="w-full flex items-center justify-between p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">Refazer Questionário</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Atualize seu perfil de aprendizado</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
