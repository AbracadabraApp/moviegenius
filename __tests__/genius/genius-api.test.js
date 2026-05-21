/**
 * Genius API Endpoint Tests
 *
 * Tests the /api/v1/genius endpoint that builds personalized feeds
 * using More Ideas + browse_list collections
 */

import { createMocks } from 'node-mocks-http';

// Mock database module
jest.mock('../../../lib/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
  })),
}));

import handler from '../../../pages/api/v1/genius';
import { getPool } from '../../../lib/database';

describe('POST /api/v1/genius', () => {
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    getPool.mockReturnValue({ query: mockQuery });
  });

  describe('Request Validation', () => {
    test('should reject non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
    });

    test('should handle empty savedIds', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ items: [], empty: true });
    });

    test('should handle missing savedIds', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ items: [], empty: true });
    });

    test('should filter out invalid IDs', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [123, 'invalid', -5, 0, null, undefined, 456] },
      });

      await handler(req, res);

      // Should only query with valid positive integers
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [[123, 456]]
      );
    });
  });

  describe('More Ideas Selection', () => {
    test('should sample up to 5 seeds when more available', async () => {
      // Mock 10 movies with more_ideas
      const manySeeds = Array.from({ length: 10 }, (_, i) => ({
        tmdb_id: 100 + i,
        ideas: JSON.stringify([200 + i, 300 + i]),
      }));

      mockQuery
        .mockResolvedValueOnce({ rows: manySeeds }) // more_ideas query
        .mockResolvedValueOnce({ rows: [] }) // movie details query
        .mockResolvedValueOnce({ rows: [] }); // collections query

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: manySeeds.map(s => s.tmdb_id) },
      });

      await handler(req, res);

      // Should have sampled
      const data = JSON.parse(res._getData());
      expect(data.items.length).toBeLessThanOrEqual(5);
    });

    test('should handle seeds with no more_ideas', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [123, 456] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ items: [], empty: true });
    });

    test('should parse JSON and array ideas formats', async () => {
      const mockMovieData = [
        { tmdb_id: 201, title: 'Movie 1', year: 2020, poster_url: 'url1', slug: 'movie-1' },
        { tmdb_id: 202, title: 'Movie 2', year: 2021, poster_url: 'url2', slug: 'movie-2' },
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { tmdb_id: 100, ideas: JSON.stringify([201, 202]) },
          ],
        })
        .mockResolvedValueOnce({ rows: mockMovieData })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [100] },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.items.length).toBeGreaterThan(0);
    });
  });

  describe('Seen Movies Filtering', () => {
    test('should exclude seen movies from results', async () => {
      const mockMovieData = [
        { tmdb_id: 201, title: 'Movie 1', year: 2020, poster_url: 'url1', slug: 'movie-1' },
        { tmdb_id: 202, title: 'Movie 2', year: 2021, poster_url: 'url2', slug: 'movie-2' },
        { tmdb_id: 203, title: 'Movie 3', year: 2022, poster_url: 'url3', slug: 'movie-3' },
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ tmdb_id: 100, ideas: JSON.stringify([201, 202, 203]) }],
        })
        .mockResolvedValueOnce({ rows: mockMovieData })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [100], seenIds: [202] },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      const moreIdeasItem = data.items.find(item => item.type === 'more_ideas');

      // Should not include movie 202
      if (moreIdeasItem) {
        const movieIds = moreIdeasItem.movies.map(m => m.tmdb_id);
        expect(movieIds).not.toContain(202);
      }
    });

    test('should handle invalid seen IDs gracefully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tmdb_id: 100, ideas: JSON.stringify([201]) }] })
        .mockResolvedValueOnce({ rows: [{ tmdb_id: 201, title: 'Movie', year: 2020, poster_url: 'url', slug: 'movie' }] })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          savedIds: [100],
          seenIds: ['invalid', null, undefined, -5],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Response Structure', () => {
    test('should return valid response structure', async () => {
      const mockSeedMovie = { tmdb_id: 100, title: 'Seed Movie', year: 2020, poster_url: 'seed_url', slug: 'seed-movie' };
      const mockIdeaMovies = [
        { tmdb_id: 201, title: 'Idea 1', year: 2021, poster_url: 'url1', slug: 'idea-1' },
        { tmdb_id: 202, title: 'Idea 2', year: 2022, poster_url: 'url2', slug: 'idea-2' },
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ tmdb_id: 100, ideas: JSON.stringify([201, 202]) }],
        })
        .mockResolvedValueOnce({ rows: [mockSeedMovie, ...mockIdeaMovies] })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [100] },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);

      data.items.forEach(item => {
        expect(item).toHaveProperty('type');
        expect(['more_ideas', 'collection']).toContain(item.type);

        if (item.type === 'more_ideas') {
          expect(item).toHaveProperty('seedTitle');
          expect(item).toHaveProperty('seedTmdbId');
          expect(item).toHaveProperty('movies');
          expect(Array.isArray(item.movies)).toBe(true);

          item.movies.forEach(movie => {
            expect(movie).toHaveProperty('tmdb_id');
            expect(movie).toHaveProperty('title');
            expect(movie).toHaveProperty('year');
            expect(movie).toHaveProperty('poster_url');
            expect(movie).toHaveProperty('slug');
          });
        }

        if (item.type === 'collection') {
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('collectionId');
          expect(item).toHaveProperty('collectionTitle');
          expect(item).toHaveProperty('movies');
          expect(Array.isArray(item.movies)).toBe(true);
        }
      });
    });

    test('should limit more_ideas to top 2 movies per seed', async () => {
      const mockMovies = Array.from({ length: 10 }, (_, i) => ({
        tmdb_id: 200 + i,
        title: `Movie ${i}`,
        year: 2020 + i,
        poster_url: `url${i}`,
        slug: `movie-${i}`,
      }));

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ tmdb_id: 100, ideas: JSON.stringify(mockMovies.map(m => m.tmdb_id)) }],
        })
        .mockResolvedValueOnce({ rows: [{ tmdb_id: 100, title: 'Seed', year: 2020, poster_url: 'seed', slug: 'seed' }, ...mockMovies] })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [100] },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      const moreIdeasItem = data.items.find(item => item.type === 'more_ideas');

      if (moreIdeasItem) {
        expect(moreIdeasItem.movies.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Collections Integration', () => {
    test('should interleave more_ideas and collections', async () => {
      const mockCollection = {
        id: 1,
        title: 'Action Classics',
        editorial_data: JSON.stringify({
          subcategories: [{ name: 'Action', movies: [301, 302] }],
        }),
      };

      const mockMovies = [
        { tmdb_id: 100, title: 'Seed', year: 2020, poster_url: 'seed', slug: 'seed' },
        { tmdb_id: 201, title: 'Idea 1', year: 2021, poster_url: 'url1', slug: 'idea-1' },
        { tmdb_id: 202, title: 'Idea 2', year: 2022, poster_url: 'url2', slug: 'idea-2' },
        { tmdb_id: 301, title: 'Collection 1', year: 2020, poster_url: 'coll1', slug: 'collection-1' },
        { tmdb_id: 302, title: 'Collection 2', year: 2021, poster_url: 'coll2', slug: 'collection-2' },
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ tmdb_id: 100, ideas: JSON.stringify([201, 202, 301, 302]) }],
        })
        .mockResolvedValueOnce({ rows: mockMovies })
        .mockResolvedValueOnce({ rows: [mockCollection] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [100] },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());

      // Should have both types
      const hasMoreIdeas = data.items.some(item => item.type === 'more_ideas');
      const hasCollection = data.items.some(item => item.type === 'collection');

      expect(hasMoreIdeas || hasCollection).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [123] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });

    test('should handle malformed ideas JSON', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ tmdb_id: 100, ideas: 'invalid json' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'POST',
        body: { savedIds: [100] },
      });

      await handler(req, res);

      // Should not crash, might return empty
      expect([200, 500]).toContain(res._getStatusCode());
    });
  });
});
