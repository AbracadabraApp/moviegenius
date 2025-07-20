/**
 * Tests for Simple Search API Endpoint
 *
 * These tests verify the /api/simple-search endpoint correctly uses TMDB
 * for keyword-based search with popularity ranking.
 */

import handler from '../../pages/api/simple-search.js';
import { createMocks } from 'node-mocks-http';

// Mock the TMDB search service
jest.mock('../../lib/services/tmdb-search.js', () => ({
  searchTMDB: jest.fn(),
}));

import { searchTMDB } from '../../lib/services/tmdb-search.js';

describe('/api/simple-search', () => {
  beforeEach(() => {
    searchTMDB.mockClear();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('should handle keyword search requests correctly', async () => {
    const mockTMDBResults = [
      {
        id: 390043,
        title: 'Baby Driver',
        popularity: 52.7,
        release_date: '2017-06-28',
        poster_path: '/6rcq8qei7e7gN31MksvYYeEfqeu.jpg',
      },
      {
        id: 578,
        title: 'Baby',
        popularity: 8.3,
        release_date: '2007-01-01',
        poster_path: '/baby_poster.jpg',
      },
    ];

    searchTMDB.mockResolvedValue(mockTMDBResults);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'baby',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const responseData = JSON.parse(res._getData());

    // Verify TMDB search was called with the raw query
    expect(searchTMDB).toHaveBeenCalledWith('baby');

    // Verify response format
    expect(responseData.movies).toHaveLength(2);
    expect(responseData.query).toBe('baby');
    expect(responseData.hasResults).toBe(true);
    expect(responseData.fallback).toBeNull();

    // Verify movie data format
    const firstMovie = responseData.movies[0];
    expect(firstMovie.title).toBe('Baby Driver');
    expect(firstMovie.tmdb_id).toBe(390043);
    expect(firstMovie.poster_url).toBe(
      'https://image.tmdb.org/t/p/w500/6rcq8qei7e7gN31MksvYYeEfqeu.jpg'
    );
    expect(firstMovie.id).toBe('tmdb_390043');
  });

  it('should handle empty search results with fallback', async () => {
    searchTMDB.mockResolvedValue([]);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'nonexistentmovie123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const responseData = JSON.parse(res._getData());

    expect(responseData.movies).toHaveLength(0);
    expect(responseData.hasResults).toBe(false);
    expect(responseData.fallback).toEqual({
      message: "We didn't find a result, but would you like to pass it on to our Movie Genius?",
      askUrl: '/genius?q=nonexistentmovie123',
    });
  });

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

  it('should validate query parameter', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: '  ', // Only whitespace
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Query must be at least 2 characters',
    });
  });

  it('should handle missing query parameter', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Query must be at least 2 characters',
    });
  });

  it('should handle TMDB service errors gracefully', async () => {
    searchTMDB.mockRejectedValue(new Error('TMDB API Error'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'test movie',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Search failed',
      message: 'TMDB API Error',
    });
  });

  it('should limit results to 20 movies', async () => {
    // Mock 25 movies from TMDB
    const mockMovies = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Movie ${i + 1}`,
      popularity: 100 - i,
      release_date: '2020-01-01',
      poster_path: `/poster${i + 1}.jpg`,
    }));

    searchTMDB.mockResolvedValue(mockMovies);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'movie',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const responseData = JSON.parse(res._getData());
    expect(responseData.movies).toHaveLength(20); // Should be limited to 20
  });

  it('should handle movies without poster images', async () => {
    const mockResults = [
      {
        id: 123,
        title: 'Movie Without Poster',
        popularity: 10.0,
        release_date: '2020-01-01',
        poster_path: null, // No poster
      },
    ];

    searchTMDB.mockResolvedValue(mockResults);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        query: 'test',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const responseData = JSON.parse(res._getData());
    expect(responseData.movies[0].poster_url).toBe('/images/placeholder-poster.jpg');
  });

  describe('Integration scenarios', () => {
    it('should handle the "baby" keyword search use case', async () => {
      const mockResults = [
        {
          id: 390043,
          title: 'Baby Driver',
          popularity: 52.7,
          release_date: '2017-06-28',
          poster_path: '/poster1.jpg',
        },
        {
          id: 1640,
          title: "Rosemary's Baby",
          popularity: 28.4,
          release_date: '1968-06-12',
          poster_path: '/poster2.jpg',
        },
        {
          id: 578,
          title: 'Baby',
          popularity: 8.3,
          release_date: '2007-01-01',
          poster_path: '/poster3.jpg',
        },
      ];

      searchTMDB.mockResolvedValue(mockResults);

      const { req, res } = createMocks({
        method: 'POST',
        body: { query: 'baby' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());

      // Verify all baby-related movies are returned
      expect(responseData.movies).toHaveLength(3);
      expect(responseData.movies.map(m => m.title)).toEqual([
        'Baby Driver',
        "Rosemary's Baby",
        'Baby',
      ]);

      // Verify they maintain TMDB's popularity ranking
      const popularities = responseData.movies.map(
        m => mockResults.find(r => r.id === m.tmdb_id).popularity
      );
      expect(popularities).toEqual([52.7, 28.4, 8.3]); // Descending order
    });

    it('should handle multi-word keyword searches', async () => {
      const mockResults = [
        {
          id: 155,
          title: 'The Dark Knight',
          popularity: 123.4,
          release_date: '2008-07-18',
          poster_path: '/poster1.jpg',
        },
        {
          id: 49026,
          title: 'The Dark Knight Rises',
          popularity: 98.7,
          release_date: '2012-07-16',
          poster_path: '/poster2.jpg',
        },
      ];

      searchTMDB.mockResolvedValue(mockResults);

      const { req, res } = createMocks({
        method: 'POST',
        body: { query: 'dark knight' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());

      expect(responseData.movies).toHaveLength(2);
      expect(responseData.movies[0].title).toBe('The Dark Knight');
      expect(responseData.movies[1].title).toBe('The Dark Knight Rises');
    });
  });
});
