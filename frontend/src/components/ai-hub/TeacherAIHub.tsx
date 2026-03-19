import { Brain, CalendarClock, ClipboardList, MessageSquareText, Sparkles, Users } from 'lucide-react';
import type { TeacherWorkspaceData } from '../../types';

type TeacherAIHubProps = {
  data: TeacherWorkspaceData;
  onNavigate: (tab: string) => void;
};

const tools = [
  {
    id: 'ai-assistant',
    title: 'IA de ensino',
    description: 'Assistente canônico do professor com contexto real de alunos, aulas e operação.',
    action: 'Abrir assistente',
    targetTab: 'ai-assistant',
    icon: MessageSquareText
  },
  {
    id: 'ai-activities',
    title: 'Criação de atividades',
    description: 'Gerar, revisar, publicar e acompanhar atividades diretamente no portal do aluno.',
    action: 'Gerar atividade',
    targetTab: 'ai-activities',
    icon: ClipboardList
  },
  {
    id: 'lesson-prep',
    title: 'Preparação automática',
    description: 'Selecionar uma aula real, gerar o plano e aprovar antes da execução.',
    action: 'Preparar aula',
    targetTab: 'lesson-prep',
    icon: Sparkles
  },
  {
    id: 'ai-insights',
    title: 'Insights de aprendizagem',
    description: 'Cruzar frequência, pagamentos, atividades e risco para agir com clareza.',
    action: 'Ver insights',
    targetTab: 'ai-insights',
    icon: Brain
  },
  {
    id: 'smart-schedule',
    title: 'Agendamento inteligente',
    description: 'Sugerir encaixes com base no histórico real e já criar a aula no calendário.',
    action: 'Sugerir horários',
    targetTab: 'smart-schedule',
    icon: CalendarClock
  },
  {
    id: 'student-groups',
    title: 'Grupos de alunos',
    description: 'Organizar públicos reais para envio de atividade, rotina e comunicação segmentada.',
    action: 'Gerenciar grupos',
    targetTab: 'student-groups',
    icon: Users
  }
];

/**
 * Landing canônica do AI Hub do professor.
 *
 * Cada card aponta para um workspace funcional do sistema. A tela evita
 * promessas vagas e mostra volume real de operação para contextualizar a
 * tomada de decisão do professor.
 */
export const TeacherAIHub = ({ data, onNavigate }: TeacherAIHubProps) => {
  const metrics = [
    { label: 'Alunos ativos', value: data.counts.students },
    { label: 'Aulas carregadas', value: data.counts.classes },
    { label: 'Atividades publicadas', value: data.activities.filter((activity) => activity.status === 'published').length },
    { label: 'Planos de aula', value: data.counts.lessonPreparations }
  ];

  return (
    <section className="space-y-6 px-1 py-2">
      <div className="grid gap-5 xl:grid-cols-[1.6fr,0.9fr]">
        <div className="nexus-panel rounded-[2rem] p-6 md:p-8">
          <p className="nexus-kicker">AI Hub operacional</p>
          <h1 className="mt-3 text-4xl leading-none md:text-5xl">Ferramentas de IA com dados reais do professor.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">
            O hub agora trabalha com a sua base ativa, seus grupos, suas aulas e as atividades publicadas no portal.
            Cada entrada abaixo leva para um fluxo que gera, salva e volta para a operação sem perder contexto.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="nexus-chip">
              <Sparkles size={14} />
              Provider em modo {data.provider.mode === 'live' ? 'ao vivo' : 'fallback'}
            </span>
            <span className="nexus-chip">
              <ClipboardList size={14} />
              {data.counts.activities} atividade(s) carregada(s)
            </span>
            <span className="nexus-chip">
              <Users size={14} />
              {data.counts.studentGroups} grupo(s) disponível(is)
            </span>
          </div>
        </div>

        <aside className="nexus-panel rounded-[2rem] p-6">
          <p className="nexus-kicker">Leitura rápida</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {metrics.map((metric) => (
              <div key={metric.label} className="nexus-metric-card">
                <p className="text-sm font-semibold text-[var(--text-muted)]">{metric.label}</p>
                <p className="nexus-metric-value mt-3">{metric.value}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.targetTab)}
              className="nexus-panel nexus-rule-card rounded-[1.85rem] p-6 text-left transition hover:-translate-y-[2px] hover:border-[rgba(79,70,229,0.18)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3 text-[var(--brand-indigo)]">
                  <Icon size={22} />
                </div>
                    <span className="nexus-kicker">fluxo</span>
              </div>
              <h3 className="mt-5 text-2xl leading-tight">{tool.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{tool.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-indigo)]">
                {tool.action}
                <span aria-hidden="true">+</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default TeacherAIHub;
