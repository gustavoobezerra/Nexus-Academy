// backend-core/src/config/cloudinary.js
// Configuração do Cloudinary para upload de arquivos

import { v2 as cloudinary } from 'cloudinary';

/**
 * Configura o Cloudinary com as credenciais do .env
 * Esta configuração é global e só precisa ser feita uma vez
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Faz upload de arquivo para o Cloudinary
 * @param {string} filePath - Caminho do arquivo local ou buffer
 * @param {Object} options - Opções adicionais (folder, public_id, etc)
 * @returns {Promise<Object>} Resultado do upload com URL
 */
export async function uploadFile(filePath, options = {}) {
  try {
    // DEBUG: console.log('📤 Fazendo upload para Cloudinary...');

    const defaultOptions = {
      folder: 'nexus-academy',
      resource_type: 'auto',
      ...options
    };

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);

    // DEBUG: console.log('✅ Upload concluído:', result.secure_url);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };

  } catch (error) {
    console.error('❌ Erro no upload Cloudinary:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deleta arquivo do Cloudinary
 * @param {string} publicId - ID público do arquivo
 */
export async function deleteFile(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    // DEBUG: console.log('🗑️  Arquivo deletado:', publicId);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Erro ao deletar:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Faz upload de imagem com transformações
 * @param {string} filePath - Caminho da imagem
 * @param {Object} transforms - Transformações (width, height, crop, etc)
 */
export async function uploadImage(filePath, transforms = {}) {
  const options = {
    folder: 'nexus-academy/images',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      ...Object.entries(transforms).map(([key, value]) => ({ [key]: value }))
    ]
  };

  return await uploadFile(filePath, options);
}

/**
 * Faz upload de documento PDF
 */
export async function uploadDocument(filePath, filename) {
  const options = {
    folder: 'nexus-academy/documents',
    public_id: filename,
    resource_type: 'raw'
  };

  return await uploadFile(filePath, options);
}

export default cloudinary;
export { cloudinary };
