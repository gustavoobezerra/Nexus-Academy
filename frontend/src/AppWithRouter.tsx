import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Layout, Wallet, Users, LogOut, UserCircle,
  Menu, Video, Star, CalendarDays, Moon, Sun, BarChart3, Bell, BookOpen, Zap,
  MessageSquare, Brain, type LucideIcon
} from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useTheme } from './context/ThemeContext';
import { clearSensitiveData } from './utils/security';

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
import { StudentDashboard } from './components/StudentPortal/StudentDashboard';
import { SmartOnboarding } from './components/StudentPortal/SmartOnboarding';
import { StudentProfilePage } from './components/StudentPortal/StudentProfile';
import { StudentRegister } from './components/StudentPortal/StudentRegister';
import { PronunciationTest } from './components/StudentPortal/PronunciationTest';
import TeacherSettings from './components/TeacherSettings';
import HangmanGame from './components/HangmanGame';
import BrandLogo from './components/BrandLogo';

// NOVOS COMPONENTES DE AUTOMAÇÃO COM IA
import { HourBankManagement } from './components/HourBankManagement';
import { ContractManager } from './components/ContractManager';
import MessageTemplatesManager from './components/MessageTemplatesManager';
import useTeacherWorkspaceData from './hooks/useTeacherWorkspaceData';
import TeacherAIHub from './components/ai-hub/TeacherAIHub';
import TeacherAssistantWorkspace from './components/ai-hub/TeacherAssistantWorkspace';
import TeacherAIActivityWorkspace from './components/ai-hub/TeacherAIActivityWorkspace';
import TeacherLessonPrepWorkspace from './components/ai-hub/TeacherLessonPrepWorkspace';
import TeacherAIInsightsWorkspace from './components/ai-hub/TeacherAIInsightsWorkspace';
import TeacherSmartSchedulingWorkspace from './components/ai-hub/TeacherSmartSchedulingWorkspace';
import TeacherStudentGroupsWorkspace from './components/ai-hub/TeacherStudentGroupsWorkspace';
import type { Aluno } from './types';

type TeacherShellUser = {
  avatar?: string | null;
  onboardingCompletedAt?: string;
  subscriptionStatus?: string;
  status?: string;
};

type NavigationItem = {
  id: string;
  label: string;
  note: string;
  icon: LucideIcon;
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

type ShellSectionMeta = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

const navigationSections: NavigationSection[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', note: 'Visão diária', icon: Layout },
      { id: 'ai-hub', label: 'AI Hub', note: 'Assistência inteligente', icon: Brain },
      { id: 'aulas', label: 'Aulas', note: 'Agenda e execução', icon: Video },
      { id: 'students', label: 'Alunos', note: 'Base ativa', icon: Users },
      { id: 'calendar', label: 'Calendário', note: 'Planejamento', icon: CalendarDays }
    ]
  },
  {
    label: 'Operação',
    items: [
      { id: 'student-groups', label: 'Grupos', note: 'Organização de turmas', icon: Users },
      { id: 'points', label: 'Pontos', note: 'Gamificação', icon: Star },
      { id: 'online', label: 'Online', note: 'Presença atual', icon: Users },
      { id: 'finance', label: 'Financeiro', note: 'Receita e pendências', icon: Wallet },
      { id: 'analytics', label: 'Analytics', note: 'Métricas de negócio', icon: BarChart3 },
      { id: 'automation', label: 'Mensagens', note: 'Comunicação ativa', icon: Bell },
      { id: 'templates', label: 'Templates', note: 'Padrões de mensagem', icon: MessageSquare },
      { id: 'automation-manager', label: 'Motor de Automacao', note: 'Regras e rotinas', icon: Zap },
      { id: 'hub', label: 'Hub', note: 'Recursos pedagógicos', icon: BookOpen },
      { id: 'advanced', label: 'Avançados', note: 'Ferramentas extras', icon: Zap }
    ]
  }
];

