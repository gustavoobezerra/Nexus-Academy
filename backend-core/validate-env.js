/**
 * Script de validação de variáveis de ambiente
 * Execute antes do deploy para garantir que todas as configurações necessárias estão presentes
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const requiredVars = [
  'NODE_ENV',
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'FRONTEND_URL',
  'API_URL'
];

const optionalVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_BASIC',
  'STRIPE_PRICE_PRO',
  'RESEND_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_URL',
  'ASSEMBLYAI_API_KEY',
  'DAILY_API_KEY',
  'GEMINI_API_KEY'
];

console.log('🔍 Validando variáveis de ambiente...\n');

let hasErrors = false;
let hasWarnings = false;

// Verificar variáveis obrigatórias
console.log('✅ Variáveis Obrigatórias:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName}: FALTANDO`);
    hasErrors = true;
  } else {
    // Mascarar valores sensíveis
    const displayValue = varName.includes('SECRET') || varName.includes('KEY')
      ? value.substring(0, 10) + '...'
      : value;
    console.log(`  ✓ ${varName}: ${displayValue}`);
  }
});

console.log('\n⚠️  Variáveis Opcionais (mas recomendadas):');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ⚠️  ${varName}: não configurado`);
    hasWarnings = true;
  } else {
    const displayValue = varName.includes('SECRET') || varName.includes('KEY')
      ? value.substring(0, 10) + '...'
      : value;
    console.log(`  ✓ ${varName}: ${displayValue}`);
  }
});

// Validações específicas
console.log('\n🔐 Validações de Segurança:');

// JWT Secret strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.log('  ⚠️  JWT_SECRET muito curto (recomendado: 32+ caracteres)');
  hasWarnings = true;
} else if (process.env.JWT_SECRET) {
  console.log('  ✓ JWT_SECRET tem comprimento adequado');
}

// Encryption Key strength
if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
  console.log('  ⚠️  ENCRYPTION_KEY muito curto (recomendado: 32+ caracteres)');
  hasWarnings = true;
} else if (process.env.ENCRYPTION_KEY) {
  console.log('  ✓ ENCRYPTION_KEY tem comprimento adequado');
}

// MongoDB URI format
if (process.env.MONGO_URI && !process.env.MONGO_URI.startsWith('mongodb')) {
  console.log('  ❌ MONGO_URI formato inválido');
  hasErrors = true;
} else if (process.env.MONGO_URI) {
  console.log('  ✓ MONGO_URI formato válido');
}

// NODE_ENV check
if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'production') {
  console.log('  ⚠️  NODE_ENV deve ser "development" ou "production"');
  hasWarnings = true;
} else {
  console.log(`  ✓ NODE_ENV: ${process.env.NODE_ENV}`);
}

// CORS URLs check
if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('http://') && process.env.NODE_ENV === 'production') {
  console.log('  ⚠️  FRONTEND_URL usa HTTP em produção (recomendado: HTTPS)');
  hasWarnings = true;
}

console.log('\n📊 Resultado:');
if (hasErrors) {
  console.log('  ❌ ERROS ENCONTRADOS - Corrija antes de fazer deploy!');
  process.exit(1);
} else if (hasWarnings) {
  console.log('  ⚠️  AVISOS ENCONTRADOS - Revise as configurações');
  console.log('  ✅ Variáveis obrigatórias OK - Deploy pode continuar');
  process.exit(0);
} else {
  console.log('  ✅ TUDO OK - Pronto para deploy!');
  process.exit(0);
}
