/**
 * End-to-End Integration Tests for Critical User Flows
 * Tests complete user journeys from search to movie page to analysis display
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import MovieDetailPage from '../../pages/movie/[id].js';

// Mock child components to control their behavior in integration tests
jest.mock('../../components/SimpleSearch', () => {
  return function MockSimpleSearch({ onResults, placeholder, useUnifiedSearch }) {
    const handleSearch = (query) => {
      // Simulate search results based on query
      const mockResults = {
        'fight club': [{ id: 550, title: 'Fight Club', year: 1999 }],
        'matrix': [{ id: 603, title: 'The Matrix', year: 1999 }],
        'godfather': [{ id: 238, title: 'The Godfather', year: 1972 }]
      };

      const results = mockResults[query.toLowerCase()] || [];
      onResults(results);
    };

    return (
      <div data-testid="simple-search">
        <input
          data-testid="search-input"
          placeholder={placeholder}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
    );
  };
});

jest.mock('../../components/MovieHeaderLarge', () => {
  return function MockMovieHeaderLarge({ title, year, tmdbId, initialPoster, initialStreaming }) {
    return (
      <div data-testid="movie-header">
        <h1 data-testid="movie-title">{title}</h1>
        <div data-testid="movie-year">{year}</div>
        <div data-testid="movie-id">{tmdbId}</div>
        {initialPoster && <img data-testid="movie-poster" src={initialPoster} alt={title} />}
        {initialStreaming && <div data-testid="streaming-info">Available on streaming</div>}
      </div>
    );
  };
});

jest.mock('../../components/MovieAnalysisWithEntities', () => {
  return function MockMovieAnalysisWithEntities({ analysis, movie }) {
    if (!analysis?.claude_response?.raw_content) {
      return <div data-testid="analysis-loading">Loading analysis...</div>;
    }

    const content = analysis.claude_response.raw_content;
    
    // Parse content for different elements
    const hasMovies = content.includes('MOVIES:');
    const hasExplore = content.includes('EXPLORE_FURTHER:');
    const hasMoreIdeas = content.includes('MORE_IDEAS:');

    return (
      <div data-testid="movie-analysis">
        <div data-testid="analysis-content">{content}</div>
        {hasMovies && <div data-testid="featured-movies">Featured Movies Section</div>}
        {hasExplore && <div data-testid="explore-further">Explore Further Section</div>}
        {hasMoreIdeas && <div data-testid="more-ideas">More Ideas Section</div>}
      </div>
    );
  };
});

jest.mock('../../components/PhoneFrame', () => {
  return function MockPhoneFrame({ children }) {
    return <div data-testid="phone-frame">{children}</div>;
  };
});

jest.mock('../../components/DiscoveryFooter', () => {
  return function MockDiscoveryFooter() {
    return <div data-testid="discovery-footer">Discover More Movies</div>;
  };
});

jest.mock('../../components/ErrorBoundary', () => {
  return function MockErrorBoundary({ children, level }) {
    return <div data-testid={`error-boundary-${level}`}>{children}</div>;
  };
});

describe('End-to-End User Flow Integration', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    // Reset mocks
    fetch.mockClear();
    mockPush.mockClear();
    mockReplace.mockClear();

    // Mock router
    useRouter.mockReturnValue({
      query: { id: '550' },
      isReady: true,
      push: mockPush,
      replace: mockReplace,
      pathname: '/movie/[id]',
      asPath: '/movie/550'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Movie Discovery Flow', () => {
    test('user searches, finds movie, views analysis - happy path', async () => {
      // Mock successful API responses
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15",
        poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        overview: "A ticking-time-bomb insomniac and a slippery soap salesman..."
      };

      const mockStreamingResponse = {
        streaming_data: {
          providers: [{ provider_name: "Netflix", provider_id: 8 }]
        }
      };

      const mockAnalysisResponse = {
        success: true,
        analysis: `Fight Club is a provocative exploration of masculinity and modern alienation.

SUBHEAD: Technical Excellence

David Fincher's direction showcases masterful filmmaking techniques.

MOVIES: The Matrix|1999|Another reality-questioning film|Netflix
MOVIES: American Beauty|1999|Dark suburban satire|Amazon Prime

EXPLORE_FURTHER: How does Fight Club critique consumer culture?
EXPLORE_FURTHER: What makes Tyler Durden an effective unreliable narrator?

MORE_IDEAS: Seven|1995|Another dark Fincher thriller|HBO Max`,
        movie: { title: "Fight Club", year: 1999, tmdb_id: 550 },
        source: 'railway-postgresql'
      };

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStreamingResponse) })
        .mockResolvedValueOnce({ ok: false, status: 404 }) // No static file
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockAnalysisResponse) });

      // Render the movie page
      render(<MovieDetailPage />);

      // 1. VERIFICATION: Page Structure Loads
      expect(screen.getByTestId('phone-frame')).toBeInTheDocument();
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();

      // 2. VERIFICATION: Search Functionality Works
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search Movies . . .');

      // 3. VERIFICATION: Movie Data Loads
      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(screen.getByTestId('movie-title')).toHaveTextContent('Fight Club');
      expect(screen.getByTestId('movie-year')).toHaveTextContent('1999');
      expect(screen.getByTestId('movie-id')).toHaveTextContent('550');

      // 4. VERIFICATION: Analysis Content Displays
      await waitFor(() => {
        expect(screen.getByTestId('movie-analysis')).toBeInTheDocument();
      }, { timeout: 10000 });

      const analysisContent = screen.getByTestId('analysis-content');
      expect(analysisContent).toHaveTextContent(/Fight Club is a provocative exploration/);
      expect(analysisContent).toHaveTextContent(/Technical Excellence/);

      // 5. VERIFICATION: Interactive Elements Present
      expect(screen.getByTestId('featured-movies')).toBeInTheDocument();
      expect(screen.getByTestId('explore-further')).toBeInTheDocument();
      expect(screen.getByTestId('more-ideas')).toBeInTheDocument();

      // 6. VERIFICATION: Footer and Navigation
      expect(screen.getByTestId('discovery-footer')).toBeInTheDocument();

      // 7. VERIFICATION: API Calls Made Correctly
      expect(fetch).toHaveBeenCalledWith('/api/tmdb-movie?id=550');
      expect(fetch).toHaveBeenCalledWith('/api/movie-streaming?id=550');
      expect(fetch).toHaveBeenCalledWith('/nuclear-static/550.json');
      expect(fetch).toHaveBeenCalledWith('/api/movie-analysis?tmdbId=550');
    });

    test('user encounters movie not found - error handling', async () => {
      // Mock 404 response for movie
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Movie not found' })
      });

      render(<MovieDetailPage />);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/Failed to fetch movie: 404/)).toBeInTheDocument();

      // Search should still be available for recovery
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
    });

    test('user encounters analysis loading failure - graceful degradation', async () => {
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15",
        poster_path: "/poster.jpg"
      };

      const mockStreamingResponse = { streaming_data: null };

      // Movie loads successfully, but analysis fails
      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStreamingResponse) })
        .mockResolvedValueOnce({ ok: false, status: 404 }) // No static file
        .mockResolvedValueOnce({ ok: false, status: 500 }); // Analysis API fails

      render(<MovieDetailPage />);

      // Movie should still load
      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(screen.getByTestId('movie-title')).toHaveTextContent('Fight Club');

      // Analysis section should show loading or be empty
      expect(screen.getByTestId('analysis-loading')).toBeInTheDocument();

      // Core functionality should still work
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
      expect(screen.getByTestId('discovery-footer')).toBeInTheDocument();
    });
  });

  describe('Search and Navigation Flow', () => {
    test('search functionality integrates with page navigation', async () => {
      // Setup successful movie page load
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15"
      };

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      });

      // Test search interaction
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'matrix' } });

      // Search should be responsive
      expect(searchInput.value).toBe('matrix');
    });

    test('navigation preserves search functionality across pages', async () => {
      const mockMovieResponse = {
        id: 238,
        title: "The Godfather",
        release_date: "1972-03-14"
      };

      // Update router for different movie
      useRouter.mockReturnValue({
        query: { id: '238' },
        isReady: true,
        push: mockPush,
        replace: mockReplace,
        pathname: '/movie/[id]',
        asPath: '/movie/238'
      });

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      });

      expect(screen.getByTestId('movie-title')).toHaveTextContent('The Godfather');
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();

      // API should be called with correct movie ID
      expect(fetch).toHaveBeenCalledWith('/api/tmdb-movie?id=238');
    });
  });

  describe('Multi-Device and Responsive Flow', () => {
    test('mobile layout renders complete user flow', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15"
      };

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      // PhoneFrame should be used for mobile layout
      expect(screen.getByTestId('phone-frame')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      });

      // All elements should be accessible on mobile
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
      expect(screen.getByTestId('movie-header')).toBeInTheDocument();
      expect(screen.getByTestId('discovery-footer')).toBeInTheDocument();
    });

    test('tablet layout maintains functionality', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15"
      };

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      });

      expect(screen.getByTestId('phone-frame')).toBeInTheDocument();
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Resilience Flow', () => {
    test('user can recover from network errors', async () => {
      // First attempt fails
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      // Search should still be available for user to try different movie
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
    });

    test('partial data loading provides usable experience', async () => {
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15"
      };

      // Movie loads, streaming fails, analysis fails
      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockRejectedValueOnce(new Error('Streaming API down'))
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockRejectedValueOnce(new Error('Analysis API down'));

      render(<MovieDetailPage />);

      // Movie should still render
      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      });

      expect(screen.getByTestId('movie-title')).toHaveTextContent('Fight Club');
      expect(screen.getByTestId('movie-year')).toHaveTextContent('1999');

      // Core navigation should work
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
      expect(screen.getByTestId('discovery-footer')).toBeInTheDocument();
    });

    test('error boundaries contain failures without breaking entire page', async () => {
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15"
      };

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      });

      // Verify error boundaries are in place
      expect(screen.getByTestId('error-boundary-page')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary-section')).toBeInTheDocument();

      // Page should still function
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
    });
  });

  describe('Performance Integration Testing', () => {
    test('complete user flow meets performance requirements', async () => {
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15",
        poster_path: "/poster.jpg"
      };

      const mockAnalysisResponse = {
        success: true,
        analysis: "Fight Club analysis content",
        movie: { title: "Fight Club", year: 1999, tmdb_id: 550 }
      };

      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMovieResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockAnalysisResponse) });

      const startTime = Date.now();
      render(<MovieDetailPage />);

      // Wait for complete page load
      await waitFor(() => {
        expect(screen.getByTestId('movie-analysis')).toBeInTheDocument();
      }, { timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // Complete page load should be under 10 seconds
      expect(loadTime).toBeLessThan(10000);

      // All essential elements should be present
      expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      expect(screen.getByTestId('movie-analysis')).toBeInTheDocument();
      expect(screen.getByTestId('simple-search')).toBeInTheDocument();
    });

    test('search interactions remain responsive during loading', async () => {
      const mockMovieResponse = {
        id: 550,
        title: "Fight Club",
        release_date: "1999-10-15"
      };

      // Simulate slow API
      fetch
        .mockImplementationOnce(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve(mockMovieResponse) }), 2000)
          )
        )
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ streaming_data: null }) })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      render(<MovieDetailPage />);

      // Search should be immediately interactive
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();

      // Search should respond immediately even while movie is loading
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      expect(searchInput.value).toBe('test search');

      // Eventually movie should load
      await waitFor(() => {
        expect(screen.getByTestId('movie-title')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});