const shellSectionMeta: Record<string, ShellSectionMeta> = {
  dashboard: {
    eyebrow: 'Painel central',
    title: 'Painel de Controle',
    subtitle: 'Leitura rápida da operação diária, agenda e saúde financeira.'
  },
  aulas: {
    eyebrow: 'Agenda pedagógica',
    title: 'Gestão de Aulas',
    subtitle: 'Organize a rotina de aulas, inicie sessões e acompanhe horários.'
  },
  students: {
    eyebrow: 'Base ativa',
    title: 'Gestão de Alunos',
    subtitle: 'Cadastros, convite público e acompanhamento da carteira de alunos.'
  },
  calendar: {
    eyebrow: 'Planejamento',
    title: 'Calendário',
    subtitle: 'Visualize compromissos e ajuste a agenda pedagógica.'
  },
  'hour-bank': {
    eyebrow: 'Operação avançada',
    title: 'Banco de Horas',
    subtitle: 'Controle o saldo de horas e a distribuição da carga docente.'
  },
  'ai-activities': {
    eyebrow: 'IA aplicada',
    title: 'Gerador de Atividades IA',
    subtitle: 'Crie atividades com apoio de IA sem sair da área operacional.'
  },
  'ai-assistant': {
    eyebrow: 'IA aplicada',
    title: 'Assistente de Ensino',
    subtitle: 'Converse com o assistente canônico do professor usando dados reais do workspace.'
  },
  'ai-insights': {
    eyebrow: 'IA aplicada',
    title: 'Dashboard de Insights IA',
    subtitle: 'Resumo automatizado de sinais e comportamento pedagógico.'
  },
  'smart-schedule': {
    eyebrow: 'IA aplicada',
    title: 'Agendamento Inteligente',
    subtitle: 'Sugestões automáticas para encaixe, recorrência e ritmo.'
  },
  'lesson-prep': {
    eyebrow: 'IA aplicada',
    title: 'Preparação Automática de Aulas',
    subtitle: 'Apoio na preparação de aulas, materiais e tópicos.'
  },
  contracts: {
    eyebrow: 'Operação avançada',
    title: 'Gerenciador de Contratos',
    subtitle: 'Centralize contratos e acompanhe o ciclo comercial.'
  },
  'student-groups': {
    eyebrow: 'Operação avançada',
    title: 'Grupos de Alunos',
    subtitle: 'Agrupe turmas e organize contextos coletivos.'
  },
  points: {
    eyebrow: 'Engajamento',
    title: 'Pontos',
    subtitle: 'Acompanhe regras e recompensas ligadas à gamificação.'
  },
  online: {
    eyebrow: 'Monitoramento',
    title: 'Alunos Online',
    subtitle: 'Veja quem está ativo agora dentro do ecossistema.'
  },
  finance: {
    eyebrow: 'Financeiro',
    title: 'Financeiro',
    subtitle: 'Receita, pendências e visão geral de pagamentos.'
  },
  analytics: {
    eyebrow: 'Inteligência de negócio',
    title: 'Dashboard de Negócios',
    subtitle: 'Métricas amplas para decisões sobre crescimento e retenção.'
  },
  automation: {
    eyebrow: 'Comunicação',
    title: 'Centro de Mensagens',
    subtitle: 'Mensagens ativas, alertas e rotinas de contato.'
  },
  templates: {
    eyebrow: 'Comunicação',
    title: 'Templates de Mensagens',
    subtitle: 'Padronize mensagens para ganhar consistência e velocidade.'
  },
  'automation-manager': {
    eyebrow: 'Automação',
    title: 'Motor de Automacao Central',
    subtitle: 'Gerencie regras, gatilhos e ações automáticas do sistema.'
  },
  'ai-hub': {
    eyebrow: 'Núcleo inteligente',
    title: 'Nexus AI Hub',
    subtitle: 'Ferramentas assistidas por IA reunidas em uma camada dedicada.'
  },
  hub: {
    eyebrow: 'Recursos',
    title: 'Hub Educacional',
    subtitle: 'Biblioteca de apoio e recursos didáticos integrados.'
  },
  advanced: {
    eyebrow: 'Recursos extras',
    title: 'Recursos Avançados',
    subtitle: 'Ferramentas complementares para fluxos especializados.'
  }
};

