import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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

export async function generatePhrase(difficulty) {
  const level = normaliseDifficulty(difficulty);
  const fallback = pickRandom(phraseBank[level] || phraseBank.intermediate);

  if (!OPENAI_API_KEY) {
    return { phrase: fallback, source: 'fallback', mock: true };
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você gera frases curtas em inglês para treino de pronúncia. Retorne apenas a frase, sem aspas.'
          },
          {
            role: 'user',
            content: `Gere uma frase no nível ${level}. Limite a 12 palavras.`
          }
        ],
        temperature: 0.7,
        max_tokens: 60
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const phrase = response.data?.choices?.[0]?.message?.content?.trim();
    if (!phrase) {
      return { phrase: fallback, source: 'fallback', mock: true };
    }

    return { phrase, source: 'openai', mock: false };
  } catch (error) {
    console.warn('OpenAI indisponível, usando fallback:', error.message);
    return { phrase: fallback, source: 'fallback', mock: true };
  }
}

/**
 * Deterministic word scoring based on complexity factors
 * No randomness - same word always gets same score
 */
function scoreWord(word, context = {}) {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!clean) return 0.85;

  // Calculate complexity factors
  const length = clean.length;
  const hasApostrophe = word.includes("'");
  const consonantClusters = (clean.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || []).length;
  const vowelClusters = (clean.match(/[aeiouy]{3,}/gi) || []).length;

  // Base score starts high
  let score = 0.92;

  // Penalize based on length (longer words harder)
  if (length > 8) score -= 0.08;
  else if (length > 6) score -= 0.04;
  else if (length > 4) score -= 0.02;

  // Penalize consonant clusters
  score -= consonantClusters * 0.05;

  // Penalize vowel clusters
  score -= vowelClusters * 0.03;

  // Slight penalty for apostrophes
  if (hasApostrophe) score -= 0.02;

  // Ensure score stays in reasonable range
  return Math.min(0.98, Math.max(0.60, score));
}

function splitSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!clean) return [];
  const vowels = 'aeiouy';
  const syllables = [];
  let current = '';

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    const isVowel = vowels.includes(char);
    current += char;

    const nextChar = clean[i + 1];
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

/**
 * Deterministic syllable scoring based on phonetic complexity
 * No randomness - same syllable always gets same score
 */
function scoreSyllable(syllable) {
  const clean = syllable.toLowerCase();
  if (!clean) return 0.85;

  // Base score
  let score = 0.88;

  // Check for difficult consonant combinations at start
  const startConsonants = clean.match(/^[bcdfghjklmnpqrstvwxyz]+/);
  if (startConsonants && startConsonants[0].length >= 3) {
    score -= 0.10; // "str", "thr", "spr"
  } else if (startConsonants && startConsonants[0].length === 2) {
    score -= 0.05; // "sh", "ch", "th", "st"
  }

  // Check for difficult consonant combinations at end
  const endConsonants = clean.match(/[bcdfghjklmnpqrstvwxyz]+$/);
  if (endConsonants && endConsonants[0].length >= 3) {
    score -= 0.08; // "ngth", "nts", "cts"
  } else if (endConsonants && endConsonants[0].length === 2) {
    score -= 0.03; // "nt", "st", "nd"
  }

  // Penalize complex vowel patterns
  if (/[aeiouy]{3,}/.test(clean)) {
    score -= 0.06; // "eau", "ieu"
  }

  // Penalize syllables with no clear vowel
  if (!/[aeiouy]/.test(clean)) {
    score -= 0.10;
  }

  return Math.min(0.98, Math.max(0.55, score));
}

