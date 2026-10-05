import { useState } from 'react';
import { ThumbsUp, Lightbulb, AlertCircle } from 'lucide-react';

interface FeedbackItem {
  isCorrect: boolean;
  score: number;
  message: string;
  tips: string[];
  commonMistakes: string[];
  nextSteps: string[];
}

interface AnswerFeedbackProps {
  answer: string;
  expectedAnswer: string;
  questionDifficulty: 'easy' | 'medium' | 'hard';
  onFeedback?: (feedback: FeedbackItem) => void;
}

const AnswerFeedback = ({ answer, expectedAnswer, onFeedback }: AnswerFeedbackProps) => {
  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [loading, setLoading] = useState(false);

  const generateFeedback = async () => {
    setLoading(true);

    const answerLength = answer.trim().length;
    const hasKeywords = expectedAnswer.toLowerCase().split(' ').filter(w => w.length > 4)
      .some(keyword => answer.toLowerCase().includes(keyword));

    const baseScore = hasKeywords ? 70 : 40;
    const lengthBonus = Math.min(answerLength / 100, 20);
    const score = Math.min(baseScore + lengthBonus, 100);

    const feedbackData: FeedbackItem = {
      isCorrect: score >= 70,
      score: Math.round(score),
      message: score >= 70
        ? '✓ Ótima resposta! Você demonstrou bom entendimento.'
        : '⚠ Sua resposta precisa de melhorias. Veja as dicas abaixo.',
      tips: [
        'Leia a pergunta com atenção e identifique o que está sendo pedido',
        'Use termos técnicos corretos do conteúdo abordado',
        'Estruture sua resposta de forma clara e organizada',
        'Forneça exemplos práticos quando possível'
      ],
      commonMistakes: [
        'Não abordar todos os aspectos da pergunta',
        'Confundir conceitos similares',
        'Respostas muito genéricas sem especificidade',
        'Falta de argumentos ou justificativas'
      ],
      nextSteps: [
        'Revise o material da aula relacionado a este tópico',
        'Faça exercícios similares para praticar',
        'Tire dúvidas com o professor em aulas futuras',
        'Estude exemplos do mundo real do conceito'
      ]
    };

    setFeedback(feedbackData);
    if (onFeedback) {
      onFeedback(feedbackData);
    }

    setTimeout(() => setLoading(false), 800);
  };

  if (!feedback) {
    return (
      <button
        onClick={generateFeedback}
        disabled={loading}
        className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-medium rounded transition-all"
      >
        {loading ? 'Gerando feedback...' : 'Gerar Feedback com IA'}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border-2 ${
        feedback.isCorrect
          ? 'bg-emerald-900/20 border-emerald-600'
          : 'bg-amber-900/20 border-amber-600'
      }`}>
        <div className="flex items-start gap-3">
          {feedback.isCorrect ? (
            <ThumbsUp className="text-emerald-400 flex-shrink-0 mt-1" size={20} />
          ) : (
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-1" size={20} />
          )}
          <div>
            <p className={`font-semibold ${feedback.isCorrect ? 'text-emerald-300' : 'text-amber-300'}`}>
              {feedback.message}
            </p>
            <p className={`text-sm mt-1 ${feedback.isCorrect ? 'text-emerald-200' : 'text-amber-200'}`}>
              Pontuação: <span className="font-bold">{feedback.score}%</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h4 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
          <Lightbulb size={16} />
          Dicas para Melhorar
        </h4>
        <ul className="space-y-2">
          {feedback.tips.map((tip, i) => (
            <li key={i} className="text-sm text-gray-300 flex gap-2">
              <span className="text-cyan-400">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <h4 className="font-semibold text-red-400 mb-2">Erros Comuns</h4>
          <ul className="space-y-1">
            {feedback.commonMistakes.map((mistake, i) => (
              <li key={i} className="text-xs text-red-200">✗ {mistake}</li>
            ))}
          </ul>
        </div>

        <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-400 mb-2">Próximos Passos</h4>
          <ul className="space-y-1">
            {feedback.nextSteps.map((step, i) => (
              <li key={i} className="text-xs text-emerald-200">✓ {step}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnswerFeedback;
