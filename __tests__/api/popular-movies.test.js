// __tests__/api/popular-movies.test.js
import handler from '../../pages/api/popular-movies';
import { createMocks } from 'node-mocks-http';

// Mock environment variables
process.env.NEXT_PUBLIC_TMDB_API_KEY = 'test-api-key';

// Mock fetch globally
global.fetch = jest.fn();

describe('/api/popular-movies', () => {
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
      error: 'Method not allowed',
    });
  });

  it('should require category parameter', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Category is required',
    });
  });

  it('should handle popular-all-time category', async () => {
    const mockResponse = {
      results: [
        {
          id: 238,
          title: 'The Godfather',
          release_date: '1972-03-14',
          poster_path: '/godfather.jpg',
          popularity: 98.7,
          vote_average: 9.2,
          vote_count: 15000,
        },
      ],
      total_results: 500,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.category).toBe('popular-all-time');
    expect(data.categoryTitle).toBe('Most Popular All Time');
    expect(data.movies).toHaveLength(1);
    expect(data.movies[0]).toEqual({
      id: 'tmdb_238',
      title: 'The Godfather',
      year: 1972,
      tmdb_id: 238,
      poster_url: 'https://image.tmdb.org/t/p/w500/godfather.jpg',
      popularity: 98.7,
      vote_average: 9.2,
      vote_count: 15000,
      release_date: '1972-03-14',
    });
    expect(data.totalResults).toBe(500);

    // Verify correct TMDB URL was called
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('movie/popular'));
  });

  it('should handle top-rated category', async () => {
    const mockResponse = {
      results: [
        {
          id: 278,
          title: 'The Shawshank Redemption',
          release_date: '1994-09-23',
          poster_path: '/shawshank.jpg',
          popularity: 75.3,
          vote_average: 9.3,
          vote_count: 20000,
        },
      ],
      total_results: 300,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'top-rated' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.category).toBe('top-rated');
    expect(data.categoryTitle).toBe('Top Rated Movies');
    expect(data.movies).toHaveLength(1);
    expect(data.movies[0]).toEqual({
      id: 'tmdb_278',
      title: 'The Shawshank Redemption',
      year: 1994,
      tmdb_id: 278,
      poster_url: 'https://image.tmdb.org/t/p/w500/shawshank.jpg',
      popularity: 75.3,
      vote_average: 9.3,
      vote_count: 20000,
      release_date: '1994-09-23',
    });

    // Verify correct TMDB URL was called
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('movie/top_rated'));
  });

  it('should handle invalid category', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'invalid-category' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Invalid category',
    });
  });

  it('should handle missing TMDB API key', async () => {
    // Temporarily remove the API key
    const originalKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    delete process.env.NEXT_PUBLIC_TMDB_API_KEY;

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'TMDB API key not configured',
      movies: [],
    });

    // Restore the API key
    process.env.NEXT_PUBLIC_TMDB_API_KEY = originalKey;
  });

  it('should handle TMDB API errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Failed to fetch movies');
    expect(data.movies).toEqual([]);
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network timeout'));

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'top-rated' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Network timeout');
  });

  it('should filter out invalid movies', async () => {
    const mockResponse = {
      results: [
        {
          id: 123,
          title: 'Valid Movie',
          release_date: '2020-01-15',
          poster_path: '/valid.jpg',
          popularity: 45.5,
          vote_average: 7.8,
          vote_count: 1000,
        },
        {
          id: 124,
          // Missing title - should be filtered out
          release_date: '2020-01-16',
          poster_path: '/invalid.jpg',
          popularity: 30.2,
          vote_average: 6.5,
        },
        {
          // Missing id - should be filtered out
          title: 'No ID Movie',
          release_date: '2020-01-17',
          poster_path: '/no-id.jpg',
          popularity: 25.8,
        },
      ],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    // Should only include the valid movie
    expect(data.movies).toHaveLength(1);
    expect(data.movies[0].title).toBe('Valid Movie');
  });

  it('should handle movies without poster_path', async () => {
    const mockResponse = {
      results: [
        {
          id: 123,
          title: 'Movie Without Poster',
          release_date: '2020-01-15',
          poster_path: null, // No poster available
          popularity: 45.5,
          vote_average: 7.8,
          vote_count: 1000,
        },
      ],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.movies).toHaveLength(1);
    expect(data.movies[0].poster_url).toBe('/images/placeholder-poster.jpg');
  });

  it('should limit results to 20 movies', async () => {
    const mockResponse = {
      results: Array(25)
        .fill(null)
        .map((_, index) => ({
          id: index + 1,
          title: `Popular Movie ${index + 1}`,
          release_date: '2020-01-15',
          poster_path: `/movie${index + 1}.jpg`,
          popularity: 50 - index,
          vote_average: 8.0,
          vote_count: 1000,
        })),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'top-rated' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    // Should be limited to 20 results
    expect(data.movies).toHaveLength(20);
  });

  it('should handle empty results', async () => {
    const mockResponse = {
      results: [],
      total_results: 0,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.movies).toHaveLength(0);
    expect(data.hasResults).toBe(false);
    expect(data.totalResults).toBe(0);
  });

  it('should handle movies without release dates', async () => {
    const mockResponse = {
      results: [
        {
          id: 123,
          title: 'Movie Without Release Date',
          release_date: null, // No release date
          poster_path: '/test.jpg',
          popularity: 45.5,
          vote_average: 7.8,
          vote_count: 1000,
        },
      ],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { category: 'popular-all-time' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());

    expect(data.movies).toHaveLength(1);
    expect(data.movies[0].year).toBe(null);
    expect(data.movies[0].release_date).toBe(null);
  });
});
