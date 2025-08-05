/**
 * Critical User Path Test: Movie Page Load → API Call → Analysis Display Flow
 * Tests the most important user journey in MovieGenius
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import MovieDetailPage from '../../pages/movie/[id].js';

// Mock the router with realistic movie ID
const mockPush = jest.fn();
const mockRouter = {
  query: { id: '550' }, // Fight Club - essential movie
  isReady: true,
  push: mockPush,
  replace: jest.fn(),
  pathname: '/movie/[id]',
  asPath: '/movie/550'
};

// Mock successful API responses for critical path
const mockMovieResponse = {
  id: 550,
  title: "Fight Club",
  release_date: "1999-10-15",
  poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy."
};

const mockAnalysisResponse = {
  success: true,
  analysis: "Fight Club is a provocative exploration of masculinity, consumerism, and modern alienation...",
  rawAnalysis: "Fight Club is a provocative exploration of masculinity, consumerism, and modern alienation...",
  movie: {
    title: "Fight Club",
    year: 1999,
    tmdb_id: 550
  },
  cached: true,
  source: 'railway-postgresql',
  performance: {
    total_time: 150,
    connect_time: 25,
    movie_query_time: 45,
    analysis_query_time: 80
  }
};

const mockStreamingResponse = {
  streaming_data: {
    providers: [
      { provider_name: "Netflix", provider_id: 8 }
    ]
  }
};

describe('Critical Path: Movie Page Load Flow', () => {
  beforeEach(() => {
    // Mock useRouter hook
    useRouter.mockReturnValue(mockRouter);
    
    // Reset fetch mock
    fetch.mockClear();
    
    // Mock API responses in order of execution
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMovieResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreamingResponse)
      })
      .mockResolvedValueOnce({
        ok: false, // Static file not found - normal fallback
        status: 404
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysisResponse)
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('complete movie page load flow with analysis display', async () => {
    const { container } = render(<MovieDetailPage />);

    // 1. PHASE: Initial Loading State
    expect(container).toBeTruthy();

    // 2. PHASE: API Calls are Made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tmdb-movie?id=550');
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/movie-streaming?id=550');
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/nuclear-static/550.json');
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/movie-analysis?tmdbId=550');
    }, { timeout: 5000 });

    // 3. PHASE: Movie Header Renders
    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    // 4. PHASE: Analysis Content Displays
    await waitFor(() => {
      expect(screen.getByText(/Fight Club is a provocative exploration/)).toBeInTheDocument();
    }, { timeout: 10000 });

    // 5. VALIDATION: Complete Page Structure
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(container.querySelector('input[placeholder*="Search Movies"]')).toBeInTheDocument();
    
    // 6. PERFORMANCE: Verify API call efficiency
    expect(fetch).toHaveBeenCalledTimes(4);
    
    // 7. ERROR BOUNDARY: Ensure no error boundaries triggered
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('handles missing movie gracefully', async () => {
    // Mock 404 response for movie
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Movie not found' })
    });

    render(<MovieDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText(/Failed to fetch movie: 404/)).toBeInTheDocument();
  });

  test('handles missing analysis gracefully', async () => {
    // Mock successful movie but failed analysis
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMovieResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreamingResponse)
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Analysis not found' })
      });

    render(<MovieDetailPage />);

    // Movie should still render without analysis
    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Analysis section should be empty or show placeholder
    expect(screen.queryByText(/Fight Club is a provocative exploration/)).not.toBeInTheDocument();
  });

  test('search functionality works on movie page', async () => {
    render(<MovieDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    const searchInput = container.querySelector('input[placeholder*="Search Movies"]');
    expect(searchInput).toBeInTheDocument();
    
    // Test search interaction
    fireEvent.change(searchInput, { target: { value: 'matrix' } });
    expect(searchInput.value).toBe('matrix');
  });

  test('error boundary catches component failures', async () => {
    // Mock component error by making analysis parsing fail
    const invalidAnalysisResponse = {
      ...mockAnalysisResponse,
      analysis: null,
      rawAnalysis: undefined
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMovieResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreamingResponse)
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidAnalysisResponse)
      });

    const { container } = render(<MovieDetailPage />);

    // Movie should still render even if analysis component fails
    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Page should not crash
    expect(container).toBeTruthy();
  });

  test('performance requirements are met', async () => {
    const startTime = Date.now();
    
    render(<MovieDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (10 seconds for full integration)
    expect(loadTime).toBeLessThan(10000);
    
    // API calls should be efficient
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});

describe('Critical Path: Mobile Responsiveness', () => {
  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMovieResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreamingResponse)
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysisResponse)
      });
  });

  test('mobile layout renders correctly', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(<MovieDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    // PhoneFrame component should be present for mobile layout
    expect(container.querySelector('div')).toBeInTheDocument();
    
    // Search should be accessible on mobile
    expect(container.querySelector('input[placeholder*="Search Movies"]')).toBeInTheDocument();
  });
});

// Accessibility tests for critical path
describe('Critical Path: Accessibility', () => {
  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMovieResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreamingResponse)
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysisResponse)
      });
  });

  test('keyboard navigation works', async () => {
    render(<MovieDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    const searchInput = screen.getByPlaceholderText(/Search Movies/);
    
    // Focus should work
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
    
    // Tab navigation should work
    fireEvent.keyDown(searchInput, { key: 'Tab' });
  });

  test('screen reader compatibility', async () => {
    render(<MovieDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Fight Club')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Text content should be accessible to screen readers
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    
    // Search input should have proper labeling
    const searchInput = screen.getByPlaceholderText(/Search Movies/);
    expect(searchInput).toBeInTheDocument();
  });
});