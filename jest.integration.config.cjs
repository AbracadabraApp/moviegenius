/**
 * Jest Configuration for Integration Tests
 * Tests actual database connections, API endpoints, and static generation pipeline
 */

module.exports = {
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testTimeout: 30000, // Allow for database operations and API calls
  maxWorkers: 2, // Limit concurrent database connections
  testEnvironment: 'node',

  // Environment variables
  setupFiles: ['<rootDir>/jest.integration.env.js'],

  // Coverage for integration tests
  collectCoverageFrom: [
    'pages/api/**/*.js',
    'lib/**/*.js',
    '!lib/**/*.test.js',
    '!**/node_modules/**'
  ],

  coverageReporters: ['text', 'lcov'],

  // Handle ES modules in Node environment
  preset: null
};