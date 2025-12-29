import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import studentRoutes from '../routes/students.js';
import { protect } from '../middleware/auth.js';

const app = express();
app.use(express.json());
app.use('/api/students', studentRoutes);

describe('Fluxo Completo de Registro de Aluno', () => {
  let teacher, token;

  beforeEach(async () => {
    teacher = await global.createTestUser(User);
    token = global.generateAuthToken(jwt, teacher._id);
  });

  describe('Criação de Aluno com Validações', () => {
    it('deve criar aluno com todos os campos obrigatórios', async () => {
      const studentData = {
        name: 'João Silva',
        age: 14,
        grade: '8o Ano',
        monthlyFee: 450,
        parentName: 'Maria Silva',
        parentEmail: 'maria@test.com',
        parentPhone: '(11) 99999-9999',
        email: 'joao@test.com',
        phone: '(11) 88888-8888'
      };

      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.student.name).toBe('João Silva');
      expect(res.body.student.teacher.toString()).toBe(teacher._id.toString());
      expect(res.body.student.active).toBe(true);
    });

    it('deve criar pagamento pendente automaticamente ao criar aluno', async () => {
      const studentData = {
        name: 'Pedro Santos',
        age: 12,
        grade: '6o Ano',
        monthlyFee: 500,
        parentName: 'Ana Santos',
        parentEmail: 'ana@test.com',
        parentPhone: '(11) 77777-7777'
      };

      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

      expect(res.status).toBe(201);
      const studentId = res.body.student._id;

      // Verificar se o pagamento foi criado
      const payment = await Payment.findOne({ student: studentId });
      expect(payment).toBeDefined();
      expect(payment.amount).toBe(500);
      expect(payment.status).toBe('pending');
      expect(payment.teacher.toString()).toBe(teacher._id.toString());
    });

    it('deve rejeitar criação sem campos obrigatórios', async () => {
      const incompleteData = {
        name: 'Aluno Incompleto'
        // Faltam campos obrigatórios
      };

      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(incompleteData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('obrigatórios');
    });

    it('deve sanitizar inputs para prevenir XSS', async () => {
      const maliciousData = {
        name: '<script>alert("XSS")</script>João',
        age: 14,
        grade: '8o Ano',
        monthlyFee: 450,
        parentName: 'Maria',
        parentEmail: 'maria@test.com',
        parentPhone: '(11) 99999-9999'
      };

      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousData);

      expect(res.status).toBe(201);
      // Verificar que o script foi removido
      expect(res.body.student.name).not.toContain('<script>');
      expect(res.body.student.name).not.toContain('</script>');
    });
  });

  describe('Atualização de Aluno', () => {
    it('deve atualizar aluno existente', async () => {
      const student = await global.createTestStudent(Student, teacher._id, {
        name: 'Aluno Original',
        monthlyFee: 400
      });

      const res = await request(app)
        .put(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Aluno Atualizado',
          monthlyFee: 550
        });

      expect(res.status).toBe(200);
      expect(res.body.student.name).toBe('Aluno Atualizado');
      expect(res.body.student.monthlyFee).toBe(550);
    });

    it('deve sanitizar inputs na atualização', async () => {
      const student = await global.createTestStudent(Student, teacher._id);

      const res = await request(app)
        .put(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '<img src=x onerror=alert(1)>Hack',
          notes: 'javascript:alert("XSS")'
        });

      expect(res.status).toBe(200);
      expect(res.body.student.name).not.toContain('<img');
      expect(res.body.student.name).not.toContain('onerror');
    });
  });

  describe('Exclusão de Aluno', () => {
    it('deve marcar aluno como inativo ao deletar', async () => {
      const student = await global.createTestStudent(Student, teacher._id, {
        name: 'Aluno para Deletar'
      });

      const res = await request(app)
        .delete(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verificar que o aluno foi marcado como inativo (soft delete)
      const deletedStudent = await Student.findById(student._id);
      expect(deletedStudent.active).toBe(false);
    });
  });

  describe('Busca e Filtros', () => {
    beforeEach(async () => {
      await global.createTestStudent(Student, teacher._id, {
        name: 'João Silva',
        grade: '5o Ano',
        paymentStatus: 'paid'
      });
      await global.createTestStudent(Student, teacher._id, {
        name: 'Maria Santos',
        grade: '6o Ano',
        paymentStatus: 'pending'
      });
      await global.createTestStudent(Student, teacher._id, {
        name: 'Pedro Costa',
        grade: '5o Ano',
        paymentStatus: 'late'
      });
    });

    it('deve filtrar por série', async () => {
      const res = await request(app)
        .get('/api/students?grade=5o Ano')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.students).toHaveLength(2);
      expect(res.body.students.every(s => s.grade === '5o Ano')).toBe(true);
    });

    it('deve filtrar por status de pagamento', async () => {
      const res = await request(app)
        .get('/api/students?paymentStatus=paid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.students).toHaveLength(1);
      expect(res.body.students[0].paymentStatus).toBe('paid');
    });

    it('deve buscar por nome, email ou telefone', async () => {
      const res = await request(app)
        .get('/api/students?search=João')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.students.length).toBeGreaterThan(0);
      expect(res.body.students.some(s => s.name.includes('João'))).toBe(true);
    });
  });
});

