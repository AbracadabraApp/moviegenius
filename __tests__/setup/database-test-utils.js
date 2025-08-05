/**
 * Database Test Utilities for Railway PostgreSQL Integration
 * Provides mock database setup, test data fixtures, and helper functions
 */

import { Client } from 'pg';

// Mock Railway PostgreSQL client factory
export const createMockRailwayClient = () => {
  const mockClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  
  // Default to successful connection
  mockClient.connect.mockResolvedValue();
  mockClient.end.mockResolvedValue();
  
  return mockClient;
};

// Essential movies test data - matches the 8 migrated movies
export const ESSENTIAL_MOVIES_TEST_DATA = [
  {
    id: 1,
    title: 'The Maltese Falcon',
    year: 1941,
    tmdb_id: 963,
    overview: 'A private detective takes on a case that involves him with three eccentric criminals...',
    poster_path: '/dQHHV7dAXRO7ndzCNgBM7xCGPkb.jpg'
  },
  {
    id: 2,
    title: 'Psycho',
    year: 1960,
    tmdb_id: 539,
    overview: 'When larcenous real estate clerk Marion Crane goes on the lam with a wad of cash...',
    poster_path: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg'
  },
  {
    id: 3,
    title: 'The Godfather',
    year: 1972,
    tmdb_id: 238,
    overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family...',
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'
  },
  {
    id: 4,
    title: 'Fight Club',
    year: 1999,
    tmdb_id: 550,
    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression...',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
  },
  {
    id: 5,
    title: 'Pulp Fiction',
    year: 1994,
    tmdb_id: 680,
    overview: 'A burger-loving hit man, his philosophical partner, a drug-addled gangster\'s moll...',
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg'
  },
  {
    id: 6,
    title: 'Goodfellas',
    year: 1990,
    tmdb_id: 769,
    overview: 'The true story of Henry Hill, a half-Irish, half-Sicilian Brooklyn kid who is adopted by neighbourhood gangsters...',
    poster_path: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg'
  },
  {
    id: 7,
    title: 'Casablanca',
    year: 1942,
    tmdb_id: 289,
    overview: 'In Casablanca, Morocco in December 1941, a cynical American expatriate meets a former lover...',
    poster_path: '/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg'
  },
  {
    id: 8,
    title: 'Citizen Kane',
    year: 1941,
    tmdb_id: 15,
    overview: 'Follows the investigation into the dying words of a publishing tycoon...',
    poster_path: '/sav0jAeHAw8wBhZWDOsIp2sOcTW.jpg'
  }
];

// Sample analysis data for testing
export const SAMPLE_ANALYSES = {
  550: { // Fight Club
    id: 1,
    movie_id: 4,
    claude_response: `Fight Club is a provocative exploration of masculinity, consumerism, and modern alienation that remains as relevant today as when it was first released. David Fincher's masterful direction transforms Chuck Palahniuk's novel into a visceral cinematic experience that challenges viewers to confront uncomfortable truths about contemporary society.

SUBHEAD: Technical Excellence

The film's technical achievements are remarkable, from Jeff Cronenweth's shadowy cinematography to the innovative visual effects that bring Tyler Durden's anarchic philosophy to life. The production design creates a world that feels both hyper-realistic and surreal, perfectly matching the protagonist's fractured mental state.

MOVIES: The Matrix|1999|Another exploration of reality and illusion in the late 90s|Netflix
MOVIES: American Beauty|1999|Dark satire of suburban malaise from the same era|Amazon Prime

SUBHEAD: Cultural Impact and Legacy

Fight Club's influence extends far beyond cinema, spawning countless discussions about toxic masculinity, consumer culture, and the search for authentic meaning in modern life. The film's central thesis about the emasculating effects of corporate culture resonates strongly with audiences who feel disconnected from traditional sources of purpose and identity.

EXPLORE_FURTHER: How does Fight Club's critique of consumer culture compare to other anti-establishment films of the 1990s?
EXPLORE_FURTHER: What role does the unreliable narrator play in shaping our understanding of Tyler Durden's philosophy?

MORE_IDEAS: The Social Network|2010|Another Fincher film exploring modern alienation|HBO Max
MORE_IDEAS: There Will Be Blood|2007|Critique of American capitalism and masculinity|Netflix`,
    created_at: new Date('2024-01-01T10:00:00Z'),
    analysis_type: 'comprehensive'
  },
  238: { // The Godfather
    id: 2,
    movie_id: 3,
    claude_response: {
      raw_content: `The Godfather stands as perhaps the greatest achievement in American cinema, a film that transcends its crime genre origins to become a profound meditation on power, family, and the corruption of the American Dream. Francis Ford Coppola's adaptation of Mario Puzo's novel creates a world so complete and compelling that it feels less like fiction than historical documentation.

SUBHEAD: Masterful Storytelling

Coppola's direction demonstrates remarkable restraint and sophistication, allowing the story to unfold with the deliberate pace of a great novel. The film's three-hour runtime never feels excessive because every scene serves multiple purposes, developing character, advancing plot, and deepening our understanding of this insular world.

MOVIES: The Godfather Part II|1974|The equally masterful sequel|Amazon Prime
MOVIES: Goodfellas|1990|Martin Scorsese's kinetic take on organized crime|Netflix

The performances are uniformly excellent, with Marlon Brando's Don Vito Corleone becoming one of cinema's most iconic characters. His transformation of Michael from reluctant outsider to ruthless patriarch provides the film's emotional and moral center.

EXPLORE_FURTHER: How does The Godfather's portrayal of Italian-American culture reflect and challenge stereotypes?
EXPLORE_FURTHER: What does Michael's transformation reveal about the nature of power and moral compromise?

MORE_IDEAS: Scarface|1983|Another tale of power and corruption|Hulu
MORE_IDEAS: Casino|1995|Scorsese's epic about Las Vegas organized crime|Netflix`,
      entity_data: {
        movies: ['The Godfather Part II', 'Goodfellas', 'Scarface', 'Casino'],
        people: ['Francis Ford Coppola', 'Marlon Brando', 'Al Pacino', 'Mario Puzo']
      }
    },
    created_at: new Date('2024-01-01T11:00:00Z'),
    analysis_type: 'comprehensive'
  }
};

