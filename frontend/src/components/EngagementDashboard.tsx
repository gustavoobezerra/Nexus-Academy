import { Users, MessageSquare, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EngagementMetric {
  participantName: string;
  messages: number;
  questions: number;
  participation: number;
  correctAnswers: number;
}

interface DifficultTopic {
  topic: string;
  mentions: number;
  context: string;
}

interface EngagementDashboardProps {
  classTitle: string;
  participants: EngagementMetric[];
  difficultyTopics: DifficultTopic[];
  averageAttention: number;
  sessionDuration: number;
}

const EngagementDashboard = ({
  classTitle,
  participants,
  difficultyTopics,
  averageAttention,
  sessionDuration
}: EngagementDashboardProps) => {
  const totalParticipants = participants.length;
  const avgParticipation = participants.length > 0
    ? Math.round(participants.reduce((sum, p) => sum + p.participation, 0) / participants.length)
    : 0;
  const totalQuestions = participants.reduce((sum, p) => sum + p.questions, 0);
  const totalCorrectAnswers = participants.reduce((sum, p) => sum + p.correctAnswers, 0);

  const engagementData = participants.map(p => ({
    name: p.participantName.split(' ')[0],
    participação: p.participation,
    respostas: p.correctAnswers
  }));

  const difficultyData = difficultyTopics.map(t => ({
    name: t.topic,
    mentions: t.mentions || 0
  }));

  const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-xl border border-slate-700">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-400 mb-2">{classTitle}</h1>
        <p className="text-gray-400 text-sm">Análise de Engajamento e Desempenho</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="text-cyan-400" size={20} />}
          label="Total de Participantes"
          value={totalParticipants}
          color="cyan"
        />
        <MetricCard
          icon={<TrendingUp className="text-emerald-400" size={20} />}
          label="Participação Média"
          value={`${avgParticipation}%`}
          color="emerald"
        />
        <MetricCard
          icon={<MessageSquare className="text-amber-400" size={20} />}
          label="Perguntas Feitas"
          value={totalQuestions}
          color="amber"
        />
        <MetricCard
          icon={<BarChart3 className="text-indigo-400" size={20} />}
          label="Atenção Média"
          value={`${averageAttention}%`}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Engajamento por Aluno</h3>
          {participants.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Legend />
                <Bar dataKey="participação" fill="#06B6D4" />
                <Bar dataKey="respostas" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Nenhum dado de engajamento</p>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Tópicos Difíceis</h3>
          {difficultyTopics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: unknown) => `${props.name}: ${props.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="mentions"
                >
                  {difficultyData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Nenhum tópico difícil identificado</p>
          )}
        </div>
      </div>

      {difficultyTopics.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <AlertCircle size={20} />
            Recomendações de Reforço
          </h3>
          <ul className="space-y-2">
            {difficultyTopics.map((topic, i) => (
              <li key={i} className="text-sm text-amber-100">
                <span className="font-semibold">• {topic.topic}:</span> Detectado em {topic.mentions} momento(s)
                <p className="text-xs text-amber-200 ml-4 mt-1">"{topic.context}"</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h4 className="font-semibold text-gray-300 mb-3">Resumo de Desempenho</h4>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Duração: <span className="text-gray-200 font-medium">{sessionDuration} minutos</span>
            </p>
            <p className="text-sm text-gray-400">
              Taxa de Acerto: <span className="text-emerald-400 font-medium">{totalParticipants > 0 ? Math.round((totalCorrectAnswers / Math.max(totalParticipants, 1)) * 100) : 0}%</span>
            </p>
            <p className="text-sm text-gray-400">
              Questões por Aluno: <span className="text-cyan-400 font-medium">{totalParticipants > 0 ? (totalQuestions / totalParticipants).toFixed(1) : 0}</span>
            </p>
          </div>
        </div>

        <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-400 mb-3">Próximas Ações</h4>
          <ul className="space-y-2 text-sm text-indigo-100">
            <li>✓ Enviar resumo da aula aos alunos</li>
            <li>✓ Preparar exercícios extras para tópicos difíceis</li>
            <li>✓ Enviar feedback personalizado</li>
            <li>✓ Agendar reforço individual se necessário</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

function MetricCard({
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

export default EngagementDashboard;
