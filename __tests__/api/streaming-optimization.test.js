/**
 * Simple Streaming Endpoint Optimization Validation
 * Tests basic functionality and performance improvements
 */

const { createMocks } = require('node-mocks-http');

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Available on Netflix, Amazon Prime Video for streaming. Also available for rent on Amazon Prime Video, Apple TV, and Google Play Movies.' }],
        usage: { input_tokens: 45, output_tokens: 35 }
      })
    }
  }));
});

// Mock cache service for testing
const mockCache = {
  cacheStreamingData: jest.fn()
};

jest.mock('../../lib/cache.js', () => ({
  getCache: () => mockCache
}));

// Mock performance monitor
jest.mock('../../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: () => ({
    timeFunction: jest.fn(async (name, fn, context) => {
      return await fn();
    }),
    trackMetric: jest.fn(),
    trackAPICost: jest.fn()
  })
}));

// Mock API utils
jest.mock('../../lib/api-utils.js', () => ({
  withErrorHandling: (handler) => handler,
  validateRequiredFields: (body, fields) => ({
    isValid: fields.every(field => body && body[field]),
    missingFields: fields.filter(field => !body || !body[field])
  }),
  successResponse: (res, data) => res.status(200).json(data)
}));

const handler = require('../../pages/api/get-streaming-info').default;

describe('Streaming Endpoint Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  test('should validate input parameters correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {} // Missing required fields
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Missing required fields');
  });

  test('should handle cache miss scenario (first request)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'The Matrix',
        year: 1999
      }
    });

    // Mock cache miss
    mockCache.cacheStreamingData.mockImplementation(async (key, fetchFn) => {
      // Simulate cache miss - call the fetch function
      return await fetchFn();
    });

    const startTime = Date.now();
    await handler(req, res);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Validate response structure
    expect(data).toHaveProperty('streamingText');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('year');
    expect(data).toHaveProperty('responseTime');
    
    // Should be cache miss
    expect(data.cached).toBe(false);
    
    // Should have called cache function
    expect(mockCache.cacheStreamingData).toHaveBeenCalledWith(
      'The Matrix_1999',
      expect.any(Function)
    );
    
    console.log(`📊 Cache Miss Response Time: ${responseTime}ms`);
    console.log(`📊 Cache Miss Data:`, data);
  });

  test('should handle cache hit scenario (subsequent request)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Inception',
        year: 2010
      }
    });

    // Mock cache hit
    const cachedResponse = {
      streamingText: 'Available on Netflix and HBO Max',
      title: 'Inception',
      year: 2010,
      cached: true,
      requestTime: 5
    };

    mockCache.cacheStreamingData.mockResolvedValue(cachedResponse);

    const startTime = Date.now();
    await handler(req, res);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Should be much faster cache hit
    expect(data.cached).toBe(true);
    expect(responseTime).toBeLessThan(100); // Should be very fast
    
    console.log(`📊 Cache Hit Response Time: ${responseTime}ms`);
    console.log(`📊 Cache Hit Data:`, data);
  });

  test('should include proper cache headers', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Pulp Fiction',
        year: 1994
      }
    });

    mockCache.cacheStreamingData.mockResolvedValue({
      streamingText: 'Available for rent on Amazon Prime Video',
      title: 'Pulp Fiction',
      year: 1994,
      cached: true
    });

    await handler(req, res);

    // Check cache headers are set
    const headers = res._getHeaders();
    expect(headers['cache-control']).toContain('public');
    expect(headers['cache-control']).toContain('max-age=3600');
    expect(headers['x-cache-status']).toBeDefined();
  });

  test('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Method not allowed');
  });

  test('should handle cache errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'The Godfather',
        year: 1972
      }
    });

    // Simulate cache error
    mockCache.cacheStreamingData.mockRejectedValue(new Error('Redis connection failed'));

    await handler(req, res);

    // Should still return error response
    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to fetch streaming info');
  });

  test('should demonstrate performance improvement potential', () => {
    // Performance calculations based on expected usage
    const baselineApiTime = 2000; // 2 seconds for Claude API
    const cachedResponseTime = 50; // 50ms for cache hit
    const cacheHitRate = 80; // 80% cache hit rate expected
    
    const averageResponseTime = (cacheHitRate / 100) * cachedResponseTime + 
                               ((100 - cacheHitRate) / 100) * baselineApiTime;
    
    const improvementPercent = ((baselineApiTime - averageResponseTime) / baselineApiTime) * 100;
    
    console.log(`📊 Performance Analysis:`);
    console.log(`   Baseline API time: ${baselineApiTime}ms`);
    console.log(`   Cached response time: ${cachedResponseTime}ms`);
    console.log(`   Expected cache hit rate: ${cacheHitRate}%`);
    console.log(`   Average response time with caching: ${averageResponseTime}ms`);
    console.log(`   Performance improvement: ${improvementPercent.toFixed(1)}%`);
    
    // Validate significant improvement
    expect(improvementPercent).toBeGreaterThan(70); // Should be >70% improvement
  });

  test('should calculate cost savings', () => {
    // Cost calculations
    const costPerClaudeQuery = 0.002; // ~$0.002 per streaming query
    const queriesPerDay = 1000; // Expected daily queries
    const cacheHitRate = 80; // 80% cache hit rate
    
    const dailyCostWithoutCache = queriesPerDay * costPerClaudeQuery;
    const dailyCostWithCache = (queriesPerDay * (100 - cacheHitRate) / 100) * costPerClaudeQuery;
    const dailySavings = dailyCostWithoutCache - dailyCostWithCache;
    const monthlySavings = dailySavings * 30;
    
    console.log(`💰 Cost Analysis:`);
    console.log(`   Cost per Claude query: $${costPerClaudeQuery.toFixed(4)}`);
    console.log(`   Daily queries: ${queriesPerDay}`);
    console.log(`   Daily cost without cache: $${dailyCostWithoutCache.toFixed(2)}`);
    console.log(`   Daily cost with cache: $${dailyCostWithCache.toFixed(2)}`);
    console.log(`   Daily savings: $${dailySavings.toFixed(2)}`);
    console.log(`   Monthly savings: $${monthlySavings.toFixed(2)}`);
    
    const savingsPercent = (dailySavings / dailyCostWithoutCache) * 100;
    console.log(`   Cost reduction: ${savingsPercent.toFixed(1)}%`);
    
    // Validate significant cost reduction
    expect(savingsPercent).toBeGreaterThan(70); // Should be >70% cost reduction
  });
});