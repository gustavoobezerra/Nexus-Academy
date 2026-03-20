/**
 * Camada canônica de transcrição de áudio do produto.
 *
 * O projeto usa o SDK oficial da AssemblyAI. Nenhum segredo é mantido em
 * código rastreado; a chave é lida apenas de `process.env.ASSEMBLYAI_API_KEY`.
 */

import { AssemblyAI } from 'assemblyai';

const DEFAULT_SPEECH_MODELS = ['universal-3-pro', 'universal-2'];
const DEFAULT_TRANSCRIPTION_OPTIONS = {
  language_detection: true,
  speech_models: DEFAULT_SPEECH_MODELS,
  format_text: true
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeConfidence(value, fallback = null) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (numericValue > 1) {
    return Math.max(0, Math.min(1, numericValue / 100));
  }

  return Math.max(0, Math.min(1, numericValue));
}

function normalizeDurationSeconds(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  // A AssemblyAI pode devolver a duração em milissegundos; para frases curtas,
  // qualquer valor acima de 300 é tratado como ms para evitar inflar métricas.
  return numericValue > 300 ? numericValue / 1000 : numericValue;
}

function normalizeAudioInput(audioInput) {
  if (Buffer.isBuffer(audioInput)) {
    return audioInput;
  }

  if (audioInput instanceof Uint8Array) {
    return Buffer.from(audioInput);
  }

  if (audioInput instanceof ArrayBuffer) {
    return Buffer.from(audioInput);
  }

  return audioInput;
}

export function getAssemblyAIKey() {
  return String(process.env.ASSEMBLYAI_API_KEY || '').trim();
}

export function isAssemblyAIConfigured() {
  return Boolean(getAssemblyAIKey());
}

export function getAssemblyAIClient() {
  const apiKey = getAssemblyAIKey();
  if (!apiKey) {
    return null;
  }

  return new AssemblyAI({ apiKey });
}

export function getAssemblyAIProviderInfo() {
  return {
    configured: isAssemblyAIConfigured(),
    provider: 'assemblyai',
    primaryModel: DEFAULT_SPEECH_MODELS[0],
    fallbackModels: DEFAULT_SPEECH_MODELS.slice(1)
  };
}

function normalizeTranscript(transcript, requestOptions = {}) {
  const speechModels = Array.isArray(requestOptions.speech_models) && requestOptions.speech_models.length > 0
    ? requestOptions.speech_models
    : DEFAULT_SPEECH_MODELS;

  return {
    success: true,
    text: normalizeText(transcript?.text),
    words: Array.isArray(transcript?.words) ? transcript.words : [],
    speakers: Array.isArray(transcript?.utterances) ? transcript.utterances : [],
    confidence: normalizeConfidence(
      transcript?.confidence,
      normalizeConfidence(
        (transcript?.words || []).reduce((sum, word) => sum + (Number(word?.confidence) || 0), 0)
          / Math.max((transcript?.words || []).length, 1),
        null
      )
    ),
    audioDuration: normalizeDurationSeconds(transcript?.audio_duration),
    languageCode: transcript?.language_code || null,
    providerMode: 'live',
    provider: 'assemblyai',
    providerModel: transcript?.speech_model_used || speechModels[0] || DEFAULT_SPEECH_MODELS[0],
    transcriptId: transcript?.id || null,
    isMock: false,
    raw: transcript
  };
}

/**
 * Transcreve áudio por URL, path local ou buffer usando o SDK da AssemblyAI.
 */
export async function transcribeAudio(audioInput, options = {}) {
  const client = getAssemblyAIClient();
  if (!client) {
    return {
      success: false,
      error: 'ASSEMBLYAI_API_KEY não configurada.',
      configurationPending: true,
      providerMode: 'fallback',
      provider: 'assemblyai',
      providerModel: DEFAULT_SPEECH_MODELS[0],
      isMock: true
    };
  }

  const requestOptions = {
    ...DEFAULT_TRANSCRIPTION_OPTIONS,
    ...options
  };

  try {
    const transcript = await client.transcripts.transcribe({
      audio: normalizeAudioInput(audioInput),
      ...requestOptions
    });

    if (transcript?.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }

    return normalizeTranscript(transcript, requestOptions);
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao transcrever áudio com AssemblyAI.',
      configurationPending: false,
      providerMode: 'fallback',
      provider: 'assemblyai',
      providerModel: requestOptions.speech_models?.[0] || DEFAULT_SPEECH_MODELS[0],
      isMock: false
    };
  }
}

/**
 * Transcrição em tempo real. Mantida como utilitário auxiliar do workspace de
 * aula ao vivo, mas usando o mesmo provider da camada de transcrição.
 */
export async function* transcribeRealtime(audioStream) {
  const client = getAssemblyAIClient();
  if (!client) {
    yield {
      text: '[AssemblyAI não configurada. Adicione ASSEMBLYAI_API_KEY para transcrição em tempo real.]',
      isFinal: true,
      isMock: true
    };
    return;
  }

  const realtimeTranscriber = client.realtime.transcriber({
    sample_rate: 16000,
    encoding: 'pcm_s16le'
  });

  realtimeTranscriber.on('transcript', (transcript) => {
    if (transcript?.text) {
      return {
        text: transcript.text,
        isFinal: transcript.message_type === 'FinalTranscript'
      };
    }
    return undefined;
  });

  await realtimeTranscriber.connect();
  audioStream.pipe(realtimeTranscriber);
  yield* realtimeTranscriber;
}

export async function getTranscription(transcriptId) {
  const client = getAssemblyAIClient();
  if (!client) {
    return {
      success: false,
      error: 'ASSEMBLYAI_API_KEY não configurada.',
      configurationPending: true,
      providerMode: 'fallback',
      provider: 'assemblyai',
      providerModel: DEFAULT_SPEECH_MODELS[0],
      isMock: true
    };
  }

  try {
    const transcript = await client.transcripts.get(transcriptId);
    return {
      ...normalizeTranscript(transcript),
      status: transcript?.status || null
    };
  } catch (error) {
    console.error('AssemblyAI getTranscription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao consultar a transcrição na AssemblyAI.',
      configurationPending: false,
      providerMode: 'fallback',
      provider: 'assemblyai',
      providerModel: DEFAULT_SPEECH_MODELS[0],
      isMock: false
    };
  }
}

export default {
  transcribeAudio,
  transcribeRealtime,
  getTranscription,
  getAssemblyAIClient,
  getAssemblyAIProviderInfo,
  isAssemblyAIConfigured
};
