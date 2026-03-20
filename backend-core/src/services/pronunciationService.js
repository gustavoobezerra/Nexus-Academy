import aiAssistantService from './aiAssistantService.js';
import {
  getAssemblyAIProviderInfo,
  isAssemblyAIConfigured,
  transcribeAudio
} from './transcriptionService.js';

const PRONUNCIATION_LOCALE = 'en_us';
const MIN_AUDIO_BUFFER_BYTES = 2_048;
const PRONUNCIATION_SCORING_METHOD = 'assemblyai-transcription-beta-v1';

const phraseBank = {
  beginner: [
    'Hello, my name is Anna.',
    'This is a red apple.',
    'I like to read books.',
    'The cat is on the table.',
    'I have a blue car.',
    'She is my best friend.',
    'We go to school today.',
    'The sun is very bright.'
  ],
  elementary: [
    'Could you please open the window?',
    'I am learning English every day.',
    'She works in a small office.',
    'They live near the big park.',
    'My family loves to travel.',
    'He enjoys playing soccer on weekends.',
    'We need to buy some groceries.',
    'The weather is nice this morning.'
  ],
  intermediate: [
    'I would like to book a room with a sea view.',
    'Traveling helps people understand new cultures.',
    'He decided to change his career last year.',
    'Practice makes perfect when learning a language.',
    'She has been studying abroad for two years.',
    'Technology is changing the way we communicate.',
    'I prefer working remotely from home.',
    'They are planning a trip to Europe next summer.'
  ],
  'upper-intermediate': [
    'Despite the rain, the concert continued without interruptions.',
    'She quickly adapted to the fast-paced environment at work.',
    'Maintaining a healthy balance between work and life is challenging.',
    'He delivered his presentation with clarity and confidence.',
    'The company implemented new policies to improve productivity.',
    'Understanding cultural differences is essential for global business.',
    'She has been developing her leadership skills through training.',
    'The research findings were published in a prestigious journal.'
  ],
  advanced: [
    'Her articulate speech captivated the audience from start to finish.',
    'They debated the implications of artificial intelligence on society.',
    'Investing time in deliberate practice accelerates mastery.',
    'Sustainable solutions require collaboration across disciplines.',
    'The economic downturn prompted companies to restructure operations.',
    'His innovative approach revolutionized the industry standards.',
    'Critical thinking skills are paramount in decision-making processes.',
    'The symposium addressed pressing environmental challenges facing humanity.'
  ],
  proficient: [
    'He synthesized complex data into actionable business strategies.',
    'The documentary provided a nuanced perspective on climate policy.',
    'Her persuasive rhetoric swayed the undecided voters.',
    'Innovation thrives where curiosity meets disciplined execution.',
    'The paradigm shift necessitated a comprehensive reevaluation of methodologies.',
    'Interdisciplinary collaboration fosters groundbreaking discoveries.',
    'The legislation aimed to mitigate systemic inequalities.',
    'His erudite analysis elucidated the intricate mechanisms underlying the phenomenon.'
  ]
};

class PronunciationAnalysisError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PronunciationAnalysisError';
    this.status = options.status || 500;
    this.code = options.code || 'PRONUNCIATION_ANALYSIS_ERROR';
    this.userMessage = options.userMessage || message;
  }
}

function normaliseDifficulty(difficulty = 'intermediate') {
  const key = difficulty.toLowerCase();
  if (phraseBank[key]) return key;
  if (key === 'upperintermediate' || key === 'upper_intermediate') return 'upper-intermediate';
  if (key === 'c1') return 'advanced';
  if (key === 'c2') return 'proficient';
  if (key === 'b2') return 'upper-intermediate';
  if (key === 'b1') return 'intermediate';
  if (key === 'a2') return 'elementary';
  if (key === 'a1') return 'beginner';
  return 'intermediate';
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeToken(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9']/gi, '');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value) {
  return Math.round(clamp(Number(value) || 0, 0, 1) * 100) / 100;
}

function toNormalizedScore(value, fallback = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return roundScore(fallback);
  }

  const numericValue = Number(value);
  if (numericValue > 1) {
    return roundScore(numericValue / 100);
  }

  return roundScore(numericValue);
}

