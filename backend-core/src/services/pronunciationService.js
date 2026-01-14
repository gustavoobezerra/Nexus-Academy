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

function scoreWord(word) {
  // Score pseudo-aleatório estável baseado na palavra
  const seed = word.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const random = (Math.sin(seed) + 1) / 2; // 0..1
  return Math.min(0.98, Math.max(0.45, 0.7 + (random - 0.5) * 0.4));
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

function scoreSyllable(syllable) {
  const seed = syllable.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const random = (Math.sin(seed) + 1) / 2;
  return Math.min(0.98, Math.max(0.45, 0.65 + (random - 0.5) * 0.5));
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

export async function analyzePronunciation({ audioBuffer, originalPhrase }) {
  // Para futuras integrações, enviar audioBuffer para provedor externo (Azure, Google, etc.)
  // Aqui usamos um mock baseado na frase para manter o fluxo funcionando em ambientes sem chave.
  const wordScores = buildWordScores(originalPhrase);
  const accuracyScore = wordScores.reduce((sum, w) => sum + w.score, 0) / Math.max(wordScores.length, 1);
  const fluencyScore = Math.min(0.98, Math.max(0.5, accuracyScore - 0.05 + Math.random() * 0.1));
  const pronunciationScore = (accuracyScore * 0.6) + (fluencyScore * 0.4);

  const feedback = pronunciationScore >= 0.9
    ? 'Parabéns! Pronúncia excelente. Continue praticando para manter o nível.'
    : pronunciationScore >= 0.75
      ? 'Bom trabalho! Foque em ajustar a articulação de algumas palavras.'
      : 'Continue praticando. Concentre-se em ritmo e clareza dos sons.';

  return {
    mock: true,
    accuracyScore,
    fluencyScore,
    pronunciationScore,
    feedback,
    wordScores
  };
}

export default {
  generatePhrase,
  analyzePronunciation
};
