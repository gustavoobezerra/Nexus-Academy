// backend-core/seed.js
// Script para popular o banco de dados com dados iniciais

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import User from './src/models/User.js';
import Student from './src/models/Student.js';
import Class from './src/models/Class.js';
import Payment from './src/models/Payment.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    // Conectar ao MongoDB
    await connectDB();

    // Limpar dados existentes (CUIDADO: isso apaga tudo!)
    console.log('🗑️  Limpando dados existentes...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Class.deleteMany({});
    await Payment.deleteMany({});
    console.log('✅ Dados limpos\n');

    // ==========================================
    // CRIAR USUÁRIOS (PROFESSOR E ADMIN)
    // ==========================================

    console.log('👤 Criando usuários...');

    const professor = await User.create({
      name: 'Professor Nexus',
      email: 'professor@nexus.com',
      password: '123456',
      phone: '(11) 98765-4321',
      role: 'teacher',
      bio: 'Professor experiente em Matemática e Física',
      subjects: ['Matemática', 'Física', 'Química'],
      active: true,
      emailVerified: true,
      subscription: {
        plan: 'pro',
        status: 'active',
        features: {
          maxStudents: 100,
          maxClasses: 500,
          aiFeatures: true,
          advancedAnalytics: true,
          customBranding: true
        }
      }
    });

    const admin = await User.create({
      name: 'Admin Nexus',
      email: 'admin@nexus.com',
      password: '123456',
      phone: '(11) 91234-5678',
      role: 'admin',
      active: true,
      emailVerified: true,
      subscription: {
        plan: 'enterprise',
        status: 'active'
      }
    });

    console.log('✅ Usuários criados:');
    console.log(`   - ${professor.name} (${professor.email})`);
    console.log(`   - ${admin.name} (${admin.email})\n`);

    // ==========================================
    // CRIAR ALUNOS
    // ==========================================

    console.log('👨‍🎓 Criando alunos...');

    const studentsData = [
      {
        name: 'Ana Silva',
        email: 'ana.silva@email.com',
        age: 15,
        grade: '9º ano',
        subject: 'Matemática',
        parentName: 'Maria Silva',
        parentEmail: 'maria.silva@email.com',
        parentPhone: '(11) 99876-5432',
        monthlyFee: 500,
        paymentStatus: 'paid',
        paymentDay: 5,
        preferredDays: ['monday', 'wednesday'],
        preferredTimes: ['14:00', '16:00'],
        performance: {
          overall: 85,
          trend: 'up',
          strengths: ['Álgebra', 'Geometria'],
          weaknesses: ['Estatística']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Bruno Costa',
        email: 'bruno.costa@email.com',
        age: 16,
        grade: '1º EM',
        subject: 'Física',
        parentName: 'João Costa',
        parentEmail: 'joao.costa@email.com',
        parentPhone: '(11) 98765-1234',
        monthlyFee: 600,
        paymentStatus: 'pending',
        paymentDay: 10,
        preferredDays: ['tuesday', 'thursday'],
        preferredTimes: ['15:00', '17:00'],
        performance: {
          overall: 75,
          trend: 'stable',
          strengths: ['Mecânica'],
          weaknesses: ['Eletromagnetismo']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Carla Oliveira',
        email: 'carla.oliveira@email.com',
        age: 14,
        grade: '8º ano',
        subject: 'Química',
        parentName: 'Ana Oliveira',
        parentEmail: 'ana.oliveira@email.com',
        parentPhone: '(11) 97654-3210',
        monthlyFee: 450,
        paymentStatus: 'paid',
        paymentDay: 15,
        preferredDays: ['monday', 'friday'],
        preferredTimes: ['13:00', '15:00'],
        performance: {
          overall: 90,
          trend: 'up',
          strengths: ['Química Orgânica', 'Reações'],
          weaknesses: []
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Daniel Santos',
        email: 'daniel.santos@email.com',
        age: 17,
        grade: '2º EM',
        subject: 'Matemática',
        parentName: 'Pedro Santos',
        parentEmail: 'pedro.santos@email.com',
        parentPhone: '(11) 96543-2109',
        monthlyFee: 550,
        paymentStatus: 'late',
        paymentDay: 5,
        preferredDays: ['wednesday', 'saturday'],
        preferredTimes: ['10:00', '14:00'],
        performance: {
          overall: 70,
          trend: 'down',
          strengths: ['Cálculo'],
          weaknesses: ['Trigonometria', 'Funções']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Eduarda Lima',
        email: 'eduarda.lima@email.com',
        age: 15,
        grade: '9º ano',
        subject: 'Física',
        parentName: 'Mariana Lima',
        parentEmail: 'mariana.lima@email.com',
        parentPhone: '(11) 95432-1098',
        monthlyFee: 500,
        paymentStatus: 'paid',
        paymentDay: 20,
        preferredDays: ['tuesday', 'thursday'],
        preferredTimes: ['16:00', '18:00'],
        performance: {
          overall: 88,
          trend: 'up',
          strengths: ['Cinemática', 'Dinâmica'],
          weaknesses: ['Termodinâmica']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Felipe Almeida',
        email: 'felipe.almeida@email.com',
        age: 16,
        grade: '1º EM',
        subject: 'Matemática',
        parentName: 'Carlos Almeida',
        parentEmail: 'carlos.almeida@email.com',
        parentPhone: '(11) 94321-0987',
        monthlyFee: 600,
        paymentStatus: 'pending',
        paymentDay: 10,
        preferredDays: ['monday', 'wednesday', 'friday'],
        preferredTimes: ['14:00'],
        performance: {
          overall: 92,
          trend: 'up',
          strengths: ['Álgebra', 'Geometria Analítica'],
          weaknesses: []
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Gabriela Rocha',
        email: 'gabriela.rocha@email.com',
        age: 14,
        grade: '8º ano',
        subject: 'Química',
        parentName: 'Beatriz Rocha',
        parentEmail: 'beatriz.rocha@email.com',
        parentPhone: '(11) 93210-9876',
        monthlyFee: 450,
        paymentStatus: 'paid',
        paymentDay: 5,
        preferredDays: ['tuesday', 'thursday'],
        preferredTimes: ['15:00'],
        performance: {
          overall: 78,
          trend: 'stable',
          strengths: ['Tabela Periódica'],
          weaknesses: ['Estequiometria']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Henrique Martins',
        email: 'henrique.martins@email.com',
        age: 17,
        grade: '2º EM',
        subject: 'Física',
        parentName: 'Ricardo Martins',
        parentEmail: 'ricardo.martins@email.com',
        parentPhone: '(11) 92109-8765',
        monthlyFee: 550,
        paymentStatus: 'paid',
        paymentDay: 15,
        preferredDays: ['monday', 'friday'],
        preferredTimes: ['16:00'],
        performance: {
          overall: 82,
          trend: 'up',
          strengths: ['Óptica', 'Ondas'],
          weaknesses: ['Eletricidade']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'Isabela Ferreira',
        email: 'isabela.ferreira@email.com',
        age: 15,
        grade: '9º ano',
        subject: 'Matemática',
        parentName: 'Paula Ferreira',
        parentEmail: 'paula.ferreira@email.com',
        parentPhone: '(11) 91098-7654',
        monthlyFee: 500,
        paymentStatus: 'late',
        paymentDay: 10,
        preferredDays: ['wednesday', 'saturday'],
        preferredTimes: ['14:00'],
        performance: {
          overall: 65,
          trend: 'stable',
          strengths: ['Geometria'],
          weaknesses: ['Álgebra', 'Funções']
        },
        teacher: professor._id,
        active: true
      },
      {
        name: 'João Pedro Souza',
        email: 'joao.souza@email.com',
        age: 16,
        grade: '1º EM',
        subject: 'Química',
        parentName: 'Fernanda Souza',
        parentEmail: 'fernanda.souza@email.com',
        parentPhone: '(11) 90987-6543',
        monthlyFee: 600,
        paymentStatus: 'paid',
        paymentDay: 20,
        preferredDays: ['tuesday', 'thursday'],
        preferredTimes: ['17:00'],
        performance: {
          overall: 87,
          trend: 'up',
          strengths: ['Química Inorgânica', 'Equilíbrio Químico'],
          weaknesses: ['Cinética Química']
        },
        teacher: professor._id,
        active: true
      }
    ];

    const students = await Student.insertMany(studentsData);
    console.log(`✅ ${students.length} alunos criados\n`);

    // ==========================================
    // CRIAR AULAS
    // ==========================================

    console.log('📚 Criando aulas...');

    const now = new Date();
    const classesData = [];

    // Criar aulas passadas (completadas)
    for (let i = 0; i < 5; i++) {
      const student = students[i % students.length];
      const daysAgo = 7 + i * 2;
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() - daysAgo);

      classesData.push({
        title: `Aula de ${student.subject} - ${student.name}`,
        description: 'Aula regular',
        subject: student.subject,
        grade: student.grade,
        topic: 'Revisão geral',
        student: student._id,
        teacher: professor._id,
        studentName: student.name,
        scheduledAt: scheduledDate,
        duration: 60,
        actualDuration: 58,
        startedAt: scheduledDate,
        endedAt: new Date(scheduledDate.getTime() + 58 * 60000),
        status: 'completed',
        notes: 'Aula produtiva. Aluno demonstrou bom entendimento.',
        assessmentScore: 80 + Math.floor(Math.random() * 20)
      });
    }

    // Criar aulas futuras (agendadas)
    for (let i = 0; i < 10; i++) {
      const student = students[i % students.length];
      const daysAhead = 1 + i;
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + daysAhead);
      scheduledDate.setHours(14 + (i % 4), 0, 0, 0);

      classesData.push({
        title: `Aula de ${student.subject} - ${student.name}`,
        description: 'Aula agendada',
        subject: student.subject,
        grade: student.grade,
        topic: i % 2 === 0 ? 'Novo conteúdo' : 'Exercícios práticos',
        student: student._id,
        teacher: professor._id,
        studentName: student.name,
        scheduledAt: scheduledDate,
        duration: 60,
        status: 'scheduled'
      });
    }

    const classes = await Class.insertMany(classesData);
    console.log(`✅ ${classes.length} aulas criadas (${classesData.filter(c => c.status === 'completed').length} completadas, ${classesData.filter(c => c.status === 'scheduled').length} agendadas)\n`);

    // ==========================================
    // CRIAR PAGAMENTOS
    // ==========================================

    console.log('💰 Criando pagamentos...');

    const paymentsData = [];
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Criar pagamentos do mês atual para cada aluno
    for (const student of students) {
      const dueDate = new Date(currentYear, currentMonth - 1, student.paymentDay);

      paymentsData.push({
        student: student._id,
        teacher: professor._id,
        amount: student.monthlyFee,
        originalAmount: student.monthlyFee,
        month: now.toLocaleString('pt-BR', { month: 'long' }),
        year: currentYear,
        dueDate: dueDate,
        status: student.paymentStatus,
        paidAt: student.paymentStatus === 'paid' ? new Date(dueDate.getTime() - 86400000) : null,
        paymentMethod: student.paymentStatus === 'paid' ? 'pix' : null
      });
    }

    // Criar alguns pagamentos do mês passado (todos pagos)
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    for (let i = 0; i < 5; i++) {
      const student = students[i];
      const dueDate = new Date(lastMonthYear, lastMonth - 1, student.paymentDay);

      paymentsData.push({
        student: student._id,
        teacher: professor._id,
        amount: student.monthlyFee,
        month: new Date(lastMonthYear, lastMonth - 1).toLocaleString('pt-BR', { month: 'long' }),
        year: lastMonthYear,
        dueDate: dueDate,
        status: 'paid',
        paidAt: new Date(dueDate.getTime() + 86400000 * 2),
        paymentMethod: i % 2 === 0 ? 'pix' : 'credit_card'
      });
    }

    const payments = await Payment.insertMany(paymentsData);
    console.log(`✅ ${payments.length} pagamentos criados\n`);

    // ==========================================
    // RESUMO
    // ==========================================

    console.log('═══════════════════════════════════════════');
    console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════════\n');

    console.log('📊 RESUMO:');
    console.log(`   ✅ ${await User.countDocuments()} usuários`);
    console.log(`   ✅ ${await Student.countDocuments()} alunos`);
    console.log(`   ✅ ${await Class.countDocuments()} aulas`);
    console.log(`   ✅ ${await Payment.countDocuments()} pagamentos\n`);

    console.log('🔑 CREDENCIAIS DE LOGIN:');
    console.log('   👨‍🏫 Professor:');
    console.log('      Email: professor@nexus.com');
    console.log('      Senha: 123456\n');
    console.log('   👤 Admin:');
    console.log('      Email: admin@nexus.com');
    console.log('      Senha: 123456\n');

    console.log('═══════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO NO SEED:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Executar seed
seedDatabase();
