import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import User from '../models/User.js';
import Student from '../models/Student.js';
import portalAuthRoutes from '../routes/portal/auth.js';
import portalProfileRoutes from '../routes/portal/profile.js';

const app = express();
app.use(express.json());
app.use('/api/portal', portalAuthRoutes);
app.use('/api/portal', portalProfileRoutes);

describe('Portal Auth', () => {
  it('should register an adult student without guardian fields when using the teacher link flow', async () => {
    const teacher = await global.createTestUser(User, {
      slug: 'professor-adulto',
      subscriptionStatus: 'active'
    });

    const res = await request(app)
      .post('/api/portal/auth/register')
      .send({
        name: 'Aluno Adulto',
        email: 'adulto@test.com',
        password: 'Password123!',
        age: 21,
        grade: 'Ensino Superior',
        teacherId: teacher._id.toString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.student.email).toBe('adulto@test.com');
    expect(res.body.student.teacher.id).toBe(teacher._id.toString());

    const student = await Student.findOne({ 'portalAccess.email': 'adulto@test.com' });
    expect(student).toBeDefined();
    expect(student.parentName).toBeUndefined();
    expect(student.teacher.toString()).toBe(teacher._id.toString());
  });

  it('should reject portal access when the student is disabled after token issuance', async () => {
    const teacher = await global.createTestUser(User, { subscriptionStatus: 'active' });
    const passwordHash = await bcrypt.hash('Password123!', 12);

    const student = await Student.create({
      name: 'Aluno Bloqueado',
      email: 'bloqueado@test.com',
      age: 16,
      grade: '2o Ano',
      parentName: 'Responsavel',
      parentEmail: 'responsavel@test.com',
      parentPhone: '(11) 99999-9999',
      monthlyFee: 0,
      teacher: teacher._id,
      active: true,
      portalAccess: {
        enabled: true,
        email: 'bloqueado@test.com',
        password: passwordHash
      }
    });

    const token = jwt.sign(
      {
        studentId: student._id.toString(),
        type: 'student',
        teacherId: teacher._id.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const successRes = await request(app)
      .get('/api/portal/me')
      .set('Authorization', `Bearer ${token}`);

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);

    await Student.findByIdAndUpdate(student._id, {
      active: false,
      'portalAccess.enabled': false
    });

    const blockedRes = await request(app)
      .get('/api/portal/me')
      .set('Authorization', `Bearer ${token}`);

    expect(blockedRes.status).toBe(401);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.message).toBe('Acesso ao portal desativado');
  });
});
