// __tests__/api/lookup-movie.test.js
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/lookup-movie';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [
              {
                id: 1,
                title: 'The Matrix',
                year: 1999,
                slug: 'Mind-bending sci-fi thriller',
                poster_url: '/matrix.jpg',
                tmdb_id: 603,
              },
            ],
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('/api/lookup-movie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return movie results for valid search', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'matrix',
        year: 1999,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0]).toHaveProperty('title');
    expect(data.results[0]).toHaveProperty('year');
    expect(data.results[0]).toHaveProperty('tmdb_id');
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
    expect(data.error).toContain('Movie title and year are required');
  });

  it('should return 405 for invalid method', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);

    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Only POST method allowed');
  });

  it('should handle empty search results', async () => {
    // Mock empty results
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          ilike: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'nonexistentmovie',
        year: 1999,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.results).toEqual([]);
  });
});
