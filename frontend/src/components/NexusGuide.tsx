import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CircleDot,
  GraduationCap,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { FadeContent, StaggerContainer, StaggerItem } from './ui/Animations';

const pillars = [
  {
    title: 'Operacao do professor',
    description: 'Agenda, alunos, financeiro, aulas ao vivo e automacoes ficam em uma area unica de trabalho.',
    icon: CalendarDays
  },
  {
    title: 'Portal do aluno',
    description: 'O aluno acompanha aulas, atividades, metas, progresso e comunicacao sem entrar no painel administrativo.',
    icon: GraduationCap
  },
  {
    title: 'IA aplicada ao ensino',
    description: 'A IA apoia preparacao, atividades, insights e organizacao sem substituir o criterio pedagogico.',
    icon: Sparkles
  }
];

const modules = [
  ['Dashboard', 'Visao diaria da operacao, alertas e proximas acoes.'],
  ['Alunos', 'Cadastro, acompanhamento, status e organizacao da base ativa.'],
  ['Aulas', 'Agenda, inicio de aula ao vivo e historico pedagogico.'],
  ['Financeiro', 'Pagamentos, pendencias, receita e leitura de saude financeira.'],
  ['AI Hub', 'Assistente, atividades, insights, preparacao e agendamento inteligente.'],
  ['Mensagens', 'Templates, notificacoes e rotinas de comunicacao.']
];

const flow = [
  'Configure sua conta de professor e dados principais.',
  'Cadastre alunos ou envie o link publico de inscricao.',
  'Organize aulas, pagamentos, atividades e grupos.',
  'Use o AI Hub para preparar aulas, analisar sinais e acelerar tarefas.',
  'Acompanhe tudo pelo dashboard e pelo portal do aluno.'
];

const commercialHighlights = [
  { label: 'Perfis separados', value: 'Professor e aluno' },
  { label: 'Nucleo IA', value: 'Assistente, insights e atividades' },
  { label: 'Gestao recorrente', value: 'Agenda, financeiro e mensagens' }
];

export const NexusGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="nexus-public-page min-h-screen bg-[var(--page-bg)] text-[var(--text-strong)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--surface-base)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <button type="button" onClick={() => navigate('/')} className="shrink-0">
            <BrandLogo variant="horizontal" theme="auto" size="md" />
          </button>

          <nav className="hidden items-center gap-6 text-sm font-bold text-[var(--text-muted)] md:flex">
            <a href="#visao" className="transition-colors hover:text-[var(--text-strong)]">Visao</a>
            <a href="#modulos" className="transition-colors hover:text-[var(--text-strong)]">Modulos</a>
            <a href="#fluxo" className="transition-colors hover:text-[var(--text-strong)]">Fluxo</a>
          </nav>

          <button type="button" onClick={() => navigate('/professor/login')} className="nexus-button-primary">
            Entrar
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main>
        <section id="visao" className="nexus-section relative overflow-hidden">
          <div className="nexus-flow-field" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
            <FadeContent className="relative z-10" distance={16} blur>
              <p className="nexus-kicker">Guia Nexus Academy</p>
              <h1 className="mt-6 max-w-4xl text-[clamp(3rem,7vw,6.8rem)] leading-[0.9] tracking-normal">
                Uma escola digital com rotina, contexto e escala.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
                O Nexus Academy organiza a operacao de professores e escolas que precisam vender,
                acompanhar e entregar aulas com uma experiencia mais clara para alunos e gestores.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate('/professor/login')} className="nexus-button-primary">
                  Acessar painel
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => navigate('/portal/login')} className="nexus-button-secondary">
                  Portal do aluno
                </button>
              </div>
            </FadeContent>

            <StaggerContainer className="relative z-10 grid content-end gap-4" delay={0.1} staggerDelay={0.06}>
              {commercialHighlights.map((item) => (
                <StaggerItem key={item.label}>
                  <div className="nexus-feature-row">
                    <span className="text-sm font-extrabold uppercase text-[var(--text-soft)]">{item.label}</span>
                    <strong className="text-xl font-extrabold">{item.value}</strong>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="border-y border-[var(--border-soft)] bg-[var(--surface-strong)]">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
            {[
              ['Aulas', CalendarDays],
              ['Alunos', Users],
              ['Financeiro', Wallet],
              ['Analytics', BarChart3]
            ].map(([label, Icon]) => {
              const ModuleIcon = Icon as typeof CalendarDays;
              return (
                <div key={label as string} className="flex items-center gap-3 border-l border-[var(--border-soft)] px-4 py-3">
                  <ModuleIcon size={20} className="text-[var(--brand-indigo)]" />
                  <span className="font-extrabold">{label as string}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="nexus-section px-5 py-20 lg:px-8" id="modulos">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="nexus-kicker">Estrutura</p>
                <h2 className="mt-4 text-5xl leading-none md:text-6xl">Ferramentas completas, interface contida.</h2>
                <p className="mt-6 text-base leading-7 text-[var(--text-muted)]">
                  O desenho prioriza leitura, hierarquia e repeticao diaria. A plataforma continua completa,
                  mas sem depender de excesso visual para parecer moderna.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {pillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <article key={pillar.title} className="nexus-guide-card">
                      <Icon size={22} className="text-[var(--brand-indigo)]" />
                      <h3 className="mt-8 text-2xl leading-tight">{pillar.title}</h3>
                      <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{pillar.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)] md:grid-cols-2">
              {modules.map(([title, description]) => (
                <div key={title} className="bg-[var(--surface-strong)] p-6">
                  <div className="flex items-start gap-4">
                    <Check size={18} className="mt-1 text-[var(--brand-emerald)]" />
                    <div>
                      <h3 className="font-extrabold">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fluxo" className="border-y border-[var(--border-soft)] bg-[var(--surface-strong)] px-5 py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="nexus-kicker">Como usar</p>
              <h2 className="mt-4 text-5xl leading-none md:text-6xl">Do cadastro a gestao recorrente.</h2>
            </div>

            <div className="space-y-3">
              {flow.map((step, index) => (
                <div key={step} className="nexus-flow-step">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] text-sm font-extrabold">
                    {index + 1}
                  </div>
                  <p className="text-base font-bold leading-7">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="nexus-section px-5 py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="nexus-kicker">Pronto para operar</p>
              <h2 className="mt-4 text-5xl leading-none md:text-6xl">Uma experiencia comercial, administrativa e pedagogica no mesmo produto.</h2>
            </div>
            <div className="grid content-end gap-4">
              {[
                [ShieldCheck, 'Ambientes separados por perfil e token.'],
                [MessagesSquare, 'Comunicacao, templates e alertas integrados.'],
                [BookOpen, 'Atividades e preparacao de aula dentro do fluxo.'],
                [CircleDot, 'Visual minimalista, sem perder densidade operacional.']
              ].map(([Icon, text]) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={text as string} className="flex items-center gap-4 border-t border-[var(--border-soft)] py-4">
                    <ItemIcon size={20} className="text-[var(--brand-indigo)]" />
                    <p className="font-bold">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-soft)] px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
          <span>Nexus Academy © 2026</span>
          <span>Plataforma para ensino, gestao e acompanhamento academico.</span>
        </div>
      </footer>
    </div>
  );
};

export default NexusGuide;
