// __tests__/setup/jsonTestSetup.js
/**
 * Test setup and configuration for JSON analysis testing
 * Provides mocks, utilities, and global test configuration
 */

import '@testing-library/jest-dom';

// Mock external dependencies
jest.mock('../../lib/analysis/jsonAnalysisParser', () => ({
  parseJSONAnalysis: jest.fn(),
  validateJSONAnalysis: jest.fn(),
  buildAlternatingLayout: jest.fn(),
  detectAnalysisFormat: jest.fn()
}));

// Mock MediaCard component
jest.mock('../../components/MediaCard', () => {
  return function MockMediaCard({ movie, ...props }) {
    return (
      <div 
        data-testid="featured-movie-card"
        data-movie-year={movie.year}
        data-movie-slug={movie.slug}
        data-movie-description={movie.description}
      >
        <div data-testid="movie-title">{movie.title}</div>
        <div data-testid="movie-year">{movie.year}</div>
        <div data-testid="movie-description">{movie.description}</div>
      </div>
    );
  };
});

// Mock ExplorePromptCard component
jest.mock('../../components/ExplorePromptCard', () => {
  return function MockExplorePromptCard({ topic, ...props }) {
    return (
      <div data-testid="explore-topic-card">
        <div data-testid="topic-title">{topic.topic}</div>
        <div data-testid="topic-category">{topic.category}</div>
        <div data-testid="topic-difficulty">{topic.difficulty}</div>
      </div>
    );
  };
});

// Mock EntityLinkedText component
jest.mock('../../components/EntityLinkedText', () => {
  return function MockEntityLinkedText({ children, ...props }) {
    return <div data-testid="entity-linked-text">{children}</div>;
  };
});

// Mock ErrorBoundary components
jest.mock('../../components/ErrorBoundary', () => {
  return function MockErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

// Global test utilities
global.createMockAnalysisResponse = (analysisData) => ({
  claude_response: {
    raw_content: JSON.stringify(analysisData),
    processed_content: JSON.stringify(analysisData),
    generated_at: new Date().toISOString(),
    cost_estimate: 0.05,
    input_tokens: 1000,
    output_tokens: 2000,
    model: 'claude-3-5-sonnet-20241022'
  }
});

global.createMockMovieData = (overrides = {}) => ({
  id: 996,
  title: "Test Movie",
  year: 2000,
  tmdb_id: 996,
  slug: "Test movie description",
  poster_url: "https://example.com/poster.jpg",
  streaming_data: { netflix: true },
  ...overrides
});

// Performance testing utilities
global.measureRenderTime = async (renderFn) => {
  const startTime = performance.now();
  await renderFn();
  return performance.now() - startTime;
};

// Console error suppression for expected errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});