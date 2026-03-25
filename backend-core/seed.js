import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './src/config/database.js';
import { ensureDevelopmentDemoData } from './src/dev/ensureDemoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const seedDatabase = async () => {
  const previousResetFlag = process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT;

  try {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      throw new Error('O seed canônico do Nexus Academy não deve ser executado em produção.');
    }

    console.log('🌱 Iniciando seed canônico do domínio demo...\n');

    await connectDB();

    process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT = 'true';
    const result = await ensureDevelopmentDemoData({ forceReset: true });

    if (!result) {
      throw new Error('Não foi possível preparar o domínio demo canônico.');
    }

    console.log('═══════════════════════════════════════════');
    console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════════\n');

    console.log('📊 DOMÍNIO DEMO PREPARADO:');
    console.log('   ✅ professor demo, portal do aluno e AI Hub alinhados');
    console.log('   ✅ classes, pagamentos, atividades, sinais e grupos resetados');
    console.log('   ✅ domínio compatível com os E2E e com a validação manual atual\n');

    console.log('🔑 CREDENCIAIS CANÔNICAS:');
    console.log('   👨‍🏫 Professor demo:');
    console.log(`      Email: ${result.teacherEmail}`);
    console.log(`      Senha: ${result.teacherPassword}\n`);
    console.log('   👨‍🎓 Aluno demo:');
    console.log(`      Email: ${result.studentEmail}`);
    console.log(`      Senha: ${result.studentPassword}\n`);

    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exitCode = 1;
  } finally {
    if (previousResetFlag === undefined) {
      delete process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT;
    } else {
      process.env.RESET_NEXUS_DEMO_DATA_ON_BOOT = previousResetFlag;
    }

    await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  }
};

await seedDatabase();
