// __tests__/api/tmdb-bulk.test.js - Tests for TMDB bulk API
import { createMocks } from 'node-mocks-http';
import handler, { createBulkRequests } from '../../pages/api/tmdb-bulk';

// Mock fetch for TMDB API calls
global.fetch = jest.fn();

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({ error: null })),
    })),
  })),
}));

describe('/api/tmdb-bulk', () => {
  beforeEach(() => {
    fetch.mockClear();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Request Validation', () => {
    it('should reject non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });

    it('should reject invalid request format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { requests: 'not an array' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid request format. Expected array of requests.',
      });
    });

    it('should reject empty requests array', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { requests: [] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'No requests provided',
      });
    });

    it('should reject too many requests', async () => {
      const requests = Array(51).fill({ type: 'search_movie', id: 'test' });
      const { req, res } = createMocks({
        method: 'POST',
        body: { requests },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Too many requests. Maximum 50 requests per batch.',
      });
    });

    it('should reject requests without required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [
            { type: 'search_movie' }, // missing id
            { id: 'test' }, // missing type
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Each request must have type and id fields',
      });
    });
  });

  describe('Movie Search Requests', () => {
    it('should process search_movie requests successfully', async () => {
      const mockTMDBResponse = {
        results: [
          {
            id: 603,
            title: 'The Matrix',
            release_date: '1999-03-31',
            poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
            overview: 'A computer hacker learns from mysterious rebels...',
            vote_average: 8.7,
            vote_count: 18500,
            popularity: 65.3,
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTMDBResponse),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [
            { id: 'matrix', type: 'search_movie', params: { title: 'The Matrix', year: 1999 } },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results).toHaveLength(1);
      expect(responseData.results[0]).toEqual({
        id: 'matrix',
        type: 'search_movie',
        success: true,
        data: {
          tmdb_id: 603,
          title: 'The Matrix',
          year: 1999,
          poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
          overview: 'A computer hacker learns from mysterious rebels...',
          vote_average: 8.7,
          vote_count: 18500,
          popularity: 65.3,
          release_date: '1999-03-31',
        },
      });

      expect(responseData.summary).toEqual({
        total: 1,
        successful: 1,
        failed: 0,
        processingTime: expect.any(Number),
      });
    });

    it('should handle movie not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [
            {
              id: 'notfound',
              type: 'search_movie',
              params: { title: 'Nonexistent Movie', year: 2025 },
            },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results[0]).toEqual({
        id: 'notfound',
        type: 'search_movie',
        success: false,
        error: 'Movie not found in TMDB',
      });
    });
  });

  describe('Movie Details Requests', () => {
    it('should process movie_details requests successfully', async () => {
      const mockDetailsResponse = {
        id: 603,
        title: 'The Matrix',
        release_date: '1999-03-31',
        poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        backdrop_path: '/vybQQ7w05Zt7vDuD6Dcy0l5o0l5.jpg',
        overview: 'A computer hacker learns from mysterious rebels...',
        runtime: 136,
        genres: [
          { id: 28, name: 'Action' },
          { id: 878, name: 'Science Fiction' },
        ],
        vote_average: 8.7,
        vote_count: 18500,
        popularity: 65.3,
        credits: {
          cast: [{ id: 6384, name: 'Keanu Reeves', character: 'Neo' }],
          crew: [{ id: 905, name: 'Lana Wachowski', job: 'Director' }],
        },
        'watch/providers': {
          results: {
            US: {
              flatrate: [{ provider_id: 8, provider_name: 'Netflix' }],
            },
          },
        },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDetailsResponse),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [{ id: 'details', type: 'movie_details', params: { tmdb_id: 603 } }],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results[0].success).toBe(true);
      expect(responseData.results[0].data).toMatchObject({
        tmdb_id: 603,
        title: 'The Matrix',
        year: 1999,
        poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        backdrop: 'https://image.tmdb.org/t/p/w1280/vybQQ7w05Zt7vDuD6Dcy0l5o0l5.jpg',
        runtime: 136,
        genres: expect.any(Array),
        credits: expect.any(Object),
        watch_providers: expect.any(Object),
      });
    });
  });

  describe('Streaming Requests', () => {
    it('should process movie_streaming requests successfully', async () => {
      const mockStreamingResponse = {
        results: {
          US: {
            flatrate: [
              { provider_id: 8, provider_name: 'Netflix' },
              { provider_id: 15, provider_name: 'Hulu' },
            ],
          },
        },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreamingResponse),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [{ id: 'streaming', type: 'movie_streaming', params: { tmdb_id: 603 } }],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results[0]).toEqual({
        id: 'streaming',
        type: 'movie_streaming',
        success: true,
        data: {
          tmdb_id: 603,
          streamingText: 'Netflix, Hulu',
          providers: mockStreamingResponse.results.US,
        },
      });
    });

    it('should handle no streaming availability', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: {} }),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [{ id: 'nostreaming', type: 'movie_streaming', params: { tmdb_id: 603 } }],
        },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData.results[0].data.streamingText).toBe('TBD');
    });
  });

  describe('Parallel Processing', () => {
    it('should process multiple different request types in parallel', async () => {
      // Mock multiple TMDB responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [{ id: 603, title: 'The Matrix', release_date: '1999-03-31' }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 603,
              title: 'The Matrix',
              release_date: '1999-03-31',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: { US: { flatrate: [{ provider_name: 'Netflix' }] } },
            }),
        });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [
            { id: 'search1', type: 'search_movie', params: { title: 'The Matrix', year: 1999 } },
            { id: 'details1', type: 'movie_details', params: { tmdb_id: 603 } },
            { id: 'streaming1', type: 'movie_streaming', params: { tmdb_id: 603 } },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results).toHaveLength(3);
      expect(responseData.results.every(r => r.success)).toBe(true);
      expect(responseData.summary.successful).toBe(3);
      expect(responseData.summary.failed).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle TMDB API errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [{ id: 'error', type: 'search_movie', params: { title: 'Test', year: 2000 } }],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results[0].success).toBe(false);
      expect(responseData.results[0].error).toContain('TMDB API error: 404');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requests: [
            { id: 'network_error', type: 'search_movie', params: { title: 'Test', year: 2000 } },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());

      expect(responseData.results[0].success).toBe(false);
      expect(responseData.summary.failed).toBe(1);
    });
  });

  describe('Helper Functions', () => {
    it('should create bulk request objects correctly', () => {
      const helper = createBulkRequests();

      expect(helper.searchMovie('id1', 'The Matrix', 1999)).toEqual({
        id: 'id1',
        type: 'search_movie',
        params: { title: 'The Matrix', year: 1999 },
      });

      expect(helper.movieDetails('id2', 603)).toEqual({
        id: 'id2',
        type: 'movie_details',
        params: { tmdb_id: 603 },
      });

      expect(helper.movieStreaming('id3', 603)).toEqual({
        id: 'id3',
        type: 'movie_streaming',
        params: { tmdb_id: 603 },
      });
    });
  });
});
