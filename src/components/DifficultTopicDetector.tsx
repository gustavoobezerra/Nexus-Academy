import { useState } from 'react';
import { AlertTriangle, Loader, CheckCircle } from 'lucide-react';

interface DifficultTopic {
  topic: string;
  severity: 'low' | 'medium' | 'high';
  indicators: string[];
  suggestedResources: string[];
  segment: string;
}

interface DifficultTopicDetectorProps {
  transcript: string;
  subject?: string;
  onTopicsDetected?: (topics: DifficultTopic[]) => void;
}

const DifficultTopicDetector = ({
  transcript,
  subject = 'Geral',
  onTopicsDetected
}: DifficultTopicDetectorProps) => {
  const [detectedTopics, setDetectedTopics] = useState<DifficultTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const analyzeTranscript = () => {
    if (!transcript || transcript.trim().length === 0) {
      return;
    }

    setLoading(true);

    const lowercaseTranscript = transcript.toLowerCase();
    const topics: DifficultTopic[] = [];

    const problematicPatterns = [
      { word: 'difícil', topic: 'Conceito Complexo', severity: 'high' as const },
      { word: 'não entendo', topic: 'Incompreensão', severity: 'high' as const },
      { word: 'confuso', topic: 'Ambiguidade Conceitual', severity: 'medium' as const },
      { word: 'por quê', topic: 'Falta de Justificativa', severity: 'medium' as const },
      { word: 'como é que', topic: 'Falta de Clareza', severity: 'medium' as const },
      { word: 'não sei', topic: 'Lacuna de Conhecimento', severity: 'high' as const },
      { word: 'poderia explicar novamente', topic: 'Necessidade de Reforço', severity: 'medium' as const },
      { word: 'erramos', topic: 'Erro Conceitual', severity: 'high' as const },
    ];

    problematicPatterns.forEach(({ word, topic, severity }) => {
      if (lowercaseTranscript.includes(word)) {
        const index = lowercaseTranscript.indexOf(word);
        const segment = transcript.substring(
          Math.max(0, index - 50),
          Math.min(transcript.length, index + 100)
        );

        const existingTopic = topics.find(t => t.topic === topic);
        if (!existingTopic) {
          topics.push({
            topic,
            severity,
            indicators: [word],
            suggestedResources: generateSuggestedResources(topic, subject),
            segment: segment.trim()
          });
        } else {
          existingTopic.indicators.push(word);
        }
      }
    });

    setDetectedTopics(topics);
    setAnalyzed(true);

    if (onTopicsDetected) {
      onTopicsDetected(topics);
    }

    setTimeout(() => setLoading(false), 1000);
  };

  const generateSuggestedResources = (topic: string, subject: string): string[] => {
    const resources: { [key: string]: string[] } = {
      'Conceito Complexo': [
        `Vídeo: Explicação Avançada de ${subject}`,
        'Artigo com exemplos práticos',
        'Estude analogias do conceito'
      ],
      'Incompreensão': [
        'Revisão dos conceitos fundamentais',
        'Exercícios básicos com passo a passo',
        'Aula particular ou reforço'
      ],
      'Ambiguidade Conceitual': [
        'Comparar com conceitos similares',
        'Estudar diferenças claras',
        'Analisar exemplos contrastantes'
      ],
      'Falta de Justificativa': [
        'Estudar o fundamento histórico',
        'Análise de por quê funciona assim',
        'Explorar aplicações práticas'
      ],
      'Falta de Clareza': [
        'Pedir exemplos específicos',
        'Usar diagramas e visualizações',
        'Relacionar com conceitos já conhecidos'
      ],
      'Lacuna de Conhecimento': [
        'Retornar aos pré-requisitos',
        'Aula introdutória completa',
        'Material de apoio em PDF'
      ],
      'Necessidade de Reforço': [
        'Exercícios repetidos',
        'Mais tempo de prática',
        'Discussão em grupo'
      ],
      'Erro Conceitual': [
        'Identificar e corrigir o erro',
        'Entender a origem do erro',
        'Exercícios para consolidar o correto'
      ]
    };

    return resources[topic] || [
      'Material de apoio disponível',
      'Consulte o professor',
      'Revisão necessária'
    ];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-900/30 border-red-700 text-red-300';
      case 'medium':
        return 'bg-amber-900/30 border-amber-700 text-amber-300';
      case 'low':
        return 'bg-blue-900/30 border-blue-700 text-blue-300';
      default:
        return 'bg-slate-700 border-slate-600 text-gray-300';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Crítico';
      case 'medium':
        return 'Moderado';
      case 'low':
        return 'Leve';
      default:
        return severity;
    }
  };

  if (!analyzed) {
    return (
      <button
        onClick={analyzeTranscript}
        disabled={loading || !transcript}
        className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="animate-spin" size={16} />
            Analisando transcrição...
          </>
        ) : (
          <>
            <AlertTriangle size={16} />
            Detectar Tópicos Difíceis
          </>
        )}
      </button>
    );
  }

  if (detectedTopics.length === 0) {
    return (
      <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
        <div>
          <p className="font-semibold text-emerald-300">Nenhum tópico difícil detectado!</p>
          <p className="text-sm text-emerald-200">A aula foi bem compreendida pelos alunos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle size={20} />
          Tópicos Identificados como Difíceis ({detectedTopics.length})
        </h3>
        <button
          onClick={analyzeTranscript}
          className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 transition-all"
        >
          Re-analisar
        </button>
      </div>

      {detectedTopics.map((item, index) => (
        <div key={index} className={`rounded-lg p-4 border ${getSeverityColor(item.severity)}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold">{item.topic}</h4>
              <p className="text-xs opacity-75 mt-1">
                Severidade: <span className="font-bold">{getSeverityLabel(item.severity)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold opacity-75 mb-1">Indicadores encontrados:</p>
              <div className="flex flex-wrap gap-1">
                {item.indicators.map((indicator, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-black/20 rounded"
                  >
                    "{indicator}"
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold opacity-75 mb-1">Contexto na transcrição:</p>
              <p className="text-xs italic opacity-75 bg-black/20 rounded p-2 border-l-2">
                "...{item.segment}..."
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold opacity-75 mb-2">Recursos sugeridos:</p>
              <ul className="space-y-1">
                {item.suggestedResources.map((resource, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    <span className="opacity-50 mt-0.5">•</span>
                    <span>{resource}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="font-semibold text-blue-400 mb-2">Recomendação</h4>
        <p className="text-sm text-blue-200">
          Preparar aulas de reforço focadas em {detectedTopics.map(t => `"${t.topic}"`).join(', ')}
          . Considere revisar esses conceitos na próxima aula.
        </p>
      </div>
    </div>
  );
};

export default DifficultTopicDetector;
