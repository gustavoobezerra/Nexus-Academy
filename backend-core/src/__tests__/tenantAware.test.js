import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import studentRoutes from '../routes/students.js';
import { protect } from '../middleware/auth.js';

const app = express();
app.use(express.json());
app.use('/api/students', studentRoutes);
app.get('/api/courses/raw', protect, async (req, res) => {
  const courses = await Course.find();
  res.json({ courses });
});

describe('TenantAware Middleware - Isolamento de Dados', () => {
  let teacher1, teacher2, token1, token2;

  beforeEach(async () => {
    // Criar dois professores diferentes
    teacher1 = await global.createTestUser(User, { email: 'teacher1@test.com' });
    teacher2 = await global.createTestUser(User, { email: 'teacher2@test.com' });
    
    token1 = global.generateAuthToken(jwt, teacher1._id);
    token2 = global.generateAuthToken(jwt, teacher2._id);
  });

  describe('Isolamento de Alunos entre Professores', () => {
    it('deve retornar apenas alunos do professor autenticado', async () => {
      // Criar alunos para cada professor
      await global.createTestStudent(Student, teacher1._id, { name: 'Aluno Teacher 1' });
      await global.createTestStudent(Student, teacher1._id, { name: 'Aluno Teacher 1 - 2' });
      await global.createTestStudent(Student, teacher2._id, { name: 'Aluno Teacher 2' });

      // Buscar alunos do teacher1
      const res1 = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token1}`);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.students).toHaveLength(2);
      expect(res1.body.students.every(s => s.name.includes('Teacher 1'))).toBe(true);

      // Buscar alunos do teacher2
      const res2 = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token2}`);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.students).toHaveLength(1);
      expect(res2.body.students[0].name).toBe('Aluno Teacher 2');
    });

    it('nÆo deve permitir que um professor acesse aluno de outro professor', async () => {
      const student = await global.createTestStudent(Student, teacher1._id, { name: 'Aluno Privado' });

      // Tentar acessar com token do teacher2
      const res = await request(app)
        .get(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('nÆo encontrado');
    });

    it('nÆo deve permitir que um professor atualize aluno de outro professor', async () => {
      const student = await global.createTestStudent(Student, teacher1._id, { name: 'Aluno Original' });

      // Tentar atualizar com token do teacher2
      const res = await request(app)
        .put(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ name: 'Tentativa de Hack' });

      expect(res.status).toBe(404);
      
      // Verificar que o aluno nÆo foi alterado
      const studentAfter = await Student.findById(student._id);
      expect(studentAfter.name).toBe('Aluno Original');
    });

    it('nÆo deve permitir que um professor delete aluno de outro professor', async () => {
      const student = await global.createTestStudent(Student, teacher1._id, { name: 'Aluno Protegido' });

      // Tentar deletar com token do teacher2
      const res = await request(app)
        .delete(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(404);
      
      // Verificar que o aluno ainda est  ativo
      const studentAfter = await Student.findById(student._id);
      expect(studentAfter.active).toBe(true);
    });

    it('deve filtrar alunos corretamente por professor em queries com filtros', async () => {
      // Criar alunos com mesmo nome para professores diferentes
      await global.createTestStudent(Student, teacher1._id, { 
        name: 'JoÆo Silva',
        grade: '5o Ano',
        paymentStatus: 'paid'
      });
      await global.createTestStudent(Student, teacher2._id, { 
        name: 'JoÆo Silva',
        grade: '5o Ano',
        paymentStatus: 'paid'
      });

      // Buscar com filtro de s‚rie
      const res = await request(app)
        .get('/api/students?grade=5o Ano')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.students).toHaveLength(1);
      expect(res.body.students[0].teacher.toString()).toBe(teacher1._id.toString());
    });
  });

  describe('Isolamento em Estat¡sticas', () => {
    it('deve retornar estat¡sticas apenas do professor autenticado', async () => {
      await global.createTestStudent(Student, teacher1._id, { monthlyFee: 500 });
      await global.createTestStudent(Student, teacher1._id, { monthlyFee: 600 });
      await global.createTestStudent(Student, teacher2._id, { monthlyFee: 1000 });

      const res = await request(app)
        .get('/api/students/stats')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalStudents).toBe(2);
      expect(res.body.stats.totalMonthlyRevenue).toBe(1100); // 500 + 600
    });
  });

  describe('Isolamento em outros modelos', () => {
    it('deve filtrar cursos automaticamente por tenant', async () => {
      await Course.create({ title: 'Curso A', teacher: teacher1._id, subject: 'Math' });
      await Course.create({ title: 'Curso B', teacher: teacher2._id, subject: 'Science' });

      const res = await request(app)
        .get('/api/courses/raw')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.courses).toHaveLength(1);
      expect(res.body.courses[0].title).toBe('Curso A');
    });
  });
});
