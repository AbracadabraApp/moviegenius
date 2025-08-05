/**
 * Comprehensive API Endpoint Tests: /api/movie-analysis
 * Tests response format, error scenarios, performance, and HTTP status codes
 */

import { createMocks } from 'node-mocks-http';
import movieAnalysisHandler from '../../pages/api/movie-analysis.js';

// Mock pg Client
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  }))
}));

// Mock observability logger
jest.mock('../../lib/observability/logger.js', () => ({
  logger: {
    movieAnalysis: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  },
  dbLogger: {
    dbQuery: jest.fn(),
    dbError: jest.fn()
  },
  apiLogger: {
    apiRequest: jest.fn(),
    apiResponse: jest.fn()
  },
  railwayLogger: {
    info: jest.fn(),
    error: jest.fn(),
    railwayConnection: jest.fn()
  }
}));

import { Client } from 'pg';

describe('/api/movie-analysis API Endpoint', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    };
    Client.mockImplementation(() => mockClient);

    process.env.RAILWAY_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.RAILWAY_DATABASE_URL;
  });

  describe('HTTP Method Validation', () => {
    test('accepts GET requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, movie_id: 1, claude_response: 'Test analysis', created_at: new Date() }], rowCount: 1 });

      await movieAnalysisHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });

    test('rejects POST requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(405);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Method not allowed');
    });

    test('rejects PUT requests', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    test('rejects DELETE requests', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('Parameter Validation', () => {
    test('requires tmdbId parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('tmdbId parameter is required');
    });

    test('handles string tmdbId correctly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, movie_id: 1, claude_response: 'Analysis', created_at: new Date() }], rowCount: 1 });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM movies WHERE tmdb_id = $1',
        [550] // Should convert to integer
      );
    });

    test('handles numeric tmdbId correctly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: 550 }
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, movie_id: 1, claude_response: 'Analysis', created_at: new Date() }], rowCount: 1 });

      await movieAnalysisHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });

    test('handles invalid tmdbId format', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: 'not-a-number' }
      });

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Movie not found');
    });
  });

  describe('Response Format Validation', () => {
    test('returns correct success response format', async () => {
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

      const mockAnalysis = {
        id: 1,
        movie_id: 1,
        claude_response: 'Fight Club is a provocative exploration...',
        created_at: new Date('2024-01-01')
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockMovie], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockAnalysis], rowCount: 1 });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      // Validate response structure
      expect(responseData).toMatchObject({
        success: true,
        analysis: expect.any(String),
        rawAnalysis: expect.any(String),
        movie: {
          title: 'Fight Club',
          year: 1999,
          tmdb_id: 550
        },
        cached: true,
        source: 'railway-postgresql',
        performance: {
          total_time: expect.any(Number),
          connect_time: expect.any(Number),
          movie_query_time: expect.any(Number),
          analysis_query_time: expect.any(Number)
        }
      });

      expect(responseData.analysis).toBe('Fight Club is a provocative exploration...');
      expect(responseData.rawAnalysis).toBe('Fight Club is a provocative exploration...');
    });

    test('handles movie found but no analysis', async () => {
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
        .mockResolvedValueOnce({ rows: [mockMovie], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // No analysis

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData).toMatchObject({
        success: true,
        movie: {
          title: 'Fight Club',
          year: 1999,
          tmdb_id: 550
        },
        analysis: null,
        message: 'Movie found but no analysis available',
        source: 'railway-postgresql'
      });
    });

    test('handles complex claude_response formats', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      const complexResponse = {
        raw_content: 'Detailed analysis content',
        entity_data: { movies: [], people: [] },
        metadata: { version: '1.0' }
      };

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            movie_id: 1, 
            claude_response: complexResponse, 
            created_at: new Date() 
          }], 
          rowCount: 1 
        });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.analysis).toBe('Detailed analysis content');
    });

    test('handles null claude_response gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            movie_id: 1, 
            claude_response: null, 
            created_at: new Date() 
          }], 
          rowCount: 1 
        });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.analysis).toBe('');
    });
  });

  describe('Error Scenarios', () => {
    test('returns 404 for non-existent movie', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '99999' }
      });

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(404);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Movie not found');
      expect(responseData.tmdbId).toBe('99999');
      expect(responseData.source).toBe('railway-postgresql');
    });

    test('handles database connection errors', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Internal server error');
      expect(responseData.message).toBe('Connection failed');
      expect(responseData.source).toBe('railway-postgresql');
    });

    test('handles query errors', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      const dbError = new Error('Query timeout');
      dbError.code = 'ETIMEDOUT';
      mockClient.query.mockRejectedValueOnce(dbError);

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Internal server error');
      expect(responseData.message).toBe('Query timeout');
    });

    test('handles missing database URL in production', async () => {
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
      expect(responseData.message).toBe('DATABASE_URL not configured');
    });
  });

  describe('Performance Requirements', () => {
    test('meets response time benchmarks', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      // Mock fast database responses
      mockClient.connect.mockResolvedValueOnce();
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Analysis', created_at: new Date() }], 
          rowCount: 1 
        });

      const startTime = Date.now();
      await movieAnalysisHandler(req, res);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.performance.total_time).toBeGreaterThan(0);
    });

    test('tracks performance metrics', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Analysis', created_at: new Date() }], 
          rowCount: 1 
        });

      await movieAnalysisHandler(req, res);
      
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.performance).toMatchObject({
        total_time: expect.any(Number),
        connect_time: expect.any(Number),
        movie_query_time: expect.any(Number),
        analysis_query_time: expect.any(Number)
      });

      expect(responseData.performance.total_time).toBeGreaterThan(0);
      expect(responseData.performance.connect_time).toBeGreaterThan(0);
    });

    test('handles concurrent requests efficiently', async () => {
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: (550 + i).toString() }
        });

        mockClient.query
          .mockResolvedValue({ 
            rows: [{ id: 1, title: 'Movie', year: 1999, tmdb_id: 550 + i }], 
            rowCount: 1 
          })
          .mockResolvedValue({ 
            rows: [{ id: 1, movie_id: 1, claude_response: 'Analysis', created_at: new Date() }], 
            rowCount: 1 
          });

        requests.push(movieAnalysisHandler(req, res));
      }

      const startTime = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should complete reasonably quickly
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Content Validation', () => {
    test('validates essential movie data integrity', async () => {
      const essentialMovies = [
        { tmdbId: 550, title: 'Fight Club', year: 1999 },
        { tmdbId: 238, title: 'The Godfather', year: 1972 },
        { tmdbId: 539, title: 'Psycho', year: 1960 },
        { tmdbId: 963, title: 'The Maltese Falcon', year: 1941 }
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
              year: movie.year, 
              tmdb_id: movie.tmdbId 
            }], 
            rowCount: 1 
          })
          .mockResolvedValueOnce({ 
            rows: [{ 
              id: 1, 
              movie_id: 1, 
              claude_response: `${movie.title} detailed analysis content`, 
              created_at: new Date() 
            }], 
            rowCount: 1 
          });

        await movieAnalysisHandler(req, res);
        
        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.movie.title).toBe(movie.title);
        expect(responseData.movie.year).toBe(movie.year);
        expect(responseData.analysis).toContain(movie.title);
      }
    });

    test('validates response content length', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      const longAnalysis = 'A'.repeat(10000); // 10KB analysis

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            movie_id: 1, 
            claude_response: longAnalysis, 
            created_at: new Date() 
          }], 
          rowCount: 1 
        });

      await movieAnalysisHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.analysis.length).toBe(10000);
    });
  });

  describe('Logging and Observability', () => {
    test('logs API requests and responses', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Analysis', created_at: new Date() }], 
          rowCount: 1 
        });

      await movieAnalysisHandler(req, res);

      // Verify logging calls were made (mocked)
      const { apiLogger } = require('../../lib/observability/logger.js');
      expect(apiLogger.apiRequest).toHaveBeenCalledWith('GET', '/api/movie-analysis', { tmdbId: '550' });
      expect(apiLogger.apiResponse).toHaveBeenCalledWith('GET', '/api/movie-analysis', 200, expect.any(Number), expect.any(Number));
    });

    test('logs database errors properly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      const dbError = new Error('Database connection failed');
      dbError.code = 'ECONNREFUSED';
      mockClient.query.mockRejectedValueOnce(dbError);

      await movieAnalysisHandler(req, res);

      const { dbLogger, railwayLogger } = require('../../lib/observability/logger.js');
      expect(dbLogger.dbError).toHaveBeenCalledWith('movie analysis query', ['550'], dbError);
      expect(railwayLogger.error).toHaveBeenCalledWith('Movie analysis database error', expect.objectContaining({
        tmdbId: '550',
        error: 'Database connection failed',
        code: 'ECONNREFUSED'
      }));
    });
  });
});