/**
 * Database Optimization Tests
 * 
 * Tests the database index creation and performance measurement system.
 * Validates query optimization, performance tracking, and error handling.
 * 
 * Tests:
 * - Index creation and validation
 * - Query performance measurement
 * - Optimization recommendations
 * - Error handling and rollback
 */

import { jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      or: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      lt: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => ({
        lt: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  })),
  rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock performance monitor
const mockPerformanceMonitor = {
  trackMetric: jest.fn(),
  trackAPICost: jest.fn()
};

jest.mock('../../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: () => mockPerformanceMonitor
}));

// Mock API utils
jest.mock('../../lib/api-utils.js', () => ({
  withErrorHandling: (handler) => handler,
  ApiErrors: {
    BAD_REQUEST: (msg) => ({ name: 'ApiError', message: msg, statusCode: 400 }),
    SERVICE_UNAVAILABLE: (msg) => ({ name: 'ApiError', message: msg, statusCode: 503 }),
    INTERNAL_ERROR: (msg) => ({ name: 'ApiError', message: msg, statusCode: 500 })
  },
  successResponse: (data, message) => ({ success: true, data, message }),
  checkRateLimit: jest.fn()
}));

import { getDatabaseOptimizer } from '../../lib/database-optimizer.js';
import handler from '../../pages/api/optimize-database.js';

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    NODE_ENV: 'test'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Database Optimization', () => {
  let optimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    optimizer = getDatabaseOptimizer();
  });

  describe('DatabaseOptimizer Class', () => {
    test('should create critical indexes successfully', async () => {
      // Mock successful index creation
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });

      const results = await optimizer.createCriticalIndexes();

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      // Should attempt to create multiple indexes
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(results.length);
      
      // Should track performance metrics
      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'database_index_creation',
        expect.any(Number),
        expect.objectContaining({
          index_name: expect.any(String),
          table: expect.any(String)
        })
      );
    });

    test('should handle index creation errors gracefully', async () => {
      // Mock index creation failure
      mockSupabaseClient.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Index creation failed' } 
      });

      const results = await optimizer.createCriticalIndexes();

      expect(results).toBeDefined();
      expect(results.some(r => r.status === 'error')).toBe(true);
    });

    test('should measure query performance correctly', async () => {
      // Mock successful query
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 1, title: 'Test Movie', year: 2023 }, 
              error: null 
            }))
          }))
        }))
      });

      const result = await optimizer.measureQueryPerformance('test_query', async () => {
        return await optimizer.lookupMovie('Test Movie', 2023);
      });

      expect(result).toBeDefined();
      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'database_query_test_query',
        expect.any(Number),
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should track slow queries', async () => {
      // Mock slow query (simulate delay)
      const slowQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds
        return { data: 'test' };
      };

      await optimizer.measureQueryPerformance('slow_test_query', slowQuery);

      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'database_query_slow_test_query',
        expect.any(Number),
        expect.objectContaining({
          slow_query: true
        })
      );
    });

    test('should generate optimization recommendations', () => {
      // Add some slow query stats
      optimizer.queryStats.set('slow_query', {
        totalExecutions: 10,
        totalTime: 15000,
        slowQueries: 8,
        averageTime: 1500
      });

      const recommendations = optimizer.generateOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'slow_query')).toBe(true);
    });

    test('should perform movie lookup optimization', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 1, title: 'The Matrix', year: 1999 }, 
              error: null 
            }))
          }))
        }))
      });

      const result = await optimizer.lookupMovie('The Matrix', 1999);

      expect(result).toEqual({ id: 1, title: 'The Matrix', year: 1999 });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('movies');
    });

    test('should perform TMDB ID lookup optimization', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 1, tmdb_id: 603, title: 'The Matrix' }, 
              error: null 
            }))
          }))
        }))
      });

      const result = await optimizer.lookupMovieByTmdbId(603);

      expect(result).toEqual({ id: 1, tmdb_id: 603, title: 'The Matrix' });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('movies');
    });

    test('should perform fuzzy search optimization', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ 
                data: [
                  { id: 1, title: 'The Matrix', year: 1999 },
                  { id: 2, title: 'Matrix Reloaded', year: 2003 }
                ], 
                error: null 
              }))
            }))
          }))
        }))
      });

      const results = await optimizer.searchMovies('matrix');

      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('Matrix');
    });

    test('should handle cache cleanup optimization', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn(() => ({
          lt: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      });

      const result = await optimizer.cleanupExpiredCache();

      expect(result).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('query_cache');
    });
  });

  describe('Database Optimization API', () => {
    test('should execute complete database optimization', async () => {
      // Mock successful operations
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
          })),
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          delete: jest.fn(() => ({
            lt: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      expect(responseData.success).toBe(true);
      expect(responseData.data.optimization_result).toBeDefined();
      expect(responseData.data.performance_tests).toBeDefined();
      expect(responseData.data.summary).toBeDefined();
    });

    test('should reject non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    test('should handle missing service role key', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      
      // Restore the key
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    });

    test('should track performance metrics during optimization', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
          })),
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          delete: jest.fn(() => ({
            lt: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await handler(req, res);

      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'database_optimization_complete',
        expect.any(Number),
        expect.objectContaining({
          indexes_created: expect.any(Number)
        })
      );
    });

    test('should handle optimization errors gracefully', async () => {
      // Mock database error
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Database connection failed'));

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      // Should track the error
      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'database_optimization_error',
        expect.any(Number),
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  describe('Query Statistics', () => {
    test('should track query statistics correctly', async () => {
      const stats = optimizer.getQueryStats();
      expect(typeof stats).toBe('object');
    });

    test('should calculate slow query percentages', async () => {
      // Add mock statistics
      optimizer.queryStats.set('test_query', {
        totalExecutions: 100,
        totalTime: 50000,
        slowQueries: 10,
        averageTime: 500
      });

      const stats = optimizer.getQueryStats();
      expect(stats.test_query.slowQueryPercentage).toBe('10.0%');
    });
  });
});