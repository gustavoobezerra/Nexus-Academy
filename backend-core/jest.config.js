export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/server-simple.js',
    '!src/config/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 30000,
  verbose: true
};
