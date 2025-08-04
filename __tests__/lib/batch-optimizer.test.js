/**
 * Batch Optimizer Tests
 *
 * Tests the high-performance parallel processing system for batch operations.
 * Validates concurrency control, error handling, performance tracking,
 * and circuit breaker functionality.
 */

import { jest } from '@jest/globals';
import { getBatchOptimizer } from '../../lib/batch-optimizer.js';

// Mock performance monitor
const mockPerformanceMonitor = {
  trackMetric: jest.fn(),
  trackAPICost: jest.fn(),
};

jest.mock('../../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: () => mockPerformanceMonitor,
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    upsert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    insert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    update: jest.fn(() => ({ match: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
  })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    NODE_ENV: 'test',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Batch Optimizer', () => {
  let batchOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    batchOptimizer = getBatchOptimizer();
  });

  describe('Concurrency Control', () => {
    test('should limit concurrent operations correctly', async () => {
      const concurrency = 3;
      const limiter = batchOptimizer.createConcurrencyLimiter(concurrency);

      let running = 0;
      let maxConcurrentReached = 0;

      const items = Array.from({ length: 10 }, (_, i) => i);

      const promises = items.map(item =>
        limiter(async () => {
          running++;
          maxConcurrentReached = Math.max(maxConcurrentReached, running);

          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, 10));

          running--;
          return item * 2;
        })
      );

      const results = await Promise.all(promises);

      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      expect(maxConcurrentReached).toBeLessThanOrEqual(concurrency);
    });

    test('should handle errors in concurrent operations', async () => {
      const limiter = batchOptimizer.createConcurrencyLimiter(2);

      const promises = [
        limiter(async () => 'success1'),
        limiter(async () => {
          throw new Error('test error');
        }),
        limiter(async () => 'success2'),
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value).toBe('success1');
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason.message).toBe('test error');
      expect(results[2].status).toBe('fulfilled');
      expect(results[2].value).toBe('success2');
    });
  });

  describe('Parallel Processing', () => {
    test('should process items in parallel with progress tracking', async () => {
      const items = [1, 2, 3, 4, 5];
      const progressUpdates = [];

      const result = await batchOptimizer.processInParallel(
        items,
        async item => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return item * 2;
        },
        {
          concurrency: 3,
          batchName: 'test_processing',
          onProgress: progress => {
            progressUpdates.push(progress);
          },
        }
      );

      expect(result.results).toEqual([2, 4, 6, 8, 10]);
      expect(result.errors).toEqual([]);
      expect(result.metrics.totalItems).toBe(5);
      expect(result.metrics.successfulItems).toBe(5);
      expect(result.metrics.failedItems).toBe(0);
      expect(result.metrics.successRate).toBe(100);

      // Should have progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(5);
    });

    test('should handle errors gracefully in parallel processing', async () => {
      const items = [1, 2, 3];

      const result = await batchOptimizer.processInParallel(
        items,
        async item => {
          if (item === 2) {
            throw new Error(`Error processing ${item}`);
          }
          return item * 2;
        },
        {
          concurrency: 2,
          batchName: 'error_test',
        }
      );

      expect(result.results).toEqual([2, 6]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].item).toBe(2);
      expect(result.metrics.successRate).toBe(66.7);
    });

    test('should process in chunks when chunk size is specified', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i + 1);

      const result = await batchOptimizer.processInParallel(items, async item => item * 2, {
        concurrency: 5,
        chunkSize: 10,
        batchName: 'chunked_test',
      });

      expect(result.results).toHaveLength(25);
      expect(result.metrics.totalItems).toBe(25);
      expect(result.metrics.successRate).toBe(100);
    });
  });

  describe('Database Batch Operations', () => {
    test('should perform batch upsert successfully', async () => {
      const testData = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];

      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => ({
          select: jest.fn(() =>
            Promise.resolve({
              data: testData,
              error: null,
            })
          ),
        })),
      });

      const result = await batchOptimizer.batchDatabaseOperation('upsert', testData, {
        table: 'test_table',
        batchSize: 10,
      });

      expect(result.success).toBe(true);
      expect(result.results).toEqual(testData);
      expect(result.metrics.recordsProcessed).toBe(2);
      expect(result.metrics.recordsInserted).toBe(2);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_table');
    });

    test('should handle database errors gracefully', async () => {
      const testData = [{ id: 1, name: 'Test' }];

      mockSupabaseClient.from.mockReturnValue({
        upsert: jest.fn(() => ({
          select: jest.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            })
          ),
        })),
      });

      await expect(
        batchOptimizer.batchDatabaseOperation('upsert', testData, {
          table: 'test_table',
        })
      ).rejects.toThrow('Database error');
    });

    test('should reject invalid table name', async () => {
      await expect(batchOptimizer.batchDatabaseOperation('upsert', [], {})).rejects.toThrow(
        'Table name is required'
      );
    });
  });

  describe('Circuit Breaker', () => {
    test('should succeed on first attempt with healthy API', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success');

      const result = await batchOptimizer.makeResilientAPICall('test_api', mockApiCall);

      expect(result).toBe('success');
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      const mockApiCall = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await batchOptimizer.makeResilientAPICall('test_api_retry', mockApiCall, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockApiCall).toHaveBeenCalledTimes(3);
    });

    test('should open circuit breaker after multiple failures', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Persistent error'));

      // Make multiple failed calls to trip the circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await batchOptimizer.makeResilientAPICall('failing_api', mockApiCall, {
            maxRetries: 1,
            retryDelay: 1,
            circuitBreakerThreshold: 3,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should be rejected by circuit breaker
      await expect(
        batchOptimizer.makeResilientAPICall('failing_api', mockApiCall, {
          circuitBreakerThreshold: 3,
          circuitBreakerTimeout: 10000,
        })
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Progress Tracking', () => {
    test('should track progress correctly', () => {
      const tracker = batchOptimizer.createProgressTracker(100, 0); // 0ms interval for testing

      tracker.update(25);
      tracker.update(25);
      tracker.update(50);

      const metrics = tracker.getMetrics();

      expect(metrics.completed).toBe(100);
      expect(metrics.total).toBe(100);
      expect(metrics.percentage).toBe('100.0');
      expect(metrics.duration).toBeGreaterThan(0);
    });

    test('should update progress incrementally', () => {
      const tracker = batchOptimizer.createProgressTracker(10, 0);

      for (let i = 0; i < 10; i++) {
        tracker.update(1);
      }

      const metrics = tracker.getMetrics();
      expect(metrics.completed).toBe(10);
      expect(metrics.percentage).toBe('100.0');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track metrics during processing', async () => {
      const items = [1, 2, 3];

      await batchOptimizer.processInParallel(items, async item => item * 2, {
        batchName: 'metrics_test',
      });

      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'metrics_test_batch_complete',
        expect.any(Number),
        expect.objectContaining({
          total_items: 3,
          successful_items: 3,
          failed_items: 0,
          success_rate: 100,
        })
      );
    });

    test('should track API call metrics', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success');

      await batchOptimizer.makeResilientAPICall('metrics_api', mockApiCall);

      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'api_call_metrics_api',
        expect.any(Number),
        expect.objectContaining({
          attempt: 1,
          success: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should collect errors without stopping processing', async () => {
      const items = [1, 2, 3, 4, 5];

      const result = await batchOptimizer.processInParallel(
        items,
        async item => {
          if (item % 2 === 0) {
            throw new Error(`Even number error: ${item}`);
          }
          return item * 2;
        },
        { batchName: 'error_collection_test' }
      );

      expect(result.results).toEqual([2, 6, 10]); // Only odd numbers succeed
      expect(result.errors).toHaveLength(2); // Even numbers fail
      expect(result.errors[0].item).toBe(2);
      expect(result.errors[1].item).toBe(4);
    });

    test('should handle completely failing batch gracefully', async () => {
      const items = [1, 2, 3];

      const result = await batchOptimizer.processInParallel(
        items,
        async () => {
          throw new Error('All operations fail');
        },
        { batchName: 'total_failure_test' }
      );

      expect(result.results).toEqual([]);
      expect(result.errors).toHaveLength(3);
      expect(result.metrics.successRate).toBe(0);
    });
  });
});
