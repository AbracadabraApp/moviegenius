// __tests__/api/ask-claude.test.js
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/ask-claude';

// Mock cache service
jest.mock('../../lib/cache.js', () => ({
  getCache: jest.fn(() => ({
    cacheClaudeResponse: jest.fn((key, model, fn) => fn()),
    cacheTMDBResponse: jest.fn((type, params, fn) => fn()),
  })),
}));

// Mock performance monitor
jest.mock('../../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: jest.fn(() => ({
    trackAPICost: jest.fn(),
    trackMetric: jest.fn(),
  })),
}));

// Mock predictive cache
jest.mock('../../lib/predictive-cache.js', () => ({
  checkPredictiveCache: jest.fn(() => Promise.resolve(null)),
  getPredictiveCacheManager: jest.fn(() => ({
    cachePredictiveResponse: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock query detector
jest.mock('../../lib/query-detector.js', () => ({
  getQueryDetector: jest.fn(() => ({
    detectSeries: jest.fn(() => Promise.resolve({ found: false, confidence: 0 })),
  })),
}));

// Mock prompts builder
jest.mock('../../lib/prompts/builder.js', () => ({
  buildPrompt: jest.fn(() => ({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
  })),
}));

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            text: `PARAGRAPH: The Matrix (1999) is a groundbreaking science fiction film that redefined cinema.

MOVIES: The Matrix|1999|Mind-bending sci-fi thriller about reality and perception
MOVIES: Blade Runner|1982|Dystopian thriller exploring humanity and artificial intelligence

EXPLORE_FURTHER: Philosophy in The Matrix
EXPLORE_FURTHER: Visual effects revolution

MORE_IDEAS: Ghost in the Shell|1995|Anime cyberpunk thriller
MORE_IDEAS: Dark City|1998|Neo-noir sci-fi mystery`,
          },
        ],
      }),
    },
  })),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' },
          })),
        })),
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
}));

describe('/api/ask-claude', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return Claude analysis for valid query', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'Tell me about The Matrix',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('sections');
    expect(data).toHaveProperty('exploreFurther');
    expect(data).toHaveProperty('moreIdeas');
    expect(Array.isArray(data.sections)).toBe(true);
    expect(Array.isArray(data.exploreFurther)).toBe(true);
  });

  it('should return 400 for missing query', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);

    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Query is required');
  });

  it('should return 405 for invalid method', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should handle Claude API errors gracefully', async () => {
    // Mock Claude API error
    const Anthropic = require('@anthropic-ai/sdk').default;
    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(new Error('API Error')),
      },
    }));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'test query',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);

    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
  });

  it('should parse movie sections correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'sci-fi movies',
      },
    });

    await handler(req, res);

    const data = JSON.parse(res._getData());

    // Check sections structure
    expect(data.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          content: expect.stringContaining('The Matrix'),
        }),
        expect.objectContaining({
          type: 'movies',
          movies: expect.arrayContaining([
            expect.objectContaining({
              title: 'The Matrix',
              year: 1999,
              slug: expect.any(String),
            }),
          ]),
        }),
      ])
    );

    // Check explore further topics
    expect(data.exploreFurther).toContain('Philosophy in The Matrix');

    // Check more ideas structure
    expect(data.moreIdeas).toHaveProperty('title', 'More Great Films');
    expect(data.moreIdeas.movies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Ghost in the Shell',
          year: 1995,
        }),
      ])
    );
  });
});
