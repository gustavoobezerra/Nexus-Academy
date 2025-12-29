import CryptoJS from 'crypto-js';

const isProduction = process.env.NODE_ENV === 'production';
const keyFromEnv = process.env.ENCRYPTION_KEY;

if (!keyFromEnv) {
  const message = 'ENCRYPTION_KEY não definida. Configure uma chave segura no ambiente.';
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(`⚠️ ${message} Usando chave padrão apenas para desenvolvimento.`);
}

// Em desenvolvimento, ainda fornecemos fallback para não quebrar o fluxo,
// mas em produção o código acima já encerra o processo se a chave não existir.
const KEY = keyFromEnv || 'fallback-dev-key-change-in-production';

/**
 * Encripta um texto usando AES-256
 * @param {string} text - Texto a ser encriptado
 * @returns {string|null} Texto encriptado ou null se vazio
 */
export function encrypt(text) {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, KEY).toString();
}

/**
 * Descriptografa um texto encriptado
 * @param {string} encryptedText - Texto encriptado
 * @returns {string|null} Texto original ou null se vazio
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedText, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Encripta credenciais de gateway (objeto com múltiplos campos)
 * @param {Object} creds - Objeto com credenciais (ex: { mercadopago: { accessToken: 'xxx' } })
 * @returns {Object|null} Objeto com credenciais encriptadas
 */
export function encryptGatewayCredentials(creds) {
  if (!creds) return null;

  const encrypted = {};

  for (const [key, value] of Object.entries(creds)) {
    if (typeof value === 'object' && value !== null) {
      encrypted[key] = {};
      for (const [k, v] of Object.entries(value)) {
        encrypted[key][k] = encrypt(v);
      }
    } else {
      encrypted[key] = encrypt(value);
    }
  }

  return encrypted;
}

/**
 * Descriptografa credenciais de gateway
 * @param {Object} encrypted - Objeto com credenciais encriptadas
 * @returns {Object|null} Objeto com credenciais descriptografadas
 */
export function decryptGatewayCredentials(encrypted) {
  if (!encrypted) return null;

  const decrypted = {};

  for (const [key, value] of Object.entries(encrypted)) {
    if (typeof value === 'object' && value !== null) {
      decrypted[key] = {};
      for (const [k, v] of Object.entries(value)) {
        decrypted[key][k] = decrypt(v);
      }
    } else {
      decrypted[key] = decrypt(value);
    }
  }

  return decrypted;
}