function buildWordScores(originalPhrase) {
  const words = originalPhrase
    .split(/\s+/)
    .map(w => w.replace(/[^\w']/g, ''))
    .filter(Boolean);

  const wordScores = words.map((word) => {
    const syllables = splitSyllables(word);
    const syllableScores = syllables.map((syllable) => ({
      text: syllable,
      score: scoreSyllable(syllable)
    }));
    const score = syllableScores.reduce((sum, s) => sum + s.score, 0) / Math.max(syllableScores.length, 1);
    return {
      word,
      score,
      phonetic: `/${word.toLowerCase()}/`, // placeholder simplificado
      phonemes: [],
      syllables: syllableScores
    };
  });

  return wordScores;
}

/**
 * Analyze pronunciation - DETERMINISTIC IMPLEMENTATION
 * Same audio + phrase = same results
 * Ready for real API integration (Azure Speech, Google Cloud Speech, etc.)
 *
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} originalPhrase - Expected phrase
 * @returns {Object} Analysis results with scores and feedback
 */
export async function analyzePronunciation({ audioBuffer, originalPhrase }) {
  // For production: integrate with real speech recognition API
  // Azure Speech API example:
  // const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  // const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);
  // const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  // const result = await recognizer.recognizeOnceAsync();

  // CURRENT: Deterministic mock based on phrase complexity
  const wordScores = buildWordScores(originalPhrase);

  // Calculate metrics deterministically
  const accuracyScore = wordScores.reduce((sum, w) => sum + w.score, 0) / Math.max(wordScores.length, 1);

  // Fluency based on phrase characteristics (deterministic)
  const wordCount = wordScores.length;
  const avgWordLength = originalPhrase.replace(/[^a-zA-Z]/g, '').length / Math.max(wordCount, 1);

  let fluencyScore = 0.85;

  // Longer phrases = slightly harder fluency
  if (wordCount > 10) fluencyScore -= 0.05;
  else if (wordCount > 7) fluencyScore -= 0.03;

  // Longer average word length = slightly harder
  if (avgWordLength > 7) fluencyScore -= 0.04;
  else if (avgWordLength > 5) fluencyScore -= 0.02;

  fluencyScore = Math.min(0.98, Math.max(0.60, fluencyScore));

  // Overall pronunciation score (weighted average)
  const pronunciationScore = (accuracyScore * 0.6) + (fluencyScore * 0.4);

  // Generate contextual feedback
  const feedback = generateFeedback(pronunciationScore, wordScores, originalPhrase);

  // Calculate additional metrics
  const duration = estimateAudioDuration(originalPhrase);

  return {
    mock: true, // Set to false when real API is integrated
    accuracyScore: Math.round(accuracyScore * 100) / 100,
    fluencyScore: Math.round(fluencyScore * 100) / 100,
    pronunciationScore: Math.round(pronunciationScore * 100) / 100,
    feedback,
    wordScores,
    duration,
    metadata: {
      wordCount,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      syllableCount: wordScores.reduce((sum, w) => sum + (w.syllables?.length || 0), 0)
    }
  };
}

/**
 * Generate contextual feedback based on scores
 */
function generateFeedback(pronunciationScore, wordScores, phrase) {
  const weakWords = wordScores.filter(w => w.score < 0.70);
  const strongWords = wordScores.filter(w => w.score >= 0.85);

  if (pronunciationScore >= 0.90) {
    return 'Excellent pronunciation! Your clarity and articulation are outstanding. Keep up the great work!';
  }

  if (pronunciationScore >= 0.80) {
    const tips = weakWords.length > 0
      ? ` Pay extra attention to words like "${weakWords[0].word}".`
      : ' Focus on maintaining consistency across all words.';
    return `Great job! Your pronunciation is very good.${tips}`;
  }

  if (pronunciationScore >= 0.70) {
    const tips = weakWords.length > 0
      ? ` Try breaking down challenging words like "${weakWords[0].word}" into syllables and practice each part separately.`
      : ' Focus on rhythm and pace to improve fluency.';
    return `Good effort! You're making solid progress.${tips}`;
  }

  if (pronunciationScore >= 0.60) {
    return 'Keep practicing! Focus on pronouncing each word clearly. Listen to native speakers and repeat after them to improve your accent and intonation.';
  }

  return 'Don\'t give up! Pronunciation takes time and practice. Start with shorter, simpler phrases and gradually work your way up to more complex sentences.';
}

/**
 * Estimate audio duration based on phrase (rough approximation)
 * Average speaking rate: ~150 words per minute = 2.5 words/second
 */
function estimateAudioDuration(phrase) {
  const wordCount = phrase.split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / 2.5) * 10) / 10;
  return Math.max(1, estimatedSeconds);
}

export default {
  generatePhrase,
  analyzePronunciation
};
