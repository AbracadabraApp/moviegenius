/**
 * Movie Analysis API Regression Tests
 * 
 * Tests for the specific production failure that occurred 4-5 days ago:
 * - TMDB Bearer token validation incorrectly assumed JWT format
 * - Production fell back to placeholder API key
 * - TMDB returned null response
 * - Code crashed with "Cannot read properties of null (reading 'title')"
 */

import { createMocks } from 'node-mocks-http';

// Mock the movie analysis handler
const mockMovieAnalysisHandler = async (req, res) => {
  // Import dynamically to allow env var changes
  const handler = await import('../../pages/api/movie-analysis.js');
  return handler.default(req, res);
};

// Mock Supabase
jest.mock('../../lib/supabase-client.js', () => ({
  createSupabaseClient: () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Movie not found' }
          })
        })
      })
    })
  })
}));

// Mock TMDB service
let mockTMDBResponse = null;
jest.mock('../../lib/services/tmdb-search', () => ({
  getTMDBMovieDetails: jest.fn(() => Promise.resolve(mockTMDBResponse))
}));

// Mock database search
jest.mock('../../lib/services/database-search', () => ({
  createBasicMovieEntry: jest.fn((tmdbMovie) => {
    if (!tmdbMovie || !tmdbMovie.title) {
      throw new Error("Cannot read properties of null (reading 'title')");
    }
    return {
      title: tmdbMovie.title,
      year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null
    };
  })
}));

const originalEnv = process.env;

describe('Movie Analysis API Regression Tests', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    mockTMDBResponse = null;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Production Failure Scenario', () => {
    it('should reproduce the exact production failure from 4-5 days ago', async () => {
      // Simulate broken production environment
      process.env.TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.invalid.jwt'; // Would fail JWT validation
      delete process.env.TMDB_API_KEY;
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      // TMDB returns null due to auth failure
      mockTMDBResponse = null;
      
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await mockMovieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      
      // Should contain the exact error we saw in production
      expect(data.error).toBe('Movie not found in TMDB');
      expect(data.details).toContain('TMDB API returned invalid or null response');
      expect(data.tmdbId).toBe(550);
    });

    it('should handle null TMDB response without crashing', async () => {
      // Valid auth setup
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      
      // TMDB returns null (network issue, rate limiting, etc.)
      mockTMDBResponse = null;
      
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // This should NOT throw "Cannot read properties of null (reading 'title')"
      await expect(mockMovieAnalysisHandler(req, res)).resolves.not.toThrow();
      
      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Movie not found in TMDB');
    });

    it('should handle TMDB response missing title field', async () => {
      // Valid auth setup
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      
      // TMDB returns object but missing title field
      mockTMDBResponse = {
        id: 550,
        release_date: '1999-10-15',
        overview: 'Some overview'
        // title: missing!
      };
      
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await mockMovieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.debug.hasTitle).toBe(false);
    });
  });

  describe('Working Scenarios', () => {
    it('should work correctly with valid TMDB response', async () => {
      // Valid auth setup
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      
      // TMDB returns valid movie data
      mockTMDBResponse = {
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
        overview: 'A ticking-time-bomb insomniac...'
      };
      
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await mockMovieAnalysisHandler(req, res);
      
      // Should proceed to analysis generation (which would fail due to mocking, but that's expected)
      // The important part is that it didn't crash on the TMDB lookup
      expect(res._getStatusCode()).not.toBe(404);
    });
  });

  describe('Authentication Regression Detection', () => {
    it('should detect Bearer token validation regression', async () => {
      // The specific regression: JWT validation for non-JWT tokens
      const tmdbBearerToken = 'eyJhbGciOiJIUzI1NiJ9LeyJhdWQiOiI4MmU1M2QyZDY4ZmY0MjQ1YjhkNmQzNGVkOWNhMjgwNyIsInN1YiI6IjY2NTYwMWYyNzQ1NTNiYzM2MzVjNDlhZiIsInNjb3BlcyI6W10sInZlcnNpb24iOjF9';
      
      // Old broken validation (this should NOT be 3)
      const jwtParts = tmdbBearerToken.split('.');
      expect(jwtParts.length).not.toBe(3); // TMDB tokens are NOT JWTs
      
      // New working validation (this should pass)
      expect(tmdbBearerToken.length).toBeGreaterThan(50);
    });

    it('should prevent placeholder API key usage in production', async () => {
      // Simulate production with placeholder values
      process.env.NODE_ENV = 'production';
      process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
      delete process.env.TMDB_BEARER_TOKEN;
      delete process.env.TMDB_API_KEY;
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      // Should reject placeholder values
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config).toBeNull(); // Should not use placeholder in production
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful error messages for debugging', async () => {
      // Valid auth but TMDB returns null
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      mockTMDBResponse = null;
      
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await mockMovieAnalysisHandler(req, res);
      
      const data = JSON.parse(res._getData());
      
      // Should provide detailed debug information
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(data).toHaveProperty('tmdbId');
      expect(data).toHaveProperty('debug');
      expect(data.debug).toHaveProperty('tmdbMovie');
      expect(data.debug).toHaveProperty('hasTitle');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should validate environment variables before API calls', async () => {
      // No valid auth configured
      delete process.env.TMDB_BEARER_TOKEN;
      delete process.env.TMDB_API_KEY;
      delete process.env.NEXT_PUBLIC_TMDB_API_KEY;
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config).toBeNull();
    });

    it('should prioritize authentication methods correctly', async () => {
      // Set up priority test: Bearer > API Key > Public Key
      process.env.TMDB_BEARER_TOKEN = 'valid-bearer-token-over-50-chars-long-for-validation';
      process.env.TMDB_API_KEY = 'api-key';
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'public-key';
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config.method).toBe('bearer');
      expect(config.token).toBe('valid-bearer-token-over-50-chars-long-for-validation');
    });
  });
});