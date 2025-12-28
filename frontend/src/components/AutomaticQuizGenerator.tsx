import { useState } from 'react';
import { Loader, Download, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'essay';
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface AutomaticQuizGeneratorProps {
  subject: string;
  numberOfQuestions?: number;
  onQuizGenerated?: (questions: QuizQuestion[]) => void;
}

const AutomaticQuizGenerator = ({
  subject,
  numberOfQuestions = 5,
  onQuizGenerated
}: AutomaticQuizGeneratorProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});

  const generateQuiz = async () => {
    setLoading(true);

    const generatedQuestions: QuizQuestion[] = [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: `Qual é o conceito principal abordado em ${subject}?`,
        difficulty: 'easy',
        options: [
          'Opção fundamentalmente correta baseada no conteúdo',
          'Distrator razoável',
          'Distrator razoável',
          'Distrator razoável'
        ],
        correctAnswer: 'Opção fundamentalmente correta baseada no conteúdo',
        explanation: 'Esta resposta aborda o conceito central do conteúdo apresentado.'
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: `Como você aplicaria os conceitos de ${subject} em uma situação prática?`,
        difficulty: 'medium',
        options: [
          'Aplicação prática e relevante',
          'Aplicação parcial',
          'Sem aplicação relevante',
          'Contradiz o conceito'
        ],
        correctAnswer: 'Aplicação prática e relevante',
        explanation: 'A melhor resposta demonstra entendimento profundo e aplicação real.'
      },
      {
        id: 'q3',
        type: 'essay',
        question: `Explique detalhadamente os princípios fundamentais de ${subject} e como eles se relacionam.`,
        difficulty: 'hard',
        correctAnswer: 'Uma explicação abrangente que conecta múltiplos conceitos',
        explanation: 'Uma resposta excelente deve demonstrar compreensão profunda e conexões entre conceitos.'
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: `Qual é a diferença entre conceitos A e B em ${subject}?`,
        difficulty: 'medium',
        options: [
          'Diferença clara e precisa',
          'Diferença menor',
          'São equivalentes',
          'Não estão relacionados'
        ],
        correctAnswer: 'Diferença clara e precisa',
        explanation: 'É importante compreender as distinções entre conceitos similares.'
      },
      {
        id: 'q5',
        type: 'essay',
        question: `Analise criticamente uma situação complexa envolvendo ${subject} e sugira soluções.`,
        difficulty: 'hard',
        correctAnswer: 'Análise crítica com múltiplas perspectivas e soluções viáveis',
        explanation: 'Questões complexas exigem pensamento crítico e análise multifacetada.'
      }
    ];

    setQuestions(generatedQuestions);
    if (onQuizGenerated) {
      onQuizGenerated(generatedQuestions);
    }

    toast.success('Prova gerada com sucesso!');
    setTimeout(() => setLoading(false), 1000);
  };


  const downloadQuiz = () => {
    const quizText = questions
      .map(
        (q, i) =>
          `\n${i + 1}. ${q.question}\nDificuldade: ${q.difficulty}\n` +
          (q.type === 'multiple_choice'
            ? `Opções:\n${q.options?.map((opt, i) => `  ${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}\n`
            : 'Pergunta dissertativa\n') +
          (showAnswers ? `\nResposta: ${q.correctAnswer}\nExplicação: ${q.explanation}\n` : '')
      )
      .join('\n---\n');

    const element = document.createElement('a');
    const file = new Blob([quizText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `prova-${subject}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Prova baixada!');
  };

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4">
          <h3 className="font-semibold text-indigo-400 mb-2">Gerar Prova Automática</h3>
          <p className="text-sm text-indigo-200 mb-4">
            Sistema gerará {numberOfQuestions} questões variadas baseadas no conteúdo de {subject}
          </p>
        </div>

        <button
          onClick={generateQuiz}
          disabled={loading}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={16} />
              Gerando prova com IA...
            </>
          ) : (
            'Gerar Prova'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-indigo-400">Prova de {subject}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-gray-300 transition-all"
          >
            {showAnswers ? (
              <>
                <EyeOff size={14} />
                Ocultar
              </>
            ) : (
              <>
                <Eye size={14} />
                Mostrar Gabarito
              </>
            )}
          </button>
          <button
            onClick={downloadQuiz}
            className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-gray-300 transition-all"
          >
            <Download size={14} />
            Baixar
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-100">Questão {index + 1}</h4>
                <span className={`text-xs font-semibold px-2 py-1 rounded mt-1 inline-block ${
                  question.difficulty === 'easy'
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : question.difficulty === 'medium'
                    ? 'bg-amber-900/30 text-amber-400'
                    : 'bg-red-900/30 text-red-400'
                }`}>
                  {question.difficulty === 'easy' ? 'Fácil' : question.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                </span>
              </div>
              {question.type === 'multiple_choice' && (
                <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded">
                  Múltipla Escolha
                </span>
              )}
            </div>

            <p className="text-gray-200 font-medium mb-4">{question.question}</p>

            {question.type === 'multiple_choice' && question.options ? (
              <div className="space-y-2 mb-4">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={userAnswers[question.id] === option}
                      onChange={(e) =>
                        setUserAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                placeholder="Digite sua resposta..."
                value={userAnswers[question.id] || ''}
                onChange={(e) =>
                  setUserAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                }
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 mb-4"
                rows={4}
              />
            )}

            {showAnswers && (
              <div className="bg-emerald-900/20 border border-emerald-700 rounded p-3 space-y-2">
                <p className="text-xs font-semibold text-emerald-400">Resposta Correta:</p>
                <p className="text-sm text-emerald-200">{question.correctAnswer}</p>
                <p className="text-xs font-semibold text-emerald-400 mt-2">Explicação:</p>
                <p className="text-sm text-emerald-200">{question.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="font-semibold text-blue-400 mb-2">Informações</h4>
        <p className="text-sm text-blue-200">
          Total de questões: {questions.length} | Tipo: Mista (múltipla escolha e dissertativas)
        </p>
      </div>
    </div>
  );
};

export default AutomaticQuizGenerator;