/**
 * Orquestra as rotas públicas, o portal do aluno e o shell autenticado do
 * professor. O redesign desta rodada atua apenas na camada visual do shell,
 * preservando redirecionamentos, tokens, rotas públicas e comportamento de auth.
 */
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
  const [liveClassData, setLiveClassData] = useState<{ id: string; title: string } | null>(null);
  const [preferDaily] = useState(false); // Jitsi como padrão enquanto o Daily permanece instável no ambiente atual
  const [mostrarConfiguracoes, setMostrarConfiguracoes] = useState(false);
  const [mostrarHangman, setMostrarHangman] = useState(false);
  const teacherUser = user as (typeof user & TeacherShellUser) | null;
  const activeSectionMeta = shellSectionMeta[abaAtiva] || {
    eyebrow: 'Nexus Academy',
    title: 'Nexus Academy',
    subtitle: 'Área principal da plataforma.'
  };

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
  const shouldLoadTeacherWorkspace = Boolean(teacherToken) && !isStudentPortal && !isPublicRoute;
  const teacherWorkspace = useTeacherWorkspaceData(shouldLoadTeacherWorkspace);

  useEffect(() => {
    // Se está no portal e não tem token, redirecionar para login
    if (isStudentPortal && !studentToken && !location.pathname.includes('/login')) {
      const redirectTarget = `${location.pathname}${location.search}`;
      navigate(`/portal/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
    // Se está no portal e tem token mas está na página de login, redirecionar para dashboard
    if (isStudentPortal && studentToken && location.pathname.includes('/login')) {
      const redirectParam = new URLSearchParams(location.search).get('redirect');
      const safeRedirect = redirectParam && redirectParam.startsWith('/portal')
        ? redirectParam
        : '/portal/dashboard';
      navigate(safeRedirect);
    }
  }, [isStudentPortal, studentToken, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!isStudentPortal && !isPublicRoute) {
      const count = alertService.getUnreadCount();
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setUnreadAlerts(count);

      const onboardingConcluido = localStorage.getItem('onboarding_concluido') === 'true'
        || localStorage.getItem('onboarding_completed') === 'true'
        || Boolean(teacherUser?.onboardingCompletedAt)
        || ['active', 'trialing'].includes(teacherUser?.subscriptionStatus || '')
        || teacherUser?.status === 'active';
      if (!onboardingConcluido && isAuthenticated) {
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setMostrarOnboarding(true);
      } else {
        setMostrarOnboarding(false);
      }
    }
  }, [isStudentPortal, isPublicRoute, isAuthenticated, teacherUser]);

  const handleNavegar = useCallback((tab: string) => {
    if (tab === 'hangman') {
      setMostrarHangman(true);
      setMenuMobileAberto(false);
      return;
    }

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
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
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
          // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
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
    if (location.pathname === '/portal/hangman') {
      const storedStudentRaw = localStorage.getItem('student') || localStorage.getItem('studentData');
      const routeGameId = new URLSearchParams(location.search).get('gameId') || undefined;
      let storedStudent: Partial<Aluno> | null = null;
      if (storedStudentRaw) {
        try {
          storedStudent = JSON.parse(storedStudentRaw) as Partial<Aluno>;
        } catch {
          storedStudent = null;
        }
      }
      return (
        <HangmanGame
          gameId={routeGameId}
          isTeacher={false}
          userId={storedStudent?.id || storedStudent?._id || 'student'}
          userName={storedStudent?.name || 'Aluno'}
          userAvatar={storedStudent?.profile?.avatar}
          onClose={() => navigate('/portal/dashboard')}
        />
      );
    }
    if (location.pathname === '/portal/live-class') {
      const searchParams = new URLSearchParams(location.search);
      const queryClassId = searchParams.get('classId');
      const queryClassName = searchParams.get('className');
      const queryTeacherName = searchParams.get('teacherName');
      const resolvedLiveClass = liveClassData || (queryClassId
        ? {
            id: queryClassId,
            title: queryClassName || 'Aula ao vivo'
          }
        : null);

      if (!resolvedLiveClass) {
        return <StudentDashboard />;
      }

      return preferDaily ? (
        <DailyLiveClass
          classId={resolvedLiveClass.id}
          className={resolvedLiveClass.title}
          teacherName={queryTeacherName || 'Professor'}
          studentName={studentToken ? 'Aluno' : undefined}
          userType="student"
          onEnd={() => {
            setLiveClassData(null);
            navigate('/portal/dashboard');
          }}
        />
      ) : (
        <JitsiLiveClass
          classId={resolvedLiveClass.id}
          className={resolvedLiveClass.title}
          teacherName={queryTeacherName || 'Professor'}
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
      <div className="nexus-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="nexus-grid-bg absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_28%)]" />
        <div className="nexus-panel-strong relative z-10 rounded-[2rem] px-10 py-12 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <BrandLogo variant="mark" theme="auto" size="lg" />
          </div>
          <p className="nexus-kicker">Inicializando sistema</p>
          <p className="mt-4 text-3xl">Carregando Nexus Academy...</p>
        </div>
      </div>
    );
  }

  const ItemNavegacao = ({ item }: { item: NavigationItem }) => {
    const Icon = item.icon;

    return (
      <button
        type="button"
        onClick={() => handleNavegar(item.id)}
        className="nexus-sidebar-link"
        data-active={abaAtiva === item.id}
        aria-label={item.label}
        title={item.label}
      >
        <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-2.5 text-[var(--brand-indigo)]">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-bold">{item.label}</span>
          <span className="nexus-sidebar-note">{item.note}</span>
        </div>
      </button>
    );
  };

  const handleLogout = () => {
    logout();
    clearSensitiveData();
    navigate('/');
  };

  const userInitial = teacherUser?.name?.charAt(0).toUpperCase() || 'P';
  const renderAiWorkspace = (view: ReactNode) => {
    if (teacherWorkspace.loading) {
      return (
        <div className="nexus-panel rounded-[2rem] p-8">
          <p className="nexus-kicker">AI Hub</p>
          <p className="mt-3 text-lg text-[var(--text-muted)]">Carregando dados reais do professor...</p>
        </div>
      );
    }

    if (teacherWorkspace.error) {
      return (
        <div className="nexus-panel rounded-[2rem] p-8">
          <p className="nexus-kicker">AI Hub</p>
          <p className="mt-3 text-lg text-[var(--brand-red)]">{teacherWorkspace.error}</p>
          <button type="button" onClick={() => void teacherWorkspace.refresh()} className="nexus-button-secondary mt-5">
            Tentar novamente
          </button>
        </div>
      );
    }

    return view;
  };

  return (
    <>
      <div className={`nexus-shell flex h-screen w-screen overflow-hidden ${isDark ? 'dark' : ''}`}>
        <aside
          className={`nexus-panel fixed inset-y-0 left-0 z-40 flex w-[18.75rem] flex-col p-4 transition-transform duration-300 md:static ${
            menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="rounded-[1.8rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="flex items-center justify-between gap-4">
              <BrandLogo variant="horizontal" theme="auto" size="md" />
              <span className="nexus-kicker">Operacao</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Navegação principal do professor com foco em agenda, base ativa e operação contínua.
            </p>
          </div>

          <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
            {navigationSections.map((section) => (
              <div key={section.label}>
                <p className="nexus-kicker px-2">{section.label}</p>
                <div className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <ItemNavegacao key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-6 space-y-3 border-t border-[var(--border-soft)] pt-4">
            <div className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <p className="nexus-kicker">Conta ativa</p>
              <p className="mt-3 truncate text-lg font-semibold text-[var(--text-strong)]">
                {teacherUser?.name || 'Professor'}
              </p>
              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                {teacherUser?.email || 'Sem email'}
              </p>
            </div>

            <button type="button" onClick={toggleTheme} className="nexus-button-secondary w-full justify-start">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Modo Claro' : 'Modo Escuro'}
            </button>

            <button type="button" onClick={handleLogout} className="nexus-button-secondary w-full justify-start text-red-500">
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </aside>

        {menuMobileAberto && (
          <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMenuMobileAberto(false)} />
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="nexus-panel md:hidden fixed left-4 top-4 z-50 rounded-full p-3"
          >
            <Menu size={22} />
          </button>

          <header className="sticky top-0 z-10 p-3 pb-0 md:p-4 md:pb-0">
            <div className="nexus-panel rounded-[1.8rem] p-4 md:px-6 md:py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <p className="nexus-kicker">{activeSectionMeta.eyebrow}</p>
                  <h2 className="mt-2 text-3xl leading-none md:text-4xl">
                    {activeSectionMeta.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)] md:text-base">
                    {activeSectionMeta.subtitle}
                  </p>
                </div>

                <div className="relative flex items-center gap-3 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="nexus-button-ghost hidden md:inline-flex"
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? 'Claro' : 'Escuro'}
                  </button>

                  <button
                    onClick={() => setMostrarAlertas(!mostrarAlertas)}
                    className={`relative rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 transition-colors ${
                      mostrarAlertas ? 'text-[var(--brand-indigo)]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <Bell size={20} />
                    {unreadAlerts > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-red)] text-[10px] font-bold text-white">
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
                    type="button"
                    onClick={() => setMostrarConfiguracoes(true)}
                    className="flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 transition-colors hover:border-[rgba(79,70,229,0.2)]"
                  >
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold text-[var(--text-strong)]">{teacherUser?.name}</p>
                      <p className="text-xs text-[var(--text-soft)]">{teacherUser?.email}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-indigo)] text-sm font-bold text-white">
                      {teacherUser?.avatar ? <UserCircle size={20} /> : userInitial}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto px-3 pb-3 md:px-4 md:pb-4">
            <div className="min-h-full rounded-[2rem]">
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
                preferDaily ? (
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
              {abaAtiva === 'ai-hub' && renderAiWorkspace(
                <TeacherAIHub data={teacherWorkspace.data} onNavigate={handleNavegar} />
              )}
              {abaAtiva === 'hub' && <ComprehensiveHub />}
              {abaAtiva === 'advanced' && <AdvancedFeatures />}
              {abaAtiva === 'points' && <PaginaPontos />}
              {abaAtiva === 'online' && <OnlineStudents />}

              {/* Novos componentes de Automação IA */}
              {abaAtiva === 'hour-bank' && <HourBankManagement />}
              {abaAtiva === 'ai-assistant' && renderAiWorkspace(
                <TeacherAssistantWorkspace data={teacherWorkspace.data} />
              )}
              {abaAtiva === 'ai-activities' && renderAiWorkspace(
                <TeacherAIActivityWorkspace
                  classes={teacherWorkspace.data.classes}
                  students={teacherWorkspace.data.students}
                  studentGroups={teacherWorkspace.data.studentGroups}
                  activities={teacherWorkspace.data.activities}
                  onRefresh={teacherWorkspace.refresh}
                />
              )}
              {abaAtiva === 'ai-insights' && renderAiWorkspace(
                <TeacherAIInsightsWorkspace
                  students={teacherWorkspace.data.students}
                  classes={teacherWorkspace.data.classes}
                  payments={teacherWorkspace.data.payments}
                  activities={teacherWorkspace.data.activities}
                  learningSnapshots={teacherWorkspace.data.learningSnapshots}
                />
              )}
              {abaAtiva === 'smart-schedule' && renderAiWorkspace(
                <TeacherSmartSchedulingWorkspace
                  students={teacherWorkspace.data.students}
                  classes={teacherWorkspace.data.classes}
                  onRefresh={teacherWorkspace.refresh}
                />
              )}
              {abaAtiva === 'lesson-prep' && renderAiWorkspace(
                <TeacherLessonPrepWorkspace
                  classes={teacherWorkspace.data.classes}
                  students={teacherWorkspace.data.students}
                  lessonPreparations={teacherWorkspace.data.lessonPreparations}
                  onRefresh={teacherWorkspace.refresh}
                />
              )}
              {abaAtiva === 'contracts' && <ContractManager />}
              {abaAtiva === 'student-groups' && renderAiWorkspace(
                <TeacherStudentGroupsWorkspace
                  students={teacherWorkspace.data.students}
                  payments={teacherWorkspace.data.payments}
                  studentGroups={teacherWorkspace.data.studentGroups}
                  onRefresh={teacherWorkspace.refresh}
                />
              )}
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
      {mostrarHangman && (
        <HangmanGame
          isTeacher
          userId={user?.id || 'teacher'}
          userName={user?.name || 'Professor'}
          userAvatar={teacherUser?.avatar}
          onClose={() => setMostrarHangman(false)}
        />
      )}
    </>
  );
}

export default AppWithRouter;

