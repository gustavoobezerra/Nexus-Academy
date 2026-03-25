import React, { useState, useEffect } from 'react';
import {
  BarChart3, BookOpen, Share2, Clock, Zap, Shield, Award,
  Plus, Link as LinkIcon, TrendingUp
} from 'lucide-react';
import api, { notificationsAPI } from '../lib/api';
import type {
  StudentGrade, StudentMaterial, TeachingTemplate,
  ReferralLink, CoursePlan, NotificationTemplate
} from '../types';
import toast from 'react-hot-toast';

const ComprehensiveHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'grades' | 'materials' | 'templates' | 'referral' | 'pricing' | 'courses' | 'reminders' | 'schedule'
  >('grades');

  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [templates, setTemplates] = useState<TeachingTemplate[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<NotificationTemplate[]>([]);
  const [referral, setReferral] = useState<ReferralLink | null>(null);
  const [courses, setCourses] = useState<CoursePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);

  const [newMaterial, setNewMaterial] = useState({
    classId: '', className: '', topic: '', title: '', type: 'pdf' as const, url: '', description: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const warnings: string[] = [];
      const safeRequest = async <T,>(label: string, loader: () => Promise<T>, fallback: T) => {
        try {
          return await loader();
        } catch (error) {
          console.error(`[ComprehensiveHub] Falha ao carregar ${label}:`, error);
          warnings.push(label);
          return fallback;
        }
      };

      const [gradesData, materialsData, templatesData, referralData, coursesData, messageTemplatesData] = await Promise.all([
        safeRequest('notas', async () => {
          const response = await api.get<StudentGrade[]>('/grades');
          return Array.isArray(response.data) ? response.data : [];
        }, [] as StudentGrade[]),
        safeRequest('materiais', async () => {
          const response = await api.get<StudentMaterial[]>('/materials');
          return Array.isArray(response.data) ? response.data : [];
        }, [] as StudentMaterial[]),
        safeRequest('templates pedagógicos', async () => {
          const response = await api.get<TeachingTemplate[]>('/teaching-templates');
          return Array.isArray(response.data) ? response.data : [];
        }, [] as TeachingTemplate[]),
        safeRequest('referência', async () => {
          const response = await api.get<ReferralLink | null>('/referral');
          return response.data || null;
        }, null as ReferralLink | null),
        safeRequest('planos de curso', async () => {
          const response = await api.get<CoursePlan[]>('/course-plans');
          return Array.isArray(response.data) ? response.data : [];
        }, [] as CoursePlan[]),
        safeRequest('templates de mensagem', async () => {
          const response = await notificationsAPI.getTemplates();
          return Array.isArray(response.templates) ? response.templates : [];
        }, [] as NotificationTemplate[])
      ]);

      setGrades(gradesData);
      setMaterials(materialsData);
      setTemplates(templatesData);
      setMessageTemplates(messageTemplatesData);
      setReferral(referralData);
      setCourses(coursesData);
      setSyncWarnings(warnings);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar alguns dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.title.trim() || !newMaterial.url.trim()) {
      toast.error('Preencha título e URL');
      return;
    }
    try {
      const response = await api.post('/materials', newMaterial);
      setMaterials(prev => [...prev, response.data]);
      setNewMaterial({ classId: '', className: '', topic: '', title: '', type: 'pdf', url: '', description: '' });
      toast.success('Material adicionado!');
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      toast.error('Erro ao adicionar material');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const renderRoadmapState = ({
    icon: Icon,
    title,
    description,
    status,
    bullets,
    currentSurface
  }: {
    icon: typeof TrendingUp;
    title: string;
    description: string;
    status: string;
    bullets: string[];
    currentSurface: string;
  }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
              <Icon className="text-indigo-300" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-sm text-slate-400 mt-1">{status}</p>
            </div>
          </div>
          <p className="text-gray-300 mt-5">{description}</p>
        </div>
        <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          Em preparação
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {bullets.map((bullet) => (
          <div key={bullet} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-200">{bullet}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-sm font-semibold text-white">Superfície funcional por enquanto</p>
        <p className="text-sm text-slate-400 mt-2">{currentSurface}</p>
      </div>
    </div>
  );

  if (loading) return <div className="text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">Hub Educacional Completo</h1>
        <p className="text-gray-400">Notas, materiais, templates, referência, cursos e módulos em evolução.</p>
        {syncWarnings.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Alguns blocos não puderam ser sincronizados agora: {syncWarnings.join(', ')}.
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-8 flex-wrap text-sm">
        {[
          { id: 'grades', label: 'Notas', icon: BarChart3 },
          { id: 'materials', label: 'Materiais', icon: BookOpen },
          { id: 'templates', label: 'Templates', icon: Zap },
          { id: 'referral', label: 'Referência', icon: Share2 },
          { id: 'pricing', label: 'Preços', icon: TrendingUp },
          { id: 'courses', label: 'Cursos', icon: Award },
          { id: 'reminders', label: 'Lembretes', icon: Clock },
          { id: 'schedule', label: 'Agendamento', icon: Shield }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* 📊 NOTAS */}
        {activeTab === 'grades' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Histórico de Notas</h2>
            {grades.length === 0 ? (
              <p className="text-gray-400">Sem notas registradas ainda</p>
            ) : (
              <div className="space-y-3">
                {grades.map((grade) => (
                  <div key={grade.id} className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{grade.subject}</p>
                      <p className="text-xs text-gray-400">{grade.assessmentType}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${grade.percentage >= 80 ? 'text-emerald-400' : grade.percentage >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {grade.percentage.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-400">{grade.score}/{grade.maxScore}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 📚 MATERIAIS */}
        {activeTab === 'materials' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Banco de Materiais</h2>
              <button onClick={() => setNewMaterial({ ...newMaterial })} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 rounded-lg text-sm">
                <Plus size={16} /> Adicionar
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <input placeholder="Título" value={newMaterial.title} onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500" />
              <input placeholder="URL" value={newMaterial.url} onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500" />
              <div className="flex gap-3">
                <select value={newMaterial.type} onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as any })} className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="pdf">PDF</option>
                  <option value="video">Vídeo</option>
                  <option value="exercise">Exercício</option>
                  <option value="link">Link</option>
                </select>
                <button onClick={handleAddMaterial} className="px-4 py-2 bg-emerald-600 rounded-lg font-medium">Salvar</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.map((mat) => (
                <div key={mat.id} className="bg-slate-700/50 p-4 rounded-lg">
                  <p className="font-semibold text-white truncate">{mat.title}</p>
                  <p className="text-xs text-gray-400 mb-2">{mat.type}</p>
                  <a href={mat.url} target="_blank" rel="noreferrer" className="text-cyan-400 text-xs hover:underline">Abrir →</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎨 TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Templates ativos do professor</h2>

            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Pedagógicos</p>
                    <p className="text-sm text-slate-500">Estruturas de aula e repertório didático do Hub.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
                    {templates.length} template(s)
                  </span>
                </div>

                {templates.length === 0 ? (
                  <p className="text-gray-400">Nenhum template pedagógico criado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                        <p className="font-semibold text-white">{tpl.name}</p>
                        <p className="text-xs text-gray-400 mb-2">{tpl.subject} • {tpl.duration}min</p>
                        <p className="text-sm text-gray-300 line-clamp-2">{tpl.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Mensagens</p>
                    <p className="text-sm text-slate-500">Mesma base usada na aba de mensagens do professor.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-600/20 text-xs font-semibold text-indigo-200">
                    {messageTemplates.length} template(s)
                  </span>
                </div>

                {messageTemplates.length === 0 ? (
                  <p className="text-gray-400">Nenhum template de mensagem criado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {messageTemplates.map((template) => (
                      <div
                        key={template.id || template._id}
                        className="bg-slate-700/50 p-4 rounded-lg border border-slate-600"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{template.name}</p>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                            {template.channel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {template.type} {template.subject ? `• ${template.subject}` : ''}
                        </p>
                        <p className="text-sm text-gray-300 line-clamp-3 mt-2">{template.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🔗 REFERÊNCIA */}
        {activeTab === 'referral' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Sistema de Referência</h2>
            {referral && (
              <div className="space-y-6">
                <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-6">
                  <h3 className="font-semibold text-white mb-4">Seu Link de Referência</h3>
                  <div className="flex items-center gap-3 bg-slate-700 p-4 rounded-lg mb-4">
                    <LinkIcon className="text-cyan-400" size={20} />
                    <code className="flex-1 text-cyan-300 text-sm break-all">{referral.fullUrl}</code>
                    <button onClick={() => copyToClipboard(referral.fullUrl)} className="px-3 py-2 bg-cyan-600 rounded text-xs font-medium">Copiar</button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 p-3 rounded">
                      <p className="text-xs text-gray-400">Código</p>
                      <p className="text-lg font-bold text-indigo-400">{referral.code}</p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded">
                      <p className="text-xs text-gray-400">Indicados</p>
                      <p className="text-lg font-bold text-emerald-400">{referral.totalReferred}</p>
                    </div>
                    <div className="bg-slate-700/50 p-3 rounded">
                      <p className="text-xs text-gray-400">Bônus</p>
                      <p className="text-lg font-bold text-amber-400">R$ {referral.totalBonus}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 💰 PREÇOS */}
        {activeTab === 'pricing' && (
          renderRoadmapState({
            icon: TrendingUp,
            title: 'Otimização de Preços',
            status: 'Sem cálculos automáticos conectados ao financeiro real nesta rodada.',
            description: 'Esta aba deixa de exibir sugestões fabricadas. Ela só será ativada quando o Hub puder calcular preços, retenção e crescimento a partir de pagamentos, alunos e contratos realmente persistidos.',
            bullets: [
              'Nenhuma recomendação de valor é mostrada sem base financeira real.',
              'Nenhum cenário A/B é sugerido antes da integração com contratos e pagamentos.',
              'Quando a integração existir, os números daqui precisarão bater com o Financeiro.'
            ],
            currentSurface: 'Use a aba Financeiro para consultar receita e pendências já disponíveis no shell do professor.'
          })
        )}

        {/* 🎓 CURSOS */}
        {activeTab === 'courses' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Plano de Cursos</h2>
            {courses.length === 0 ? (
              <p className="text-gray-400">Nenhum plano de curso criado</p>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="bg-slate-700/50 p-4 rounded-lg">
                    <p className="font-semibold text-white">{course.name}</p>
                    <p className="text-xs text-gray-400 mb-2">{course.totalModules} módulos</p>
                    <p className="text-sm text-gray-300">{course.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ⏰ LEMBRETES */}
        {activeTab === 'reminders' && (
          renderRoadmapState({
            icon: Clock,
            title: 'Lembretes Inteligentes',
            status: 'Nenhum alerta automático é emitido aqui sem critérios persistidos.',
            description: 'A versão anterior exibida nesta tela parecia viva, mas usava textos inventados. Agora o módulo deixa claro que lembretes só serão publicados quando houver gatilhos auditados ligados a frequência, pagamento, notificações e atividades.',
            bullets: [
              'Não mostramos faltas, atrasos ou cobranças sem fonte confirmada.',
              'Os futuros lembretes precisarão ser reconciliados com Mensagens e Notificações.',
              'Toda automação pedagógica ou financeira deverá deixar rastro observável no sistema.'
            ],
            currentSurface: 'Use Mensagens, Notificações e Atividades para acompanhar os fluxos que já estão ativos hoje.'
          })
        )}

        {/* 📅 AGENDAMENTO */}
        {activeTab === 'schedule' && (
          renderRoadmapState({
            icon: Shield,
            title: 'Análise de Horários',
            status: 'Sem recomendações de agenda enquanto o motor não estiver ligado aos dados reais de aulas e presença.',
            description: 'Recomendações de melhor horário, engajamento por turno e expansão de vagas só podem existir quando a agenda real, presença e histórico de turmas estiverem sincronizados. Até lá, a tela permanece honesta sobre o que ainda falta integrar.',
            bullets: [
              'Não exibimos percentuais de presença ou engajamento sem base observável.',
              'Nenhuma sugestão comercial de horário é emitida sem demanda registrada.',
              'A futura versão desta análise deve conversar com Calendário e Agendamento Inteligente.'
            ],
            currentSurface: 'Use Calendário, Aulas e Agendamento Inteligente no AI Hub para os fluxos já operacionais.'
          })
        )}
      </div>
    </div>
  );
};

export default ComprehensiveHub;
