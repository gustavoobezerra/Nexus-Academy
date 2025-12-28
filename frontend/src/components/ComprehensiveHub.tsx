import React, { useState, useEffect } from 'react';
import {
  BarChart3, BookOpen, Share2, Clock, Zap, Shield, Award,
  Plus, Link as LinkIcon, CheckCircle, TrendingUp
} from 'lucide-react';
import api from '../lib/api';
import type {
  StudentGrade, StudentMaterial, TeachingTemplate,
  ReferralLink, CoursePlan
} from '../types';
import toast from 'react-hot-toast';

const ComprehensiveHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'grades' | 'materials' | 'templates' | 'referral' | 'pricing' | 'courses' | 'reminders' | 'schedule'
  >('grades');

  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [templates, setTemplates] = useState<TeachingTemplate[]>([]);
  const [referral, setReferral] = useState<ReferralLink | null>(null);
  const [courses, setCourses] = useState<CoursePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [newMaterial, setNewMaterial] = useState({
    classId: '', className: '', topic: '', title: '', type: 'pdf' as const, url: '', description: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [gradesRes, materialsRes, templatesRes, referralRes, coursesRes] = await Promise.all([
        api.get('/grades').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
        api.get('/teaching-templates').catch(() => ({ data: [] })),
        api.get('/referral').catch(() => ({ data: null })),
        api.get('/course-plans').catch(() => ({ data: [] }))
      ]);

      setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : []);
      setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
      setReferral(referralRes.data || null);
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
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

  if (loading) return <div className="text-white p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">🎓 Hub Educacional Completo</h1>
        <p className="text-gray-400">Notas, Materiais, Templates, Referência, Preços, Cursos e mais</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap text-sm">
        {[
          { id: 'grades', label: '📊 Notas', icon: BarChart3 },
          { id: 'materials', label: '📚 Materiais', icon: BookOpen },
          { id: 'templates', label: '🎨 Templates', icon: Zap },
          { id: 'referral', label: '🔗 Referência', icon: Share2 },
          { id: 'pricing', label: '💰 Preços', icon: TrendingUp },
          { id: 'courses', label: '🎓 Cursos', icon: Award },
          { id: 'reminders', label: '⏰ Lembretes', icon: Clock },
          { id: 'schedule', label: '📅 Agendamento', icon: Shield }
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
            <h2 className="text-2xl font-bold mb-6">Templates de Aula</h2>
            {templates.length === 0 ? (
              <p className="text-gray-400">Nenhum template criado</p>
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
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Otimização de Preços</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-700/50 p-6 rounded-lg">
                <h3 className="font-semibold text-white mb-4">Sugestão Inteligente</h3>
                <p className="text-gray-300 mb-4">Com 10 alunos ativos de R$ 450/mês = R$ 4.500/mês</p>
                <div className="space-y-3">
                  <div className="bg-amber-900/20 border border-amber-700 p-3 rounded">
                    <p className="text-sm text-amber-300">↗️ Aumente para R$ 500</p>
                    <p className="text-xs text-gray-400">+R$ 500/mês com mesmos alunos</p>
                  </div>
                  <div className="bg-emerald-900/20 border border-emerald-700 p-3 rounded">
                    <p className="text-sm text-emerald-300">✓ Cresça para 15 alunos</p>
                    <p className="text-xs text-gray-400">= R$ 6.750/mês (50% crescimento)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 p-6 rounded-lg">
                <h3 className="font-semibold text-white mb-4">Simulador A/B</h3>
                <p className="text-gray-300 text-sm mb-4">Teste novo preço com próximos alunos:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
                    <span className="text-sm">Preço Atual</span>
                    <span className="font-bold">R$ 450</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-indigo-900/30 rounded">
                    <span className="text-sm">Teste</span>
                    <input type="number" defaultValue="500" className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Lembretes Inteligentes</h2>
            <div className="space-y-3">
              <div className="bg-amber-900/20 border border-amber-700 p-4 rounded-lg flex items-start gap-3">
                <Clock className="text-amber-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">Você não cobra 3 alunos há 30 dias</p>
                  <p className="text-xs text-gray-400">Action: Envie lembrete de pagamento</p>
                </div>
              </div>
              <div className="bg-amber-900/20 border border-amber-700 p-4 rounded-lg flex items-start gap-3">
                <Clock className="text-amber-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">João faltou 2 aulas</p>
                  <p className="text-xs text-gray-400">Action: Verifique se está interessado</p>
                </div>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-700 p-4 rounded-lg flex items-start gap-3">
                <CheckCircle className="text-emerald-400 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-white">Próxima avaliação de Maria em 5 dias</p>
                  <p className="text-xs text-gray-400">Prepare material de revisão</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📅 AGENDAMENTO */}
        {activeTab === 'schedule' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Análise de Horários</h2>
            <div className="space-y-4">
              <div className="bg-emerald-900/20 border border-emerald-700 p-4 rounded-lg">
                <p className="font-semibold text-white">📈 Seu melhor engagement</p>
                <p className="text-sm text-emerald-300 mt-2">Sexta-feira: 95% de presença e engajamento alto</p>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-700 p-4 rounded-lg">
                <p className="font-semibold text-white">📊 Comparação por período</p>
                <p className="text-sm text-emerald-300 mt-2">Alunos da manhã: 20% melhor desempenho vs à noite</p>
              </div>
              <div className="bg-indigo-900/20 border border-indigo-700 p-4 rounded-lg">
                <p className="font-semibold text-white">💡 Sugestão</p>
                <p className="text-sm text-indigo-300 mt-2">Abra mais vagas segunda à noite - 3 solicitações em fila</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComprehensiveHub;
