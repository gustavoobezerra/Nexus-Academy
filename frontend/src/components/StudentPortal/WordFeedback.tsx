import { Volume2 } from 'lucide-react';
import { useState } from 'react';

interface WordFeedbackProps {
  word: string;
  score: number;
  phonetic?: string;
  onSpeak: () => void;
}

export function WordFeedback({ word, score, phonetic, onSpeak }: WordFeedbackProps) {
  const [showPhonetic, setShowPhonetic] = useState(false);

  // Determinar cor baseada no score
  const getColorClass = () => {
    if (score >= 0.85) return 'bg-green-500 text-white border-green-600';
    if (score >= 0.65) return 'bg-yellow-400 text-slate-900 border-yellow-500';
    return 'bg-red-500 text-white border-red-600';
  };

  const getScoreLabel = () => {
    if (score >= 0.85) return 'Excelente';
    if (score >= 0.65) return 'Bom';
    return 'Precisa melhorar';
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowPhonetic(true)}
      onMouseLeave={() => setShowPhonetic(false)}
    >
      <div
        className={`
          px-3 py-2 rounded-lg border-2 font-medium transition-all duration-200
          hover:scale-105 cursor-pointer
          ${getColorClass()}
        `}
      >
        <div className="flex items-center gap-2">
          <span>{word}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpeak();
            }}
            className="p-1 hover:bg-white/20 rounded transition"
            title="Ouvir palavra"
          >
            <Volume2 size={14} />
          </button>
        </div>
      </div>

      {/* Tooltip com fonética */}
      {showPhonetic && phonetic && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="font-mono">{phonetic}</div>
            <div className="text-slate-300 mt-1">{getScoreLabel()}: {Math.round(score * 100)}%</div>
            {/* Seta do tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
