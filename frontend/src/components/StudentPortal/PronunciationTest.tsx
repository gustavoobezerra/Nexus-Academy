import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, StopCircle, Volume2, RefreshCw, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DifficultySelector } from './DifficultySelector';
import { WordFeedback } from './WordFeedback';
import { API_URL } from '../../services/api.service';

type WordScore = {
  word: string;
  score: number;
  phonetic?: string;
  syllables?: { text: string; score: number }[];
};

type AnalysisResult = {
  accuracyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  feedback?: string;
  wordScores: WordScore[];
  mock?: boolean;
  source?: string;
  providerMode?: 'live' | 'beta' | 'fallback';
  providerModel?: string;
  configurationPending?: boolean;
  fallbackReason?: string | null;
  metadata?: {
    service?: string;
    locale?: string;
    recognizedText?: string;
    confidence?: number | null;
    completenessScore?: number | null;
    paceScore?: number | null;
    scoringMethod?: string;
  };
  audioUrl?: string | null;
};

type PreparedAudio = {
  wavBlob: Blob;
  duration: number;
  rms: number;
};

const TARGET_SAMPLE_RATE = 16000;
const SILENCE_RMS_THRESHOLD = 0.008;
const PCM_WAV_HEADER_SIZE = 44;

const AudioContextCtor = window.AudioContext || (window as typeof window & {
  webkitAudioContext?: typeof AudioContext;
}).webkitAudioContext;

const OfflineAudioContextCtor = window.OfflineAudioContext || (window as typeof window & {
  webkitOfflineAudioContext?: typeof OfflineAudioContext;
}).webkitOfflineAudioContext;

function encodeWavFromAudioBuffer(audioBuffer: AudioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + channelData.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + channelData.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, channelData.length * 2, true);

  let offset = 44;
  for (let index = 0; index < channelData.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, channelData[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function looksLikeWav(arrayBuffer: ArrayBuffer) {
  if (arrayBuffer.byteLength < PCM_WAV_HEADER_SIZE) {
    return false;
  }

  const view = new DataView(arrayBuffer);
  const readString = (offset: number, length: number) =>
    Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join('');

  return readString(0, 4) === 'RIFF' && readString(8, 4) === 'WAVE';
}

function extractPreparedAudioFromPcmWav(arrayBuffer: ArrayBuffer): PreparedAudio | null {
  if (!looksLikeWav(arrayBuffer) || arrayBuffer.byteLength < PCM_WAV_HEADER_SIZE) {
    return null;
  }

  const view = new DataView(arrayBuffer);
  const channelCount = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataSize = view.getUint32(40, true);

  if (channelCount !== 1 || sampleRate !== TARGET_SAMPLE_RATE || bitsPerSample !== 16) {
    return null;
  }

  const sampleCount = Math.floor(dataSize / 2);
  const samples = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = view.getInt16(PCM_WAV_HEADER_SIZE + (index * 2), true) / 0x7fff;
  }

  const rms = Math.sqrt(
    samples.reduce((sum, sample) => sum + (sample * sample), 0) / Math.max(samples.length, 1)
  );

  return {
    wavBlob: new Blob([arrayBuffer], { type: 'audio/wav' }),
    duration: sampleCount / TARGET_SAMPLE_RATE,
    rms
  };
}

async function prepareAudioForAnalysis(blob: Blob): Promise<PreparedAudio> {
  const arrayBuffer = await blob.arrayBuffer();
  const directWavAudio = extractPreparedAudioFromPcmWav(arrayBuffer);

  if (directWavAudio) {
    return directWavAudio;
  }

  if (!AudioContextCtor || !OfflineAudioContextCtor) {
    throw new Error('Seu navegador não suporta a conversão de áudio necessária para a análise da pronúncia.');
  }

  const audioContext = new AudioContextCtor();

  try {
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const frameCount = Math.max(1, Math.ceil(decodedBuffer.duration * TARGET_SAMPLE_RATE));
    const offlineContext = new OfflineAudioContextCtor(1, frameCount, TARGET_SAMPLE_RATE);
    const monoBuffer = offlineContext.createBuffer(1, decodedBuffer.length, decodedBuffer.sampleRate);
    const monoData = monoBuffer.getChannelData(0);

    for (let channelIndex = 0; channelIndex < decodedBuffer.numberOfChannels; channelIndex += 1) {
      const channelData = decodedBuffer.getChannelData(channelIndex);
      for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
        monoData[sampleIndex] += channelData[sampleIndex] / decodedBuffer.numberOfChannels;
      }
    }

    const source = offlineContext.createBufferSource();
    source.buffer = monoBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    const renderedData = renderedBuffer.getChannelData(0);
    const rms = Math.sqrt(
      renderedData.reduce((sum, sample) => sum + (sample * sample), 0) / Math.max(renderedData.length, 1)
    );
    const wavBlob = new Blob([encodeWavFromAudioBuffer(renderedBuffer)], { type: 'audio/wav' });

    return {
      wavBlob,
      duration: renderedBuffer.duration,
      rms
    };
  } finally {
    await audioContext.close();
  }
}

