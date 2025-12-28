// backend-core/src/config/assemblyai.js
// Configuração do Assembly AI para transcrição de áudio

import axios from 'axios';

const baseUrl = 'https://api.assemblyai.com';
const headers = {
  authorization: process.env.ASSEMBLYAI_API_KEY
};

/**
 * Faz upload de arquivo de áudio para Assembly AI
 * @param {Buffer|string} audioData - Dados do áudio ou caminho do arquivo
 */
export async function uploadAudio(audioData) {
  try {
    console.log('📤 Fazendo upload de áudio para Assembly AI...');

    const uploadResponse = await axios.post(`${baseUrl}/v2/upload`, audioData, {
      headers
    });

    console.log('✅ Upload concluído:', uploadResponse.data.upload_url);

    return {
      success: true,
      audioUrl: uploadResponse.data.upload_url
    };

  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Solicita transcrição de um áudio
 * @param {string} audioUrl - URL do áudio (pode ser do upload ou URL externa)
 */
export async function requestTranscription(audioUrl) {
  try {
    console.log('🎙️  Solicitando transcrição...');

    const data = {
      audio_url: audioUrl,
      speech_model: 'universal',
      language_code: 'pt'
    };

    const response = await axios.post(`${baseUrl}/v2/transcript`, data, {
      headers: headers
    });

    console.log('✅ Transcrição solicitada:', response.data.id);

    return {
      success: true,
      transcriptId: response.data.id
    };

  } catch (error) {
    console.error('❌ Erro ao solicitar transcrição:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica status da transcrição e retorna resultado quando completo
 * @param {string} transcriptId - ID da transcrição
 */
export async function getTranscription(transcriptId) {
  try {
    const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;

    while (true) {
      const pollingResponse = await axios.get(pollingEndpoint, { headers });
      const result = pollingResponse.data;

      if (result.status === 'completed') {
        console.log('✅ Transcrição completa');
        return {
          success: true,
          text: result.text,
          confidence: result.confidence,
          words: result.words
        };
      } else if (result.status === 'error') {
        throw new Error(`Transcrição falhou: ${result.error}`);
      } else {
        console.log('⏳ Transcrição em andamento...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

  } catch (error) {
    console.error('❌ Erro na transcrição:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Função completa: upload + transcrição
 * @param {Buffer|string} audioData - Dados do áudio
 */
export async function transcribeAudio(audioData) {
  // Upload do áudio
  const uploadResult = await uploadAudio(audioData);
  if (!uploadResult.success) return uploadResult;

  // Solicita transcrição
  const transcriptResult = await requestTranscription(uploadResult.audioUrl);
  if (!transcriptResult.success) return transcriptResult;

  // Aguarda e retorna transcrição
  return await getTranscription(transcriptResult.transcriptId);
}

export { baseUrl, headers };
