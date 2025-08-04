/**
 * Ask Claude API Request Deduplication Tests
 *
 * Tests the request deduplication optimization that prevents redundant
 * API calls when identical requests are made within 30 seconds.
 *
 * This optimization provides significant cost savings and performance
 * improvements for high-traffic scenarios.
 */

// Mock dependencies before imports to avoid module loading issues
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

jest.mock('../../lib/prompts/builder.js', () => ({
  buildPrompt: jest.fn(() => ({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    temperature: 0.1,
  })),
}));

jest.mock('../../lib/cache.js', () => ({
  getCache: jest.fn(() => ({
    cacheClaudeResponse: jest.fn((question, model, callback) => callback()),
    cacheTMDBResponse: jest.fn((type, params, callback) => callback()),
  })),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('../../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: jest.fn(() => ({
    trackMetric: jest.fn(),
    trackAPICost: jest.fn(),
  })),
}));

import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/ask-claude.js';
import { getPerformanceMonitor } from '../../lib/performance-monitor.js';

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    TMDB_API_KEY: 'test-tmdb-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    NODE_ENV: 'test',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Ask Claude API Request Deduplication', () => {
  let mockAnthropicResponse;
  let mockPerformanceMonitor;

  // Helper to create properly mocked requests
  const createMockRequest = (question, method = 'POST') => {
    const { req, res } = createMocks({
      method,
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: { question },
    });
    req.connection = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Anthropic response
    mockAnthropicResponse = {
      content: [
        {
          text: 'PARAGRAPH: Test film analysis content.\nMOVIES: The Godfather|1972|Mafia family saga|Free on Tubi\nMORE_IDEAS: Casablanca|1942|Wartime romance|Free on Archive.org',
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 200,
      },
    };

    const { Anthropic } = require('@anthropic-ai/sdk');
    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue(mockAnthropicResponse),
      },
    }));

    // Mock global fetch for TMDB API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        results: [
          {
            id: 238,
            title: 'The Godfather',
            release_date: '1972-03-14',
            poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
            overview: 'Mafia family saga',
          },
        ],
      }),
    });

    // Mock performance monitor
    mockPerformanceMonitor = {
      trackMetric: jest.fn(),
      trackAPICost: jest.fn(),
    };
    const { getPerformanceMonitor } = require('../../lib/performance-monitor.js');
    getPerformanceMonitor.mockReturnValue(mockPerformanceMonitor);
  });

  test('should handle single request normally', async () => {
    const { req, res } = createMockRequest('What are the best sci-fi films?');

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.success).toBe(true);
    expect(responseData.data.sections).toBeDefined();
    expect(responseData.data.moreIdeas).toBeDefined();

    // Should make one API call
    const { Anthropic } = require('@anthropic-ai/sdk');
    expect(Anthropic).toHaveBeenCalledTimes(1);
  });

  test('should deduplicate identical concurrent requests', async () => {
    const question = 'What are the best noir films?';

    // Create two identical requests
    const { req: req1, res: res1 } = createMockRequest(question);
    const { req: req2, res: res2 } = createMockRequest(question);

    // Make both requests concurrently
    const [result1, result2] = await Promise.all([handler(req1, res1), handler(req2, res2)]);

    // Both should succeed
    expect(res1._getStatusCode()).toBe(200);
    expect(res2._getStatusCode()).toBe(200);

    const responseData1 = JSON.parse(res1._getData());
    const responseData2 = JSON.parse(res2._getData());

    expect(responseData1.success).toBe(true);
    expect(responseData2.success).toBe(true);

    // Should only make one API call due to deduplication
    const { Anthropic } = require('@anthropic-ai/sdk');
    const mockInstance = new Anthropic();
    expect(mockInstance.messages.create).toHaveBeenCalledTimes(1);

    // Should track deduplication metric
    expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
      'request_deduplication',
      1,
      expect.objectContaining({
        question: expect.stringContaining('What are the best noir'),
        cost_savings: 'prevented_duplicate_api_call',
      })
    );
  });

  test('should not deduplicate different requests', async () => {
    const { req: req1, res: res1 } = createMockRequest('What are the best sci-fi films?');
    const { req: req2, res: res2 } = createMockRequest('What are the best horror films?');

    // Make both requests
    await Promise.all([handler(req1, res1), handler(req2, res2)]);

    // Both should succeed
    expect(res1._getStatusCode()).toBe(200);
    expect(res2._getStatusCode()).toBe(200);

    // Should make two API calls for different questions
    const { Anthropic } = require('@anthropic-ai/sdk');
    const mockInstance = new Anthropic();
    expect(mockInstance.messages.create).toHaveBeenCalledTimes(2);

    // Should not track deduplication
    expect(mockPerformanceMonitor.trackMetric).not.toHaveBeenCalledWith(
      'request_deduplication',
      expect.any(Number),
      expect.any(Object)
    );
  });

  test('should track API cost and performance metrics', async () => {
    const { req, res } = createMockRequest('What are the best adventure films?');

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    // Should track API cost
    expect(mockPerformanceMonitor.trackAPICost).toHaveBeenCalledWith(
      'claude_sonnet',
      'ask-claude',
      100, // input tokens
      200, // output tokens
      false // not cached
    );

    // Should track response time
    expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
      'claude_api_response_time',
      expect.any(Number),
      expect.objectContaining({
        question: expect.stringContaining('What are the best adventure'),
        input_tokens: 100,
        output_tokens: 200,
      })
    );
  });

  test('should handle API errors gracefully with fallback', async () => {
    // Mock API error
    const { Anthropic } = require('@anthropic-ai/sdk');
    const mockInstance = new Anthropic();
    mockInstance.messages.create.mockRejectedValue(new Error('API Error'));

    const { req, res } = createMockRequest('What are the best comedy films?');

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());

    // Should still return a response (fallback)
    expect(responseData.success).toBe(true);
    expect(responseData.data.sections).toBeDefined();

    // Should track API error
    expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
      'claude_api_error',
      1,
      expect.objectContaining({
        error: 'API Error',
        question: expect.stringContaining('What are the best comedy'),
      })
    );
  });

  test('should handle request deduplication failure gracefully', async () => {
    // First request succeeds
    const { req: req1, res: res1 } = createMockRequest('What are the best drama films?');

    await handler(req1, res1);
    expect(res1._getStatusCode()).toBe(200);

    // Mock the first request to fail during deduplication
    const { Anthropic } = require('@anthropic-ai/sdk');
    const mockInstance = new Anthropic();
    mockInstance.messages.create.mockRejectedValueOnce(new Error('Network Error'));

    // Second identical request should proceed despite first request failure
    const { req: req2, res: res2 } = createMockRequest('What are the best drama films?');

    await handler(req2, res2);

    expect(res2._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res2._getData());
    expect(responseData.success).toBe(true);
  });

  test('should normalize request keys for deduplication', async () => {
    // Test that different whitespace/casing doesn't prevent deduplication
    const { req: req1, res: res1 } = createMockRequest('What are the BEST sci-fi films?');
    const { req: req2, res: res2 } = createMockRequest('  what are the best  sci-fi  films?  ');

    // Make both requests concurrently
    await Promise.all([handler(req1, res1), handler(req2, res2)]);

    // Both should succeed
    expect(res1._getStatusCode()).toBe(200);
    expect(res2._getStatusCode()).toBe(200);

    // Should only make one API call due to normalized deduplication
    const { Anthropic } = require('@anthropic-ai/sdk');
    const mockInstance = new Anthropic();
    expect(mockInstance.messages.create).toHaveBeenCalledTimes(1);
  });
});
