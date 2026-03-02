/**
 * Transcription Service using AssemblyAI
 * FREE tier: 3 hours/month
 * Docs: https://www.assemblyai.com/docs
 */

import { AssemblyAI } from 'assemblyai';

const client = process.env.ASSEMBLYAI_API_KEY
  ? new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY })
  : null;

/**
 * Transcribe audio file to text in Portuguese
 * @param {string} audioUrl - URL or local path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} Transcription result
 */
async function transcribeAudio(audioUrl, options = {}) {
  if (!client) {
    console.log('⚠️ AssemblyAI not configured. Using mock transcription.');
    return {
      success: true,
      text: '[Mock transcription] Configure ASSEMBLYAI_API_KEY para transcrição real.',
      confidence: 0.95,
      audio_duration: 60,
      isMock: true
    };
  }

  try {
    const transcript = await client.transcripts.transcribe({
      audio_url: audioUrl,
      language_code: 'pt',
      speaker_labels: true,
      format_text: true,
      ...options
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    return {
      success: true,
      text: transcript.text,
      words: transcript.words,
      speakers: transcript.utterances,
      confidence: transcript.confidence,
      audio_duration: transcript.audio_duration
    };
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Transcribe audio in real-time (streaming)
 * @param {ReadableStream} audioStream - Audio stream
 * @returns {AsyncGenerator} Transcription chunks
 */
async function* transcribeRealtime(audioStream) {
  if (!client) {
    yield {
      text: '[Real-time transcription não configurada. Adicione ASSEMBLYAI_API_KEY]',
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
}

/**
 * Get transcription by ID (for checking status)
 */
async function getTranscription(transcriptId) {
  if (!client) {
    return {
      success: false,
      error: 'AssemblyAI not configured. Add ASSEMBLYAI_API_KEY to .env',
      isMock: true
    };
  }

  try {
    const transcript = await client.transcripts.get(transcriptId);
    return {
      success: true,
      status: transcript.status,
      text: transcript.text,
      ...transcript
    };
  } catch (error) {
    console.error('AssemblyAI getTranscription error:', error);
    return { success: false, error: error.message };
  }
}

export {
  transcribeAudio,
  transcribeRealtime,
  getTranscription
};
