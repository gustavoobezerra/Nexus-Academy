import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Layout, Wallet, Users, LogOut, UserCircle,
  Menu, Video, Star, CalendarDays, Moon, Sun, BarChart3, Bell, BookOpen, Zap,
  Brain, MessageSquare
} from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useTheme } from './context/ThemeContext';

import OnlineStudents from './components/OnlineStudents';
import CalendarView from './components/CalendarView';
import { AlertsPanel } from './components/AlertsPanel';
import { QuickActions } from './components/QuickActions';
import { OnboardingWizardNew } from './components/OnboardingWizardNew';
import { Toaster } from 'react-hot-toast';
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
import AIHub from './components/AIHub';

// NOVOS COMPONENTES DE AUTOMAÇÃO COM IA
import { HourBankManagement } from './components/HourBankManagement';
import { AIActivityGenerator } from './components/AIActivityGenerator';
import { AIInsightsDashboard } from './components/AIInsightsDashboard';
import { SmartScheduling } from './components/SmartScheduling';
import { LessonPrepAI } from './components/LessonPrepAI';
import { ContractManager } from './components/ContractManager';
import { StudentGroupsManager } from './components/StudentGroupsManager';
import MessageTemplatesManager from './components/MessageTemplatesManager';
import BrandLogo from './components/BrandLogo';

type ItemNavegacaoProps = {
  icon: ReactNode;
  label: string;
  id: string;
  isActive: boolean;
  onNavigate: (id: string) => void;
};

function ItemNavegacao({ icon, label, id, isActive, onNavigate }: ItemNavegacaoProps) {
  return (
    <button
      onClick={() => onNavigate(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        isActive
          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
          : 'text-gray-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function App() {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [inicializado, setInicializado] = useState(false);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [liveClassData, setLiveClassData] = useState<{ id: string; title: string } | null>(null);
  const [useDaily] = useState(true); // Usar Daily.co como padrão (true) ou Jitsi (false)

  useEffect(() => {
    let frameId: number | null = null;

    const updateState = () => {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setUnreadAlerts(alertService.getUnreadCount());
      if (user && !user.onboardingCompletedAt) {
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setMostrarOnboarding(true);
      } else {
        setMostrarOnboarding(false);
      }
    };

    frameId = requestAnimationFrame(updateState);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [user]);

  const handleNavegar = useCallback((tab: string) => {
    setAbaAtiva(tab);
    setMenuMobileAberto(false);
  }, []);

  useEffect(() => {
    // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
    const timer = setTimeout(() => setInicializado(true), 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!inicializado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-cyan-500 to-indigo-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 flex justify-center animate-pulse">
            <BrandLogo variant="mark" theme="dark" size="lg" />
          </div>
          <p className="text-lg font-medium">Carregando Nexus Academy...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1F2937', color: '#fff' } }} />
      <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'dark' : ''}`}>
        <aside className={`hidden md:flex fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white p-4 flex-col transform transition-transform duration-300 ${
          menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="sm:hidden">
              <BrandLogo variant="mark" theme="dark" size="md" />
            </div>
            <div className="hidden sm:flex">
              <BrandLogo variant="horizontal" theme="dark" size="md" />
            </div>
            <p className="text-xs text-gray-400">GestÆo Educacional</p>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Principal</div>
            <ItemNavegacao icon={<Layout size={20} />} label="Dashboard" id="dashboard" isActive={abaAtiva === 'dashboard'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Brain size={20} />} label="AI Hub" id="ai-hub" isActive={abaAtiva === 'ai-hub'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Video size={20} />} label="Aulas" id="aulas" isActive={abaAtiva === 'aulas'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Users size={20} />} label="Alunos" id="students" isActive={abaAtiva === 'students'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<CalendarDays size={20} />} label="Calendário" id="calendar" isActive={abaAtiva === 'calendar'} onNavigate={handleNavegar} />

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2 mt-4">Gestão</div>
            <ItemNavegacao icon={<Users size={20} />} label="Grupos" id="student-groups" isActive={abaAtiva === 'student-groups'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Star size={20} />} label="Pontos" id="points" isActive={abaAtiva === 'points'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Users size={20} />} label="Online" id="online" isActive={abaAtiva === 'online'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Wallet size={20} />} label="Financeiro" id="finance" isActive={abaAtiva === 'finance'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<BarChart3 size={20} />} label="Analytics" id="analytics" isActive={abaAtiva === 'analytics'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Bell size={20} />} label="Mensagens" id="automation" isActive={abaAtiva === 'automation'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<MessageSquare size={20} />} label="Templates" id="templates" isActive={abaAtiva === 'templates'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Zap size={20} />} label="Motor de Automacao" id="automation-manager" isActive={abaAtiva === 'automation-manager'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<BookOpen size={20} />} label="Hub" id="hub" isActive={abaAtiva === 'hub'} onNavigate={handleNavegar} />
            <ItemNavegacao icon={<Zap size={20} />} label="Avançados" id="advanced" isActive={abaAtiva === 'advanced'} onNavigate={handleNavegar} />
          </nav>
          <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
            <div className="px-4 py-3 bg-slate-800 rounded-xl">
              <p className="text-xs text-gray-400">Logado como</p>
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button
              onClick={() => { logout(); window.location.reload(); }}
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

                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{user?.name}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <UserCircle className="text-white" size={24} />
                </div>
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
              {abaAtiva === 'hub' && <ComprehensiveHub />}
              {abaAtiva === 'ai-hub' && <AIHub onNavigate={handleNavegar} />}
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
        <OnboardingWizardNew
          onComplete={() => {
            setMostrarOnboarding(false);
            // Atualizar user com onboarding completo
            window.location.reload(); // Recarregar para pegar dados atualizados
          }}
        />
      )}
    </>
  );
}

export default App;
