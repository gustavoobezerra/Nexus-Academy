import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeoutMS: 60000,
    },
    binary: {
      version: '6.0.4',
      skipMD5: true,
    }
  });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Global test utilities
global.createTestUser = async (User, overrides = {}) => {
  const user = await User.create({
    name: 'Test Teacher',
    email: `test${Date.now()}@test.com`,
    password: 'password123',
    role: 'teacher',
    ...overrides
  });
  return user;
};

global.createTestStudent = async (Student, teacherId, overrides = {}) => {
  const student = await Student.create({
    name: 'Test Student',
    age: 12,
    grade: '7o Ano',
    parentName: 'Test Parent',
    parentEmail: `parent${Date.now()}@test.com`,
    parentPhone: '(11) 99999-9999',
    monthlyFee: 500,
    teacher: teacherId,
    ...overrides
  });
  return student;
};

global.generateAuthToken = (jwt, userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'nexus-secret-key-2025',
    { expiresIn: '1h' }
  );
};
