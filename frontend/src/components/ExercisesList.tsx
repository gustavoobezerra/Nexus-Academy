import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Exercise } from '../types';

interface ExercisesListProps {
  exercises: Exercise[];
  onSubmitAnswer?: (exerciseId: string, answer: string) => void;
}

const ExercisesList = ({ exercises, onSubmitAnswer }: ExercisesListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState<{ [key: string]: boolean }>({});

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-900/30 border-emerald-700 text-emerald-400';
      case 'medium':
        return 'bg-amber-900/30 border-amber-700 text-amber-400';
      case 'hard':
        return 'bg-red-900/30 border-red-700 text-red-400';
      default:
        return 'bg-slate-700 border-slate-600 text-gray-300';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Médio';
      case 'hard':
        return 'Difícil';
      default:
        return difficulty;
    }
  };

  const handleSubmitAnswer = (exerciseId: string) => {
    const answer = userAnswers[exerciseId];
    if (!answer || answer.trim().length === 0) {
      toast.error('Escreva uma resposta primeiro');
      return;
    }

    if (onSubmitAnswer) {
      onSubmitAnswer(exerciseId, answer);
    }

    setSubmitted((prev) => ({ ...prev, [exerciseId]: true }));
    toast.success('Resposta enviada para revisão!');
  };

  const handleResetAnswer = (exerciseId: string) => {
    setUserAnswers((prev) => ({ ...prev, [exerciseId]: '' }));
    setSubmitted((prev) => ({ ...prev, [exerciseId]: false }));
  };

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => (
        <div
          key={exercise.id}
          className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-all"
        >
          <button
            onClick={() =>
              setExpandedId(expandedId === exercise.id ? null : exercise.id)
            }
            className="w-full p-4 flex items-start justify-between gap-4 hover:bg-slate-750 transition-colors text-left"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-gray-500">
                  Exercício {index + 1}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded border ${getDifficultyColor(
                    exercise.difficulty
                  )}`}
                >
                  {getDifficultyLabel(exercise.difficulty)}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-gray-100">
                {exercise.question}
              </h4>
              {submitted[exercise.id] && (
                <div className="flex items-center gap-2 mt-2 text-emerald-400 text-xs">
                  <CheckCircle size={14} />
                  Resposta enviada
                </div>
              )}
            </div>
            {expandedId === exercise.id ? (
              <ChevronUp size={20} className="text-cyan-400 flex-shrink-0 mt-1" />
            ) : (
              <ChevronDown size={20} className="text-gray-500 flex-shrink-0 mt-1" />
            )}
          </button>

          {expandedId === exercise.id && (
            <div className="border-t border-slate-700 p-4 space-y-4 bg-slate-900/50">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Sua Resposta
                </label>
                <textarea
                  value={userAnswers[exercise.id] || ''}
                  onChange={(e) =>
                    setUserAnswers((prev) => ({
                      ...prev,
                      [exercise.id]: e.target.value,
                    }))
                  }
                  disabled={submitted[exercise.id]}
                  placeholder="Escreva sua resposta aqui..."
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmitAnswer(exercise.id)}
                  disabled={submitted[exercise.id]}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-sm font-medium rounded transition-all"
                >
                  Enviar Resposta
                </button>
                {submitted[exercise.id] && (
                  <button
                    onClick={() => handleResetAnswer(exercise.id)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 text-sm font-medium rounded transition-all"
                  >
                    Tentar Novamente
                  </button>
                )}
              </div>

              {exercise.answer && (
                <div className="bg-slate-800 border border-slate-600 rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-cyan-400 uppercase">
                    Resposta Esperada
                  </p>
                  <p className="text-sm text-gray-300">{exercise.answer}</p>
                </div>
              )}

              {exercise.explanation && (
                <div className="bg-amber-900/20 border border-amber-700 rounded p-3">
                  <p className="text-xs font-semibold text-amber-400 uppercase mb-2">
                    Explicação
                  </p>
                  <p className="text-sm text-amber-100">{exercise.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ExercisesList;
