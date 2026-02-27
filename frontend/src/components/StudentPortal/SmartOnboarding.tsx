import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, ChevronRight, ChevronLeft, Check, Sparkles,
  BookOpen, Globe, Calculator, Code, Palette, Briefcase, GraduationCap,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FadeIn, SlideIn } from '../ui/Animations';
import { studentOnboardingAPI } from '../../lib/api';

// Tipos
interface Subject {
  name: string;
  icon: string;
  category: string;
  description: string;
}

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  id: string;
  type: 'single-choice' | 'multiple-choice' | 'text' | 'scale';
  question: string;
  options?: QuestionOption[] | string[];
  required?: boolean;
  allowMultiple?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  labels?: { min: string; max: string };
}

interface Questionnaire {
  subject: string;
  icon: string;
  description: string;
  category: string;
  questions: Question[];
}

interface SubjectsByCategory {
  [category: string]: Subject[];
}

// Ícone para categoria
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Idiomas':
      return <Globe className="w-5 h-5" />;
    case 'Exatas':
      return <Calculator className="w-5 h-5" />;
    case 'Programação e Tecnologia':
      return <Code className="w-5 h-5" />;
    case 'Humanas':
      return <BookOpen className="w-5 h-5" />;
    case 'Artes e Criatividade':
      return <Palette className="w-5 h-5" />;
    case 'Profissional e Negócios':
      return <Briefcase className="w-5 h-5" />;
    case 'Preparação para Provas':
      return <GraduationCap className="w-5 h-5" />;
    default:
      return <HelpCircle className="w-5 h-5" />;
  }
};