// Funções de API (você pode mover para um arquivo separado)
const getAuthHeaders = () => {
  const token = localStorage.getItem('studentToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const generatePronunciationPhrase = async (difficulty: string) => {
  const response = await fetch(`${API_URL}/portal/pronunciation/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ difficulty })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Erro ao gerar frase');
  }
  
  return await response.json();
};

const analyzePronunciation = async (formData: FormData) => {
  const token = localStorage.getItem('studentToken');
  const response = await fetch(`${API_URL}/portal/pronunciation/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Erro ao analisar pronúncia');
  }
  
  return await response.json();
};

const savePronunciationHistory = async (data: unknown) => {
  const response = await fetch(`${API_URL}/portal/pronunciation/history`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Erro ao salvar histórico');
  }
  
  return await response.json();
};

export function PronunciationTest() {
  const navigate = useNavigate();
  const studentToken = localStorage.getItem('studentToken');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [phrase, setPhrase] = useState('');
  const [phraseSource, setPhraseSource] = useState('');
  const [phraseProviderMode, setPhraseProviderMode] = useState<'live' | 'fallback'>('fallback');
  const [phraseProviderModel, setPhraseProviderModel] = useState<string | null>(null);
  const [phraseAudioUrl, setPhraseAudioUrl] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisAudioUrl, setAnalysisAudioUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!studentToken) {
      return;
    }
    handleGeneratePhrase('intermediate');
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, [studentToken]);

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
      setAnalysisAudioUrl(null);
      setPhraseAudioUrl(null);
      const res = await generatePronunciationPhrase(level);
      const phraseValue = res?.data?.phrase || res?.phrase;
      const sourceValue = res?.data?.source || res?.source || 'fallback';
      const providerModeValue = res?.data?.providerMode || res?.providerMode || 'fallback';
      const providerModelValue = res?.data?.providerModel || res?.providerModel || null;
      const audioValue = res?.data?.audioUrl || res?.audioUrl || null;
      setPhrase(phraseValue || 'Practice makes perfect.');
      setPhraseSource(sourceValue);
      setPhraseProviderMode(providerModeValue);
      setPhraseProviderModel(providerModelValue);
      setPhraseAudioUrl(audioValue);
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
        const recordedBlobType = audioChunksRef.current.find((chunk): chunk is Blob => chunk instanceof Blob)?.type || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: recordedBlobType });
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
      const preparedAudio = await prepareAudioForAnalysis(audioBlob);

      if (preparedAudio.duration < 0.6 || preparedAudio.rms < SILENCE_RMS_THRESHOLD) {
        toast.error('A gravação ficou muito baixa ou silenciosa. Grave novamente falando a frase inteira.');
        return;
      }

      const formData = new FormData();
      formData.append('audio', preparedAudio.wavBlob, 'pronunciation.wav');
      formData.append('originalPhrase', phrase);

      const res = await analyzePronunciation(formData);
      const result: AnalysisResult = res?.data?.analysis || res?.analysis || res?.data;
      if (!result) {
        toast.error('Resposta inválida da análise.');
        return;
      }
      setAnalysis(result);
      setAnalysisAudioUrl(result.audioUrl || null);
      toast.success(
        result.providerMode === 'beta'
          ? 'Análise beta do AssemblyAI concluída.'
          : result.providerMode === 'live'
            ? 'Análise canônica concluída.'
            : result.configurationPending
              ? 'AssemblyAI não configurada. Resultado local exibido sem impactar os insights.'
              : 'AssemblyAI indisponível. Resultado local exibido como fallback.'
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao analisar pronúncia.');
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
        mock: Boolean(analysis.mock),
        source: analysis.source,
        providerMode: analysis.providerMode,
        providerModel: analysis.providerModel,
        feedback: analysis.feedback,
        wordScores: analysis.wordScores,
        audioUrl: analysisAudioUrl,
        metadata: analysis.metadata
      });
      toast.success(
        analysis.providerMode === 'live'
          ? 'Resultado salvo e enviado ao professor.'
          : 'Resultado salvo no histórico sem impactar os insights do professor.'
      );
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
    phonetic: undefined,
    syllables: []
  }));

  const phraseSourceLabel = (() => {
    switch (phraseSource) {
      case 'teacher':
        return '(Professor)';
      case 'gemini':
        return '(Gemini)';
      case 'fallback':
        return '(Fallback local)';
      default:
        return '';
    }
  })();

  const handlePlayPhrase = () => {
    if (phraseAudioUrl) {
      const audio = new Audio(phraseAudioUrl);
      audio.play().catch(() => {
        toast.error('Não foi possível reproduzir o áudio da frase.');
      });
      return;
    }
    speak(phrase);
  };

  if (!studentToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Pronunciation Test</h1>
          <p className="text-slate-600 mb-4">
            Faça login no portal do aluno para acessar o teste de pronúncia.
          </p>
          <button
            onClick={() => navigate('/portal/login')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Treinamento de Pronúncia com IA</p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">Pronunciation Test</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Escolha a dificuldade, grave sua voz e receba feedback palavra a palavra.</p>
          </div>
          <button
            onClick={() => navigate('/portal/dashboard')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Voltar
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Como funciona</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-100">1. Ouça</p>
              <p>Escute a frase gerada e se familiarize com a pronúncia.</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-100">2. Grave</p>
              <p>Fale a frase em voz alta e finalize a gravação.</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-100">3. Analise</p>
              <p>Receba notas por palavra e dicas específicas.</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-100">4. Salve</p>
              <p>Envie o resultado para seu professor acompanhar.</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-indigo-500" size={18} />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Selecione o nível</p>
          </div>
          <DifficultySelector value={difficulty} onSelect={handleDifficultySelect} />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Frase gerada {phraseSourceLabel}:</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{phrase || '—'}</h2>
              {phraseProviderModel ? (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {phraseProviderMode === 'live' ? 'Modelo ativo' : 'Modo fallback'}: {phraseProviderModel}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePlayPhrase}
                disabled={!phrase || loadingPhrase}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Volume2 size={16} />
                Ouvir frase
              </button>
              <button
                onClick={() => handleGeneratePhrase(difficulty)}
                disabled={loadingPhrase}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700 flex items-center gap-2 disabled:opacity-50"
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
                syllables={w.syllables}
                onSpeak={() => speak(w.word)}
                onSpeakSyllable={(syllable) => speak(syllable)}
              />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Grave sua pronúncia e envie para análise</p>
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
          {!audioBlob && analysisAudioUrl && (
            <audio controls src={analysisAudioUrl} className="w-full mt-2" />
          )}
        </div>

        {analysis && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {analysis.providerMode === 'beta'
                    ? 'Feedback beta do AssemblyAI'
                    : analysis.providerMode === 'live'
                      ? 'Feedback canônico de pronúncia'
                      : 'Fallback explícito de pronúncia'}
                </p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Resultados</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-indigo-600">{(analysis.pronunciationScore * 100).toFixed(0)}%</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Score geral</p>
              </div>
            </div>

            <div className={`rounded-xl border px-4 py-3 text-sm ${
              analysis.providerMode === 'live'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
            }`}>
              <p className="font-semibold">
                {analysis.providerMode === 'beta'
                  ? 'AssemblyAI beta'
                  : analysis.providerMode === 'live'
                    ? 'Análise canônica concluída'
                    : analysis.configurationPending
                      ? 'Configuração pendente do AssemblyAI'
                      : 'Fallback local ativado'}
              </p>
              <p className="mt-1">
                {analysis.providerMode === 'beta'
                  ? `Origem: ${analysis.providerModel || 'universal-3-pro'}. O score abaixo é aproximado, útil para treino e histórico, mas não entra nos insights do professor.`
                  : analysis.providerMode === 'live'
                    ? `Origem: ${analysis.providerModel || 'live-pronunciation-provider'}`
                    : analysis.configurationPending
                      ? 'O resultado abaixo é apenas uma referência visual até a AssemblyAI ser configurada neste ambiente.'
                      : 'A AssemblyAI não respondeu nesta tentativa. O resultado abaixo é local e não impacta os insights do professor.'}
              </p>
              {analysis.metadata?.recognizedText ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] opacity-80">
                  Reconhecido: {analysis.metadata.recognizedText}
                </p>
              ) : null}
              {typeof analysis.metadata?.confidence === 'number' ? (
                <p className="mt-1 text-xs uppercase tracking-[0.16em] opacity-70">
                  Confiança do reconhecimento: {(analysis.metadata.confidence * 100).toFixed(0)}%
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreCard label="Precisão" value={analysis.accuracyScore} />
              <ScoreCard label="Fluência" value={analysis.fluencyScore} />
              <ScoreCard label="Pronúncia" value={analysis.pronunciationScore} />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <p className="text-slate-700 dark:text-slate-200">{analysis.feedback || 'Continue praticando para melhorar sua pronúncia.'}</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">Envie o resultado ao professor e salve no histórico</p>
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
    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{(value * 100).toFixed(0)}%</p>
      <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </div>
    </div>
  );
}







