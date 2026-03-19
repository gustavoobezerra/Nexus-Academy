import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Shield,
  Sparkles,
  Users
} from 'lucide-react';
import { FadeContent, BlurText, StaggerContainer, StaggerItem } from './ui/Animations';
import BrandLogo from './BrandLogo';

type RoleOption = {
  id: 'student' | 'teacher';
  title: string;
  description: string;
  eyebrow: string;
  icon: typeof GraduationCap;
  accent: string;
  features: string[];
};

const roleOptions: RoleOption[] = [
  {
    id: 'student',
    title: 'Sou Aluno',
    description: 'Entre no portal para acompanhar aulas, progresso, atividades e próximos passos da sua trilha.',
    eyebrow: 'Portal individual',
    icon: GraduationCap,
    accent: 'rgba(79, 70, 229, 0.18)',
    features: ['Aulas', 'Progresso', 'Metas']
  },
  {
    id: 'teacher',
    title: 'Sou Professor',
    description: 'Acesse o núcleo operacional para gerir turmas, agenda, finanças e automações com clareza.',
    eyebrow: 'Painel de gestão',
    icon: Users,
    accent: 'rgba(6, 182, 212, 0.18)',
    features: ['Agenda', 'Alunos', 'Analytics']
  }
];

const platformSignals = [
  {
    value: '01',
    label: 'Operação clara',
    description: 'Rotina, calendário e acompanhamento reunidos em uma única superfície.'
  },
  {
    value: '02',
    label: 'Pedagogia assistida',
    description: 'IA como apoio de preparação, revisão e análise, sem poluir a experiência.'
  },
  {
    value: '03',
    label: 'Escala com contexto',
    description: 'Professores e alunos entram em fluxos diferentes, mas com a mesma identidade.'
  }
];

/**
 * Porta de entrada principal do produto. A composição foi simplificada para
 * destacar marca, proposta de valor e escolha de perfil sem depender de cards
 * genéricos ou efeitos visuais excessivos.
 */
export const LoginPage = () => {
  const [hoveredRole, setHoveredRole] = useState<RoleOption['id'] | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (role: RoleOption['id']) => {
    if (role === 'student') {
      navigate('/portal/login');
      return;
    }

    navigate('/professor/login');
  };

  return (
    <div className="nexus-shell relative min-h-screen overflow-x-hidden">
      <div className="nexus-grid-bg absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_28%)]" />

      <div className="relative z-10 min-h-screen px-4 py-6 md:px-8 md:py-8 lg:px-10">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <BrandLogo variant="horizontal" theme="auto" size="md" />
          <span className="hidden md:inline-flex nexus-chip">
            <Sparkles className="h-4 w-4 text-[var(--brand-indigo)]" />
            Plataforma editorial para ensino e gestão
          </span>
        </header>

        <main className="mx-auto mt-6 grid w-full max-w-6xl gap-6 lg:min-h-[calc(100vh-120px)] lg:grid-cols-[1.15fr_0.85fr]">
          <FadeContent delay={0} duration={0.55} className="h-full">
            <section className="nexus-panel-strong nexus-rule-card flex h-full flex-col justify-between rounded-[2rem] p-8 md:p-10 lg:p-12">
              <div className="space-y-8">
                <div className="space-y-5">
                  <p className="nexus-kicker">Nexus Academy</p>
                  <h1 className="max-w-3xl text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.92]">
                    Ensino com ritmo, gestão com assinatura.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-[var(--text-muted)] md:text-lg">
                    Uma plataforma para escolas, professores e alunos que precisam
                    de rotina clara, acompanhamento consistente e uma interface com
                    identidade própria.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {platformSignals.map((signal) => (
                    <div
                      key={signal.value}
                      className="rounded-[1.6rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
                    >
                      <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--brand-indigo)]">
                        {signal.value}
                      </p>
                      <h2 className="mt-4 text-2xl">{signal.label}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        {signal.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 space-y-5 border-t border-[var(--border-soft)] pt-6">
                <div className="flex flex-wrap gap-2">
                  <span className="nexus-chip">
                    <BookOpen className="h-4 w-4 text-[var(--brand-indigo)]" />
                    Aulas ao vivo
                  </span>
                  <span className="nexus-chip">
                    <Shield className="h-4 w-4 text-[var(--brand-cyan)]" />
                    Fluxos seguros
                  </span>
                  <span className="nexus-chip">
                    <Sparkles className="h-4 w-4 text-[var(--brand-indigo)]" />
                    Automação com IA
                  </span>
                </div>

                <BlurText
                  text="Menos ruído visual, mais foco na operação pedagógica e na entrada certa para cada perfil."
                  className="block max-w-2xl text-sm leading-6 text-[var(--text-muted)] md:text-base"
                  delay={0.2}
                />
              </div>
            </section>
          </FadeContent>

          <StaggerContainer className="h-full" delay={0.15} staggerDelay={0.08}>
            <section className="nexus-panel flex h-full flex-col rounded-[2rem] p-6 md:p-8 lg:p-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="nexus-kicker">Escolha seu acesso</p>
                  <h2 className="mt-3 text-4xl leading-none">Entrada principal</h2>
                </div>
                <p className="text-sm font-semibold text-[var(--text-soft)]">02 perfis</p>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                Cada jornada começa em uma superfície própria, mas ambas mantêm o
                mesmo sistema visual e a mesma lógica de navegação.
              </p>

              <div className="mt-8 space-y-4">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  const isHovered = hoveredRole === role.id;

                  return (
                    <StaggerItem key={role.id}>
                      <button
                        type="button"
                        onClick={() => handleRoleSelect(role.id)}
                        onMouseEnter={() => setHoveredRole(role.id)}
                        onMouseLeave={() => setHoveredRole(null)}
                        className="group flex w-full flex-col gap-5 rounded-[1.8rem] border bg-[var(--surface-strong)] p-6 text-left transition-all duration-300 hover:-translate-y-[2px]"
                        style={{
                          borderColor: isHovered ? role.accent : 'var(--border-soft)',
                          boxShadow: isHovered ? 'var(--shadow-lifted)' : 'var(--shadow-panel)'
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-[1.2rem]"
                            style={{ backgroundColor: role.accent }}
                          >
                            <Icon className="h-7 w-7 text-[var(--text-strong)]" />
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-soft)]">
                            <span>{role.eyebrow}</span>
                            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-3xl leading-none">{role.title}</h3>
                          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                            {role.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {role.features.map((feature) => (
                            <span key={feature} className="nexus-chip">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </button>
                    </StaggerItem>
                  );
                })}
              </div>

              <div className="mt-auto rounded-[1.8rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
                <p className="nexus-kicker">Leitura rápida</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Alunos entram para acompanhar a própria trilha. Professores
                  entram para operar agenda, base de alunos, finanças e recursos
                  inteligentes em um único painel.
                </p>
              </div>
            </section>
          </StaggerContainer>
        </main>

        <footer className="mx-auto mt-6 flex w-full max-w-6xl flex-col gap-2 pb-4 text-sm text-[var(--text-soft)] md:flex-row md:items-center md:justify-between">
          <span>© 2026 Nexus Academy</span>
          <span>Identidade editorial, paleta preservada e fluxos separados por contexto.</span>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
