import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, BookOpen, Clock, Brain,
  ChevronRight, ChevronLeft, Check, Sparkles,
  Lightbulb, Rocket
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FadeIn, SlideIn } from '../ui/Animations';
import { portalAPI } from '../../lib/api';

interface OnboardingData {
  learningPurpose: string;
  currentLevel: string;
  targetTimeframe: string;
  studyHoursPerWeek: number;
  preferredSchedule: string;
  learningStyle: string;
  previousExperience: string;
  mainChallenges: string[];
  specificGoals: string[];
  initialGoals: { title: string; description: string; targetDate: string }[];
}

const STEPS = [
  { id: 'purpose', title: 'Seu Objetivo', icon: Target },
  { id: 'level', title: 'Seu Nível', icon: BookOpen },
  { id: 'time', title: 'Disponibilidade', icon: Clock },
  { id: 'style', title: 'Como Você Aprende', icon: Brain },
  { id: 'challenges', title: 'Desafios', icon: Lightbulb },
  { id: 'goals', title: 'Suas Metas', icon: Rocket }
];

const LEVELS = [
  { id: 'beginner', label: 'Iniciante', description: 'Estou começando do zero' },
  { id: 'elementary', label: 'Básico', description: 'Sei algumas palavras e frases simples' },
  { id: 'intermediate', label: 'Intermediário', description: 'Consigo manter conversas simples' },
  { id: 'upper_intermediate', label: 'Intermediário-Avançado', description: 'Converso bem, mas preciso melhorar' },
  { id: 'advanced', label: 'Avançado', description: 'Sou fluente mas quero aperfeiçoar' },
  { id: 'fluent', label: 'Fluente', description: 'Domino bem, quero manter prática' }
];

const SCHEDULES = [
  { id: 'morning', label: 'Manhã', icon: '🌅', description: '6h às 12h' },
  { id: 'afternoon', label: 'Tarde', icon: '☀️', description: '12h às 18h' },
  { id: 'evening', label: 'Noite', icon: '🌙', description: '18h às 23h' },
  { id: 'flexible', label: 'Flexível', icon: '⏰', description: 'Qualquer horário' }
];

const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual', description: 'Aprendo melhor vendo vídeos, imagens e diagramas', icon: '👁️' },
  { id: 'auditory', label: 'Auditivo', description: 'Aprendo melhor ouvindo áudios e conversando', icon: '👂' },
  { id: 'reading', label: 'Leitura/Escrita', description: 'Prefiro ler e escrever para fixar', icon: '📖' },
  { id: 'kinesthetic', label: 'Prático', description: 'Aprendo fazendo exercícios e praticando', icon: '✋' },
  { id: 'mixed', label: 'Misto', description: 'Gosto de combinar diferentes métodos', icon: '🎯' }
];

const CHALLENGES = [
  'Vocabulário limitado',
  'Gramática confusa',
  'Dificuldade para ouvir/entender',
  'Vergonha de falar',
  'Falta de tempo para estudar',
  'Falta de motivação',
  'Dificuldade com pronúncia',
  'Esqueço o que aprendo rápido'
];

const PURPOSE_OPTIONS = [
  'Trabalho/Carreira',
  'Viagens',
  'Estudos acadêmicos',
  'Consumir entretenimento (filmes, séries, músicas)',
  'Comunicação com familiares/amigos',
  'Crescimento pessoal',
  'Preparação para exames/certificações',
  'Outro'
];

