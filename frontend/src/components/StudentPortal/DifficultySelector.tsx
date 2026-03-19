import { Check } from 'lucide-react';

interface DifficultySelectorProps {
  value: string;
  onSelect: (difficulty: string) => void;
}

const difficulties = [
  { value: 'beginner', label: 'A1 - Beginner', description: 'Frases simples e básicas', accent: 'border-emerald-400/45 bg-emerald-500/12 text-emerald-100' },
  { value: 'elementary', label: 'A2 - Elementary', description: 'Conversação cotidiana', accent: 'border-sky-400/45 bg-sky-500/12 text-sky-100' },
  { value: 'intermediate', label: 'B1 - Intermediate', description: 'Situações do dia a dia', accent: 'border-amber-400/45 bg-amber-500/12 text-amber-100' },
  { value: 'upper-intermediate', label: 'B2 - Upper Intermediate', description: 'Discussões complexas', accent: 'border-orange-400/45 bg-orange-500/12 text-orange-100' },
  { value: 'advanced', label: 'C1 - Advanced', description: 'Fluência avançada', accent: 'border-rose-400/45 bg-rose-500/12 text-rose-100' },
  { value: 'proficient', label: 'C2 - Proficient', description: 'Nível nativo', accent: 'border-violet-400/45 bg-violet-500/12 text-violet-100' }
];

export function DifficultySelector({ value, onSelect }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {difficulties.map((difficulty) => (
        <button
          key={difficulty.value}
          onClick={() => onSelect(difficulty.value)}
          className={`
            relative min-h-[86px] p-4 rounded-2xl border transition-all duration-200
            ${value === difficulty.value 
              ? `${difficulty.accent} shadow-[0_16px_36px_rgba(15,23,42,0.22)] ring-1 ring-white/30`
              : 'border-slate-700 bg-slate-950/65 text-slate-200 hover:border-slate-500 hover:bg-slate-900/80'
            }
          `}
        >
          {value === difficulty.value && (
            <div className="absolute top-2 right-2">
              <Check size={20} className="text-white" />
            </div>
          )}
          <div className="text-left">
            <p className="font-bold text-sm">{difficulty.label}</p>
            <p className={`text-xs mt-1 ${value === difficulty.value ? 'opacity-90' : 'text-slate-400'}`}>{difficulty.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