// Mock database responses factory
export const createMockDbResponses = {
  // Movie found, analysis found
  movieWithAnalysis: (tmdbId) => {
    const movie = ESSENTIAL_MOVIES_TEST_DATA.find(m => m.tmdb_id == tmdbId);
    const analysis = SAMPLE_ANALYSES[tmdbId];
    
    return {
      movieQuery: { rows: movie ? [movie] : [], rowCount: movie ? 1 : 0 },
      analysisQuery: { rows: analysis ? [analysis] : [], rowCount: analysis ? 1 : 0 }
    };
  },

  // Movie found, no analysis
  movieWithoutAnalysis: (tmdbId) => {
    const movie = ESSENTIAL_MOVIES_TEST_DATA.find(m => m.tmdb_id == tmdbId);
    
    return {
      movieQuery: { rows: movie ? [movie] : [], rowCount: movie ? 1 : 0 },
      analysisQuery: { rows: [], rowCount: 0 }
    };
  },

  // Movie not found
  movieNotFound: () => {
    return {
      movieQuery: { rows: [], rowCount: 0 },
      analysisQuery: { rows: [], rowCount: 0 }
    };
  },

  // Database error scenarios
  connectionError: () => {
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';
    return { error };
  },

  queryTimeout: () => {
    const error = new Error('Query timeout');
    error.code = 'ETIMEDOUT';
    return { error };
  },

  schemaError: () => {
    const error = new Error('column "tmdb_id" does not exist');
    error.code = '42703';
    return { error };
  }
};

// Performance test helpers
export const createPerformanceMocks = (responseTimeMs = 50) => {
  const mockClient = createMockRailwayClient();
  
  // Add artificial delay to simulate network latency
  const delayedResponse = (response) => 
    new Promise(resolve => setTimeout(() => resolve(response), responseTimeMs));
  
  mockClient.connect.mockImplementation(() => delayedResponse());
  mockClient.query.mockImplementation(() => delayedResponse({
    rows: [ESSENTIAL_MOVIES_TEST_DATA[0]],
    rowCount: 1
  }));
  
  return mockClient;
};

// Test data validation helpers
export const validateMovieData = (movie) => {
  const requiredFields = ['id', 'title', 'year', 'tmdb_id'];
  const missingFields = requiredFields.filter(field => !(field in movie));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  if (typeof movie.tmdb_id !== 'number' || movie.tmdb_id <= 0) {
    throw new Error('tmdb_id must be a positive number');
  }
  
  if (typeof movie.year !== 'number' || movie.year < 1888 || movie.year > new Date().getFullYear()) {
    throw new Error('year must be a valid year');
  }
  
  return true;
};

export const validateAnalysisData = (analysis) => {
  const requiredFields = ['id', 'movie_id', 'claude_response'];
  const missingFields = requiredFields.filter(field => !(field in analysis));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  if (!analysis.claude_response) {
    throw new Error('claude_response cannot be null or empty');
  }
  
  return true;
};

