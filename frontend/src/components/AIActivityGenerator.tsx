import React, { useState } from 'react';
import { Wand2, CheckCircle, Send, Eye, Trash2, Sparkles, FileText, Brain, Users, User, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Activity, Question, Aula, Aluno } from '../types';
import { aiAPI } from '../lib/api';

interface AIActivityGeneratorProps {
  classes?: Aula[];
  students?: Aluno[];
  studentGroups?: StudentGroup[];
  onActivityCreated?: (activity: Activity) => void;
}

interface StudentGroup {
  id: string;
  name: string;
  studentIds: string[];
  color: string;
}

export const AIActivityGenerator: React.FC<AIActivityGeneratorProps> = ({
  classes = [],
  students = [],
  studentGroups = [],
  onActivityCreated
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [manualDescription, setManualDescription] = useState('');
  const [inputMode, setInputMode] = useState<'class' | 'manual'>('class');
  const [generatedActivity, setGeneratedActivity] = useState<Activity | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'review' | 'history'>('generate');
  const [activityHistory, setActivityHistory] = useState<Activity[]>([]);

  // Opções de envio
  const [sendTo, setSendTo] = useState<'specific' | 'group' | 'all'>('specific');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const completedClasses = classes.filter(c => c.status === 'completed');

  const handleGenerate = async () => {
    if (inputMode === 'class' && !selectedClass) {
      toast.error('Selecione uma aula ou escreva uma descrição');
      return;
    }

    if (inputMode === 'manual' && !manualDescription.trim()) {
      toast.error('Escreva uma descrição da aula');
      return;
    }

    const selectedClassData = inputMode === 'class'
      ? completedClasses.find(c => c._id === selectedClass)
      : null;

    const lessonTopic = inputMode === 'manual'
      ? manualDescription
      : selectedClassData?.title || 'Tópico da aula';

    const lessonSubject = inputMode === 'manual'
      ? 'Matéria geral'
      : selectedClassData?.subject || 'Matéria';

    setIsGenerating(true);
    toast.loading('IA analisando e gerando atividades...', { id: 'generating' });

    try {
      const lessonDescription = inputMode === 'manual'
        ? ''
        : (selectedClassData as any)?.notes || (selectedClassData as any)?.description || '';

      const result = await aiAPI.generateActivity({ lessonTopic, lessonSubject, lessonDescription });

      if (!result || !result.questions || result.questions.length === 0) {
        toast.error('IA não configurada ou sem resposta. Configure GEMINI_API_KEY no servidor.', { id: 'generating' });
        return;
      }

      const questions: Question[] = result.questions;

      const activity: Activity = {
        _id: `activity_${Date.now()}`,
        class: selectedClass || 'manual_' + Date.now(),
        student: selectedStudents[0] || '',
        teacher: '',
        title: `Atividade: ${lessonTopic}`,
        description: inputMode === 'manual'
          ? `Atividade gerada a partir da descrição: "${manualDescription}"`
          : `Atividade gerada automaticamente pela IA com base na aula.`,
        type: 'exercise',
        questions,
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
        status: 'draft',
        submissions: [],
        generatedByAI: true,
        aiMetadata: {
          sourceTranscript: inputMode === 'manual' ? manualDescription : 'Transcrição da aula',
          topics: [lessonSubject],
          generatedAt: new Date().toISOString(),
          reviewed: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setGeneratedActivity(activity);
      toast.success('Atividade gerada com sucesso! Revise e escolha para quem enviar.', { id: 'generating' });
      setActiveTab('review');
    } catch (error: unknown) {
      const msg = error instanceof Error && error.message
        ? error.message
        : 'Erro ao gerar atividade. Verifique a configuração da IA.';
      toast.error(msg, { id: 'generating' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = (questionNumber: number) => {
    if (!generatedActivity) return;

    const updatedQuestions = generatedActivity.questions
      .filter(q => q.questionNumber !== questionNumber)
      .map((q, index) => ({ ...q, questionNumber: index + 1 }));

    setGeneratedActivity({
      ...generatedActivity,
      questions: updatedQuestions,
      totalPoints: updatedQuestions.reduce((sum, q) => sum + q.points, 0)
    });

    toast.success('Questão removida');
  };

  const getRecipientsText = () => {
    if (sendTo === 'all') return 'Todos os alunos';
    if (sendTo === 'group') {
      const group = studentGroups.find(g => g.id === selectedGroup);
      return group ? `Grupo: ${group.name}` : 'Selecione um grupo';
    }
    if (selectedStudents.length === 0) return 'Selecione aluno(s)';
    if (selectedStudents.length === 1) {
      const student = students.find(s => s._id === selectedStudents[0]);
      return student?.name || '1 aluno';
    }
    return `${selectedStudents.length} alunos selecionados`;
  };

  const handlePublishActivity = () => {
    if (!generatedActivity) return;

    if (sendTo === 'specific' && selectedStudents.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }

    if (sendTo === 'group' && !selectedGroup) {
      toast.error('Selecione um grupo');
      return;
    }

    const publishedActivity = {
      ...generatedActivity,
      status: 'published' as const,
      aiMetadata: generatedActivity.aiMetadata ? {
        ...generatedActivity.aiMetadata,
        reviewed: true,
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'teacher_demo'
      } : undefined
    };

    setActivityHistory([publishedActivity, ...activityHistory]);
    if (onActivityCreated) onActivityCreated(publishedActivity);

    toast.success(`Atividade publicada e enviada para: ${getRecipientsText()}!`, { duration: 4000 });
    setGeneratedActivity(null);
    setSelectedClass('');
    setManualDescription('');
    setSelectedStudents([]);
    setSelectedGroup('');
    setActiveTab('history');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400 bg-green-900/30 border-green-700';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      case 'hard':
        return 'text-red-400 bg-red-900/30 border-red-700';
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return '📝';
      case 'essay':
        return '✍️';
      case 'true_false':
        return '✓✗';
      case 'fill_blank':
        return '___';
      default:
        return '❓';
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2 flex items-center gap-3">
          <Wand2 size={36} />
          Gerador Automático de Atividades com IA
        </h1>
        <p className="text-gray-400 dark:text-gray-300">Crie atividades personalizadas em segundos - a partir de uma aula ou descrição livre</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {(['generate', 'review', 'history'] as const).map(tab => {
          const Icon = tab === 'generate' ? Sparkles : tab === 'review' ? Eye : FileText;
          const label = tab === 'generate' ? 'Gerar Nova' : tab === 'review' ? 'Revisar & Enviar' : 'Histórico';
          const disabled = tab === 'review' && !generatedActivity;

          return (
            <button
              key={tab}
              onClick={() => !disabled && setActiveTab(tab)}
              disabled={disabled}
              className={`px-4 py-3 font-medium border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-400'
                  : 'border-transparent text-gray-400 dark:text-gray-400 hover:text-gray-200 dark:hover:text-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} />
                {label}
              </div>
            </button>
          );
        })}
      </div>

      {/* GERAR NOVA */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* Seletor de Modo de Input */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Brain className="text-indigo-400" />
              Como você quer gerar a atividade?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setInputMode('class')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  inputMode === 'class'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                <div className="text-4xl mb-3">📚</div>
                <h4 className="font-bold text-lg mb-2">A partir de uma Aula</h4>
                <p className="text-sm text-gray-400 dark:text-gray-300">Escolha uma aula concluída e a IA analisa o relatório completo</p>
              </button>

              <button
                onClick={() => setInputMode('manual')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  inputMode === 'manual'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                <div className="text-4xl mb-3">✍️</div>
                <h4 className="font-bold text-lg mb-2">Descrição Livre</h4>
                <p className="text-sm text-gray-400 dark:text-gray-300">Escreva o que foi abordado e a IA cria as questões</p>
              </button>
            </div>

            {/* Input baseado no modo selecionado */}
            {inputMode === 'class' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 dark:text-gray-200 mb-2">
                  Escolha uma aula concluída
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione uma aula...</option>
                  {completedClasses.map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.title} - {cls.studentName} ({new Date(cls.scheduledAt).toLocaleDateString('pt-BR')})
                    </option>
                  ))}
                </select>
                {completedClasses.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-400">⚠️ Nenhuma aula concluída. Use o modo "Descrição Livre".</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 dark:text-gray-200 mb-2">
                  Descreva o que foi ensinado na aula
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Ex: Ensinei equações do segundo grau, explicando a fórmula de Bhaskara, delta, e resolvi 5 exemplos práticos..."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-300">
                  Dica: Quanto mais detalhes, melhor a qualidade das questões geradas
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || (inputMode === 'class' && !selectedClass) || (inputMode === 'manual' && !manualDescription.trim())}
              className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Wand2 size={24} />
                  Gerar Atividade Automaticamente
                </>
              )}
            </button>

            <div className="mt-6 bg-indigo-900/20 border border-indigo-700 rounded-lg p-4">
              <p className="font-semibold text-indigo-300 mb-2">🤖 Como Funciona:</p>
              <ul className="space-y-2 text-sm text-gray-300 dark:text-gray-200">
                <li>✓ IA analisa o conteúdo (transcrição ou descrição)</li>
                <li>✓ Identifica os principais conceitos e tópicos</li>
                <li>✓ Gera 5-7 questões variadas (múltipla escolha, dissertativas, V/F)</li>
                <li>✓ Cria gabarito automático com explicações detalhadas</li>
                <li>✓ Você revisa, edita e escolhe para quem enviar</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* REVISAR & ENVIAR */}
      {activeTab === 'review' && generatedActivity && (
        <div className="space-y-6">
          {/* Header da Atividade */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">{generatedActivity.title}</h3>
                <p className="text-gray-400 dark:text-gray-300 mt-1">{generatedActivity.description}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-indigo-400">{generatedActivity.totalPoints}</p>
                <p className="text-sm text-gray-400 dark:text-gray-300">pontos totais</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="px-3 py-1 bg-indigo-900/50 border border-indigo-700 rounded-full">
                📝 {generatedActivity.questions.length} questões
              </span>
              <span className="px-3 py-1 bg-green-900/50 border border-green-700 rounded-full">
                🤖 Gerado por IA
              </span>
              <span className="px-3 py-1 bg-yellow-900/50 border border-yellow-700 rounded-full">
                ⏱️ Aguardando envio
              </span>
            </div>
          </div>

          {/* Seletor de Destinatários */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="text-indigo-400" />
              Para quem você quer enviar?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setSendTo('specific')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  sendTo === 'specific'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                <User className="mx-auto mb-2 text-indigo-400" size={32} />
                <h4 className="font-bold">Aluno(s) Específico(s)</h4>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Escolha individualmente</p>
              </button>

              <button
                onClick={() => setSendTo('group')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  sendTo === 'group'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                <Users className="mx-auto mb-2 text-purple-400" size={32} />
                <h4 className="font-bold">Grupo de Alunos</h4>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Enviar para um grupo</p>
              </button>

              <button
                onClick={() => setSendTo('all')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  sendTo === 'all'
                    ? 'border-indigo-500 bg-indigo-900/30'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                }`}
              >
                <Globe className="mx-auto mb-2 text-cyan-400" size={32} />
                <h4 className="font-bold">Todos os Alunos</h4>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Envio em massa</p>
              </button>
            </div>

            {/* Seleção baseada no modo */}
            {sendTo === 'specific' && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {students.map(student => (
                  <label
                    key={student._id}
                    className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id || '')}
                      onChange={() => toggleStudentSelection(student._id || '')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-300">{student.grade}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {sendTo === 'group' && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione um grupo...</option>
                {studentGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.studentIds.length} alunos)
                  </option>
                ))}
              </select>
            )}

            {sendTo === 'all' && (
              <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
                <p className="text-cyan-300 font-medium">
                  📢 Esta atividade será enviada para TODOS os {students.length} alunos cadastrados
                </p>
              </div>
            )}

            <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-700 rounded-lg">
              <p className="text-sm text-indigo-300">
                <strong>Destinatários:</strong> {getRecipientsText()}
              </p>
            </div>
          </div>

          {/* Questões */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Questões Geradas</h3>
            {generatedActivity.questions.map((question) => (
              <div key={question.questionNumber} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-indigo-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      {question.questionNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getTypeIcon(question.type)}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty === 'easy' ? 'Fácil' : question.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-300">{question.points} pontos</span>
                      </div>
                      <p className="text-lg font-medium">{question.question}</p>

                      {question.type === 'multiple_choice' && question.options && (
                        <div className="mt-4 space-y-2">
                          {question.options.map(option => (
                            <div
                              key={option.letter}
                              className={`p-3 rounded-lg border ${
                                option.isCorrect
                                  ? 'bg-green-900/30 border-green-700'
                                  : 'bg-slate-700/50 border-slate-600'
                              }`}
                            >
                              <span className="font-semibold mr-2">{option.letter})</span>
                              {option.text}
                              {option.isCorrect && <CheckCircle className="inline ml-2 text-green-400" size={16} />}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'true_false' && (
                        <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                          <p className="font-semibold">✅ Resposta correta: {question.correctAnswer}</p>
                        </div>
                      )}

                      {question.type === 'fill_blank' && (
                        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                          <p className="font-semibold">Resposta esperada: {question.correctAnswer}</p>
                        </div>
                      )}

                      {question.explanation && (
                        <div className="mt-4 p-3 bg-slate-700/30 border border-slate-600 rounded-lg">
                          <p className="text-sm text-gray-300 dark:text-gray-200">
                            <strong className="text-indigo-400">Explicação:</strong> {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(question.questionNumber)}
                    className="ml-4 p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition"
                    title="Remover questão"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('generate')}
              className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
            >
              ← Voltar e Gerar Outra
            </button>
            <button
              onClick={handlePublishActivity}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition"
            >
              <Send size={24} />
              Publicar e Enviar
            </button>
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold mb-4">Histórico de Atividades</h3>

          {activityHistory.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <FileText size={64} className="mx-auto text-gray-600 dark:text-gray-500 mb-4" />
              <p className="text-gray-400 dark:text-gray-300 text-lg">Nenhuma atividade publicada ainda</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">As atividades que você criar aparecerão aqui</p>
            </div>
          ) : (
            activityHistory.map((activity, index) => (
              <div key={index} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-xl font-bold">{activity.title}</h4>
                    <p className="text-gray-400 dark:text-gray-300 mt-1">{activity.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      <span className="px-3 py-1 bg-green-900/50 border border-green-700 rounded-full">
                        ✅ Publicada
                      </span>
                      <span className="text-gray-400 dark:text-gray-300">
                        {activity.questions.length} questões • {activity.totalPoints} pontos
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 dark:text-gray-300">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR') : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString('pt-BR') : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AIActivityGenerator;
