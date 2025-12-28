import React, { useState } from 'react';
import { BookOpen, Wand2, CheckCircle, Download, Clock, Target, Lightbulb, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiService } from '../services/aiService';
import type { LessonPreparation, Aula, Aluno } from '../types';

interface LessonPrepAIProps {
  students?: Aluno[];
  upcomingClasses?: Aula[];
}

export const LessonPrepAI: React.FC<LessonPrepAIProps> = ({ students = [], upcomingClasses = [] }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [preparation, setPreparation] = useState<LessonPreparation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'structure' | 'materials' | 'differentiation'>('structure');

  const generatePreparation = async () => {
    if (!selectedClass) {
      toast.error('Selecione uma aula primeiro');
      return;
    }

    const classData = upcomingClasses.find(c => c._id === selectedClass || c.id === selectedClass);
    if (!classData) return;

    const student = students.find(s => s._id === classData.studentId || s.id === classData.studentId);
    if (!student) return;

    setIsGenerating(true);
    toast.loading('IA gerando plano de aula completo...', { id: 'generating' });

    try {
      const prep = await aiService.generateLessonPlan(classData, student);
      setPreparation(prep);
      toast.success(
        `Plano de aula gerado! Economize ~35min de preparação. Revise e aprove.`,
        { id: 'generating', duration: 4000 }
      );
    } catch (error) {
      toast.error('Erro ao gerar plano de aula', { id: 'generating' });
    } finally {
      setIsGenerating(false);
    }
  };

  const approvePreparation = () => {
    if (!preparation) return;

    const updatedPrep = {
      ...preparation,
      teacherReview: {
        reviewed: true,
        reviewedAt: new Date().toISOString(),
        modifications: [],
        approved: true,
        notes: 'Plano aprovado sem modificações'
      },
      status: 'ready' as const
    };

    setPreparation(updatedPrep);
    toast.success('Plano de aula aprovado e pronto para uso!');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-900/30 border-green-700 text-green-400';
      case 'medium':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      case 'hard':
        return 'bg-red-900/30 border-red-700 text-red-400';
      default:
        return 'bg-gray-900/30 border-gray-700 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-emerald-400 mb-2 flex items-center gap-3">
          <BookOpen size={36} />
          Preparação Automática de Aulas
        </h1>
        <p className="text-gray-400">IA gera plano de aula completo em minutos - economize 30-40min de preparação</p>
      </div>

      {/* Seleção de Aula */}
      {!preparation && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Selecionar Aula para Preparar</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Escolha uma aula agendada
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione...</option>
                {upcomingClasses.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.title} - {cls.studentName} ({new Date(cls.scheduledAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(cls.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generatePreparation}
              disabled={!selectedClass || isGenerating}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Gerando Plano Completo...
                </>
              ) : (
                <>
                  <Wand2 size={24} />
                  Gerar Plano de Aula com IA
                </>
              )}
            </button>
          </div>

          <div className="mt-6 bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
            <p className="font-semibold text-emerald-300 mb-2">⚡ Economia de Tempo:</p>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>✓ Plano completo gerado em ~2 minutos</li>
              <li>✓ Estrutura de aula otimizada automaticamente</li>
              <li>✓ Sugestões de materiais e atividades</li>
              <li>✓ Diferenciação para diferentes estilos de aprendizagem</li>
              <li>✓ Estratégias para dificuldades antecipadas</li>
              <li className="font-bold text-emerald-400 mt-2">💰 Economize 30-40 minutos por aula!</li>
            </ul>
          </div>
        </div>
      )}

      {/* Plano Gerado */}
      {preparation && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{preparation.topic}</h2>
                <p className="text-gray-400 mt-1">
                  Aluno: {students.find(s => s._id === preparation.student)?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  preparation.status === 'ready'
                    ? 'bg-green-900/50 border border-green-700 text-green-400'
                    : 'bg-yellow-900/50 border border-yellow-700 text-yellow-400'
                }`}>
                  {preparation.status === 'ready' ? '✓ Aprovado' : '⏱️ Aguardando Revisão'}
                </span>
                <span className="text-sm text-gray-400">
                  {preparation.aiMetadata?.confidence}% confiança
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                <Clock className="text-blue-400" size={24} />
                <div>
                  <p className="text-sm text-gray-400">Duração Total</p>
                  <p className="font-semibold">
                    {preparation.structure.warmup.duration +
                     preparation.structure.mainContent.duration +
                     preparation.structure.practice.duration +
                     preparation.structure.review.duration} min
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                <Target className="text-purple-400" size={24} />
                <div>
                  <p className="text-sm text-gray-400">Objetivos</p>
                  <p className="font-semibold">{preparation.objectives.length} definidos</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                <FileText className="text-green-400" size={24} />
                <div>
                  <p className="text-sm text-gray-400">Materiais</p>
                  <p className="font-semibold">{preparation.materials.length} sugeridos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-700">
            {[
              { id: 'structure', label: 'Estrutura da Aula' },
              { id: 'materials', label: 'Materiais & Recursos' },
              { id: 'differentiation', label: 'Diferenciação' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Estrutura */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              {/* Objetivos */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Target className="text-purple-400" />
                  Objetivos da Aula
                </h3>
                <div className="space-y-2">
                  {preparation.objectives.map((obj, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        obj.priority === 'primary'
                          ? 'bg-purple-900/20 border-purple-700'
                          : 'bg-slate-700/50 border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-semibold">
                          {obj.priority === 'primary' ? '🎯' : '📌'}
                        </span>
                        <p className="flex-1">{obj.objective}</p>
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded">
                          {obj.priority === 'primary' ? 'Primário' : obj.priority === 'secondary' ? 'Secundário' : 'Opcional'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fases da Aula */}
              <div className="grid grid-cols-1 gap-4">
                {/* Aquecimento */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-bold">🔥 Aquecimento</h4>
                    <span className="text-sm text-gray-400">{preparation.structure.warmup.duration} min</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{preparation.structure.warmup.description}</p>
                  <ul className="space-y-2">
                    {preparation.structure.warmup.activities?.map((activity, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-700/50 rounded-lg p-3">
                        <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-sm">{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Conteúdo Principal */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-bold">📚 Conteúdo Principal</h4>
                    <span className="text-sm text-gray-400">{preparation.structure.mainContent.duration} min</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{preparation.structure.mainContent.description}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold mb-2 text-sm">Pontos-Chave:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {preparation.structure.mainContent.keyPoints?.map((point, idx) => (
                          <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Método: {
                        preparation.structure.mainContent.teachingMethod === 'mixed' ? '🎯 Misto (Exposição + Prática)' :
                        preparation.structure.mainContent.teachingMethod
                      }</p>
                    </div>
                  </div>
                </div>

                {/* Prática */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-bold">✍️ Prática Guiada</h4>
                    <span className="text-sm text-gray-400">{preparation.structure.practice.duration} min</span>
                  </div>
                  <div className="space-y-3">
                    {preparation.structure.practice.exercises.map((exercise, idx) => (
                      <div key={idx} className={`border rounded-lg p-4 ${getDifficultyColor(exercise.difficulty)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">
                            Exercício {idx + 1}: {exercise.difficulty === 'easy' ? '🟢 Fácil' : exercise.difficulty === 'medium' ? '🟡 Médio' : '🔴 Difícil'}
                          </span>
                          <span className="text-xs">{exercise.estimatedTime.toFixed(0)} min</span>
                        </div>
                        <p className="text-sm">{exercise.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revisão */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-bold">🔄 Revisão e Fechamento</h4>
                    <span className="text-sm text-gray-400">{preparation.structure.review.duration} min</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold mb-2 text-sm">Pontos-Chave a Revisar:</p>
                      <ul className="space-y-2">
                        {preparation.structure.review.keyTakeaways.map((takeaway, idx) => (
                          <li key={idx} className="bg-slate-700/50 rounded-lg p-2 text-sm flex items-start gap-2">
                            <span>•</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Perguntas para Fazer:</p>
                      <ul className="space-y-2">
                        {preparation.structure.review.questionsToAsk.map((question, idx) => (
                          <li key={idx} className="bg-slate-700/50 rounded-lg p-2 text-sm flex items-start gap-2">
                            <span>❓</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Materiais */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">📦 Materiais Sugeridos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preparation.materials.map((material, idx) => (
                    <div key={idx} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">
                          {material.type === 'presentation' && '📊'}
                          {material.type === 'video' && '🎥'}
                          {material.type === 'document' && '📄'}
                          {material.type === 'link' && '🔗'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{material.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">{material.description}</p>
                          <p className="text-xs text-gray-500 mt-2">Tipo: {material.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">⚠️ Dificuldades Antecipadas</h3>
                <div className="space-y-3">
                  {preparation.anticipatedDifficulties.map((diff, idx) => (
                    <div key={idx} className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-300 mb-2">{diff.concept}</h4>
                      <p className="text-sm text-gray-300 mb-3">
                        <strong>Estratégia:</strong> {diff.strategy}
                      </p>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-2">Exemplos/Abordagens:</p>
                        <ul className="space-y-1">
                          {diff.examples.map((example, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-orange-400">→</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Diferenciação */}
          {activeTab === 'differentiation' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="text-yellow-400" />
                Estratégias de Diferenciação
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <h4 className="font-semibold text-red-300 mb-3">📉 Para Alunos com Dificuldade</h4>
                  <ul className="space-y-2">
                    {preparation.differentiation.forStruggling.map((strategy, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="text-red-400 flex-shrink-0 mt-0.5" size={14} />
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <h4 className="font-semibold text-green-300 mb-3">📈 Para Alunos Avançados</h4>
                  <ul className="space-y-2">
                    {preparation.differentiation.forAdvanced.map((strategy, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={14} />
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-300 mb-3">👁️ Aprendizes Visuais</h4>
                  <ul className="space-y-2">
                    {preparation.differentiation.visualLearners.map((strategy, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={14} />
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-300 mb-3">👂 Aprendizes Auditivos</h4>
                  <ul className="space-y-2">
                    {preparation.differentiation.auditoryLearners.map((strategy, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="text-purple-400 flex-shrink-0 mt-0.5" size={14} />
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 md:col-span-2">
                  <h4 className="font-semibold text-yellow-300 mb-3">✋ Aprendizes Cinestésicos</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {preparation.differentiation.kinestheticLearners.map((strategy, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setPreparation(null);
                setSelectedClass('');
              }}
              className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
            >
              ❌ Descartar e Gerar Novo
            </button>

            {preparation.status === 'draft' && (
              <button
                onClick={approvePreparation}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg font-semibold flex items-center justify-center gap-3 transition"
              >
                <CheckCircle size={24} />
                Aprovar e Usar Este Plano
              </button>
            )}

            {preparation.status === 'ready' && (
              <button
                onClick={() => toast.success('Plano exportado! (funcionalidade futura)')}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold flex items-center justify-center gap-3 transition"
              >
                <Download size={24} />
                Exportar como PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPrepAI;