// Database state helpers for testing
export const setupTestDatabase = () => {
  const mockClient = createMockRailwayClient();
  
  // Set up default responses for essential movies
  mockClient.query.mockImplementation((query, params) => {
    if (query.includes('movies WHERE tmdb_id')) {
      const tmdbId = params[0];
      const movie = ESSENTIAL_MOVIES_TEST_DATA.find(m => m.tmdb_id == tmdbId);
      return Promise.resolve({
        rows: movie ? [movie] : [],
        rowCount: movie ? 1 : 0
      });
    }
    
    if (query.includes('movie_analyses WHERE movie_id')) {
      const movieId = params[0];
      const movie = ESSENTIAL_MOVIES_TEST_DATA.find(m => m.id == movieId);
      if (movie) {
        const analysis = SAMPLE_ANALYSES[movie.tmdb_id];
        return Promise.resolve({
          rows: analysis ? [analysis] : [],
          rowCount: analysis ? 1 : 0
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  
  return mockClient;
};

// Cleanup utilities
export const cleanupTestDatabase = (mockClient) => {
  if (mockClient) {
    mockClient.connect.mockReset();
    mockClient.query.mockReset();
    mockClient.end.mockReset();
  }
};

// Environment setup for tests
export const setupTestEnvironment = () => {
  const originalEnv = process.env;
  
  process.env = {
    ...originalEnv,
    RAILWAY_DATABASE_URL: 'postgresql://test:test@localhost:5432/moviegenius_test',
    NODE_ENV: 'test',
    JEST_TIMEOUT: '30000'
  };
  
  return originalEnv;
};

export const restoreTestEnvironment = (originalEnv) => {
  process.env = originalEnv;
};

// Integration test helpers
export const createIntegrationTestSuite = (testName, tests) => {
  describe(`Integration: ${testName}`, () => {
    let originalEnv;
    let mockClient;
    
    beforeAll(() => {
      originalEnv = setupTestEnvironment();
    });
    
    beforeEach(() => {
      mockClient = setupTestDatabase();
      Client.mockImplementation(() => mockClient);
    });
    
    afterEach(() => {
      cleanupTestDatabase(mockClient);
      jest.clearAllMocks();
    });
    
    afterAll(() => {
      restoreTestEnvironment(originalEnv);
    });
    
    tests(mockClient);
  });
};

// Performance benchmark utilities
export const createPerformanceBenchmark = (name, targetTimeMs = 1000) => {
  return async (testFunction) => {
    const startTime = Date.now();
    await testFunction();
    const duration = Date.now() - startTime;
    
    if (duration > targetTimeMs) {
      console.warn(`Performance Warning: ${name} took ${duration}ms (target: ${targetTimeMs}ms)`);
    }
    
    return {
      name,
      duration,
      targetTime: targetTimeMs,
      passed: duration <= targetTimeMs
    };
  };
};

// Mock data factories for different test scenarios
export const createTestScenario = {
  // Happy path: all data present and valid
  complete: (tmdbId = 550) => {
    const mockClient = createMockRailwayClient();
    const responses = createMockDbResponses.movieWithAnalysis(tmdbId);
    
    mockClient.query
      .mockResolvedValueOnce(responses.movieQuery)
      .mockResolvedValueOnce(responses.analysisQuery);
    
    return { mockClient, expectedStatus: 200 };
  },
  
  // Movie exists but no analysis
  missingAnalysis: (tmdbId = 550) => {
    const mockClient = createMockRailwayClient();
    const responses = createMockDbResponses.movieWithoutAnalysis(tmdbId);
    
    mockClient.query
      .mockResolvedValueOnce(responses.movieQuery)
      .mockResolvedValueOnce(responses.analysisQuery);
    
    return { mockClient, expectedStatus: 200 };
  },
  
  // Movie not found
  notFound: (tmdbId = 99999) => {
    const mockClient = createMockRailwayClient();
    const responses = createMockDbResponses.movieNotFound();
    
    mockClient.query.mockResolvedValueOnce(responses.movieQuery);
    
    return { mockClient, expectedStatus: 404 };
  },
  
  // Database connection error
  connectionError: () => {
    const mockClient = createMockRailwayClient();
    const error = createMockDbResponses.connectionError().error;
    
    mockClient.connect.mockRejectedValueOnce(error);
    
    return { mockClient, expectedStatus: 500 };
  },
  
  // Query error
  queryError: () => {
    const mockClient = createMockRailwayClient();
    const error = createMockDbResponses.queryTimeout().error;
    
    mockClient.query.mockRejectedValueOnce(error);
    
    return { mockClient, expectedStatus: 500 };
  }
};

export default {
  createMockRailwayClient,
  ESSENTIAL_MOVIES_TEST_DATA,
  SAMPLE_ANALYSES,
  createMockDbResponses,
  createPerformanceMocks,
  validateMovieData,
  validateAnalysisData,
  setupTestDatabase,
  cleanupTestDatabase,
  setupTestEnvironment,
  restoreTestEnvironment,
  createIntegrationTestSuite,
  createPerformanceBenchmark,
  createTestScenario
};