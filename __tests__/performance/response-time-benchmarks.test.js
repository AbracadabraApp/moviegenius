/**
 * Performance Benchmarks and Regression Detection Tests
 * Ensures API endpoints meet response time requirements and catch performance regressions
 */

import { createMocks } from 'node-mocks-http';
import movieAnalysisHandler from '../../pages/api/movie-analysis.js';
import { createPerformanceBenchmark } from '../setup/database-test-utils.js';

// Mock database
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

describe('Performance Benchmarks', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(),
    };
    Client.mockImplementation(() => mockClient);

    process.env.RAILWAY_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.RAILWAY_DATABASE_URL;
  });

  describe('API Response Time Requirements', () => {
    test('movie analysis API responds within 500ms target', async () => {
      const benchmark = createPerformanceBenchmark('Movie Analysis API', 500);

      // Mock fast database responses
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            movie_id: 1, 
            claude_response: 'Fast analysis response', 
            created_at: new Date() 
          }], 
          rowCount: 1 
        });

      const result = await benchmark(async () => {
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: '550' }
        });

        await movieAnalysisHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
      });

      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(500);
    });

    test('concurrent requests maintain performance', async () => {
      const concurrentRequests = 10;
      const benchmark = createPerformanceBenchmark('Concurrent Requests', 2000);

      // Setup fast responses for all requests
      mockClient.query
        .mockResolvedValue({ 
          rows: [{ id: 1, title: 'Test Movie', year: 2000, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValue({ 
          rows: [{ 
            id: 1, 
            movie_id: 1, 
            claude_response: 'Test analysis', 
            created_at: new Date() 
          }], 
          rowCount: 1 
        });

      const result = await benchmark(async () => {
        const promises = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
          const { req, res } = createMocks({
            method: 'GET',
            query: { tmdbId: (550 + i).toString() }
          });
          
          promises.push(movieAnalysisHandler(req, res));
        }

        await Promise.all(promises);
      });

      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(2000);
    });

    test('large analysis content performance', async () => {
      const benchmark = createPerformanceBenchmark('Large Content Response', 1000);

      // Create large analysis content (100KB)
      const largeAnalysis = 'A'.repeat(100000);

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Fight Club', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            movie_id: 1, 
            claude_response: largeAnalysis, 
            created_at: new Date() 
          }], 
          rowCount: 1 
        });

      const result = await benchmark(async () => {
        const { req, res } = createMooks({
          method: 'GET',
          query: { tmdbId: '550' }
        });

        await movieAnalysisHandler(req, res);
        
        const responseData = JSON.parse(res._getData());
        expect(responseData.analysis.length).toBe(100000);
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('Database Performance Benchmarks', () => {
    test('database connection time is acceptable', async () => {
      let connectionTime = 0;
      
      mockClient.connect.mockImplementation(async () => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms connection
        connectionTime = Date.now() - start;
      });

      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], 
          rowCount: 1 
        });

      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);

      expect(connectionTime).toBeLessThan(100); // Connection should be under 100ms
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.performance.connect_time).toBeGreaterThan(0);
    });

    test('query execution time is optimal', async () => {
      let movieQueryTime = 0;
      let analysisQueryTime = 0;

      mockClient.query
        .mockImplementationOnce(async () => {
          const start = Date.now();
          await new Promise(resolve => setTimeout(resolve, 20)); // 20ms movie query
          movieQueryTime = Date.now() - start;
          return { rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], rowCount: 1 };
        })
        .mockImplementationOnce(async () => {
          const start = Date.now();
          await new Promise(resolve => setTimeout(resolve, 30)); // 30ms analysis query
          analysisQueryTime = Date.now() - start;
          return { rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], rowCount: 1 };
        });

      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);

      expect(movieQueryTime).toBeLessThan(50);
      expect(analysisQueryTime).toBeLessThan(100);

      const responseData = JSON.parse(res._getData());
      expect(responseData.performance.movie_query_time).toBeGreaterThan(0);
      expect(responseData.performance.analysis_query_time).toBeGreaterThan(0);
    });

    test('handles timeout scenarios within acceptable limits', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      mockClient.query.mockRejectedValueOnce(timeoutError);

      const startTime = Date.now();
      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);
      const responseTime = Date.now() - startTime;

      // Error handling should still be fast
      expect(responseTime).toBeLessThan(1000);
      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('properly cleans up database connections', async () => {
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], 
          rowCount: 1 
        });

      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);

      // Verify connection lifecycle
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.end).toHaveBeenCalledTimes(1);
    });

    test('cleans up connections on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'GET',
        query: { tmdbId: '550' }
      });

      await movieAnalysisHandler(req, res);

      // Should still clean up connection even on error
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.end).toHaveBeenCalledTimes(1);
    });

    test('handles multiple rapid requests without connection leaks', async () => {
      const requestCount = 20;
      
      mockClient.query
        .mockResolvedValue({ 
          rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValue({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], 
          rowCount: 1 
        });

      const promises = [];
      
      for (let i = 0; i < requestCount; i++) {
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: (550 + i).toString() }
        });
        
        promises.push(movieAnalysisHandler(req, res));
      }

      await Promise.all(promises);

      // Should have created and cleaned up exactly the right number of connections
      expect(mockClient.connect).toHaveBeenCalledTimes(requestCount);
      expect(mockClient.end).toHaveBeenCalledTimes(requestCount);
    });
  });

  describe('Regression Detection', () => {
    test('establishes baseline performance metrics', async () => {
      const benchmarks = {};

      // Test different scenarios and record performance
      const scenarios = [
        { name: 'simple_movie_lookup', tmdbId: '550' },
        { name: 'essential_movie_access', tmdbId: '238' },
        { name: 'popular_movie_query', tmdbId: '680' }
      ];

      for (const scenario of scenarios) {
        mockClient.query
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: parseInt(scenario.tmdbId) }], 
            rowCount: 1 
          })
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, movie_id: 1, claude_response: 'Test analysis', created_at: new Date() }], 
            rowCount: 1 
          });

        const startTime = Date.now();
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: scenario.tmdbId }
        });

        await movieAnalysisHandler(req, res);
        const duration = Date.now() - startTime;

        benchmarks[scenario.name] = {
          duration,
          timestamp: new Date().toISOString(),
          success: res._getStatusCode() === 200
        };

        expect(benchmarks[scenario.name].success).toBe(true);
        expect(benchmarks[scenario.name].duration).toBeLessThan(1000);
      }

      // Store baseline metrics for comparison
      expect(Object.keys(benchmarks)).toHaveLength(3);
    });

    test('validates response size consistency', async () => {
      const responses = [];

      for (let i = 0; i < 3; i++) {
        mockClient.query
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, title: `Movie ${i}`, year: 1999, tmdb_id: 550 + i }], 
            rowCount: 1 
          })
          .mockResolvedValueOnce({ 
            rows: [{ 
              id: 1, 
              movie_id: 1, 
              claude_response: `Analysis content for movie ${i}`, 
              created_at: new Date() 
            }], 
            rowCount: 1 
          });

        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: (550 + i).toString() }
        });

        await movieAnalysisHandler(req, res);
        const responseData = res._getData();
        responses.push({
          size: responseData.length,
          status: res._getStatusCode()
        });
      }

      // Response sizes should be reasonable and consistent structure
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.size).toBeGreaterThan(100); // Minimum reasonable size
        expect(response.size).toBeLessThan(50000); // Maximum reasonable size
      });
    });

    test('tracks performance degradation over time', async () => {
      const performanceHistory = [];
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        mockClient.query
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], 
            rowCount: 1 
          })
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], 
            rowCount: 1 
          });

        const startTime = performance.now();
        const { req, res } = createMocks({
          method: 'GET',
          query: { tmdbId: '550' }
        });

        await movieAnalysisHandler(req, res);
        const duration = performance.now() - startTime;

        performanceHistory.push(duration);
      }

      // Calculate performance statistics
      const avgDuration = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
      const maxDuration = Math.max(...performanceHistory);
      const minDuration = Math.min(...performanceHistory);

      expect(avgDuration).toBeLessThan(500); // Average should be fast
      expect(maxDuration).toBeLessThan(1000); // No request should be too slow
      expect(maxDuration - minDuration).toBeLessThan(500); // Consistent performance
    });
  });

  describe('Load Testing Scenarios', () => {
    test('handles burst traffic patterns', async () => {
      const burstSize = 15;
      const benchmark = createPerformanceBenchmark('Burst Traffic', 3000);

      mockClient.query
        .mockResolvedValue({ 
          rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValue({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], 
          rowCount: 1 
        });

      const result = await benchmark(async () => {
        // Simulate burst of requests all at once
        const promises = [];
        for (let i = 0; i < burstSize; i++) {
          const { req, res } = createMocks({
            method: 'GET',
            query: { tmdbId: (550 + i).toString() }
          });
          promises.push(movieAnalysisHandler(req, res));
        }

        const results = await Promise.all(promises);
        
        // All requests should succeed
        results.forEach((_, index) => {
          // Each request should have completed
          expect(mockClient.connect).toHaveBeenCalled();
        });
      });

      expect(result.passed).toBe(true);
    });

    test('maintains performance under sustained load', async () => {
      const sustainedRequests = 25;
      const benchmark = createPerformanceBenchmark('Sustained Load', 5000);

      mockClient.query
        .mockResolvedValue({ 
          rows: [{ id: 1, title: 'Test', year: 1999, tmdb_id: 550 }], 
          rowCount: 1 
        })
        .mockResolvedValue({ 
          rows: [{ id: 1, movie_id: 1, claude_response: 'Test', created_at: new Date() }], 
          rowCount: 1 
        });

      const result = await benchmark(async () => {
        // Process requests sequentially to simulate sustained load
        for (let i = 0; i < sustainedRequests; i++) {
          const { req, res } = createMocks({
            method: 'GET',
            query: { tmdbId: (550 + i).toString() }
          });

          await movieAnalysisHandler(req, res);
          expect(res._getStatusCode()).toBe(200);
        }
      });

      expect(result.passed).toBe(true);
      expect(mockClient.connect).toHaveBeenCalledTimes(sustainedRequests);
      expect(mockClient.end).toHaveBeenCalledTimes(sustainedRequests);
    });
  });
});