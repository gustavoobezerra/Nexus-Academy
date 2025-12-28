import { Brain, MessageSquare, Sparkles, Wand2, PenTool, Rocket, ShieldCheck, Bot } from 'lucide-react';
import { SpotlightCard, TiltCard, SplitText } from './ui/ReactBits';
import React from 'react';

type AIHubProps = {
  onNavigate?: (tab: string) => void;
};

const tools = [
  {
    id: 'chatbot',
    title: 'Chatbot de Tutoria',
    description: 'Assistente conversacional para dúvidas de alunos e suporte em tempo real.',
    icon: MessageSquare,
    action: 'Abrir chatbot',
    targetTab: 'automation'
  },
  {
    id: 'correcao',
    title: 'Correção Automática',
    description: 'Feedback instantâneo em tarefas e redações com rubricas personalizadas.',
    icon: ShieldCheck,
    action: 'Corrigir tarefa',
    targetTab: 'ai-activities'
  },
  {
    id: 'conteudo',
    title: 'Geração de Conteúdo',
    description: 'Crie planos de aula, roteiros e materiais interativos em segundos.',
    icon: PenTool,
    action: 'Criar conteúdo',
    targetTab: 'lesson-prep'
  },
  {
    id: 'insights',
    title: 'Insights de Aprendizagem',
    description: 'Dashboards preditivos com níveis, engajamento e risco de evasão.',
    icon: Brain,
    action: 'Ver insights',
    targetTab: 'ai-insights'
  },
  {
    id: 'agendamento',
    title: 'Agendamento Inteligente',
    description: 'Monte agendas ideais conciliando disponibilidade, fuso e prioridades.',
    icon: Wand2,
    action: 'Agendar',
    targetTab: 'smart-schedule'
  },
  {
    id: 'assistente',
    title: 'Assistente de Produtividade',
    description: 'Resumos, e-mails prontos e scripts para acelerar sua rotina.',
    icon: Bot,
    action: 'Usar assistente',
    targetTab: 'automation-manager'
  }
];

export const AIHub: React.FC<AIHubProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <SplitText text="Nexus AI Hub" className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white" />
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">Central de Inteligência Artificial - Todas as ferramentas de IA em um só lugar</p>
          </div>
          <TiltCard className="p-5 flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <Rocket className="w-6 h-6 text-indigo-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Experiência Premium</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Design minimalista e moderno</p>
            </div>
          </TiltCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <SpotlightCard key={tool.id} className="group cursor-pointer" onClick={() => onNavigate?.(tool.targetTab)}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <tool.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{tool.title}</h3>
                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{tool.description}</p>
                  <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold group-hover:gap-3 transition-all">
                    {tool.action}
                    <span className="text-xs">→</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIHub;
