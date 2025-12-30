import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Lightbulb, Shield, Activity, BookOpen } from 'lucide-react';
import type { AIAnalysis, Aluno, Aula, Pagamento, EvasionRisk, AIInsight, AIRecommendation } from '../types';
import toast from 'react-hot-toast';

interface AIInsightsDashboardProps {
  students?: Aluno[];
  classes?: Aula[];
  payments?: Pagamento[];
}

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({ students = [], classes = [], payments = [] }) => {
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'evasion' | 'performance' | 'recommendations'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Gerar análises mock para todos os alunos
    const mockAnalyses: AIAnalysis[] = students.map(student => {
      const studentClasses = classes.filter(c => c.studentId === student._id);
      const completedClasses = studentClasses.filter(c => c.status === 'completed');
      const studentPayments = payments.filter(p => p.studentId === student._id);
      const latePayments = studentPayments.filter(p => p.status === 'late' || p.status === 'overdue');

      // Calcular risco de evasão
      const lastClass = completedClasses.sort((a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      )[0];

      const daysInactive = lastClass
        ? Math.floor((new Date().getTime() - new Date(lastClass.scheduledAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let evasionScore = 0;
      const factors: any[] = [];

      // Fator: Inatividade
      if (daysInactive > 30) {
        evasionScore += 30;
        factors.push({
          factor: 'high_inactivity',
          weight: 30,
          description: `${daysInactive} dias sem aula`
        });
      } else if (daysInactive > 14) {
        evasionScore += 15;
        factors.push({
          factor: 'medium_inactivity',
          weight: 15,
          description: `${daysInactive} dias sem aula`
        });
      }

      // Fator: Pagamentos atrasados
      if (latePayments.length >= 2) {
        evasionScore += 25;
        factors.push({
          factor: 'late_payments',
          weight: 25,
          description: `${latePayments.length} pagamentos atrasados`
        });
      } else if (latePayments.length > 0) {
        evasionScore += 10;
        factors.push({
          factor: 'late_payment',
          weight: 10,
          description: `${latePayments.length} pagamento atrasado`
        });
      }

      // Fator: Frequência reduzida
      const classesLastMonth = studentClasses.filter(c => {
        const daysSince = Math.floor((new Date().getTime() - new Date(c.scheduledAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 30;
      }).length;

      const classesPreviousMonth = studentClasses.filter(c => {
        const daysSince = Math.floor((new Date().getTime() - new Date(c.scheduledAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 30 && daysSince <= 60;
      }).length;

      if (classesPreviousMonth > 0 && classesLastMonth < classesPreviousMonth * 0.5) {
        evasionScore += 20;
        factors.push({
          factor: 'frequency_reduction',
          weight: 20,
          description: `Redução de ${classesPreviousMonth} para ${classesLastMonth} aulas/mês`
        });
      }

      const evasionLevel: 'low' | 'medium' | 'high' | 'critical' =
        evasionScore >= 70 ? 'critical' :
        evasionScore >= 50 ? 'high' :
        evasionScore >= 30 ? 'medium' : 'low';

      const evasionRisk: EvasionRisk = {
        score: evasionScore,
        level: evasionLevel,
        factors,
        lastActivity: lastClass?.scheduledAt,
        daysInactive
      };

      // Gerar insights
      const insights: AIInsight[] = [];

      if (evasionLevel === 'critical' || evasionLevel === 'high') {
        insights.push({
          type: 'threat',
          title: 'Risco Alto de Evasão',
          description: `${student.name} apresenta sinais de que pode abandonar as aulas.`,
          priority: 'urgent',
          actionable: true,
          suggestedAction: 'Entre em contato imediatamente com o responsável para entender a situação.'
        });
      }

      if (latePayments.length > 0) {
        insights.push({
          type: 'weakness',
          title: 'Pagamentos Pendentes',
          description: `Há ${latePayments.length} pagamento(s) em atraso.`,
          priority: latePayments.length >= 2 ? 'high' : 'medium',
          actionable: true,
          suggestedAction: 'Envie lembrete de pagamento via WhatsApp ou email.'
        });
      }

      if (completedClasses.length >= 4 && daysInactive < 7) {
        insights.push({
          type: 'strength',
          title: 'Aluno Engajado',
          description: `${student.name} mantém frequência regular e está ativo.`,
          priority: 'low',
          actionable: false
        });
      }

      // Gerar recomendações
      const recommendations: AIRecommendation[] = [];

      if (evasionLevel === 'high' || evasionLevel === 'critical') {
        recommendations.push({
          category: 'schedule',
          recommendation: 'Agendar reunião com responsável',
          rationale: 'Entender motivos da redução de frequência e possíveis soluções',
          expectedImpact: 'high'
        });
      }

      if (daysInactive > 14) {
        recommendations.push({
          category: 'schedule',
          recommendation: 'Agendar aula de reengajamento',
          rationale: 'Retomar o ritmo de estudos com conteúdo interessante',
          expectedImpact: 'medium'
        });
      }

      if (completedClasses.length >= 5) {
        recommendations.push({
          category: 'content',
          recommendation: 'Introduzir tópicos mais avançados',
          rationale: 'Aluno demonstra consistência, pode estar pronto para desafios maiores',
          expectedImpact: 'medium'
        });
      }

      return {
        _id: `analysis_${student._id}`,
        student: student._id || '',
        studentName: student.name,
        analysisType: 'evasion_risk',
        data: {
          evasionRisk,
          performanceScore: 75,
          performanceTrend: 'stable' as const,
          difficultTopics: []
        },
        insights,
        recommendations,
        confidence: 85,
        processedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };
    });

    setAnalyses(mockAnalyses);
  }, [students, classes, payments]);

  const filteredAnalyses = selectedStudent === 'all'
    ? analyses
    : analyses.filter(a => a.student === selectedStudent);

  const criticalRiskStudents = analyses.filter(a => a.data.evasionRisk?.level === 'critical').length;
  const highRiskStudents = analyses.filter(a => a.data.evasionRisk?.level === 'high').length;
  const totalInsights = analyses.reduce((sum, a) => sum + a.insights.length, 0);
  const urgentActions = analyses.reduce((sum, a) =>
    sum + a.insights.filter(i => i.priority === 'urgent').length, 0
  );

  const runFullAnalysis = () => {
    setIsAnalyzing(true);
    toast.loading('IA analisando todos os alunos...', { id: 'analyzing' });

    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success('Análise concluída! Novos insights disponíveis.', { id: 'analyzing' });
    }, 2000);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-900/30 border-red-700 text-red-400';
      case 'high':
        return 'bg-orange-900/30 border-orange-700 text-orange-400';
      case 'medium':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      case 'low':
        return 'bg-green-900/30 border-green-700 text-green-400';
      default:
        return 'bg-gray-900/30 border-gray-700 text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'high':
        return <AlertTriangle className="text-orange-500" size={20} />;
      case 'medium':
        return <Target className="text-yellow-500" size={20} />;
      case 'low':
        return <Lightbulb className="text-blue-500" size={20} />;
      default:
        return <Lightbulb className="text-gray-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-violet-400 mb-2 flex items-center gap-3">
          <Brain size={36} />
          Dashboard de Insights com IA
        </h1>
        <p className="text-gray-400">Análise preditiva, detecção de riscos e recomendações inteligentes</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-medium">Alunos Analisados</h3>
            <Activity className="text-blue-400" size={24} />
          </div>
          <p className="text-3xl font-bold">{analyses.length}</p>
          <button
            onClick={runFullAnalysis}
            disabled={isAnalyzing}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {isAnalyzing ? 'Analisando...' : 'Atualizar análise'}
          </button>
        </div>

        <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-medium">Risco Crítico</h3>
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-red-400">{criticalRiskStudents + highRiskStudents}</p>
          <p className="text-xs text-gray-500 mt-1">Requerem atenção imediata</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-medium">Insights Gerados</h3>
            <Lightbulb className="text-yellow-400" size={24} />
          </div>
          <p className="text-3xl font-bold">{totalInsights}</p>
          <p className="text-xs text-gray-500 mt-1">Total de descobertas</p>
        </div>

        <div className="bg-orange-900/20 border border-orange-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-medium">Ações Urgentes</h3>
            <Target className="text-orange-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-orange-400">{urgentActions}</p>
          <p className="text-xs text-gray-500 mt-1">Requerem ação imediata</p>
        </div>
      </div>

      {/* Filtro de Aluno */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Filtrar por Aluno</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full md:w-96 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Todos os Alunos</option>
          {students.map(student => (
            <option key={student._id} value={student._id}>
              {student.name} - {student.grade}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700 overflow-x-auto">
        {(['overview', 'evasion', 'performance', 'recommendations'] as const).map(tab => {
          const Icon = tab === 'overview' ? Brain : tab === 'evasion' ? AlertTriangle : tab === 'performance' ? TrendingUp : Lightbulb;
          const label = tab === 'overview' ? 'Visão Geral' : tab === 'evasion' ? 'Risco de Evasão' : tab === 'performance' ? 'Desempenho' : 'Recomendações';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-violet-600 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} />
                {label}
              </div>
            </button>
          );
        })}
      </div>

      {/* VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {filteredAnalyses.map(analysis => (
            <div key={analysis._id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{analysis.studentName}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Análise processada em {new Date(analysis.processedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${
                    getRiskColor(analysis.data.evasionRisk?.level || 'low')
                  }`}>
                    {analysis.data.evasionRisk?.level === 'critical' ? '🔴 Crítico' :
                     analysis.data.evasionRisk?.level === 'high' ? '🟠 Alto' :
                     analysis.data.evasionRisk?.level === 'medium' ? '🟡 Médio' :
                     '🟢 Baixo'} Risco
                  </span>
                  <span className="text-sm text-gray-400">
                    {analysis.confidence}% confiança
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Insights */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb size={16} className="text-yellow-400" />
                    Insights ({analysis.insights.length})
                  </h4>
                  <div className="space-y-2">
                    {analysis.insights.slice(0, 2).map((insight, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          {getPriorityIcon(insight.priority)}
                          <div>
                            <p className="text-sm font-semibold">{insight.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fatores de Risco */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield size={16} className="text-red-400" />
                    Fatores de Risco
                  </h4>
                  <div className="space-y-2">
                    {analysis.data.evasionRisk?.factors.slice(0, 2).map((factor, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm font-semibold">{factor.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Peso: {factor.weight}pts</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recomendações */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target size={16} className="text-green-400" />
                    Recomendações
                  </h4>
                  <div className="space-y-2">
                    {analysis.recommendations.slice(0, 2).map((rec, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm font-semibold">{rec.recommendation}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Impacto: {rec.expectedImpact === 'high' ? 'Alto' : rec.expectedImpact === 'medium' ? 'Médio' : 'Baixo'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredAnalyses.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <Brain size={64} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Nenhuma análise disponível</p>
            </div>
          )}
        </div>
      )}

      {/* RISCO DE EVASÃO */}
      {activeTab === 'evasion' && (
        <div className="space-y-4">
          {filteredAnalyses
            .sort((a, b) => (b.data.evasionRisk?.score || 0) - (a.data.evasionRisk?.score || 0))
            .map(analysis => (
              <div key={analysis._id} className={`border rounded-xl p-6 ${
                analysis.data.evasionRisk?.level === 'critical' ? 'bg-red-900/20 border-red-700' :
                analysis.data.evasionRisk?.level === 'high' ? 'bg-orange-900/20 border-orange-700' :
                analysis.data.evasionRisk?.level === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                'bg-green-900/20 border-green-700'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{analysis.studentName}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Última atividade: {analysis.data.evasionRisk?.daysInactive} dias atrás
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {analysis.data.evasionRisk?.score}
                    </div>
                    <p className="text-sm text-gray-400">Score de Risco</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        (analysis.data.evasionRisk?.score || 0) >= 70 ? 'bg-red-500' :
                        (analysis.data.evasionRisk?.score || 0) >= 50 ? 'bg-orange-500' :
                        (analysis.data.evasionRisk?.score || 0) >= 30 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${analysis.data.evasionRisk?.score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-3">Fatores Contribuintes:</h4>
                    <div className="space-y-2">
                      {analysis.data.evasionRisk?.factors.map((factor, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">{factor.description}</span>
                            <span className="text-sm text-gray-400">{factor.weight}pts</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                              style={{ width: `${(factor.weight / 30) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Ações Recomendadas:</h4>
                    <div className="space-y-2">
                      {analysis.insights
                        .filter(i => i.actionable)
                        .map((insight, idx) => (
                          <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-start gap-2 mb-2">
                              {getPriorityIcon(insight.priority)}
                              <p className="text-sm font-semibold flex-1">{insight.title}</p>
                            </div>
                            {insight.suggestedAction && (
                              <p className="text-xs text-gray-400 ml-7">
                                💡 {insight.suggestedAction}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* DESEMPENHO */}
      {activeTab === 'performance' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Análise de Desempenho</h3>
          <p className="text-gray-400 mb-6">
            Funcionalidade em desenvolvimento. Em breve: análise de notas, tendências, tópicos com dificuldade.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-6 text-center">
              <TrendingUp className="mx-auto mb-3 text-green-400" size={48} />
              <p className="font-semibold">Performance Média</p>
              <p className="text-3xl font-bold text-green-400 mt-2">75%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-6 text-center">
              <BookOpen className="mx-auto mb-3 text-blue-400" size={48} />
              <p className="font-semibold">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">85%</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-6 text-center">
              <Target className="mx-auto mb-3 text-purple-400" size={48} />
              <p className="font-semibold">Metas Atingidas</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">12/15</p>
            </div>
          </div>
        </div>
      )}

      {/* RECOMENDAÇÕES */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {filteredAnalyses.map(analysis => (
            <div key={analysis._id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">{analysis.studentName}</h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-violet-500">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold">{rec.recommendation}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        rec.expectedImpact === 'high' ? 'bg-green-900/50 text-green-400' :
                        rec.expectedImpact === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-900/50 text-gray-400'
                      }`}>
                        Impacto: {rec.expectedImpact === 'high' ? 'Alto' : rec.expectedImpact === 'medium' ? 'Médio' : 'Baixo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{rec.rationale}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-violet-900/50 rounded text-violet-300">
                        {rec.category === 'content' ? '📚 Conteúdo' :
                         rec.category === 'methodology' ? '🎯 Metodologia' :
                         rec.category === 'pacing' ? '⏱️ Ritmo' :
                         rec.category === 'material' ? '📄 Material' :
                         '📅 Agendamento'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIInsightsDashboard;
