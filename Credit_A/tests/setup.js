// tests/setup.js - Jest setup file
import 'jest-environment-node';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';

// Global test timeout
jest.setTimeout(10000);

// Mock fetch globally
global.fetch = jest.fn();

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});