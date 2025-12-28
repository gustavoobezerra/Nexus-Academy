import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import studentRoutes from '../routes/students.js';
import { protect } from '../middleware/auth.js';

const app = express();
app.use(express.json());
app.use('/api/students', studentRoutes);

describe('Students API', () => {
  let user, token;

  beforeEach(async () => {
    user = await global.createTestUser(User);
    token = global.generateAuthToken(jwt, user._id);
  });

  describe('GET /api/students', () => {
    it('should get all students for teacher', async () => {
      await global.createTestStudent(Student, user._id);
      await global.createTestStudent(Student, user._id, { name: 'Student 2' });

      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.students).toHaveLength(2);
    });

    it('should not get students without auth', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/students', () => {
    it('should create a new student', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Student',
          age: 14,
          grade: '8o Ano',
          parentName: 'Parent Name',
          parentEmail: 'parent@test.com',
          parentPhone: '(11) 99999-9999',
          monthlyFee: 450
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.student.name).toBe('New Student');
    });

    it('should not create student without required fields', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/students/:id', () => {
    it('should get a single student', async () => {
      const student = await global.createTestStudent(Student, user._id);

      const res = await request(app)
        .get(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.student.name).toBe('Test Student');
    });

    it('should return 404 for non-existent student', async () => {
      const res = await request(app)
        .get('/api/students/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should update a student', async () => {
      const student = await global.createTestStudent(Student, user._id);

      const res = await request(app)
        .put(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', monthlyFee: 600 });

      expect(res.status).toBe(200);
      expect(res.body.student.name).toBe('Updated Name');
      expect(res.body.student.monthlyFee).toBe(600);
    });
  });

  describe('DELETE /api/students/:id', () => {
    it('should delete a student', async () => {
      const student = await global.createTestStudent(Student, user._id);

      const res = await request(app)
        .delete(`/api/students/${student._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await Student.findById(student._id);
      expect(deleted.active).toBe(false);
    });
  });

  describe('GET /api/students/stats', () => {
    it('should get student statistics', async () => {
      await global.createTestStudent(Student, user._id, { paymentStatus: 'paid' });
      await global.createTestStudent(Student, user._id, { paymentStatus: 'pending' });

      const res = await request(app)
        .get('/api/students/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
    });
  });
});
