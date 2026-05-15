import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Users,
  Wallet
} from 'lucide-react';
import { FadeContent, StaggerContainer, StaggerItem } from './ui/Animations';
import BrandLogo from './BrandLogo';

const roleOptions = [
  {
    id: 'teacher',
    title: 'Painel do professor',
    description: 'Gestao de alunos, agenda, financeiro, aulas, mensagens e AI Hub em uma area operacional.',
    path: '/professor/login',
    icon: Users,
    action: 'Entrar como professor'
  },
  {
    id: 'student',
    title: 'Portal do aluno',
    description: 'Acesso para aulas, atividades, metas, comunicacao e acompanhamento da propria evolucao.',
    path: '/portal/login',
    icon: GraduationCap,
    action: 'Entrar como aluno'
  }
];

const capabilities = [
  { label: 'Agenda', icon: CalendarDays },
  { label: 'Alunos', icon: Users },
  { label: 'Financeiro', icon: Wallet },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Atividades', icon: BookOpen },
  { label: 'Seguranca', icon: ShieldCheck }
];

const productLines = [
  'Uma entrada para vender a plataforma e outra para operar o dia a dia.',
  'Ferramentas densas, organizadas em rotas claras e com menos distracao visual.',
  'Base pronta para escolas, professores independentes e operacoes recorrentes.'
];

export const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <div className="nexus-public-page min-h-screen text-[var(--text-strong)]">
      <header className="border-b border-[var(--border-soft)] bg-[var(--surface-base)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <BrandLogo variant="horizontal" theme="auto" size="md" />

          <nav className="hidden items-center gap-6 text-sm font-bold text-[var(--text-muted)] md:flex">
            <button type="button" onClick={() => navigate('/guia')} className="transition-colors hover:text-[var(--text-strong)]">
              Guia
            </button>
            <button type="button" onClick={() => navigate('/portal/login')} className="transition-colors hover:text-[var(--text-strong)]">
              Aluno
            </button>
            <button type="button" onClick={() => navigate('/professor/login')} className="transition-colors hover:text-[var(--text-strong)]">
              Professor
            </button>
          </nav>

          <button type="button" onClick={() => navigate('/guia')} className="nexus-button-secondary">
            Ver guia
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="nexus-flow-field" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <FadeContent className="relative z-10" distance={14} blur>
              <p className="nexus-kicker">Nexus Academy</p>
              <h1 className="mt-6 max-w-4xl text-[clamp(3.2rem,7vw,7rem)] leading-[0.9]">
                Plataforma de ensino para operar, acompanhar e crescer.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
                Organize aulas, alunos, financeiro, atividades e inteligencia pedagogica em uma experiencia
                minimalista, preparada para venda e uso recorrente.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate('/professor/login')} className="nexus-button-primary">
                  Comecar pelo painel
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => navigate('/guia')} className="nexus-button-secondary">
                  Conhecer o produto
                </button>
              </div>

              <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)] sm:grid-cols-3">
                {productLines.map((line, index) => (
                  <div key={line} className="bg-[var(--surface-strong)] p-5">
                    <span className="text-sm font-extrabold text-[var(--brand-indigo)]">0{index + 1}</span>
                    <p className="mt-4 text-sm font-bold leading-6 text-[var(--text-muted)]">{line}</p>
                  </div>
                ))}
              </div>
            </FadeContent>

            <StaggerContainer className="relative z-10 grid content-center gap-4" delay={0.1} staggerDelay={0.08}>
              {roleOptions.map((role) => {
                const Icon = role.icon;

                return (
                  <StaggerItem key={role.id}>
                    <button
                      type="button"
                      onClick={() => navigate(role.path)}
                      className="group w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-strong)] p-6 text-left shadow-[var(--shadow-panel)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lifted)]"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)]">
                          <Icon size={22} className="text-[var(--brand-indigo)]" />
                        </div>
                        <ArrowRight size={18} className="mt-2 text-[var(--text-soft)] transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                      <h2 className="mt-8 text-3xl leading-none">{role.title}</h2>
                      <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{role.description}</p>
                      <span className="mt-7 inline-flex text-sm font-extrabold text-[var(--brand-indigo)]">
                        {role.action}
                      </span>
                    </button>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>

        <section className="border-y border-[var(--border-soft)] bg-[var(--surface-strong)]">
          <div className="mx-auto grid max-w-7xl gap-px bg-[var(--border-soft)] md:grid-cols-6">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 bg-[var(--surface-strong)] px-5 py-5">
                  <Icon size={18} className="text-[var(--brand-indigo)]" />
                  <span className="text-sm font-extrabold">{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="px-5 py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
          <span>Nexus Academy © 2026</span>
          <span>Ensino, gestao e acompanhamento em uma unica plataforma.</span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