export const StudentOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    learningPurpose: '',
    currentLevel: '',
    targetTimeframe: '',
    studyHoursPerWeek: 0,
    preferredSchedule: '',
    learningStyle: '',
    previousExperience: '',
    mainChallenges: [],
    specificGoals: [],
    initialGoals: []
  });
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');

  const updateData = (field: keyof OnboardingData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleChallenge = (challenge: string) => {
    setData(prev => ({
      ...prev,
      mainChallenges: prev.mainChallenges.includes(challenge)
        ? prev.mainChallenges.filter(c => c !== challenge)
        : [...prev.mainChallenges, challenge]
    }));
  };

  const addGoal = () => {
    if (newGoalTitle.trim() && data.initialGoals.length < 5) {
      setData(prev => ({
        ...prev,
        initialGoals: [...prev.initialGoals, {
          title: newGoalTitle.trim(),
          description: '',
          targetDate: ''
        }]
      }));
      setNewGoalTitle('');
    }
  };

  const removeGoal = (index: number) => {
    setData(prev => ({
      ...prev,
      initialGoals: prev.initialGoals.filter((_, i) => i !== index)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.learningPurpose || customPurpose;
      case 1: return data.currentLevel;
      case 2: return data.preferredSchedule && data.studyHoursPerWeek > 0;
      case 3: return data.learningStyle;
      case 4: return true; // Challenges são opcionais
      case 5: return true; // Goals podem ser adicionados depois
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    const finalData = {
      ...data,
      learningPurpose: data.learningPurpose === 'Outro' ? customPurpose : data.learningPurpose
    };

    try {
      // Usar a nova API centralizada com tratamento de erros automático
      await portalAPI.completeOnboarding(finalData);

      toast.success('Perfil configurado com sucesso!');

      // Marcar onboarding como completo no localStorage também
      localStorage.setItem('onboarding_completed', 'true');

      navigate('/portal/dashboard');
    } catch (error: unknown) {
      console.error('[Onboarding] ❌ Erro:', error);
      console.error('[Onboarding] Tipo de erro:', error?.type);
      console.error('[Onboarding] Detalhes:', error?.response || error?.message);

      // Se for erro de rede, oferecer modo offline
      if (error?.type === 'network' || error?.code === 'NETWORK_ERROR') {
        toast.error('Sem conexão com o servidor. Verifique se o backend está rodando.', {
          duration: 6000
        });

        // Fallback: Salvar localmente e permitir continuar
        localStorage.setItem('onboarding_data', JSON.stringify(finalData));
        localStorage.setItem('onboarding_completed', 'true');

        toast.success('Dados salvos localmente. Você pode continuar!', {
          duration: 4000
        });

        setTimeout(() => navigate('/portal/dashboard'), 2000);
      } else {
        // Outros erros
        const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao salvar configurações';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Purpose
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Por que você quer aprender inglês?</h2>
              <p className="text-slate-400">Selecione seu principal objetivo</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PURPOSE_OPTIONS.map(purpose => (
                <button
                  key={purpose}
                  onClick={() => updateData('learningPurpose', purpose)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    data.learningPurpose === purpose
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {purpose}
                </button>
              ))}
            </div>
            {data.learningPurpose === 'Outro' && (
              <input
                type="text"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="Descreva seu objetivo..."
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>
        );

      case 1: // Level
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Qual é o seu nível atual?</h2>
              <p className="text-slate-400">Seja honesto para personalizarmos seu aprendizado</p>
            </div>
            <div className="space-y-3">
              {LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => updateData('currentLevel', level.id)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    data.currentLevel === level.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{level.label}</p>
                      <p className="text-sm text-slate-400">{level.description}</p>
                    </div>
                    {data.currentLevel === level.id && (
                      <Check className="text-indigo-400" size={24} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2: // Time
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Qual sua disponibilidade?</h2>
              <p className="text-slate-400">Isso nos ajuda a planejar suas aulas</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-4">
                Melhor horário para estudar
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SCHEDULES.map(schedule => (
                  <button
                    key={schedule.id}
                    onClick={() => updateData('preferredSchedule', schedule.id)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      data.preferredSchedule === schedule.id
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-4">
                Quantas horas por semana você pode dedicar?
              </label>
              <div className="flex items-center gap-6">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={data.studyHoursPerWeek}
                  onChange={(e) => updateData('studyHoursPerWeek', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="min-w-[80px] text-center">
                  <span className="text-3xl font-bold text-indigo-400">{data.studyHoursPerWeek}</span>
                  <span className="text-slate-400 text-sm block">horas/semana</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-4">
                Em quanto tempo deseja alcançar seu objetivo?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['3 meses', '6 meses', '1 ano', '2+ anos'].map(time => (
                  <button
                    key={time}
                    onClick={() => updateData('targetTimeframe', time)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      data.targetTimeframe === time
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Learning Style
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Como você aprende melhor?</h2>
              <p className="text-slate-400">Vamos adaptar o conteúdo ao seu estilo</p>
            </div>
            <div className="space-y-4">
              {LEARNING_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => updateData('learningStyle', style.id)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    data.learningStyle === style.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{style.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{style.label}</p>
                      <p className="text-sm text-slate-400">{style.description}</p>
                    </div>
                    {data.learningStyle === style.id && (
                      <Check className="text-indigo-400" size={24} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Você já estudou inglês antes? (opcional)
              </label>
              <textarea
                value={data.previousExperience}
                onChange={(e) => updateData('previousExperience', e.target.value)}
                placeholder="Ex: Estudei 2 anos na escola, fiz um curso online, etc..."
                rows={3}
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        );

      case 4: // Challenges
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Quais são suas maiores dificuldades?</h2>
              <p className="text-slate-400">Selecione todas que se aplicam</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHALLENGES.map(challenge => (
                <button
                  key={challenge}
                  onClick={() => toggleChallenge(challenge)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    data.mainChallenges.includes(challenge)
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    data.mainChallenges.includes(challenge)
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-slate-600'
                  }`}>
                    {data.mainChallenges.includes(challenge) && (
                      <Check size={14} className="text-white" />
                    )}
                  </div>
                  <span className="text-slate-200">{challenge}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 5: // Goals
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Defina suas metas pessoais</h2>
              <p className="text-slate-400">Adicione até 5 metas para acompanhar seu progresso</p>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                placeholder="Ex: Conseguir assistir séries sem legenda"
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                disabled={data.initialGoals.length >= 5}
              />
              <button
                onClick={addGoal}
                disabled={!newGoalTitle.trim() || data.initialGoals.length >= 5}
                className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
              >
                Adicionar
              </button>
            </div>

            {data.initialGoals.length > 0 && (
              <div className="space-y-3 mt-6">
                {data.initialGoals.map((goal, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                        <Target size={16} className="text-indigo-400" />
                      </div>
                      <span className="text-white font-medium">{goal.title}</span>
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

            {data.initialGoals.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Target size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhuma meta adicionada ainda</p>
                <p className="text-sm">Você pode adicionar metas depois também!</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <FadeIn duration={0.6}>
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center ${
                      index <= currentStep ? 'text-indigo-400' : 'text-slate-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      index < currentStep
                        ? 'bg-indigo-500 text-white'
                        : index === currentStep
                        ? 'bg-indigo-500/20 border-2 border-indigo-500'
                        : 'bg-slate-800 border-2 border-slate-700'
                    }`}>
                      {index < currentStep ? (
                        <Check size={20} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>
                    <span className="text-xs font-medium hidden md:block">{step.title}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content Card */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8">
            <SlideIn key={currentStep} direction="right" duration={0.4}>
              {renderStepContent()}
            </SlideIn>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
                Voltar
              </button>

              <button
                onClick={nextStep}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  <>
                    <Sparkles size={20} />
                    Começar minha jornada!
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
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
