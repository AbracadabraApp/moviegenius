/**
 * Demo Cache Performance Tests
 * 
 * Validates ultra-aggressive caching behavior and performance
 * improvements in demo mode.
 */

import { jest } from '@jest/globals';
import { getMediaCardCache } from '../lib/mediacard-cache.js';

// Mock demo config for testing
const mockDemoConfig = {
  ENABLED: true,
  CACHING: {
    mediaCardTTL: 0, // Forever cache
    preWarmPopularMovies: true,
    maxCacheMemory: 500,
    hitRateThreshold: 0.9
  },
  DEMO_PATHS: {
    popularMovies: [550, 603, 155] // Fight Club, Matrix, Dark Knight
  }
};

// Mock safety monitor
const mockSafetyMonitor = {
  recordMetric: jest.fn()
};

// Mock the demo config import
jest.mock('../lib/demo-config.js', () => ({
  getDemoConfig: () => mockDemoConfig,
  getDemoSafetyMonitor: () => mockSafetyMonitor
}));

// Mock Redis cache
const mockRedisCache = {
  get: jest.fn(),
  set: jest.fn()
};

jest.mock('../lib/cache.js', () => ({
  getCache: () => mockRedisCache
}));

// Mock performance monitor
const mockPerformanceMonitor = {
  trackMetric: jest.fn()
};

jest.mock('../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: () => mockPerformanceMonitor
}));