function estimateAudioDuration(phrase) {
  const wordCount = String(phrase || '').split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / 2.6) * 10) / 10;
  return Math.max(1, estimatedSeconds);
}

function sanitizeGeneratedPhrase(rawPhrase, fallback) {
  const cleanedPhrase = String(rawPhrase || '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^[-*\d.)\s]+/, '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  const normalizedPhrase = normalizeWhitespace(cleanedPhrase || '');
  if (!normalizedPhrase) {
    return fallback;
  }

  return /[.!?]$/.test(normalizedPhrase) ? normalizedPhrase : `${normalizedPhrase}.`;
}

function scoreWord(word) {
  const clean = normalizeToken(word);
  if (!clean) return 0.85;

  const length = clean.length;
  const hasApostrophe = word.includes("'");
  const consonantClusters = (clean.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || []).length;
  const vowelClusters = (clean.match(/[aeiouy]{3,}/gi) || []).length;

  let score = 0.92;

  if (length > 8) score -= 0.08;
  else if (length > 6) score -= 0.04;
  else if (length > 4) score -= 0.02;

  score -= consonantClusters * 0.05;
  score -= vowelClusters * 0.03;

  if (hasApostrophe) score -= 0.02;

  return clamp(score, 0.6, 0.98);
}

function splitSyllables(word) {
  const clean = normalizeToken(word);
  if (!clean) return [];

  const vowels = 'aeiouy';
  const syllables = [];
  let current = '';

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const isVowel = vowels.includes(char);
    current += char;

    const nextChar = clean[index + 1];
    const nextIsVowel = nextChar ? vowels.includes(nextChar) : false;

    if (isVowel && !nextIsVowel && current.length > 0) {
      syllables.push(current);
      current = '';
    }
  }

  if (current) {
    syllables.push(current);
  }

  return syllables.length ? syllables : [clean];
}

function buildSyllableScores(word, score) {
  const syllables = splitSyllables(word);
  return syllables.map((text, index) => ({
    text,
    score: roundScore(clamp(score - (index * 0.02), 0.2, 0.99))
  }));
}

