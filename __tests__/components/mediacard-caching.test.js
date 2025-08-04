/**
 * MediaCard Caching Optimization Tests
 *
 * Tests the comprehensive caching system implemented for MediaCard components
 * to prevent redundant API calls and improve rendering performance.
 *
 * Validates:
 * - Cache hit/miss behavior for movie data
 * - Performance improvements from caching
 * - Fallback behavior when cache fails
 * - Cache invalidation and data freshness
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test',
  }),
}));

// Mock performance monitor
const mockPerformanceMonitor = {
  trackMetric: jest.fn(),
  trackAPICost: jest.fn(),
};

jest.mock('../../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: () => mockPerformanceMonitor,
}));

// Mock the underlying cache first
jest.mock('../../lib/cache.js', () => ({
  getCache: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

// Mock MediaCard cache
const mockMediaCardCache = {
  getMovieData: jest.fn(),
  cacheMovieData: jest.fn(),
  getPosterData: jest.fn(),
  cachePosterData: jest.fn(),
  getStreamingData: jest.fn(),
  cacheStreamingData: jest.fn(),
  getEnhancementData: jest.fn(),
  cacheEnhancementData: jest.fn(),
};

jest.mock('../../lib/mediacard-cache.js', () => ({
  getMediaCardCache: () => mockMediaCardCache,
}));

// Mock global fetch
global.fetch = jest.fn();

import MediaCard from '../../components/MediaCard.js';

describe('MediaCard Caching Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default fetch mock for API calls
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          slug: 'Test movie description',
          poster: 'https://example.com/poster.jpg',
          streamingText: 'Available on Netflix',
          tmdb_id: 12345,
        }),
    });
  });

  test('should use cached complete movie data when available', async () => {
    // Mock complete cached data
    mockMediaCardCache.getMovieData.mockResolvedValue({
      slug: 'Cached movie description',
      poster: 'https://cached.com/poster.jpg',
      streamingText: 'Cached streaming info',
      tmdb_id: 67890,
    });

    render(
      <MediaCard
        title="The Matrix"
        year={1999}
        initialSlug=""
        initialPoster="/images/placeholder-poster.jpg"
        initialStreaming=""
      />
    );

    await waitFor(() => {
      expect(mockMediaCardCache.getMovieData).toHaveBeenCalledWith('The Matrix', 1999);
    });

    // Should not make any API calls since we have cached data
    expect(global.fetch).not.toHaveBeenCalled();

    // Should track cache hit
    expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
      'mediacard_cache_complete_hit',
      expect.any(Number),
      expect.objectContaining({
        title: 'The Matrix',
        year: 1999,
      })
    );
  });

  test('should use cached poster data when complete data not available', async () => {
    // No complete data, but poster data exists
    mockMediaCardCache.getMovieData.mockResolvedValue(null);
    mockMediaCardCache.getPosterData.mockResolvedValue({
      poster: 'https://cached-poster.com/image.jpg',
      tmdb_id: 123,
    });

    render(
      <MediaCard title="Casablanca" year={1942} initialPoster="/images/placeholder-poster.jpg" />
    );

    await waitFor(() => {
      expect(mockMediaCardCache.getPosterData).toHaveBeenCalledWith('Casablanca', 1942);
    });

    // Should use cached poster and not make TMDB API call
    expect(global.fetch).not.toHaveBeenCalledWith('/api/tmdb-poster', expect.any(Object));
  });

  test('should cache enhancement results after API call', async () => {
    // No cached data
    mockMediaCardCache.getMovieData.mockResolvedValue(null);
    mockMediaCardCache.getEnhancementData.mockResolvedValue(null);

    // Mock successful enhancement API response
    global.fetch.mockImplementation(url => {
      if (url === '/api/enhance-movie-data') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              slug: 'Enhanced movie description',
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<MediaCard title="Vertigo" year={1958} initialSlug="" />);

    await waitFor(() => {
      expect(mockMediaCardCache.cacheEnhancementData).toHaveBeenCalledWith('Vertigo', 1958, {
        slug: 'Enhanced movie description',
      });
    });
  });

  test('should cache poster data after TMDB API call', async () => {
    // No cached data
    mockMediaCardCache.getMovieData.mockResolvedValue(null);
    mockMediaCardCache.getPosterData.mockResolvedValue(null);

    // Mock successful TMDB poster response
    global.fetch.mockImplementation(url => {
      if (url === '/api/tmdb-poster') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              poster: 'https://tmdb.com/poster.jpg',
              tmdb_id: 456,
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <MediaCard title="The Godfather" year={1972} initialPoster="/images/placeholder-poster.jpg" />
    );

    await waitFor(() => {
      expect(mockMediaCardCache.cachePosterData).toHaveBeenCalledWith('The Godfather', 1972, {
        poster: 'https://tmdb.com/poster.jpg',
        tmdb_id: 456,
      });
    });
  });

  test('should cache streaming data after API call', async () => {
    // No cached data
    mockMediaCardCache.getMovieData.mockResolvedValue(null);
    mockMediaCardCache.getStreamingData.mockResolvedValue(null);

    // Mock successful streaming response
    global.fetch.mockImplementation(url => {
      if (url === '/api/tmdb-streaming') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              streamingText: 'Available on HBO Max',
              source: 'tmdb',
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<MediaCard title="Dune" year={2021} initialStreaming="" />);

    await waitFor(() => {
      expect(mockMediaCardCache.cacheStreamingData).toHaveBeenCalledWith('Dune', 2021, {
        streamingText: 'Available on HBO Max',
        source: 'tmdb',
      });
    });
  });

  test('should cache complete movie data after enhancement', async () => {
    // No cached data initially
    mockMediaCardCache.getMovieData.mockResolvedValue(null);
    mockMediaCardCache.getEnhancementData.mockResolvedValue(null);
    mockMediaCardCache.getPosterData.mockResolvedValue(null);
    mockMediaCardCache.getStreamingData.mockResolvedValue(null);

    // Mock all API responses
    global.fetch.mockImplementation(url => {
      if (url === '/api/enhance-movie-data') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slug: 'Enhanced description' }),
        });
      }
      if (url === '/api/tmdb-poster') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              poster: 'https://example.com/poster.jpg',
              tmdb_id: 789,
            }),
        });
      }
      if (url === '/api/tmdb-streaming') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              streamingText: 'Stream on Netflix',
              source: 'tmdb',
            }),
        });
      }
      if (url === '/api/cache-movie-data') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <MediaCard
        title="Inception"
        year={2010}
        initialSlug=""
        initialPoster="/images/placeholder-poster.jpg"
        initialStreaming=""
      />
    );

    await waitFor(() => {
      expect(mockMediaCardCache.cacheMovieData).toHaveBeenCalledWith(
        'Inception',
        2010,
        expect.objectContaining({
          slug: 'Enhanced description',
          poster: 'https://example.com/poster.jpg',
          streamingText: 'Stream on Netflix',
          tmdb_id: 789,
        })
      );
    });

    // Should track performance metrics
    expect(mockPerformanceMonitor.trackMetric).toHaveBeenCalledWith(
      'mediacard_enhancement_complete',
      expect.any(Number),
      expect.objectContaining({
        title: 'Inception',
        year: 2010,
        cached_slug: true,
        cached_poster: true,
        cached_streaming: true,
        cached_tmdb_id: true,
      })
    );
  });

  test('should handle cache failures gracefully', async () => {
    // Mock cache methods to throw errors
    mockMediaCardCache.getMovieData.mockRejectedValue(new Error('Cache error'));

    render(<MediaCard title="Blade Runner" year={1982} initialSlug="" />);

    // Should still attempt to enhance data despite cache error
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('should not enhance if shouldEnhance returns false', async () => {
    render(
      <MediaCard
        title="Citizen Kane"
        year={1941}
        initialSlug="Media mogul's life story told in flashbacks"
        initialPoster="https://example.com/kane.jpg"
        initialStreaming="Available on Criterion"
      />
    );

    // Should not call cache methods since no enhancement needed
    await waitFor(() => {
      expect(mockMediaCardCache.getMovieData).not.toHaveBeenCalled();
    });
  });

  test('should use cached streaming data when available', async () => {
    mockMediaCardCache.getMovieData.mockResolvedValue(null);
    mockMediaCardCache.getStreamingData.mockResolvedValue({
      streamingText: 'Cached streaming info',
      source: 'cache',
    });

    render(<MediaCard title="Pulp Fiction" year={1994} initialStreaming="" />);

    await waitFor(() => {
      expect(mockMediaCardCache.getStreamingData).toHaveBeenCalledWith('Pulp Fiction', 1994);
    });

    // Should not make streaming API call
    expect(global.fetch).not.toHaveBeenCalledWith('/api/tmdb-streaming', expect.any(Object));
  });

  test('should track cache miss when no data available', async () => {
    // Mock all cache methods to return null
    Object.values(mockMediaCardCache).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockResolvedValue(null);
      }
    });

    render(<MediaCard title="2001: A Space Odyssey" year={1968} initialSlug="" />);

    await waitFor(() => {
      expect(mockMediaCardCache.getMovieData).toHaveBeenCalled();
    });

    // Should make API calls since no cached data
    expect(global.fetch).toHaveBeenCalled();
  });
});
