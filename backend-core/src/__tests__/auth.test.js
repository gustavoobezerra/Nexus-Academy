import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authRoutes from '../routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Teacher',
          email: 'newteacher@test.com',
          password: 'password123',
          phone: '(11) 99999-9999'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newteacher@test.com');
    });

    it('should not register with existing email', async () => {
      await User.create({
        name: 'Existing User',
        email: 'existing@test.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'existing@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not register without required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Test User',
        email: 'login@test.com',
        password: 'password123'
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      const user = await User.create({
        name: 'Token User',
        email: 'token@test.com',
        password: 'password123'
      });

      const token = global.generateAuthToken(jwt, user._id);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('token@test.com');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
    });
  });
});
