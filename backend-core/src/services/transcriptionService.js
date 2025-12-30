/**
 * Transcription Service using Assembly AI (FREE tier: 3 hours/month)
 *
 * To activate:
 * 1. Sign up at https://www.assemblyai.com/ (FREE forever)
 * 2. Get your API key from dashboard
 * 3. Add to .env file: ASSEMBLYAI_API_KEY=your_key_here
 * 4. Install package: npm install assemblyai
 * 5. Uncomment the code below
 */

// Uncomment after getting API key:
// const { AssemblyAI } = require('assemblyai');

// Initialize client (only if API key is available)
// const client = process.env.ASSEMBLYAI_API_KEY
//   ? new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY })
//   : null;

/**
 * Transcribe audio file to text in Portuguese
 * @param {string} audioUrl - URL or local path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} Transcription result
 */
async function transcribeAudio(audioUrl, options = {}) {
  // Uncomment when ready to use:
  /*
  if (!client) {
    throw new Error('Assembly AI not configured. Please add ASSEMBLYAI_API_KEY to .env file');
  }

  try {
    const transcript = await client.transcripts.transcribe({
      audio_url: audioUrl,
      language_code: 'pt', // Portuguese
      speaker_labels: true, // Identify different speakers
      format_text: true, // Auto-format punctuation
      ...options
    });

    // Wait for transcription to complete
    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    return {
      success: true,
      text: transcript.text,
      words: transcript.words,
      speakers: transcript.utterances, // Who said what
      confidence: transcript.confidence,
      audio_duration: transcript.audio_duration
    };
  } catch (error) {
    console.error('Assembly AI transcription error:', error);
    return {
      success: false,
      error: error.message
    };
  }
  */

  // Mock response for now (until API key is configured)
  // DEBUG: console.log('⚠️ Assembly AI not configured. Using mock transcription.');
  return {
    success: true,
    text: '[Mock transcription] Olá, esta é uma transcrição de exemplo. Configure Assembly AI para transcrição real.',
    confidence: 0.95,
    audio_duration: 60,
    isMock: true
  };
}

/**
 * Transcribe audio in real-time (streaming)
 * @param {ReadableStream} audioStream - Audio stream
 * @returns {AsyncGenerator} Transcription chunks
 */
async function* transcribeRealtime(audioStream) {
  // Uncomment when ready to use:
  /*
  if (!client) {
    throw new Error('Assembly AI not configured');
  }

  const realtimeTranscriber = client.realtime.transcriber({
    sample_rate: 16000,
    encoding: 'pcm_s16le'
  });

  realtimeTranscriber.on('transcript', (transcript) => {
    if (transcript.text) {
      return {
        text: transcript.text,
        isFinal: transcript.message_type === 'FinalTranscript'
      };
    }
  });

  await realtimeTranscriber.connect();
  audioStream.pipe(realtimeTranscriber);

  yield* realtimeTranscriber;
  */

  // Mock for now
  yield {
    text: '[Real-time transcription não configurada. Adicione ASSEMBLYAI_API_KEY]',
    isFinal: true,
    isMock: true
  };
}

/**
 * Get transcription by ID (for checking status)
 */
async function getTranscription(transcriptId) {
  // Uncomment when ready:
  /*
  if (!client) {
    throw new Error('Assembly AI not configured');
  }

  const transcript = await client.transcripts.get(transcriptId);
  return {
    success: true,
    status: transcript.status,
    text: transcript.text,
    ...transcript
  };
  */

  return {
    success: false,
    error: 'Assembly AI not configured',
    isMock: true
  };
}

module.exports = {
  transcribeAudio,
  transcribeRealtime,
  getTranscription
};
