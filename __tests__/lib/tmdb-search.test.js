/**
 * Tests for TMDB Search Service
 *
 * These tests verify keyword-based search functionality with popularity ranking.
 * They ensure the search handles various query types and returns properly ranked results.
 */

import {
  searchTMDB,
  getTMDBMovieDetails,
  rankSearchResults,
  isSingleConfidentMatch,
} from '../../lib/services/tmdb-search.js';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_TMDB_API_KEY = 'test-tmdb-key';

describe('TMDB Search Service', () => {
  beforeEach(() => {
    fetch.mockClear();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('searchTMDB', () => {
    it('should handle keyword search with popularity ranking', async () => {
      // Mock TMDB API response for "baby" search
      const mockResponse = {
        results: [
          {
            id: 1,
            title: 'Baby',
            popularity: 5.2,
            release_date: '2007-01-01',
          },
          {
            id: 2,
            title: 'Baby Driver',
            popularity: 45.8,
            release_date: '2017-06-28',
          },
          {
            id: 3,
            title: "Rosemary's Baby",
            popularity: 28.4,
            release_date: '1968-06-12',
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchTMDB('baby');

      // Verify API call
      expect(fetch).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/search/movie?api_key=test-tmdb-key&query=baby&include_adult=false&language=en-US'
      );

      // Verify results are sorted by popularity (Baby Driver first)
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Baby Driver');
      expect(results[0].popularity).toBe(45.8);
      expect(results[1].title).toBe("Rosemary's Baby");
      expect(results[2].title).toBe('Baby');
    });

    it('should handle multi-word keyword searches', async () => {
      const mockResponse = {
        results: [
          {
            id: 155,
            title: 'The Dark Knight',
            popularity: 123.4,
            release_date: '2008-07-18',
          },
          {
            id: 49026,
            title: 'The Dark Knight Rises',
            popularity: 98.7,
            release_date: '2012-07-16',
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchTMDB('dark knight');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('The Dark Knight');
      expect(results[1].title).toBe('The Dark Knight Rises');
    });

    it('should handle empty queries gracefully', async () => {
      const results = await searchTMDB('');
      expect(results).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only queries', async () => {
      const results = await searchTMDB('   ');
      expect(results).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const results = await searchTMDB('test');
      expect(results).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('TMDB search failed:', 500, 'Server Error');
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await searchTMDB('test');
      expect(results).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('TMDB search error:', expect.any(Error));
    });

    it('should handle empty results from TMDB', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const results = await searchTMDB('nonexistentmovie123');
      expect(results).toEqual([]);
    });

    it('should filter out invalid movie entries', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            title: 'Valid Movie',
            popularity: 10.0,
          },
          {
            id: null, // Invalid - no ID
            title: 'Invalid Movie',
            popularity: 5.0,
          },
          {
            id: 2,
            title: null, // Invalid - no title
            popularity: 8.0,
          },
          {
            id: 3,
            title: 'Another Valid Movie',
            popularity: 15.0,
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchTMDB('test');

      // Should only return valid movies, sorted by popularity
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Another Valid Movie');
      expect(results[1].title).toBe('Valid Movie');
    });

    it('should limit results to 20 movies maximum', async () => {
      // Create 25 mock movies
      const mockMovies = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        popularity: 25 - i, // Descending popularity
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockMovies }),
      });

      const results = await searchTMDB('movie');

      expect(results).toHaveLength(20);
      expect(results[0].title).toBe('Movie 1'); // Highest popularity
      expect(results[19].title).toBe('Movie 20');
    });

    it('should preserve original query in API call without parsing', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await searchTMDB('baby driver 2017');

      // Verify the full query is passed to TMDB without year extraction
      expect(fetch).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/search/movie?api_key=test-tmdb-key&query=baby+driver+2017&include_adult=false&language=en-US'
      );
    });
  });

  describe('getTMDBMovieDetails', () => {
    it('should fetch movie details by TMDB ID', async () => {
      const mockMovie = {
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
        overview: 'A ticking-time-bomb insomniac...',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovie,
      });

      const result = await getTMDBMovieDetails(550);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/550?api_key=test-tmdb-key'
      );
      expect(result).toEqual(mockMovie);
    });

    it('should handle API errors when fetching details', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await getTMDBMovieDetails(999999);
      expect(result).toBeNull();
    });
  });

  describe('rankSearchResults', () => {
    it('should rank results with popularity-based scoring when no exact match', async () => {
      const mockResults = [
        {
          id: 1,
          title: 'Baby Boy',
          popularity: 5.2,
          release_date: '2007-01-01',
        },
        {
          id: 2,
          title: 'Baby Driver',
          popularity: 45.8,
          release_date: '2017-06-28',
        },
      ];

      const ranked = rankSearchResults(mockResults, 'baby movie', null);

      // Baby Driver should rank higher due to popularity (no exact match bonus for either)
      expect(ranked[0].title).toBe('Baby Driver');
      expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore);
    });

    it('should give bonus for exact title matches', async () => {
      const mockResults = [
        {
          id: 1,
          title: 'Baby Driver',
          popularity: 10.0,
          release_date: '2017-06-28',
        },
        {
          id: 2,
          title: 'Baby',
          popularity: 20.0, // Higher popularity
          release_date: '2007-01-01',
        },
      ];

      const ranked = rankSearchResults(mockResults, 'Baby', null);

      // "Baby" should rank higher despite lower popularity due to exact match
      expect(ranked[0].title).toBe('Baby');
    });
  });

  describe('isSingleConfidentMatch', () => {
    it('should identify single confident matches', async () => {
      const results = [
        {
          title: 'Fight Club',
          relevanceScore: 2000,
        },
      ];

      const isConfident = isSingleConfidentMatch(results, 'Fight Club', 1999);
      expect(isConfident).toBe(true);
    });

    it('should reject low confidence single matches', async () => {
      const results = [
        {
          title: 'Some Movie',
          relevanceScore: 500, // Below threshold
        },
      ];

      const isConfident = isSingleConfidentMatch(results, 'Some Movie', null);
      expect(isConfident).toBe(false);
    });

    it('should handle empty results', async () => {
      const isConfident = isSingleConfidentMatch([], 'Any Movie', null);
      expect(isConfident).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle the "baby" -> "baby driver" use case', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            title: 'Baby',
            popularity: 8.3,
            release_date: '2007-01-01',
          },
          {
            id: 2,
            title: 'Baby Driver',
            popularity: 52.7,
            release_date: '2017-06-28',
          },
          {
            id: 3,
            title: 'Baby Boy',
            popularity: 12.1,
            release_date: '2001-06-27',
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchTMDB('baby');

      // Baby Driver should be first due to highest popularity
      expect(results[0].title).toBe('Baby Driver');
      expect(results[0].popularity).toBe(52.7);

      // Should include all "baby" related movies
      expect(results.map(r => r.title)).toContain('Baby');
      expect(results.map(r => r.title)).toContain('Baby Boy');
    });

    it('should handle the "avengers" use case with popularity ranking', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            title: 'The Avengers',
            popularity: 98.4,
            release_date: '2012-04-25',
          },
          {
            id: 2,
            title: 'Avengers: Endgame',
            popularity: 156.2,
            release_date: '2019-04-24',
          },
          {
            id: 3,
            title: 'Avengers: Infinity War',
            popularity: 134.7,
            release_date: '2018-04-25',
          },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchTMDB('avengers');

      // Should be ranked by popularity: Endgame > Infinity War > The Avengers
      expect(results[0].title).toBe('Avengers: Endgame');
      expect(results[1].title).toBe('Avengers: Infinity War');
      expect(results[2].title).toBe('The Avengers');
    });
  });
});
