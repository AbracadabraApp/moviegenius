// __tests__/pages/build.test.js
// Integration test to ensure build process works correctly

describe('Build Process Integration', () => {
  it('should have valid package.json configuration', () => {
    const packageJson = require('../../package.json');

    // Check essential scripts exist
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('test');
    expect(packageJson.scripts).toHaveProperty('lint');
    expect(packageJson.scripts).toHaveProperty('start');
    expect(packageJson.scripts).toHaveProperty('dev');

    // Check critical dependencies
    expect(packageJson.dependencies).toHaveProperty('next');
    expect(packageJson.dependencies).toHaveProperty('react');
    expect(packageJson.dependencies).toHaveProperty('@anthropic-ai/sdk');
    expect(packageJson.dependencies).toHaveProperty('@supabase/supabase-js');

    // Check test dependencies
    expect(packageJson.devDependencies).toHaveProperty('jest');
    expect(packageJson.devDependencies).toHaveProperty('@testing-library/react');
    expect(packageJson.devDependencies).toHaveProperty('eslint');
  });

  it('should have valid Next.js configuration', () => {
    const nextConfig = require('../../next.config.js');

    // Should be a valid Next.js config object
    expect(typeof nextConfig).toBe('object');

    // Should have compression enabled
    expect(nextConfig.compress).toBe(true);

    // Should have image configuration
    expect(nextConfig.images).toBeDefined();
    expect(nextConfig.images.domains).toContain('image.tmdb.org');

    // Should have cache headers configured
    expect(typeof nextConfig.headers).toBe('function');
  });

  it('should have valid Jest configuration', () => {
    const jestConfig = require('../../jest.config.js');

    // Should be a valid Jest config
    expect(typeof jestConfig).toBe('object');
    expect(jestConfig.testEnvironment).toBe('jest-environment-jsdom');
    expect(jestConfig.setupFilesAfterEnv).toContain('<rootDir>/jest.setup.js');

    // Should have coverage configuration
    expect(jestConfig.collectCoverageFrom).toBeDefined();
    expect(jestConfig.coverageThreshold).toBeDefined();
    expect(jestConfig.coverageThreshold.global.lines).toBeGreaterThan(0);
  });

  it('should have required environment variable mappings', () => {
    const nextConfig = require('../../next.config.js');

    // Environment variables should be defined (even if placeholders)
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    expect(process.env.NEXT_PUBLIC_TMDB_API_KEY).toBeDefined();
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
  });

  it('should have valid TypeScript configuration', () => {
    // Check if tsconfig.json exists and is valid
    let tsConfig;
    try {
      tsConfig = require('../../tsconfig.json');
    } catch (e) {
      // TypeScript config might not exist yet, that's ok for this test
      tsConfig = null;
    }

    if (tsConfig) {
      expect(tsConfig).toHaveProperty('compilerOptions');
      expect(tsConfig).toHaveProperty('include');
    }

    // At minimum, TypeScript types should be installed
    const packageJson = require('../../package.json');
    expect(packageJson.devDependencies).toHaveProperty('typescript');
    expect(packageJson.devDependencies).toHaveProperty('@types/react');
  });
});