function buildFallbackWordScores(originalPhrase) {
  return String(originalPhrase || '')
    .split(/\s+/)
    .map((word) => word.replace(/[^\w']/g, ''))
    .filter(Boolean)
    .map((word) => {
      const score = roundScore(scoreWord(word));

      return {
        word,
        score,
        phonetic: undefined,
        phonemes: [],
        syllables: buildSyllableScores(word, score)
      };
    });
}

function buildFallbackPronunciationAnalysis({ originalPhrase, reason, configurationPending = false }) {
  const wordScores = buildFallbackWordScores(originalPhrase);
  const accuracyScore = roundScore(
    wordScores.reduce((sum, wordScore) => sum + wordScore.score, 0) / Math.max(wordScores.length, 1)
  );
  const fluencyScore = roundScore(Math.max(0.58, accuracyScore - 0.04));
  const pronunciationScore = roundScore((accuracyScore * 0.6) + (fluencyScore * 0.4));

  return {
    mock: true,
    source: 'local-fallback',
    providerMode: 'fallback',
    providerModel: 'local-fallback',
    configurationPending,
    fallbackReason: reason,
    accuracyScore,
    fluencyScore,
    pronunciationScore,
    feedback: configurationPending
      ? 'AssemblyAI ainda não está configurada. Este resultado local é apenas uma referência visual e não entra nos insights pedagógicos.'
      : 'A AssemblyAI não respondeu nesta tentativa. Este resultado local é apenas uma referência visual e não entra nos insights pedagógicos.',
    wordScores,
    duration: estimateAudioDuration(originalPhrase),
    metadata: {
      service: 'local-fallback',
      locale: PRONUNCIATION_LOCALE,
      recognizedText: originalPhrase,
      completenessScore: 1,
      confidence: null,
      scoringMethod: 'local-heuristic-fallback-v1',
      wordCount: wordScores.length,
      matchedWords: wordScores.length
    }
  };
}

function levenshteinDistance(left, right) {
  const leftText = String(left || '');
  const rightText = String(right || '');
  const rows = leftText.length + 1;
  const cols = rightText.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = leftText[row - 1] === rightText[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function getTokenSimilarity(left, right) {
  const normalizedLeft = normalizeToken(left);
  const normalizedRight = normalizeToken(right);
  if (!normalizedLeft && !normalizedRight) return 1;
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  return clamp(1 - (levenshteinDistance(normalizedLeft, normalizedRight) / maxLength), 0, 1);
}

function buildRecognizedWords(transcription) {
  const words = Array.isArray(transcription?.words) ? transcription.words : [];
  if (words.length > 0) {
    return words
      .map((word, index) => ({
        index,
        raw: normalizeWhitespace(word?.text || word?.word || ''),
        normalized: normalizeToken(word?.text || word?.word || ''),
        confidence: toNormalizedScore(word?.confidence, transcription?.confidence ?? 0.75)
      }))
      .filter((word) => word.normalized);
  }

  return normalizeWhitespace(transcription?.text)
    .split(/\s+/)
    .map((raw, index) => ({
      index,
      raw,
      normalized: normalizeToken(raw),
      confidence: toNormalizedScore(transcription?.confidence, 0.72)
    }))
    .filter((word) => word.normalized);
}

function buildExpectedWords(originalPhrase) {
  return normalizeWhitespace(originalPhrase)
    .split(/\s+/)
    .map((raw, index) => ({
      index,
      raw: raw.replace(/\s+/g, ''),
      normalized: normalizeToken(raw)
    }))
    .filter((word) => word.normalized);
}

function alignRecognizedWords(expectedWords, recognizedWords) {
  const usedIndexes = new Set();
  let cursor = 0;

  return expectedWords.map((expectedWord, expectedIndex) => {
    let bestMatch = null;
    let bestScore = -1;

    for (let recognizedIndex = cursor; recognizedIndex < recognizedWords.length; recognizedIndex += 1) {
      if (usedIndexes.has(recognizedIndex)) {
        continue;
      }

      const recognizedWord = recognizedWords[recognizedIndex];
      const similarity = getTokenSimilarity(expectedWord.normalized, recognizedWord.normalized);
      const orderPenalty = Math.min(Math.abs(recognizedIndex - expectedIndex) * 0.05, 0.2);
      const combinedScore = similarity - orderPenalty;

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestMatch = { recognizedIndex, recognizedWord, similarity };
      }

      if (similarity === 1) {
        break;
      }
    }

    if (!bestMatch || bestMatch.similarity < 0.35) {
      return {
        expectedWord,
        recognizedWord: null,
        similarity: 0
      };
    }

    usedIndexes.add(bestMatch.recognizedIndex);
    cursor = bestMatch.recognizedIndex + 1;

    return {
      expectedWord,
      recognizedWord: bestMatch.recognizedWord,
      similarity: bestMatch.similarity
    };
  });
}

function buildWordScores(expectedWords, alignments) {
  return alignments.map(({ expectedWord, recognizedWord, similarity }) => {
    const wordConfidence = recognizedWord ? toNormalizedScore(recognizedWord.confidence, 0.7) : 0.45;
    const score = recognizedWord
      ? roundScore(clamp((similarity * 0.72) + (wordConfidence * 0.28), 0.25, 0.99))
      : roundScore(clamp(0.18 + (scoreWord(expectedWord.raw) * 0.22), 0.18, 0.45));

    return {
      word: expectedWord.raw,
      score,
      phonetic: undefined,
      phonemes: [],
      syllables: buildSyllableScores(expectedWord.raw, score),
      recognizedWord: recognizedWord?.raw || null
    };
  });
}

function generateFeedback(pronunciationScore, wordScores, metadata) {
  const weakWords = wordScores.filter((wordScore) => wordScore.score < 0.68);
  const completenessScore = Number(metadata?.completenessScore) || 0;

  if (pronunciationScore >= 0.9 && completenessScore >= 0.9) {
    return 'Ótimo treino. A transcrição ficou muito próxima da frase original e o ritmo manteve boa consistência.';
  }

  if (pronunciationScore >= 0.82) {
    return weakWords.length > 0
      ? `Bom resultado beta. Vale repetir com foco especial em "${weakWords[0].word}" para ganhar mais precisão.`
      : 'Bom resultado beta. Sua fala ficou próxima do enunciado proposto.';
  }

  if (completenessScore < 0.7) {
    return 'A transcrição capturou apenas parte da frase. Tente gravar novamente em um ambiente mais silencioso e fale o enunciado inteiro.';
  }

  if (weakWords.length > 0) {
    return `Continue praticando. As maiores perdas apareceram em "${weakWords[0].word}" e no ritmo geral da frase.`;
  }

  return 'Continue praticando. Este score beta é aproximado e ajuda a localizar trechos que ainda precisam de repetição.';
}

function buildBetaMetadata({
  transcription,
  recognizedText,
  completenessScore,
  paceScore,
  expectedDuration,
  actualDuration,
  matchedWords,
  wordScores
}) {
  return {
    service: 'assemblyai',
    locale: PRONUNCIATION_LOCALE,
    recognizedText,
    confidence: transcription.confidence ?? null,
    completenessScore: roundScore(completenessScore),
    paceScore: roundScore(paceScore),
    expectedDuration: roundScore(expectedDuration),
    actualDuration: actualDuration ? roundScore(actualDuration) : null,
    speechModelUsed: transcription.providerModel,
    languageCode: transcription.languageCode || PRONUNCIATION_LOCALE,
    scoringMethod: PRONUNCIATION_SCORING_METHOD,
    wordCount: wordScores.length,
    matchedWords
  };
}

async function analyzePronunciationWithAssemblyAI({ audioBuffer, originalPhrase }) {
  const providerInfo = getAssemblyAIProviderInfo();
  const transcription = await transcribeAudio(audioBuffer, {
    language_code: PRONUNCIATION_LOCALE,
    language_detection: false,
    speech_models: [providerInfo.primaryModel, ...providerInfo.fallbackModels].filter(Boolean)
  });

  if (!transcription.success) {
    throw new Error(transcription.error || 'Falha ao transcrever áudio na AssemblyAI.');
  }

  const recognizedText = normalizeWhitespace(transcription.text);
  if (!recognizedText) {
    throw new PronunciationAnalysisError('Nenhuma fala reconhecida', {
      status: 422,
      code: 'NO_SPEECH_RECOGNIZED',
      userMessage: 'Nenhuma fala clara foi detectada. Grave novamente em um ambiente mais silencioso.'
    });
  }

  const expectedWords = buildExpectedWords(originalPhrase);
  const recognizedWords = buildRecognizedWords(transcription);
  const alignments = alignRecognizedWords(expectedWords, recognizedWords);
  const wordScores = buildWordScores(expectedWords, alignments);
  const matchedWords = alignments.filter((alignment) => alignment.recognizedWord).length;
  const completenessScore = matchedWords / Math.max(expectedWords.length, 1);
  const confidenceScore = toNormalizedScore(transcription.confidence, 0.72);
  const averageWordScore = roundScore(
    wordScores.reduce((sum, wordScore) => sum + wordScore.score, 0) / Math.max(wordScores.length, 1)
  );
  const expectedDuration = estimateAudioDuration(originalPhrase);
  const actualDuration = Number(transcription.audioDuration) || expectedDuration;
  const durationDelta = Math.abs(actualDuration - expectedDuration) / Math.max(expectedDuration, 1);
  const paceScore = roundScore(clamp(1 - (durationDelta * 0.55), 0.4, 1));

  const accuracyScore = roundScore(
    clamp((averageWordScore * 0.55) + (completenessScore * 0.25) + (confidenceScore * 0.2), 0.2, 0.99)
  );
  const fluencyScore = roundScore(
    clamp((paceScore * 0.42) + (confidenceScore * 0.33) + (completenessScore * 0.25), 0.2, 0.99)
  );
  const pronunciationScore = roundScore(
    clamp((accuracyScore * 0.5) + (fluencyScore * 0.35) + (averageWordScore * 0.15), 0.2, 0.99)
  );
  const metadata = buildBetaMetadata({
    transcription,
    recognizedText,
    completenessScore,
    paceScore,
    expectedDuration,
    actualDuration,
    matchedWords,
    wordScores
  });

  return {
    mock: false,
    source: 'assemblyai-beta',
    providerMode: 'beta',
    providerModel: transcription.providerModel || providerInfo.primaryModel,
    configurationPending: false,
    fallbackReason: null,
    accuracyScore,
    fluencyScore,
    pronunciationScore,
    feedback: generateFeedback(pronunciationScore, wordScores, metadata),
    wordScores,
    duration: actualDuration,
    metadata
  };
}

export async function generatePhrase(difficulty) {
  const level = normaliseDifficulty(difficulty);
  const fallback = pickRandom(phraseBank[level] || phraseBank.intermediate);

  if (!aiAssistantService.isConfigured()) {
    return {
      phrase: fallback,
      source: 'fallback',
      providerMode: 'fallback',
      providerModel: 'local-fallback',
      mock: true
    };
  }

  try {
    const response = await aiAssistantService.requestTextCompletion(
      `Você gera frases curtas em inglês para treino de pronúncia.

Nível: ${level}
Regras:
1. Retorne apenas uma frase em inglês.
2. Use entre 6 e 12 palavras.
3. Evite nomes próprios raros e vocabulário excessivamente técnico.
4. Não use aspas, bullets nem explicações.`,
      {
        temperature: 0.7,
        maxOutputTokens: 80
      }
    );

    return {
      phrase: sanitizeGeneratedPhrase(response.text, fallback),
      source: 'gemini',
      providerMode: 'live',
      providerModel: response.model,
      mock: false
    };
  } catch (error) {
    console.warn('Gemini indisponível para geração de frase, usando fallback:', error?.message || error);
    return {
      phrase: fallback,
      source: 'fallback',
      providerMode: 'fallback',
      providerModel: 'local-fallback',
      mock: true
    };
  }
}

/**
 * Analisa a pronúncia usando a transcrição da AssemblyAI como um beta explícito.
 * Esse score é útil para treino e histórico, mas não entra nos insights canônicos.
 */
export async function analyzePronunciation({ audioBuffer, originalPhrase }) {
  if (!originalPhrase || !normalizeWhitespace(originalPhrase)) {
    throw new PronunciationAnalysisError('Frase original ausente', {
      status: 400,
      code: 'ORIGINAL_PHRASE_REQUIRED',
      userMessage: 'A frase original é obrigatória para analisar a pronúncia.'
    });
  }

  if (!audioBuffer || audioBuffer.length < MIN_AUDIO_BUFFER_BYTES) {
    throw new PronunciationAnalysisError('Áudio insuficiente para análise', {
      status: 422,
      code: 'AUDIO_TOO_SHORT',
      userMessage: 'A gravação ficou curta demais ou sem fala clara. Grave novamente antes de analisar.'
    });
  }

  if (!isAssemblyAIConfigured()) {
    return buildFallbackPronunciationAnalysis({
      originalPhrase,
      reason: 'assemblyai_not_configured',
      configurationPending: true
    });
  }

  try {
    return await analyzePronunciationWithAssemblyAI({
      audioBuffer,
      originalPhrase
    });
  } catch (error) {
    if (error instanceof PronunciationAnalysisError) {
      throw error;
    }

    console.warn('AssemblyAI indisponível, usando fallback explícito:', error?.message || error);
    return buildFallbackPronunciationAnalysis({
      originalPhrase,
      reason: 'assemblyai_provider_unavailable',
      configurationPending: false
    });
  }
}

export { PronunciationAnalysisError };

export default {
  generatePhrase,
  analyzePronunciation
};
