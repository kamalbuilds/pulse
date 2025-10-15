const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/pages/**/*.test.{js,jsx,ts,tsx}',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Test timeout
  testTimeout: 30000,

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@solana/web3.js|@coral-xyz/anchor|@arcium-hq/client)/)',
  ],

  // Mock modules
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',

    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle image imports
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',

  // Test environments for different test types
  projects: [
    {
      displayName: 'Unit Tests',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    {
      displayName: 'Component Tests',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/components/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    {
      displayName: 'Integration Tests',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts'],
    },
  ],

  // Verbose output for CI
  verbose: process.env.CI === 'true',

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Custom reporters for different environments
  reporters: process.env.CI
    ? [
        'default',
        ['jest-junit', {
          outputDirectory: 'test-results',
          outputName: 'junit.xml',
        }],
        ['jest-html-reporters', {
          publicPath: 'test-results',
          filename: 'test-report.html',
        }],
      ]
    : ['default'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);