import { Check } from 'lucide-react';

interface DifficultySelectorProps {
  value: string;
  onSelect: (difficulty: string) => void;
}

const difficulties = [
  { value: 'beginner', label: 'A1 - Beginner', description: 'Frases simples e básicas', color: 'bg-green-100 border-green-300 text-green-800' },
  { value: 'elementary', label: 'A2 - Elementary', description: 'Conversação cotidiana', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { value: 'intermediate', label: 'B1 - Intermediate', description: 'Situações do dia a dia', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { value: 'upper-intermediate', label: 'B2 - Upper Intermediate', description: 'Discussões complexas', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { value: 'advanced', label: 'C1 - Advanced', description: 'Fluência avançada', color: 'bg-red-100 border-red-300 text-red-800' },
  { value: 'proficient', label: 'C2 - Proficient', description: 'Nível nativo', color: 'bg-purple-100 border-purple-300 text-purple-800' }
];

export function DifficultySelector({ value, onSelect }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {difficulties.map((difficulty) => (
        <button
          key={difficulty.value}
          onClick={() => onSelect(difficulty.value)}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200
            ${value === difficulty.value 
              ? `${difficulty.color} ring-2 ring-offset-2 ring-indigo-500 scale-105` 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
            }
          `}
        >
          {value === difficulty.value && (
            <div className="absolute top-2 right-2">
              <Check size={20} className="text-indigo-600" />
            </div>
          )}
          <div className="text-left">
            <p className="font-bold text-sm">{difficulty.label}</p>
            <p className="text-xs opacity-75 mt-1">{difficulty.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
