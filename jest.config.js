// jest.config.js
// Fix TextEncoder issue by providing custom Jest config without Next.js loader for API tests
const isApiTest = process.env.JEST_TEST_TYPE === 'api';

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: isApiTest ? 'node' : 'jest-environment-jsdom',
  
  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.spec.{js,jsx,ts,tsx}'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'pages/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!pages/_app.js',
    '!pages/_document.js',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@pages/(.*)$': '<rootDir>/pages/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  // Environment variables for testing
  setupFiles: ['<rootDir>/jest.env.js'],
  
  // Ignore certain directories
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  
  // Verbose output for better debugging
  verbose: true,
  
  // Add globals for Node.js environment compatibility
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

// Conditional export based on test type
if (isApiTest) {
  // For API tests, use basic config without Next.js integration
  module.exports = customJestConfig;
} else {
  // For component tests, use Next.js integration
  const nextJest = require('next/jest');
  const createJestConfig = nextJest({
    dir: './',
  });
  module.exports = createJestConfig(customJestConfig);
}