export const SmartOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectingSubject, setSelectingSubject] = useState<string | null>(null);

  // Estados do fluxo
  const [step, setStep] = useState<'subject' | 'questionnaire' | 'schedule' | 'goals'>('subject');
  const [subjectsByCategory, setSubjectsByCategory] = useState<SubjectsByCategory>({});
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Estados de horário e metas
  const [studyHoursPerWeek, setStudyHoursPerWeek] = useState(5);
  const [preferredSchedule, setPreferredSchedule] = useState<string>('flexible');
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');

  const token = localStorage.getItem('studentToken');

  // Carregar matérias disponíveis
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await studentOnboardingAPI.getSubjects();
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setSubjectsByCategory(data.byCategory);
      } catch (error) {
        console.error('Erro ao carregar matérias:', error);
        // Fallback com dados mockados
        setSubjectsByCategory({
          'Idiomas': [
            { name: 'Inglês', icon: 'EN', category: 'Idiomas', description: 'Aprenda inglês do básico ao avançado' },
            { name: 'Espanhol', icon: 'ES', category: 'Idiomas', description: 'Domine o espanhol para viagens e negócios' },
            { name: 'Francês', icon: 'FR', category: 'Idiomas', description: 'Aprenda o idioma da cultura francesa' },
          ],
          'Exatas': [
            { name: 'Matemática', icon: 'MT', category: 'Exatas', description: 'Álgebra, geometria e cálculo' },
            { name: 'Física', icon: 'FI', category: 'Exatas', description: 'Mecânica, termodinâmica e mais' },
          ],
          'Programação e Tecnologia': [
            { name: 'Programação', icon: 'PR', category: 'Programação e Tecnologia', description: 'Python, JavaScript, Java e mais' },
          ],
          'Preparação para Provas': [
            { name: 'ENEM', icon: 'EN', category: 'Preparação para Provas', description: 'Preparação completa para o ENEM' },
          ],
          'Outros': [
            { name: 'Outros', icon: '?', category: 'Outros', description: 'Outra matéria ou objetivo específico' },
          ]
        });
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Selecionar matéria e carregar questionário
  const handleSelectSubject = async (subject: string) => {
    if (!token) {
      toast.error('Faça login novamente para continuar o onboarding.');
      navigate('/portal/login');
      return;
    }

    if (subject === 'Outros' && !customSubject.trim()) {
      toast.error('Informe a matéria desejada antes de continuar.');
      return;
    }

    setSelectedSubject(subject);
    setSelectingSubject(subject);
    setLoading(true);

    try {
      const data = await studentOnboardingAPI.selectSubject(
        subject,
        subject === 'Outros' ? customSubject : undefined
      );

      if (data.questionnaire) {
        setQuestionnaire(data.questionnaire);
        setStep('questionnaire');
        setCurrentQuestionIndex(0);
        setAnswers({});
      } else {
        toast.error('Erro ao carregar questionário');
      }
    } catch (error) {
      console.error('Erro ao selecionar matéria:', error);
      // Erro já tratado pelo interceptor
    } finally {
      setLoading(false);
      setSelectingSubject(null);
    }
  };

  // Atualizar resposta
  const updateAnswer = (questionId: string, value: string | number | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Toggle para múltipla escolha
  const toggleMultipleChoice = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (current.includes(option)) {
        return { ...prev, [questionId]: current.filter((o: string) => o !== option) };
      }
      return { ...prev, [questionId]: [...current, option] };
    });
  };

  // Verificar se pode avançar
  const canProceed = () => {
    if (!questionnaire) return false;
    const currentQuestion = questionnaire.questions[currentQuestionIndex];
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id] as string | string[] | number | undefined;
    if (currentQuestion.type === 'multiple-choice') {
      return answer && Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined && answer !== '';
  };

  // Avançar para próxima pergunta ou etapa
  const handleNext = () => {
    if (!questionnaire) return;

    if (currentQuestionIndex < questionnaire.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setStep('schedule');
    }
  };

  // Voltar pergunta ou etapa
  const handleBack = () => {
    if (step === 'questionnaire' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (step === 'questionnaire') {
      setStep('subject');
      setQuestionnaire(null);
    } else if (step === 'schedule') {
      setStep('questionnaire');
      if (questionnaire) {
        setCurrentQuestionIndex(questionnaire.questions.length - 1);
      }
    } else if (step === 'goals') {
      setStep('schedule');
    }
  };

  // Adicionar meta
  const addGoal = () => {
    if (newGoal.trim() && goals.length < 5) {
      setGoals(prev => [...prev, newGoal.trim()]);
      setNewGoal('');
    }
  };

  // Remover meta
  const removeGoal = (index: number) => {
    setGoals(prev => prev.filter((_, i) => i !== index));
  };

  // Submeter tudo
  const handleSubmit = async () => {
    setLoading(true);

    try {
      await studentOnboardingAPI.submit({
        subject: selectedSubject === 'Outros' ? customSubject : selectedSubject!,
        answers,
        goals: goals.map(g => ({ title: g })),
        studyHoursPerWeek,
        preferredSchedule
      });

      toast.success('Perfil configurado com sucesso!');
      navigate('/portal/dashboard');
    } catch (error) {
      console.error('Erro no submit:', error);
      // Erro já tratado pelo interceptor
    } finally {
      setLoading(false);
    }
  };

  // Renderizar seleção de matéria
  const renderSubjectSelection = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Qual matéria você veio aprender?
        </h2>
        <p className="text-slate-400">Escolha sua área de interesse principal</p>
      </div>

      {loadingSubjects ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(subjectsByCategory).map(([category, subjects]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4 text-indigo-400">
                {getCategoryIcon(category)}
                <h3 className="text-lg font-semibold">{category}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject.name}
                    onClick={() => {
                      if (subject.name === 'Outros') {
                        setSelectedSubject('Outros');
                        setCustomSubject('');
                        return;
                      }
                      handleSelectSubject(subject.name);
                    }}
                    disabled={loading}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all group hover:scale-[1.02] ${
                      selectedSubject === subject.name
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-indigo-500/50'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-3xl block mb-2">{subject.icon}</span>
                    <p className="font-semibold text-white">{subject.name}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{subject.description}</p>

                    {selectingSubject === subject.name && (
                      <div className="absolute inset-0 rounded-xl bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Campo para matéria customizada */}
          {selectedSubject === 'Outros' && (
            <FadeIn duration={0.3}>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Qual matéria você deseja aprender?
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Ex: Violão, Culinária, Yoga..."
                    className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSelectSubject('Outros')}
                    disabled={!customSubject.trim() || loading}
                    className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      )}
    </div>
  );

  // Renderizar questionário dinâmico
  const renderQuestionnaire = () => {
    if (!questionnaire) return null;
    const question = questionnaire.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questionnaire.questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Header com matéria */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{questionnaire.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{questionnaire.subject}</h3>
            <p className="text-sm text-slate-400">Pergunta {currentQuestionIndex + 1} de {questionnaire.questions.length}</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pergunta atual */}
        <SlideIn key={question.id} direction="right" duration={0.3}>
          <div className="py-6">
            <h2 className="text-2xl font-bold text-white mb-6">{question.question}</h2>

            {/* Single Choice */}
            {question.type === 'single-choice' && question.options && (
              <div className="space-y-3">
                {question.options.map((option, idx) => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  const optionLabel = typeof option === 'string' ? option : option.label;
                  return (
                    <button
                      key={idx}
                      onClick={() => updateAnswer(question.id, optionValue)}
                      className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                        answers[question.id] === optionValue
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{optionLabel}</span>
                        {answers[question.id] === optionValue && (
                          <Check className="text-indigo-400" size={24} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multiple Choice */}
            {question.type === 'multiple-choice' && question.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {question.options.map((option, idx) => {
                  const optionValue = typeof option === 'string' ? option : option;
                  const isSelected = (answers[question.id] || []).includes(optionValue);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleMultipleChoice(question.id, optionValue)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-slate-600'
                      }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-slate-200">{optionValue}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text */}
            {question.type === 'text' && (
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                placeholder={question.placeholder || 'Digite sua resposta...'}
                rows={4}
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
              />
            )}

            {/* Scale */}
            {question.type === 'scale' && (
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <input
                    type="range"
                    min={question.min || 1}
                    max={question.max || 10}
                    step={question.step || 1}
                    value={answers[question.id] || question.min || 1}
                    onChange={(e) => updateAnswer(question.id, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="min-w-[80px] text-center">
                    <span className="text-3xl font-bold text-indigo-400">
                      {answers[question.id] || question.min || 1}
                    </span>
                    {question.unit && (
                      <span className="text-slate-400 text-sm block">{question.unit}</span>
                    )}
                  </div>
                </div>
                {question.labels && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{question.labels.min}</span>
                    <span>{question.labels.max}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </SlideIn>
      </div>
    );
  };

  // Renderizar configuração de horário
  const renderScheduleConfig = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Qual sua disponibilidade?</h2>
        <p className="text-slate-400">Isso nos ajuda a planejar suas aulas</p>
      </div>

      {/* Melhor horário */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-4">
          Melhor horário para estudar
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'morning', label: 'Manhã', icon: 'AM', description: '6h às 12h' },
            { id: 'afternoon', label: 'Tarde', icon: 'PM', description: '12h às 18h' },
            { id: 'evening', label: 'Noite', icon: 'NO', description: '18h às 23h' },
            { id: 'flexible', label: 'Flexível', icon: '--', description: 'Qualquer horário' }
          ].map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => setPreferredSchedule(schedule.id)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                preferredSchedule === schedule.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl block mb-2">{schedule.icon}</span>
              <p className="font-medium text-white">{schedule.label}</p>
              <p className="text-xs text-slate-400">{schedule.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Horas por semana */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-4">
          Quantas horas por semana você pode dedicar?
        </label>
        <div className="flex items-center gap-6">
          <input
            type="range"
            min="1"
            max="20"
            value={studyHoursPerWeek}
            onChange={(e) => setStudyHoursPerWeek(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="min-w-[100px] text-center">
            <span className="text-3xl font-bold text-indigo-400">{studyHoursPerWeek}</span>
            <span className="text-slate-400 text-sm block">horas/semana</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar metas
  const renderGoals = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Defina suas metas pessoais</h2>
        <p className="text-slate-400">Adicione até 5 metas para acompanhar seu progresso</p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addGoal()}
          placeholder="Ex: Conseguir conversar sobre temas cotidianos"
          className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          disabled={goals.length >= 5}
        />
        <button
          onClick={addGoal}
          disabled={!newGoal.trim() || goals.length >= 5}
          className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-500 transition-colors"
        >
          Adicionar
        </button>
      </div>

      {goals.length > 0 && (
        <div className="space-y-3 mt-6">
          {goals.map((goal, index) => (
            <div
              key={index}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <Target size={16} className="text-indigo-400" />
                </div>
                <span className="text-white font-medium">{goal}</span>
              </div>
              <button
                onClick={() => removeGoal(index)}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma meta adicionada ainda</p>
          <p className="text-sm">Você pode adicionar metas depois também!</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <FadeIn duration={0.6}>
          {/* Progress Indicator */}
          <div className="mb-8 flex justify-center gap-2">
            {['subject', 'questionnaire', 'schedule', 'goals'].map((s, i) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-all ${
                  s === step
                    ? 'bg-indigo-500 w-8'
                    : ['subject', 'questionnaire', 'schedule', 'goals'].indexOf(step) > i
                    ? 'bg-indigo-500'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Content Card */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8">
            {step === 'subject' && renderSubjectSelection()}
            {step === 'questionnaire' && renderQuestionnaire()}
            {step === 'schedule' && renderScheduleConfig()}
            {step === 'goals' && renderGoals()}

            {/* Navigation */}
            {step !== 'subject' && (
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                  Voltar
                </button>

                {step === 'questionnaire' && (
                  <button
                    onClick={handleNext}
                    disabled={!canProceed() || loading}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                  >
                    Próximo
                    <ChevronRight size={20} />
                  </button>
                )}

                {step === 'schedule' && (
                  <button
                    onClick={() => setStep('goals')}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all"
                  >
                    Próximo
                    <ChevronRight size={20} />
                  </button>
                )}

                {step === 'goals' && (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Começar minha jornada!
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Skip Option */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/portal/dashboard')}
              className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
            >
              Pular por enquanto e configurar depois
            </button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default SmartOnboarding;
