import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, CheckCircle, TrendingUp, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Aluno, Aula, SmartScheduleSuggestion } from '../types';

interface SmartSchedulingProps {
  students?: Aluno[];
  classes?: Aula[];
  onClassScheduled?: (classData: Partial<Aula>) => void;
}

export const SmartScheduling: React.FC<SmartSchedulingProps> = ({ students = [], classes = [], onClassScheduled }) => {
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SmartScheduleSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classTitle, setClassTitle] = useState('');
  const [duration, setDuration] = useState(60);

  const generateSuggestions = () => {
    if (!selectedStudent) {
      toast.error('Selecione um aluno primeiro');
      return;
    }

    setIsAnalyzing(true);
    toast.loading('IA analisando melhores horários...', { id: 'analyzing' });

    // Simular análise de IA
    setTimeout(() => {
      const studentClasses = classes.filter(c => c.studentId === selectedStudent);

      // Analisar histórico de horários
      const hourFrequency: { [key: number]: number } = {};
      const dayFrequency: { [key: number]: number } = {};

      studentClasses.forEach(cls => {
        const date = new Date(cls.scheduledAt);
        const hour = date.getHours();
        const day = date.getDay();

        hourFrequency[hour] = (hourFrequency[hour] || 0) + 1;
        dayFrequency[day] = (dayFrequency[day] || 0) + 1;
      });

      // Encontrar horários preferidos
      const preferredHours = Object.entries(hourFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      const preferredDays = Object.entries(dayFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([day]) => parseInt(day));

      // Gerar sugestões inteligentes
      const mockSuggestions: SmartScheduleSuggestion[] = [];
      const today = new Date();

      // Próximos 14 dias
      for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        const dayOfWeek = date.getDay();

        // Pular finais de semana
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Usar horários preferidos ou padrões
        const hours = preferredHours.length > 0 ? preferredHours : [14, 16, 18];

        hours.forEach(hour => {
          const suggestionDate = new Date(date);
          suggestionDate.setHours(hour, 0, 0, 0);

          // Verificar conflitos
          const hasConflict = classes.some(cls => {
            const clsDate = new Date(cls.scheduledAt);
            return Math.abs(clsDate.getTime() - suggestionDate.getTime()) < 60 * 60 * 1000; // 1 hora
          });

          if (!hasConflict) {
            const isPreferredDay = preferredDays.includes(dayOfWeek);
            const isPreferredHour = preferredHours.includes(hour);

            let score = 50;
            let reasons = [];

            if (isPreferredDay) {
              score += 20;
              reasons.push('Dia da semana habitual do aluno');
            }

            if (isPreferredHour) {
              score += 20;
              reasons.push('Horário preferido do aluno');
            }

            // Priorizar dias úteis do meio da semana
            if (dayOfWeek >= 2 && dayOfWeek <= 4) {
              score += 10;
              reasons.push('Meio da semana (melhor performance)');
            }

            mockSuggestions.push({
              date: suggestionDate.toISOString().split('T')[0],
              time: `${hour.toString().padStart(2, '0')}:00`,
              score,
              reason: reasons.length > 0 ? reasons.join(', ') : 'Horário disponível',
              conflicts: [],
              studentPreference: isPreferredHour || isPreferredDay,
              teacherAvailability: true
            });
          }
        });
      }

      // Ordenar por score e pegar top 10
      const topSuggestions = mockSuggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setSuggestions(topSuggestions);
      setIsAnalyzing(false);
      toast.success('Análise concluída! Veja as melhores opções abaixo.', { id: 'analyzing' });
    }, 1500);
  };

  const scheduleClass = (suggestion: SmartScheduleSuggestion) => {
    if (!classTitle) {
      toast.error('Defina um título para a aula');
      return;
    }

    const student = students.find(s => s._id === selectedStudent);
    if (!student) return;

    const scheduledDateTime = new Date(`${suggestion.date}T${suggestion.time}`);

    const newClass: Partial<Aula> = {
      title: classTitle,
      studentId: selectedStudent,
      studentName: student.name,
      subject: classTitle.split(' - ')[0] || 'Matéria',
      grade: student.grade,
      scheduledAt: scheduledDateTime.toISOString(),
      duration,
      status: 'scheduled',
      isLive: false
    };

    if (onClassScheduled) onClassScheduled(newClass);

    toast.success(`Aula agendada para ${new Date(scheduledDateTime).toLocaleDateString('pt-BR')} às ${suggestion.time}`);

    // Limpar
    setClassTitle('');
    setSelectedStudent('');
    setSuggestions([]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-900/30 border-green-700';
    if (score >= 60) return 'text-blue-400 bg-blue-900/30 border-blue-700';
    if (score >= 40) return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
    return 'text-gray-400 bg-gray-900/30 border-gray-700';
  };

  const getDayName = (dateString: string) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00');
    return days[date.getDay()];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-400 mb-2 flex items-center gap-3">
          <Sparkles size={36} />
          Agendamento Inteligente
        </h1>
        <p className="text-gray-400">IA sugere os melhores horários baseado no histórico e preferências do aluno</p>
      </div>

      {/* Formulário */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Brain className="text-cyan-400" />
          Configurar Nova Aula
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Aluno</label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  setSuggestions([]);
                }}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Selecione um aluno...</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} - {student.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duração (minutos)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1 hora e 30 min</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Título da Aula</label>
            <input
              type="text"
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
              placeholder="Ex: Matemática - Equações do 2º Grau"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <button
            onClick={generateSuggestions}
            disabled={!selectedStudent || isAnalyzing}
            className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analisando Horários...
              </>
            ) : (
              <>
                <Sparkles size={24} />
                Gerar Sugestões Inteligentes
              </>
            )}
          </button>
        </div>

        <div className="mt-6 bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
          <p className="font-semibold text-cyan-300 mb-2">🤖 Como Funciona:</p>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>✓ Analisa histórico de aulas do aluno</li>
            <li>✓ Identifica dias e horários preferidos</li>
            <li>✓ Verifica conflitos na agenda</li>
            <li>✓ Sugere os 10 melhores horários com score de compatibilidade</li>
            <li>✓ Agende com 1 clique!</li>
          </ul>
        </div>
      </div>

      {/* Sugestões */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-cyan-400" />
            Top {suggestions.length} Sugestões (Ordenadas por Score)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`border rounded-xl p-5 transition-all hover:scale-105 cursor-pointer ${
                  index === 0
                    ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-600 ring-2 ring-green-500'
                    : index === 1
                    ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-600'
                    : 'bg-slate-800 border-slate-700'
                }`}
                onClick={() => scheduleClass(suggestion)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {index === 0 && <span className="text-2xl">🥇</span>}
                      {index === 1 && <span className="text-2xl">🥈</span>}
                      {index === 2 && <span className="text-2xl">🥉</span>}
                      <h4 className="text-lg font-bold">
                        {getDayName(suggestion.date)}, {new Date(suggestion.date).toLocaleDateString('pt-BR')}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-cyan-400" />
                      <span className="text-xl font-semibold">{suggestion.time}</span>
                      <span className="text-sm text-gray-400">({duration} min)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`px-3 py-2 rounded-lg border font-bold text-lg ${getScoreColor(suggestion.score)}`}>
                      {suggestion.score}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Score</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-300 mb-1">💡 Por que este horário?</p>
                    <p className="text-xs text-gray-400">{suggestion.reason}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestion.studentPreference && (
                      <span className="px-2 py-1 text-xs bg-purple-900/50 border border-purple-700 rounded text-purple-300">
                        ⭐ Preferência do Aluno
                      </span>
                    )}
                    {suggestion.teacherAvailability && (
                      <span className="px-2 py-1 text-xs bg-green-900/50 border border-green-700 rounded text-green-300">
                        ✓ Professor Disponível
                      </span>
                    )}
                    {suggestion.conflicts.length === 0 && (
                      <span className="px-2 py-1 text-xs bg-blue-900/50 border border-blue-700 rounded text-blue-300">
                        ✓ Sem Conflitos
                      </span>
                    )}
                  </div>
                </div>

                <button
                  disabled={!classTitle}
                  className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Agendar Neste Horário
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !isAnalyzing && selectedStudent && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Calendar size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">Clique em "Gerar Sugestões Inteligentes" para ver os melhores horários</p>
        </div>
      )}
    </div>
  );
};

export default SmartScheduling;
