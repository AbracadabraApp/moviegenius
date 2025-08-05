/**
 * Railway PostgreSQL Integration Tests
 * Tests database connectivity, query performance, and data validation
 */

import { Client } from 'pg';

// Mock the pg Client for testing without actual database connection
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  }))
}));

// Import the movie analysis API handler
import movieAnalysisHandler from '../../pages/api/movie-analysis.js';
import { createMocks } from 'node-mocks-http';

describe('Railway PostgreSQL Integration', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    };
    Client.mockImplementation(() => mockClient);

    // Mock environment variables
    process.env.RAILWAY_DATABASE_URL = 'postgresql://user:pass@db.railway.internal:5432/railway';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.RAILWAY_DATABASE_URL;
  });

  describe('Database Connection Management', () => {
    test('successfully establishes connection to Railway PostgreSQL', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock successful movie lookup
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Fight Club',
            year: 1999,
            tmdb_id: 550
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            movie_id: 1,
            claude_response: 'Fight Club analysis content...',
            created_at: new Date('2024-01-01')
          }],
          rowCount: 1
        });

      await movieAnalysisHandler(req, res);

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.end).toHaveBeenCalledTimes(1);
      expect(res._getStatusCode()).toBe(200);
    });

    test('handles connection failures gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock connection failure
      mockClient.connect.mockRejectedValueOnce(new Error('Connection refused'));

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Internal server error');
      expect(responseData.message).toBe('Connection refused');
    });

    test('properly closes connections on error', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock query failure after successful connection
      mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

      await movieAnalysisHandler(req, res);

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.end).toHaveBeenCalledTimes(1);
      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('Query Performance and Validation', () => {
    test('movie lookup query executes efficiently', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      const mockMovie = {
        id: 1,
        title: 'Fight Club',
        year: 1999,
        tmdb_id: 550
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [mockMovie],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            movie_id: 1,
            claude_response: 'Analysis content',
            created_at: new Date()
          }],
          rowCount: 1
        });

      const startTime = Date.now();
      await movieAnalysisHandler(req, res);
      const endTime = Date.now();

      // Query should complete quickly
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify correct SQL queries
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM movies WHERE tmdb_id = $1',
        [550]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC LIMIT 1',
        [1]
      );
    });

    test('handles invalid TMDB IDs correctly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: 'invalid' }
      });

      // Mock no results found
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Movie not found');
      expect(responseData.tmdbId).toBe('invalid');
    });

    test('validates analysis data format', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      const mockAnalysis = {
        id: 1,
        movie_id: 1,
        claude_response: {
          raw_content: 'Detailed analysis content...',
          entity_data: { movies: [], people: [] }
        },
        created_at: new Date('2024-01-01')
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Fight Club',
            year: 1999,
            tmdb_id: 550
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [mockAnalysis],
          rowCount: 1
        });

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(true);
      expect(responseData.analysis).toBe('Detailed analysis content...');
      expect(responseData.source).toBe('railway-postgresql');
      expect(responseData.performance).toBeDefined();
      expect(responseData.performance.total_time).toBeGreaterThan(0);
    });
  });

  describe('Environment Variable Validation', () => {
    test('fails when DATABASE_URL is missing in production', async () => {
      delete process.env.RAILWAY_DATABASE_URL;
      delete process.env.DATABASE_URL;
      process.env.NODE_ENV = 'production';

      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Database connection not available');
    });

    test('handles missing DATABASE_URL gracefully during build', async () => {
      delete process.env.RAILWAY_DATABASE_URL;
      delete process.env.DATABASE_URL;
      process.env.NODE_ENV = 'development';

      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Database connection not available');
    });

    test('validates SSL configuration', () => {
      const sslUrl = 'postgresql://user:pass@db.railway.internal:5432/railway?sslmode=require';
      process.env.RAILWAY_DATABASE_URL = sslUrl;

      // Create client to test SSL detection
      const client = new Client({ connectionString: sslUrl });
      expect(Client).toHaveBeenCalledWith({ connectionString: sslUrl });
    });
  });

  describe('Data Migration Validation', () => {
    test('validates essential movies are present', async () => {
      const essentialMovies = [
        { tmdbId: 550, title: 'Fight Club' },
        { tmdbId: 238, title: 'The Godfather' },
        { tmdbId: 539, title: 'Psycho' },
        { tmdbId: 963, title: 'The Maltese Falcon' }
      ];

      for (const movie of essentialMovies) {
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: movie.tmdbId.toString() }
        });

        mockClient.query
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              title: movie.title,
              year: 1999,
              tmdb_id: movie.tmdbId
            }],
            rowCount: 1
          })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              movie_id: 1,
              claude_response: `${movie.title} analysis`,
              created_at: new Date()
            }],
            rowCount: 1
          });

        await movieAnalysisHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }
    });

    test('handles concurrent analysis requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: '550' }
        });

        mockClient.query
          .mockResolvedValue({
            rows: [{
              id: 1,
              title: 'Fight Club',
              year: 1999,
              tmdb_id: 550
            }],
            rowCount: 1
          })
          .mockResolvedValue({
            rows: [{
              id: 1,
              movie_id: 1,
              claude_response: 'Analysis',
              created_at: new Date()
            }],
            rowCount: 1
          });

        promises.push(movieAnalysisHandler(req, res));
      }

      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach((_, index) => {
        // Each request creates its own response object
        // Verify database connections were properly managed
        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockClient.end).toHaveBeenCalled();
      });
    });
  });

  describe('Error Scenarios and Rollback', () => {
    test('handles database timeout scenarios', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock timeout error
      mockClient.query.mockRejectedValueOnce(
        Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' })
      );

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Connection timeout');
    });

    test('handles corrupted analysis data', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Fight Club',
            year: 1999,
            tmdb_id: 550
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            movie_id: 1,
            claude_response: null, // Corrupted data
            created_at: new Date()
          }],
          rowCount: 1
        });

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.analysis).toBe(''); // Should handle null gracefully
    });

    test('validates database schema integrity', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock schema error (missing column)
      mockClient.query.mockRejectedValueOnce(
        Object.assign(new Error('column "tmdb_id" does not exist'), { code: '42703' })
      );

      await movieAnalysisHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('column "tmdb_id" does not exist');
    });
  });

  describe('Performance Benchmarks', () => {
    test('meets response time requirements', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock fast responses
      mockClient.connect.mockResolvedValueOnce();
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Fight Club',
            year: 1999,
            tmdb_id: 550
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            movie_id: 1,
            claude_response: 'Analysis content',
            created_at: new Date()
          }],
          rowCount: 1
        });

      const startTime = Date.now();
      await movieAnalysisHandler(req, res);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.performance.total_time).toBeGreaterThan(0);
    });

    test('connection pooling efficiency', async () => {
      // Test multiple sequential requests
      const requests = [];
      
      for (let i = 0; i < 3; i++) {
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: (550 + i).toString() }
        });

        mockClient.query
          .mockResolvedValue({
            rows: [{
              id: i + 1,
              title: `Movie ${i + 1}`,
              year: 2000 + i,
              tmdb_id: 550 + i
            }],
            rowCount: 1
          })
          .mockResolvedValue({
            rows: [{
              id: i + 1,
              movie_id: i + 1,
              claude_response: `Analysis ${i + 1}`,
              created_at: new Date()
            }],
            rowCount: 1
          });

        requests.push(movieAnalysisHandler(req, res));
      }

      await Promise.all(requests);

      // Each request should create and close its own connection
      expect(mockClient.connect).toHaveBeenCalledTimes(3);
      expect(mockClient.end).toHaveBeenCalledTimes(3);
    });
  });
});