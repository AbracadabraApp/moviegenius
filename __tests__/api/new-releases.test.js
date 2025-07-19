// __tests__/api/new-releases.test.js
import handler from '../../pages/api/new-releases';
import { createMocks } from 'node-mocks-http';

// Mock environment variables
process.env.NEXT_PUBLIC_TMDB_API_KEY = 'test-api-key';

// Mock fetch globally
global.fetch = jest.fn();

describe('/api/new-releases', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle GET requests with 405 error', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });

  it('should require category parameter', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Category is required'
    });
  });

  it('should handle now-playing category', async () => {
    const mockResponse = {
      results: [
        {
          id: 123,
          title: 'Test Movie',
          release_date: '2025-01-15',
          poster_path: '/test.jpg',
          popularity: 45.5,
          vote_average: 7.8
        }
      ],
      total_results: 1
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'now-playing' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.category).toBe('now-playing');
    expect(data.categoryTitle).toBe('Now Playing');
    expect(data.movies).toHaveLength(1);
    expect(data.movies[0]).toEqual({
      id: 'tmdb_123',
      title: 'Test Movie',
      year: 2025,
      tmdb_id: 123,
      poster_url: 'https://image.tmdb.org/t/p/w500/test.jpg',
      popularity: 45.5,
      vote_average: 7.8,
      release_date: '2025-01-15'
    });

    // Verify correct TMDB URL was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('movie/now_playing')
    );
  });

  it('should handle upcoming category', async () => {
    const mockResponse = {
      results: [
        {
          id: 456,
          title: 'Upcoming Movie',
          release_date: '2025-06-01',
          poster_path: '/upcoming.jpg',
          popularity: 30.2,
          vote_average: 6.5
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'upcoming' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.category).toBe('upcoming');
    expect(data.categoryTitle).toBe('Coming Soon');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('movie/upcoming')
    );
  });

  it('should handle recent category with date filtering', async () => {
    const mockResponse = {
      results: [
        {
          id: 789,
          title: 'Recent Movie',
          release_date: '2025-01-01',
          poster_path: '/recent.jpg',
          popularity: 25.8,
          vote_average: 7.2
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'recent' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.category).toBe('recent');
    expect(data.categoryTitle).toBe('Recent Releases');
    
    // Should use discover endpoint with date filters
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('discover/movie')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('release_date.gte=')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('release_date.lte=')
    );
  });

  it('should handle trending category', async () => {
    const mockResponse = {
      results: [
        {
          id: 999,
          title: 'Trending Movie',
          release_date: '2024-12-25',
          poster_path: '/trending.jpg',
          popularity: 85.3,
          vote_average: 8.1
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'trending' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.category).toBe('trending');
    expect(data.categoryTitle).toBe('Trending This Week');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('trending/movie/week')
    );
  });

  it('should handle invalid category', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'invalid-category' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Invalid category'
    });
  });

  it('should handle TMDB API errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'now-playing' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to fetch movies');
    expect(data.movies).toEqual([]);
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'now-playing' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Network error');
  });

  it('should filter out invalid movies', async () => {
    const mockResponse = {
      results: [
        {
          id: 123,
          title: 'Valid Movie',
          release_date: '2025-01-15',
          poster_path: '/valid.jpg'
        },
        {
          id: 124,
          // Missing title - should be filtered out
          release_date: '2025-01-16',
          poster_path: '/invalid.jpg'
        },
        {
          // Missing id - should be filtered out
          title: 'No ID Movie',
          release_date: '2025-01-17',
          poster_path: '/no-id.jpg'
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'now-playing' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Should only include the valid movie
    expect(data.movies).toHaveLength(1);
    expect(data.movies[0].title).toBe('Valid Movie');
  });

  it('should limit results to 20 movies', async () => {
    const mockResponse = {
      results: Array(25).fill(null).map((_, index) => ({
        id: index + 1,
        title: `Movie ${index + 1}`,
        release_date: '2025-01-15',
        poster_path: `/movie${index + 1}.jpg`
      }))
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'now-playing' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Should be limited to 20 results
    expect(data.movies).toHaveLength(20);
  });
});