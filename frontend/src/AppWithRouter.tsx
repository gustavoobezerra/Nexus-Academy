import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Layout, Wallet, Users, LogOut, UserCircle,
  Menu, Video, Star, CalendarDays, Moon, Sun, BarChart3, Bell, BookOpen, Zap,
  MessageSquare, Brain
} from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useTheme } from './context/ThemeContext';

import OnlineStudents from './components/OnlineStudents';
import CalendarView from './components/CalendarView';
import { AlertsPanel } from './components/AlertsPanel';
import { QuickActions } from './components/QuickActions';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PaginaPontos } from './components/PaginaPontos';
import { Dashboard } from './components/Dashboard';
import StudentsPage from './components/Students';
import { alertService } from './services/alertService';
import ClassesPage from './components/Classes';
import JitsiLiveClass from './components/JitsiLiveClass';
import DailyLiveClass from './components/DailyLiveClass';
import FinancialPage from './components/Financial';
import TeacherAnalyticsDashboard from './components/TeacherAnalyticsDashboard';
import AutomationCenter from './components/AutomationCenter';
import AutomationManager from './components/AutomationManager';
import ComprehensiveHub from './components/ComprehensiveHub';
import AdvancedFeatures from './components/AdvancedFeatures';

// Páginas de Login e Onboarding
import { LoginPage } from './components/LoginPage';
import { TeacherLogin } from './components/TeacherLogin';
import { OnboardingWizardMultiTenant } from './components/OnboardingWizardMultiTenant';
import { OnboardingSuccess } from './components/OnboardingSuccess';
import { PaymentTutorials } from './components/PaymentTutorials';

// Portal do Aluno
import { StudentPortalLogin } from './components/StudentPortal/StudentPortalLogin';
import StudentDashboardComplete from './components/StudentPortal/StudentDashboardComplete';
import { StudentDashboard } from './components/StudentPortal/StudentDashboard';
import { SmartOnboarding } from './components/StudentPortal/SmartOnboarding';
import { StudentProfilePage } from './components/StudentPortal/StudentProfile';
import { StudentRegister } from './components/StudentPortal/StudentRegister';
import { PronunciationTest } from './components/StudentPortal/PronunciationTest';
import AIHub from './components/AIHub';
import TeacherSettings from './components/TeacherSettings';

// NOVOS COMPONENTES DE AUTOMAÇÃO COM IA
import { HourBankManagement } from './components/HourBankManagement';
import { AIActivityGenerator } from './components/AIActivityGenerator';
import { AIInsightsDashboard } from './components/AIInsightsDashboard';
import { SmartScheduling } from './components/SmartScheduling';
import { LessonPrepAI } from './components/LessonPrepAI';
import { ContractManager } from './components/ContractManager';
import { StudentGroupsManager } from './components/StudentGroupsManager';
import MessageTemplatesManager from './components/MessageTemplatesManager';

function AppWithRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, setAuth, isAuthenticated } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [inicializado, setInicializado] = useState(false);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [selectedStudentForPoints] = useState<string | null>('1');
  const [liveClassData, setLiveClassData] = useState<{ id: string; title: string } | null>(null);
  const [useDaily] = useState(true); // Usar Daily.co como padrão (true) ou Jitsi (false)
  const [mostrarConfiguracoes, setMostrarConfiguracoes] = useState(false);

  // Verificar rotas
  const isLoginPage = location.pathname === '/' || location.pathname === '/login';
  const isTeacherLogin = location.pathname === '/professor/login';
  const isOnboarding = location.pathname === '/onboarding';
  const isOnboardingSuccess = location.pathname === '/onboarding/success';
  const isTutorialPage = location.pathname.startsWith('/tutoriais/');
  const isStudentPortal = location.pathname.startsWith('/portal');
  const isTeacherSlugPage = location.pathname.startsWith('/professor/') &&
                           location.pathname !== '/professor/login';
  const studentToken = localStorage.getItem('studentToken');
  const teacherToken = localStorage.getItem('token');

  // Verificar se é uma rota pública (login)
  const isPublicRoute = isLoginPage || isTeacherLogin || location.pathname === '/portal/login' || isTeacherSlugPage || isTutorialPage;

  useEffect(() => {
    // Se está no portal e não tem token, redirecionar para login
    if (isStudentPortal && !studentToken && !location.pathname.includes('/login')) {
      navigate('/portal/login');
    }
    // Se está no portal e tem token mas está na página de login, redirecionar para dashboard
    if (isStudentPortal && studentToken && location.pathname.includes('/login')) {
      navigate('/portal/dashboard');
    }
  }, [isStudentPortal, studentToken, location.pathname, navigate]);

  useEffect(() => {
    if (!isStudentPortal && !isPublicRoute) {
      const count = alertService.getUnreadCount();
      setUnreadAlerts(count);

      const onboardingConcluido = localStorage.getItem('onboarding_concluido');
      if (!onboardingConcluido && isAuthenticated) {
        setMostrarOnboarding(true);
      }
    }
  }, [isStudentPortal, isPublicRoute, isAuthenticated]);

  const handleNavegar = useCallback((tab: string) => {
    setAbaAtiva(tab);
    setMenuMobileAberto(false);

    if (!isStudentPortal && !isPublicRoute) {
      if (tab === 'ai-hub') {
        navigate('/ai-hub');
      }
    }
  }, [isPublicRoute, isStudentPortal, navigate]);

  useEffect(() => {
    if (!isStudentPortal && !isPublicRoute && location.pathname === '/ai-hub') {
      setAbaAtiva('ai-hub');
    }
  }, [isStudentPortal, isPublicRoute, location.pathname]);

  useEffect(() => {
    // Apenas inicializar automaticamente se não for rota pública e já tiver token
    if (!isPublicRoute && !isStudentPortal && teacherToken) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setAuth(parsedUser, teacherToken);
        } catch {
          // Se houver erro, redirecionar para login
          navigate('/');
        }
      }
    }
    setInicializado(true);
  }, [setAuth, isPublicRoute, isStudentPortal, teacherToken, navigate]);

  // Renderizar página de login principal
  if (isLoginPage && !teacherToken) {
    return <LoginPage />;
  }

  // Renderizar login do professor
  if (isTeacherLogin) {
    return <TeacherLogin />;
  }

  // Renderizar página de cadastro do aluno via slug do professor
  if (isTeacherSlugPage) {
    return <StudentRegister />;
  }

  // Renderizar wizard de onboarding
  if (isOnboarding && teacherToken) {
    return (
      <OnboardingWizardMultiTenant
        onComplete={() => {
          navigate('/onboarding/success');
        }}
      />
    );
  }

  // Renderizar página de sucesso do onboarding
  if (isOnboardingSuccess && teacherToken) {
    return <OnboardingSuccess />;
  }

  // Renderizar página de tutoriais de pagamento
  if (isTutorialPage) {
    return <PaymentTutorials />;
  }

  // Renderizar Portal do Aluno
  if (isStudentPortal) {
    if (location.pathname === '/portal/login') {
      return <StudentPortalLogin />;
    }
    if (location.pathname === '/portal/onboarding') {
      return <SmartOnboarding />;
    }
    if (location.pathname === '/portal/profile') {
      return <StudentProfilePage />;
    }
    if (location.pathname === '/portal/pronunciation-test') {
      return <PronunciationTest />;
    }
    if (location.pathname === '/portal/live-class' && liveClassData) {
      return useDaily ? (
        <DailyLiveClass
          classId={liveClassData.id}
          className={liveClassData.title}
          teacherName="Professor"
          studentName={studentToken ? 'Aluno' : undefined}
          userType="student"
          onEnd={() => {
            setLiveClassData(null);
            navigate('/portal/dashboard');
          }}
        />
      ) : (
        <JitsiLiveClass
          classId={liveClassData.id}
          className={liveClassData.title}
          teacherName="Professor"
          studentName={studentToken ? 'Aluno' : undefined}
          userType="student"
          onEnd={() => {
            setLiveClassData(null);
            navigate('/portal/dashboard');
          }}
        />
      );
    }
    if (location.pathname === '/portal/dashboard' || location.pathname === '/portal') {
      return <StudentDashboard />;
    }
    return <StudentDashboard />;
  }

  // Se não tem token e não está em rota pública, redirecionar para login
  if (!teacherToken && !isPublicRoute) {
    return <LoginPage />;
  }

  if (!inicializado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-cyan-500 to-indigo-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl font-bold">N</span>
          </div>
          <p className="text-lg font-medium">Carregando Nexus Academy...</p>
        </div>
      </div>
    );
  }

  const ItemNavegacao = ({ icon, label, id }: { icon: React.ReactNode; label: string; id: string }) => (
    <button
      onClick={() => handleNavegar(id)}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
        ${abaAtiva === id
          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
          : 'text-gray-400 hover:bg-slate-700 hover:text-white'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <>
      <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'dark' : ''}`}>
        {/* Sidebar */}
        <aside className={`hidden md:flex fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white p-4 flex-col transform transition-transform duration-300 ${
          menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-xl text-white">N</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">Nexus Academy</h1>
              <p className="text-xs text-gray-400">Gestão Educacional</p>
            </div>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Principal</div>
            <ItemNavegacao icon={<Layout size={20} />} label="Dashboard" id="dashboard" />
            <ItemNavegacao icon={<Brain size={20} />} label="AI Hub" id="ai-hub" />
            <ItemNavegacao icon={<Video size={20} />} label="Aulas" id="aulas" />
            <ItemNavegacao icon={<Users size={20} />} label="Alunos" id="students" />
            <ItemNavegacao icon={<CalendarDays size={20} />} label="Calendário" id="calendar" />

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-4">Gestão</div>
            <ItemNavegacao icon={<Users size={20} />} label="Grupos" id="student-groups" />
            <ItemNavegacao icon={<Star size={20} />} label="Pontos" id="points" />
            <ItemNavegacao icon={<Users size={20} />} label="Online" id="online" />
            <ItemNavegacao icon={<Wallet size={20} />} label="Financeiro" id="finance" />
            <ItemNavegacao icon={<BarChart3 size={20} />} label="Analytics" id="analytics" />
            <ItemNavegacao icon={<Bell size={20} />} label="Mensagens" id="automation" />
            <ItemNavegacao icon={<MessageSquare size={20} />} label="Templates" id="templates" />
            <ItemNavegacao icon={<Zap size={20} />} label="Motor de Automacao" id="automation-manager" />
            <ItemNavegacao icon={<BookOpen size={20} />} label="Hub" id="hub" />
            <ItemNavegacao icon={<Zap size={20} />} label="Avançados" id="advanced" />
          </nav>

          <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
            <div className="px-4 py-3 bg-slate-800 rounded-xl">
              <p className="text-xs text-gray-400">Logado como</p>
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Professor'}</p>
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

        {menuMobileAberto && (
          <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMenuMobileAberto(false)} />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
          >
            <Menu size={24} />
          </button>

          <header className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b p-4 md:p-6 sticky top-0 z-10 shadow-sm`}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {abaAtiva === 'dashboard' ? 'Painel de Controle' :
                   abaAtiva === 'aulas' ? 'Gestão de Aulas' :
                   abaAtiva === 'students' ? 'Gestão de Alunos' :
                   abaAtiva === 'calendar' ? 'Calendário' :
                   abaAtiva === 'hour-bank' ? 'Banco de Horas' :
                   abaAtiva === 'ai-activities' ? 'Gerador de Atividades IA' :
                   abaAtiva === 'ai-insights' ? 'Dashboard de Insights IA' :
                   abaAtiva === 'smart-schedule' ? 'Agendamento Inteligente' :
                   abaAtiva === 'lesson-prep' ? 'Preparação Automática de Aulas' :
                   abaAtiva === 'contracts' ? 'Gerenciador de Contratos' :
                   abaAtiva === 'student-groups' ? 'Grupos de Alunos' :
                   abaAtiva === 'points' ? 'Pontos' :
                   abaAtiva === 'online' ? 'Alunos Online' :
                   abaAtiva === 'finance' ? 'Financeiro' :
                   abaAtiva === 'analytics' ? 'Dashboard de Negócios' :
                   abaAtiva === 'automation' ? 'Centro de Mensagens' :
                   abaAtiva === 'templates' ? 'Templates de Mensagens' :
                   abaAtiva === 'automation-manager' ? 'Motor de Automacao Central' :
                   abaAtiva === 'ai-hub' ? 'Nexus AI Hub' :
                   abaAtiva === 'hub' ? 'Hub Educacional' :
                   abaAtiva === 'advanced' ? 'Recursos Avançados' : 'Nexus Academy'}
                </h2>
              </div>
              <div className="flex items-center gap-4 relative">
                <button
                  onClick={() => setMostrarAlertas(!mostrarAlertas)}
                  className={`p-2 rounded-xl transition-all relative ${
                    mostrarAlertas
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bell size={22} />
                  {unreadAlerts > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                      {unreadAlerts}
                    </span>
                  )}
                </button>

                {mostrarAlertas && (
                  <AlertsPanel
                    onClose={() => setMostrarAlertas(false)}
                    onNavigate={handleNavegar}
                  />
                )}

                <button
                  onClick={() => setMostrarConfiguracoes(true)}
                  className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl p-2 transition-colors cursor-pointer"
                >
                  <div className="text-right hidden sm:block">
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{user?.name}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{user?.email}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <UserCircle className="text-white" size={24} />
                  </div>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className={`min-h-full ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
              {abaAtiva === 'dashboard' && <Dashboard onNavegar={handleNavegar} />}
              {abaAtiva === 'aulas' && (
                <ClassesPage
                  onStartLive={(id, title) => {
                    setLiveClassData({ id, title });
                    setAbaAtiva('live-class');
                  }}
                />
              )}
              {abaAtiva === 'live-class' && liveClassData && (
                useDaily ? (
                  <DailyLiveClass
                    classId={liveClassData.id}
                    className={liveClassData.title}
                    teacherName={user?.name || 'Professor'}
                    userType="teacher"
                    onEnd={() => {
                      setLiveClassData(null);
                      setAbaAtiva('aulas');
                    }}
                  />
                ) : (
                  <JitsiLiveClass
                    classId={liveClassData.id}
                    className={liveClassData.title}
                    teacherName={user?.name || 'Professor'}
                    userType="teacher"
                    onEnd={() => {
                      setLiveClassData(null);
                      setAbaAtiva('aulas');
                    }}
                  />
                )
              )}
              {abaAtiva === 'students' && <StudentsPage />}
              {abaAtiva === 'calendar' && <CalendarView />}
              {abaAtiva === 'finance' && <FinancialPage />}
              {abaAtiva === 'analytics' && <TeacherAnalyticsDashboard />}
              {abaAtiva === 'automation' && <AutomationCenter />}
              {abaAtiva === 'templates' && <MessageTemplatesManager />}
              {abaAtiva === 'automation-manager' && <AutomationManager />}
              {abaAtiva === 'ai-hub' && <AIHub onNavigate={handleNavegar} />}
              {abaAtiva === 'hub' && <ComprehensiveHub />}
              {abaAtiva === 'advanced' && <AdvancedFeatures />}
              {abaAtiva === 'points' && (
                <PaginaPontos
                  studentPoints={null}
                  activities={[]}
                  rewards={[]}
                />
              )}
              {abaAtiva === 'online' && <OnlineStudents />}

              {/* Novos componentes de Automação IA */}
              {abaAtiva === 'hour-bank' && <HourBankManagement />}
              {abaAtiva === 'ai-activities' && <AIActivityGenerator />}
              {abaAtiva === 'ai-insights' && <AIInsightsDashboard />}
              {abaAtiva === 'smart-schedule' && <SmartScheduling students={[]} classes={[]} />}
              {abaAtiva === 'lesson-prep' && <LessonPrepAI />}
              {abaAtiva === 'contracts' && <ContractManager />}
              {abaAtiva === 'student-groups' && <StudentGroupsManager />}
            </div>
          </main>
        </div>
      </div>
      <QuickActions onNavigate={handleNavegar} />
      {mostrarOnboarding && (
        <OnboardingWizard
          onComplete={() => {
            setMostrarOnboarding(false);
            localStorage.setItem('onboarding_concluido', 'true');
          }}
        />
      )}
      {mostrarConfiguracoes && (
        <TeacherSettings onClose={() => setMostrarConfiguracoes(false)} />
      )}
    </>
  );
}

export default AppWithRouter;
