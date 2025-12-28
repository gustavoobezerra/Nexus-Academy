import { TrendingUp, Award, Target, AlertCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface PerformanceData {
  studentName: string;
  studentId: string;
  totalClasses: number;
  averageScore: number;
  correctAnswers: number;
  totalAnswers: number;
  participation: number;
  strengths: string[];
  weaknesses: string[];
  progressData: Array<{ week: string; score: number }>;
  recommendations: string[];
  status: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

interface StudentPerformanceReportProps {
  data: PerformanceData;
}

const StudentPerformanceReport = ({ data }: StudentPerformanceReportProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-900/20 border-emerald-700 text-emerald-400';
      case 'good':
        return 'bg-blue-900/20 border-blue-700 text-blue-400';
      case 'average':
        return 'bg-amber-900/20 border-amber-700 text-amber-400';
      case 'needs_improvement':
        return 'bg-red-900/20 border-red-700 text-red-400';
      default:
        return 'bg-slate-700 border-slate-600 text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'Excelente';
      case 'good':
        return 'Bom';
      case 'average':
        return 'Mediano';
      case 'needs_improvement':
        return 'Necessita Melhorias';
      default:
        return status;
    }
  };

  const accuracyPercentage = data.totalAnswers > 0
    ? Math.round((data.correctAnswers / data.totalAnswers) * 100)
    : 0;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-indigo-400">{data.studentName}</h2>
          <p className="text-sm text-gray-400 mt-1">ID: {data.studentId}</p>
        </div>
        <div className={`rounded-lg px-4 py-2 border font-semibold ${getStatusColor(data.status)}`}>
          {getStatusLabel(data.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricBox
          icon={<Target className="text-cyan-400" size={20} />}
          label="Score Médio"
          value={`${data.averageScore}%`}
          color="cyan"
        />
        <MetricBox
          icon={<Award className="text-emerald-400" size={20} />}
          label="Taxa de Acerto"
          value={`${accuracyPercentage}%`}
          color="emerald"
        />
        <MetricBox
          icon={<TrendingUp className="text-amber-400" size={20} />}
          label="Participação"
          value={`${data.participation}%`}
          color="amber"
        />
        <MetricBox
          icon={<Target className="text-indigo-400" size={20} />}
          label="Aulas Frequentadas"
          value={data.totalClasses}
          color="indigo"
        />
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="font-semibold text-cyan-400 mb-4">Evolução de Desempenho</h3>
        {data.progressData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="week" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
                labelStyle={{ color: '#E5E7EB' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#06B6D4"
                dot={{ fill: '#06B6D4', r: 4 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-8">Dados insuficientes para gráfico</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-400 mb-3">Pontos Fortes</h4>
          <ul className="space-y-2">
            {data.strengths.length > 0 ? (
              data.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-emerald-200 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  {strength}
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-400">Nenhum ponto forte identificado ainda</p>
            )}
          </ul>
        </div>

        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
          <h4 className="font-semibold text-amber-400 mb-3">Áreas a Melhorar</h4>
          <ul className="space-y-2">
            {data.weaknesses.length > 0 ? (
              data.weaknesses.map((weakness, i) => (
                <li key={i} className="text-sm text-amber-200 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">⚠</span>
                  {weakness}
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-400">Excelente em todas as áreas!</p>
            )}
          </ul>
        </div>
      </div>

      {data.recommendations.length > 0 && (
        <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-400 mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Recomendações
          </h4>
          <ul className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-indigo-200 flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm text-gray-400">
        <p>
          <span className="text-gray-300 font-semibold">Próximas Ações:</span> Agendar atendimento individual, preparar exercícios personalizados e enviar feedback detalhado aos responsáveis.
        </p>
      </div>
    </div>
  );
};

function MetricBox({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses = {
    cyan: 'bg-cyan-900/20 border-cyan-700',
    emerald: 'bg-emerald-900/20 border-emerald-700',
    amber: 'bg-amber-900/20 border-amber-700',
    indigo: 'bg-indigo-900/20 border-indigo-700'
  };

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-100">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

export default StudentPerformanceReport;
