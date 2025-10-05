# Integration Testing Strategy for Static Builds

## Problem Statement
Our component audits focused on individual component compatibility but missed critical integration issues:
- **Trailer Duplication Bug**: All movies had identical trailer_url in database
- **Deprecated API Usage**: Supabase adapter failures went undetected
- **End-to-End Data Flow**: No testing of API → Database → Static File generation

## Core Testing Philosophy
Integration tests must validate **actual data flow** through the entire stack:
1. **Database → API → Component** (runtime validation)
2. **Database → Static Generation → File** (build-time validation)
3. **File → SSG → Browser** (deployment validation)

## Test Categories

### 1. API Integration Tests
Test actual API endpoints with real database connections:

```javascript
// __tests__/integration/api-endpoints.test.js
describe('API Integration Tests', () => {
  test('trailer API returns unique trailers for different movies', async () => {
    const movie1 = await fetch('/api/tmdb-trailer?tmdbId=550'); // Fight Club
    const movie2 = await fetch('/api/tmdb-trailer?tmdbId=18');  // Fifth Element

    const trailer1 = await movie1.json();
    const trailer2 = await movie2.json();

    expect(trailer1.videoId).not.toBe(trailer2.videoId);
    expect(trailer1.source).toBe('cache'); // Should hit database
  });
});
```

### 2. Static Generation Integration Tests
Test the complete enhanced-assembly.js pipeline:

```javascript
// __tests__/integration/static-generation.test.js
describe('Static Generation Integration', () => {
  test('assembleEnhancedMovieData produces valid static files', async () => {
    const enhancedData = await assembleEnhancedMovieData(550); // Fight Club

    // Validate structure
    expect(enhancedData.tmdbId).toBe(550);
    expect(enhancedData.movieHeader.trailerVideoId).toBeTruthy();
    expect(enhancedData.analysis.sections).toHaveLength(3);

    // Validate movie links are processed
    const sectionWithLinks = enhancedData.analysis.sections.find(s =>
      s.text.includes('class="movie-title"')
    );
    expect(sectionWithLinks).toBeTruthy();
  });
});
```

### 3. Database Corruption Detection Tests
Prevent mass data corruption like the trailer duplication:

```javascript
// __tests__/integration/data-integrity.test.js
describe('Database Integrity Tests', () => {
  test('trailer URLs are unique across movies', async () => {
    const pool = getPool();
    const client = await pool.connect();

    const result = await client.query(`
      SELECT trailer_url, COUNT(*) as count
      FROM movies
      WHERE trailer_url IS NOT NULL
      GROUP BY trailer_url
      HAVING COUNT(*) > 100  -- Flag suspicious duplicates
    `);

    expect(result.rows).toHaveLength(0); // No mass duplicates
    client.release();
  });
});
```

## Critical Test Scenarios

### Scenario 1: End-to-End Movie Page Generation
**Test**: Generate a complete movie page from database to rendered HTML
**Validates**: Database queries, API responses, static file assembly, component rendering

### Scenario 2: Trailer API Corruption Detection
**Test**: Verify trailer API returns unique values for sample movies
**Validates**: Database integrity, API caching logic, TMDB integration

### Scenario 3: Person/Movie Linking Pipeline
**Test**: Verify movie mentions are converted to proper links
**Validates**: movie-analysis-linker.js, database lookups, enhanced-assembly.js

### Scenario 4: Static File Validity
**Test**: Validate generated JSON files match expected schema
**Validates**: Enhanced static generation, data completeness, JSON structure

## Test Data Strategy

### Real Database Testing
- Use actual Railway database for integration tests
- Test against known movie IDs: 550 (Fight Club), 18 (Fifth Element), 78 (Blade Runner)
- Verify real TMDB API responses

### Fixture Data
- Create minimal database snapshots for isolated testing
- Mock heavy external API calls when testing internal logic
- Use consistent test movies across all test suites

## Test Infrastructure

### Environment Setup
```javascript
// jest.integration.config.js
module.exports = {
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testTimeout: 30000, // Allow for database operations
  maxWorkers: 2 // Limit concurrent database connections
};
```

### Database Connection Management
```javascript
// jest.integration.setup.js
import { getPool } from './lib/enhanced-assembly.js';

let pool;

beforeAll(async () => {
  pool = getPool();
});

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});
```

## Monitoring Integration

### Build-Time Validation
Integration tests run during static generation:
```bash
npm run test:integration && npm run build:static
```

### Deployment Validation
Post-deployment smoke tests verify critical paths:
- Sample movie pages load correctly
- Trailers are unique and functional
- Person/movie links resolve properly

## Success Metrics

1. **Zero False Positives**: Integration tests only fail for real issues
2. **Coverage of Critical Paths**: All major data flows tested
3. **Early Problem Detection**: Issues caught before deployment
4. **Actionable Failures**: Test failures clearly indicate fix needed

## Implementation Priority

### Phase 1: Critical Path Tests (Immediate)
- Trailer API uniqueness validation
- Basic static generation pipeline
- Database connectivity verification

### Phase 2: Comprehensive Coverage (Next Sprint)
- Complete movie page generation pipeline
- Person/movie linking validation
- Enhanced static file schema validation

### Phase 3: Continuous Monitoring (Ongoing)
- Pre-commit hooks for integration tests
- Deployment validation automation
- Performance regression detection

## Why This Approach Works

1. **Tests Actual Behavior**: Uses real database and API calls
2. **Catches Integration Issues**: Tests component interaction, not isolation
3. **Validates End-to-End**: From database to final static files
4. **Prevents Regressions**: Automated detection of issues like trailer corruption
5. **Documentation**: Tests serve as living documentation of expected behavior