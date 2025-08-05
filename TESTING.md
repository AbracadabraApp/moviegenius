# MovieGenius Testing Documentation

## Overview

This comprehensive testing suite eliminates the "blind deployment" problem that has historically caused instability in MovieGenius. The test framework provides confidence for feature development and ensures Railway PostgreSQL integration works reliably.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Architecture](#test-architecture)
- [Critical User Paths](#critical-user-paths)
- [Railway PostgreSQL Integration](#railway-postgresql-integration)
- [Performance Benchmarks](#performance-benchmarks)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Railway PostgreSQL connection string (for integration tests)

### Installation

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test -- __tests__/critical-paths/
npm run test -- __tests__/api-endpoints/
npm run test -- __tests__/components/
```

### Environment Setup

Create a `.env.test` file:

```env
NODE_ENV=test
RAILWAY_DATABASE_URL=postgresql://test:test@localhost:5432/moviegenius_test
JEST_TIMEOUT=30000
```

## Test Architecture

### Test Categories

1. **Critical User Paths** (`__tests__/critical-paths/`)
   - Movie page load → API call → analysis display flow
   - Search functionality and movie discovery
   - Error handling and recovery scenarios
   - Mobile responsiveness and accessibility

2. **Railway PostgreSQL Integration** (`__tests__/railway-integration/`)
   - Database connectivity and query performance
   - Movie lookup by TMDB ID accuracy
   - Analysis retrieval and format validation
   - Connection pooling and cleanup

3. **API Endpoint Testing** (`__tests__/api-endpoints/`)
   - `/api/movie-analysis` response format validation
   - Error scenarios (missing movie, missing analysis, DB failure)
   - Response time and performance benchmarks
   - HTTP status code correctness

4. **Frontend Component Testing** (`__tests__/components/`)
   - MovieAnalysisWithEntities component rendering
   - Error state handling and user messaging
   - Loading states and user experience
   - Entity linking integration

5. **Performance Benchmarks** (`__tests__/performance/`)
   - Response time requirements (< 1000ms)
   - Concurrent request handling
   - Memory usage and resource management
   - Regression detection

### Test Infrastructure

```
__tests__/
├── critical-paths/           # End-to-end user journeys
├── railway-integration/      # Database integration tests
├── api-endpoints/           # API contract testing
├── components/              # React component tests
├── performance/             # Benchmarks and regression tests
├── integration/             # Cross-system integration tests
└── setup/                   # Test utilities and mocks
    ├── database-test-utils.js
    └── mock-data.js
```

## Critical User Paths

### 1. Movie Page Load Flow

**Test Coverage**: `__tests__/critical-paths/movie-page-load-flow.test.js`

Tests the most important user journey:
1. User navigates to `/movie/550` (Fight Club)
2. Page loads movie data from TMDB API
3. Streaming data is fetched from database
4. Static analysis file is attempted (`/nuclear-static/550.json`)
5. Falls back to analysis API (`/api/movie-analysis?tmdbId=550`)
6. Analysis content displays with entity linking
7. Interactive elements (search, explore further) work

**Performance Requirements**:
- Complete page load: < 10 seconds
- API response time: < 1 second
- Search remains responsive during loading

### 2. Error Handling and Recovery

**Test Coverage**: Error scenarios in critical path tests

- Movie not found (404) → Graceful error message
- Analysis unavailable → Movie still displays
- Network failures → User can retry via search
- Component errors → Error boundaries prevent crash

### 3. Search and Navigation

**Test Coverage**: Integration tests for search functionality

- Search input responds immediately
- Navigation preserves functionality
- Mobile/responsive layouts work correctly

## Railway PostgreSQL Integration

### Database Test Utilities

Located in `__tests__/setup/database-test-utils.js`:

```javascript
import { createMockRailwayClient, setupTestDatabase } from '../setup/database-test-utils.js';

// Create mock client for testing
const mockClient = createMockRailwayClient();

// Setup with test data
const testDb = setupTestDatabase();
```

### Essential Movies Test Data

The test suite includes data for the 8 essential movies migrated to Railway:

- The Maltese Falcon (963)
- Psycho (539) 
- The Godfather (238)
- Fight Club (550)
- Pulp Fiction (680)
- Goodfellas (769)
- Casablanca (289)
- Citizen Kane (15)

### Connection Management Tests

- Connection establishment and cleanup
- Error handling for connection failures
- Concurrent request handling
- Resource leak prevention

## Performance Benchmarks

### Response Time Requirements

| Endpoint | Target | Maximum |
|----------|--------|---------|
| `/api/movie-analysis` | < 500ms | < 1000ms |
| Movie page load | < 5s | < 10s |
| Database queries | < 100ms | < 500ms |

### Performance Test Examples

```javascript
test('API responds within 500ms target', async () => {
  const benchmark = createPerformanceBenchmark('Movie Analysis API', 500);
  
  const result = await benchmark(async () => {
    const response = await fetch('/api/movie-analysis?tmdbId=550');
    expect(response.ok).toBe(true);
  });
  
  expect(result.passed).toBe(true);
  expect(result.duration).toBeLessThan(500);
});
```

### Regression Detection

- Baseline performance metrics recorded
- Automated alerts for performance degradation > 20%
- Load testing with concurrent requests
- Memory usage monitoring

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run specific test files
npm test movie-analysis-api.test.js

# Run tests by pattern
npm test -- --testNamePattern="API endpoint"

# Run with coverage
npm run test:coverage

# Run only changed files (with Git)
npm test -- --onlyChanged
```

### Test Categories

```bash
# Critical user paths
npm test -- __tests__/critical-paths/

# Database integration  
npm test -- __tests__/railway-integration/

# API endpoints
JEST_TEST_TYPE=api npm test -- __tests__/api-endpoints/

# Components
npm test -- __tests__/components/

# Performance benchmarks
npm test -- __tests__/performance/ --testTimeout=60000
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run single test with logging
npm test -- --testNamePattern="specific test" --verbose

# Debug component rendering
npm test -- --testNamePattern="component test" --watch
```

## CI/CD Integration

### GitHub Actions Workflow

Located at `.github/workflows/test-automation.yml`:

- **Triggers**: Push to main/develop, PRs, daily schedule
- **Test Matrix**: Parallel execution across test categories
- **Coverage**: Combined reporting with 60% threshold
- **Performance**: Regression detection on PRs
- **Security**: Dependency vulnerability scanning

### Workflow Steps

1. **Code Quality**: ESLint, TypeScript, JSX validation
2. **Test Execution**: Parallel test suites with coverage
3. **Coverage Analysis**: Combined reports with thresholds
4. **Performance Check**: Regression detection for PRs
5. **Build Verification**: Production build validation
6. **Security Scan**: Dependency audit
7. **Railway Readiness**: Deployment configuration check

### Status Checks

Required checks for PRs:
- All test suites pass
- Coverage >= 60%
- No performance regressions
- Build succeeds
- No high/critical security vulnerabilities

## Development Workflow

### Before Making Changes

```bash
# Run tests to establish baseline
npm test

# Check current coverage
npm run test:coverage
```

### During Development

```bash
# Run tests in watch mode
npm run test:watch

# Test specific functionality
npm test -- __tests__/components/movie-analysis

# Check impact on critical paths
npm test -- __tests__/critical-paths/
```

### Before Committing

```bash
# Run full test suite
npm test

# Check performance impact
npm test -- __tests__/performance/

# Validate build
npm run build
```

### PR Requirements

1. All new features must have tests
2. Critical path tests must pass
3. Coverage must not decrease
4. No performance regressions
5. API contract changes need endpoint tests

## Test Data Management

### Mock Data Strategy

- **API Responses**: Realistic movie and analysis data
- **Database**: Essential movies + sample analyses
- **Error Scenarios**: Network failures, timeouts, 404s
- **Performance**: Consistent timing for benchmarks

### Essential Movies Used in Tests

```javascript
const testMovies = [
  { tmdbId: 550, title: 'Fight Club', year: 1999 },
  { tmdbId: 238, title: 'The Godfather', year: 1972 },
  { tmdbId: 539, title: 'Psycho', year: 1960 },
  // ... other essential movies
];
```

## Troubleshooting

### Common Issues

**1. Tests timeout on CI**
```bash
# Increase timeout for integration tests
npm test -- --testTimeout=30000
```

**2. Database connection errors**
```bash
# Check environment variables
echo $RAILWAY_DATABASE_URL

# Use test database URL
export RAILWAY_DATABASE_URL="postgresql://test:test@localhost:5432/test"
```

**3. Coverage threshold failures**
```bash
# Check current coverage
npm run test:coverage

# Run specific failing tests
npm test -- --collectCoverageFrom="pages/api/*.js"
```

**4. Performance test failures**
```bash
# Run performance tests in isolation
npm test -- __tests__/performance/ --runInBand

# Check system resources during tests
npm test -- __tests__/performance/ --verbose
```

### Debugging Test Failures

**1. Component Test Issues**
```javascript
// Add debug output
import { screen, debug } from '@testing-library/react';

test('debug failing test', () => {
  render(<MyComponent />);
  debug(); // Prints current DOM
  screen.debug(); // Alternative syntax
});
```

**2. API Test Issues**
```javascript
// Log request/response details
test('debug API test', async () => {
  const { req, res } = createMocks({ method: 'GET', query: { tmdbId: '550' } });
  
  await movieAnalysisHandler(req, res);
  
  console.log('Status Code:', res._getStatusCode());
  console.log('Response:', res._getData());
});
```

**3. Integration Test Issues**
```bash
# Run with detailed output
npm test -- __tests__/integration/ --verbose --no-cache

# Check mock behavior
npm test -- --clearMocks --resetMocks
```

### Performance Optimization

**1. Test Execution Speed**
- Use `--runInBand` for debugging
- Parallelize independent test suites
- Mock external dependencies
- Use `--onlyChanged` during development

**2. Memory Usage**
- Clear mocks between tests
- Avoid global state leaks
- Use `--detectOpenHandles` to find leaks

### Getting Help

1. **Test Documentation**: This file and inline comments
2. **Jest Documentation**: https://jestjs.io/docs/getting-started
3. **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro
4. **Team Knowledge**: Check existing similar tests for patterns

## Monitoring and Maintenance

### Regular Tasks

**Weekly**:
- Review test execution times
- Check coverage trends
- Update test data if needed

**Monthly**:
- Review and update performance benchmarks
- Audit test dependencies
- Clean up obsolete tests

**After Major Releases**:
- Update baseline performance metrics
- Review critical path coverage
- Update documentation

### Metrics to Track

- Test execution time trends
- Coverage percentage over time
- Performance benchmark results
- Test failure patterns
- CI/CD pipeline duration

This testing framework provides the foundation for reliable deployments and confident feature development in MovieGenius.