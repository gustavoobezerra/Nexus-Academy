import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, StopCircle, Volume2, RefreshCw, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DifficultySelector } from './DifficultySelector';
import { WordFeedback } from './WordFeedback';

// Importar a API do portal
// Assumindo que existe um arquivo api.ts ou similar
// Se não existir, você precisará criar as funções de API

type WordScore = {
  word: string;
  score: number;
  phonetic?: string;
};

type AnalysisResult = {
  accuracyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  feedback?: string;
  wordScores: WordScore[];
  mock?: boolean;
};

// Funções de API (você pode mover para um arquivo separado)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('studentToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const generatePronunciationPhrase = async (difficulty: string) => {
  const response = await fetch(`${API_URL}/api/portal/pronunciation/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ difficulty })
  });
  
  if (!response.ok) {
    throw new Error('Erro ao gerar frase');
  }
  
  return await response.json();
};

const analyzePronunciation = async (formData: FormData) => {
  const token = localStorage.getItem('studentToken');
  const response = await fetch(`${API_URL}/api/portal/pronunciation/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Erro ao analisar pronúncia');
  }
  
  return await response.json();
};

const savePronunciationHistory = async (data: unknown) => {
  const response = await fetch(`${API_URL}/api/portal/pronunciation/history`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Erro ao salvar histórico');
  }
  
  return await response.json();
};

export function PronunciationTest() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState('intermediate');
  const [phrase, setPhrase] = useState('');
  const [phraseSource, setPhraseSource] = useState('');
  const [loadingPhrase, setLoadingPhrase] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    handleGeneratePhrase('intermediate');
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Seu navegador não suporta síntese de voz.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleGeneratePhrase = async (level: string) => {
    try {
      setLoadingPhrase(true);
      setAnalysis(null);
      setAudioBlob(null);
      const res = await generatePronunciationPhrase(level);
      const phraseValue = res?.data?.phrase || res?.phrase;
      const sourceValue = res?.data?.source || res?.source || 'fallback';
      setPhrase(phraseValue || 'Practice makes perfect.');
      setPhraseSource(sourceValue);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível gerar a frase. Tente novamente.');
    } finally {
      setLoadingPhrase(false);
    }
  };

  const handleDifficultySelect = (level: string) => {
    setDifficulty(level);
    handleGeneratePhrase(level);
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      toast.success('Gravação iniciada. Fale a frase em voz alta.');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleAnalyze = async () => {
    if (!audioBlob) {
      toast.error('Grave sua pronúncia antes de analisar.');
      return;
    }
    if (!phrase) {
      toast.error('Gere uma frase primeiro.');
      return;
    }
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'pronunciation.webm');
      formData.append('originalPhrase', phrase);

      const res = await analyzePronunciation(formData);
      const result: AnalysisResult = res?.data?.analysis || res?.analysis || res?.data;
      if (!result) {
        toast.error('Resposta inválida da análise.');
        return;
      }
      setAnalysis(result);
      toast.success('Análise concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao analisar pronúncia.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysis || !phrase) {
      toast.error('Nada para salvar. Gere e analise primeiro.');
      return;
    }
    try {
      setSaving(true);
      await savePronunciationHistory({
        phrase,
        difficulty,
        accuracyScore: analysis.accuracyScore,
        fluencyScore: analysis.fluencyScore,
        pronunciationScore: analysis.pronunciationScore,
        feedback: analysis.feedback,
        wordScores: analysis.wordScores
      });
      toast.success('Resultado salvo e enviado ao professor.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar resultado.');
    } finally {
      setSaving(false);
    }
  };

  const wordScores = analysis?.wordScores || phrase.split(/\s+/).filter(Boolean).map((word) => ({
    word,
    score: 0.75,
    phonetic: undefined
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Treinamento de Pronúncia com IA</p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Pronunciation Test</h1>
            <p className="text-slate-500 mt-1">Escolha a dificuldade, grave sua voz e receba feedback palavra a palavra.</p>
          </div>
          <button
            onClick={() => navigate('/portal/dashboard')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-100"
          >
            Voltar
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-indigo-500" size={18} />
            <p className="text-sm font-semibold text-slate-700">Selecione o nível</p>
          </div>
          <DifficultySelector value={difficulty} onSelect={handleDifficultySelect} />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Frase gerada {phraseSource === 'openai' ? '(IA)' : '(offline)'}:</p>
              <h2 className="text-2xl font-bold text-slate-900">{phrase || '—'}</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => speak(phrase)}
                disabled={!phrase || loadingPhrase}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Volume2 size={16} />
                Ouvir frase
              </button>
              <button
                onClick={() => handleGeneratePhrase(difficulty)}
                disabled={loadingPhrase}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center gap-2 disabled:opacity-50"
              >
                {loadingPhrase ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Nova frase
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {wordScores.map((w, idx) => (
              <WordFeedback
                key={`${w.word}-${idx}`}
                word={w.word}
                score={w.score}
                phonetic={w.phonetic}
                onSpeak={() => speak(w.word)}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Grave sua pronúncia e envie para análise</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Use um ambiente silencioso para melhores resultados.
              </div>
            </div>
            <div className="flex gap-2">
              {!recording ? (
                <button
                  onClick={handleStartRecording}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Mic size={16} />
                  Gravar
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                >
                  <StopCircle size={16} />
                  Parar
                </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={!audioBlob || analyzing}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
              >
                {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Analisar
              </button>
            </div>
          </div>
          {audioBlob && (
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full mt-2" />
          )}
        </div>

        {analysis && (
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Feedback da IA {analysis.mock ? '(simulado)' : ''}</p>
                <h3 className="text-xl font-bold text-slate-900">Resultados</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-indigo-600">{(analysis.pronunciationScore * 100).toFixed(0)}%</p>
                <p className="text-sm text-slate-500">Score geral</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreCard label="Precisão" value={analysis.accuracyScore} />
              <ScoreCard label="Fluência" value={analysis.fluencyScore} />
              <ScoreCard label="Pronúncia" value={analysis.pronunciationScore} />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-slate-700">{analysis.feedback || 'Continue praticando para melhorar sua pronúncia.'}</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Envie o resultado ao professor e salve no histórico</p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Salvar e enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{(value * 100).toFixed(0)}%</p>
      <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </div>
    </div>
  );
}