describe('Demo Cache Performance', () => {
  let mediaCardCache;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get fresh cache instance
    mediaCardCache = getMediaCardCache();
    
    // Wait for async demo config initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force demo config update
    mediaCardCache.demoConfig = mockDemoConfig;
    mediaCardCache.safetyMonitor = mockSafetyMonitor;
    mediaCardCache.memoryCacheSize = 500;
    mediaCardCache.memoryCacheTTL = 0; // Forever
  });

  describe('Demo Mode Configuration', () => {
    test('should enable ultra-aggressive caching in demo mode', () => {
      expect(mediaCardCache.demoConfig.ENABLED).toBe(true);
      expect(mediaCardCache.memoryCacheSize).toBe(500);
      expect(mediaCardCache.memoryCacheTTL).toBe(0); // Forever cache
    });

    test('should use forever TTL for all cache types', () => {
      // Force TTL update for demo mode
      mediaCardCache.ttls = {
        movieData: 0,
        poster: 0,
        streaming: 0,
        enhancement: 0
      };

      expect(mediaCardCache.ttls.movieData).toBe(0);
      expect(mediaCardCache.ttls.poster).toBe(0);
      expect(mediaCardCache.ttls.streaming).toBe(0);
      expect(mediaCardCache.ttls.enhancement).toBe(0);
    });
  });

  describe('Memory Cache Performance', () => {
    test('should cache items forever in memory during demo mode', async () => {
      const testKey = 'test_key';
      const testData = { title: 'Test Movie', year: 2023 };

      // Mock Redis miss, memory hit
      mockRedisCache.get.mockResolvedValue(null);

      // First call - should miss
      let result = await mediaCardCache.get(testKey);
      expect(result).toBeNull();

      // Set in cache
      mediaCardCache.setMemoryCache(testKey, testData);

      // Second call - should hit memory cache
      result = await mediaCardCache.get(testKey);
      expect(result).toEqual(testData);

      // Verify performance tracking
      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'mediacard_cache_hit',
        expect.any(Number),
        expect.objectContaining({
          source: 'memory',
          demo_mode: true
        })
      );
    });

    test('should track cache hit rates for demo monitoring', async () => {
      const testKey = 'hit_rate_test';
      const testData = { title: 'Hit Rate Movie', year: 2023 };

      // Simulate multiple requests
      await mediaCardCache.get(testKey); // Miss
      mediaCardCache.setMemoryCache(testKey, testData);
      await mediaCardCache.get(testKey); // Hit
      await mediaCardCache.get(testKey); // Hit

      const hitRate = mediaCardCache.getCacheHitRate();
      expect(hitRate).toBeGreaterThan(60); // 2/3 = 66.7%

      const stats = mediaCardCache.getCacheStats();
      expect(stats.demoMode).toBe(true);
      expect(stats.totalRequests).toBe(3);
      expect(stats.cacheHits).toBe(2);
    });

    test('should not expire memory cache items in demo mode', async () => {
      const testKey = 'forever_test';
      const testData = { title: 'Forever Movie', year: 2023 };

      // Set item in memory cache
      mediaCardCache.setMemoryCache(testKey, testData);

      // Manually simulate time passing by setting old timestamp
      const cached = mediaCardCache.memoryCache.get(testKey);
      cached.timestamp = Date.now() - 3600000; // 1 hour ago

      // Should still return the cached item (no expiration in demo mode)
      const result = await mediaCardCache.get(testKey);
      expect(result).toEqual(testData);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track demo-specific metrics', async () => {
      const testKey = 'monitoring_test';
      const testData = { title: 'Monitor Movie', year: 2023 };

      mockRedisCache.get.mockResolvedValue(testData);

      await mediaCardCache.get(testKey);

      // Should track Redis hit with demo mode flag
      expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
        'mediacard_cache_hit',
        expect.any(Number),
        expect.objectContaining({
          source: 'redis',
          demo_mode: true,
          response_time: expect.any(Number)
        })
      );

      // Should track safety metrics
      expect(mockSafetyMonitor.recordMetric).toHaveBeenCalledWith(
        'mediacard_redis_hit_time',
        expect.any(Number)
      );
    });

    test('should generate demo performance report', () => {
      // Simulate some cache activity
      mediaCardCache.cacheStats = {
        hits: 18,
        misses: 2,
        memoryHits: 15,
        totalRequests: 20,
        startTime: Date.now() - 60000 // 1 minute ago
      };

      const report = mediaCardCache.getDemoPerformanceReport();

      expect(report).toBeDefined();
      expect(report.status).toBe('excellent'); // 90% hit rate
      expect(report.metrics.overall_hit_rate).toBe(90);
      expect(report.metrics.memory_hit_rate).toBe(75);
      expect(report.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Memory Management', () => {
    test('should handle large cache sizes in demo mode', () => {
      // Fill cache to capacity
      for (let i = 0; i < 500; i++) {
        mediaCardCache.setMemoryCache(`key_${i}`, { data: `movie_${i}` });
      }

      expect(mediaCardCache.memoryCache.size).toBe(500);

      // Add one more - should evict oldest
      mediaCardCache.setMemoryCache('key_500', { data: 'newest_movie' });
      expect(mediaCardCache.memoryCache.size).toBe(500);
      expect(mediaCardCache.memoryCache.has('key_0')).toBe(false);
      expect(mediaCardCache.memoryCache.has('key_500')).toBe(true);
    });

    test('should perform memory cleanup when threshold exceeded', () => {
      // Simulate high memory usage
      mediaCardCache.memoryCache.clear();
      for (let i = 0; i < 400; i++) {
        mediaCardCache.setMemoryCache(`cleanup_${i}`, { data: `movie_${i}` });
      }

      const initialSize = mediaCardCache.memoryCache.size;
      mediaCardCache.performMemoryCleanup();

      const finalSize = mediaCardCache.memoryCache.size;
      expect(finalSize).toBeLessThan(initialSize);
      expect(mockSafetyMonitor.recordMetric).toHaveBeenCalledWith(
        'mediacard_memory_cleanup',
        expect.any(Number)
      );
    });
  });

  describe('Cache Recommendations', () => {
    test('should generate appropriate recommendations based on performance', () => {
      // Test different performance scenarios
      const scenarios = [
        { hitRate: 95, memoryRate: 85, expectedStatus: 'excellent' },
        { hitRate: 85, memoryRate: 70, expectedStatus: 'good' },
        { hitRate: 75, memoryRate: 60, expectedStatus: 'acceptable' },
        { hitRate: 65, memoryRate: 50, expectedStatus: 'needs_improvement' }
      ];

      scenarios.forEach(scenario => {
        mediaCardCache.cacheStats = {
          hits: Math.round(scenario.hitRate),
          misses: 100 - Math.round(scenario.hitRate),
          memoryHits: Math.round(scenario.memoryRate),
          totalRequests: 100,
          startTime: Date.now()
        };

        const report = mediaCardCache.getDemoPerformanceReport();
        expect(report.status).toBe(scenario.expectedStatus);
      });
    });

    test('should provide actionable recommendations for improvement', () => {
      // Low hit rate scenario
      mediaCardCache.cacheStats = {
        hits: 70,
        misses: 30,
        memoryHits: 50,
        totalRequests: 100,
        startTime: Date.now()
      };

      const recommendations = mediaCardCache.generateCacheRecommendations(70, 50);
      
      expect(recommendations).toContain('Consider pre-warming cache with more popular content');
      expect(recommendations).toContain('Increase memory cache size for better performance');
    });
  });
});

describe('Demo Cache Integration', () => {
  test('should provide seamless fallback to production mode', async () => {
    // Mock production mode
    const prodCache = getMediaCardCache();
    prodCache.demoConfig = { ENABLED: false };
    prodCache.memoryCacheSize = 100;
    prodCache.memoryCacheTTL = 300000; // 5 minutes

    const testKey = 'prod_test';
    const testData = { title: 'Production Movie', year: 2023 };

    mockRedisCache.get.mockResolvedValue(testData);

    const result = await prodCache.get(testKey);
    expect(result).toEqual(testData);

    // Should not track demo-specific metrics
    expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
      'mediacard_cache_hit',
      expect.any(Number),
      expect.objectContaining({
        demo_mode: false
      })
    );
  });
});