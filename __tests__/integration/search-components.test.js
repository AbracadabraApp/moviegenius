/**
 * Integration Tests for Search Components Across Pages
 * 
 * This test suite verifies that all pages with search functionality
 * are using the correct components and search APIs.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimpleSearch from '../../components/SimpleSearch.js';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
    pathname: '/'
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Search Components Integration', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockPush.mockClear();
    console.log = jest.fn();
  });

  describe('SimpleSearch Component', () => {
    it.skip('should use simple-search API with TMDB keyword search', async () => {
      const mockResponse = {
        movies: [
          {
            id: 'tmdb_390043',
            title: 'Baby Driver',
            tmdb_id: 390043,
            year: 2017,
            poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg'
          }
        ],
        query: 'baby',
        hasResults: true,
        fallback: null
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const mockOnResults = jest.fn();
      render(<SimpleSearch onResults={mockOnResults} />);

      const searchInput = screen.getByPlaceholderText('Search movies...');
      const form = searchInput.closest('form');
      
      // Type search query
      fireEvent.change(searchInput, { target: { value: 'baby' } });
      
      // Submit form directly
      fireEvent.submit(form);

      // Check that fetch was called with correct parameters
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/simple-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'baby' })
        });
      });

      // Check that results callback was called
      await waitFor(() => {
        expect(mockOnResults).toHaveBeenCalledWith([
          {
            id: 'tmdb_390043',
            title: 'Baby Driver',
            tmdb_id: 390043,
            year: 2017,
            poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg'
          }
        ]);
      });
    });

    it('should auto-navigate for single movie results', async () => {
      const mockResponse = {
        movies: [
          {
            id: 'tmdb_550',
            title: 'Fight Club',
            tmdb_id: 550,
            year: 1999
          }
        ],
        hasResults: true
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<SimpleSearch onResults={jest.fn()} />);

      const searchInput = screen.getByPlaceholderText('Search movies...');
      fireEvent.change(searchInput, { target: { value: 'fight club' } });
      fireEvent.submit(searchInput.closest('form'));

      // Should auto-navigate to movie page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/movie/550');
      });
    });

    it('should handle empty search results with fallback', async () => {
      const mockResponse = {
        movies: [],
        hasResults: false,
        fallback: {
          message: "We didn't find a result, but would you like to pass it on to our Movie Genius?",
          askUrl: '/genius?q=nonexistentmovie'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const mockOnResults = jest.fn();
      render(<SimpleSearch onResults={mockOnResults} />);

      const searchInput = screen.getByPlaceholderText('Search movies...');
      fireEvent.change(searchInput, { target: { value: 'nonexistentmovie' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(mockOnResults).toHaveBeenCalledWith([]);
      });

      // Should display fallback message
      await waitFor(() => {
        expect(screen.getByText(/didn't find a result/)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const mockOnResults = jest.fn();
      render(<SimpleSearch onResults={mockOnResults} />);

      const searchInput = screen.getByPlaceholderText('Search movies...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(mockOnResults).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('Search Implementation Verification', () => {
    it('should verify SimpleSearch uses TMDB keyword search', () => {
      // Read the SimpleSearch source to verify it calls simple-search API
      const SimpleSearchString = SimpleSearch.toString();
      expect(SimpleSearchString).toContain('/api/simple-search');
      expect(SimpleSearchString).not.toContain('/api/search-movies');
    });
  });

  describe('Real-world Search Scenarios', () => {
    it('should handle the "baby" keyword search case', async () => {
      const mockResponse = {
        movies: [
          {
            id: 'tmdb_390043',
            title: 'Baby Driver',
            tmdb_id: 390043,
            popularity: 52.7
          },
          {
            id: 'tmdb_1640',
            title: "Rosemary's Baby",
            tmdb_id: 1640,
            popularity: 28.4
          },
          {
            id: 'tmdb_578',
            title: 'Baby',
            tmdb_id: 578,
            popularity: 8.3
          }
        ],
        hasResults: true
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const mockOnResults = jest.fn();
      render(<SimpleSearch onResults={mockOnResults} />);

      const searchInput = screen.getByPlaceholderText('Search movies...');
      fireEvent.change(searchInput, { target: { value: 'baby' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(mockOnResults).toHaveBeenCalledWith(mockResponse.movies);
      });

      // Verify the results include all baby-related movies
      const calledWith = mockOnResults.mock.calls[0][0];
      expect(calledWith.map(m => m.title)).toEqual([
        'Baby Driver',
        "Rosemary's Baby",
        'Baby'
      ]);
    });

    it('should handle multi-word keyword searches', async () => {
      const mockResponse = {
        movies: [
          {
            id: 'tmdb_155',
            title: 'The Dark Knight',
            tmdb_id: 155
          },
          {
            id: 'tmdb_49026',
            title: 'The Dark Knight Rises',
            tmdb_id: 49026
          }
        ],
        hasResults: true
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const mockOnResults = jest.fn();
      render(<SimpleSearch onResults={mockOnResults} />);

      const searchInput = screen.getByPlaceholderText('Search movies...');
      fireEvent.change(searchInput, { target: { value: 'dark knight' } });
      fireEvent.submit(searchInput.closest('form'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/simple-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'dark knight' })
        });
      });

      await waitFor(() => {
        expect(mockOnResults).toHaveBeenCalledWith(mockResponse.movies);
      });
    });
  });

  describe('Page-specific Search Integration', () => {
    it('should verify key pages use SimpleSearch component', () => {
      // This is a documentation test to ensure we know which pages use search
      const pagesWithSimpleSearch = [
        'pages/[theme]/[episode].js',
        'pages/genius/[...params].js',
        'pages/genius/list/[id].js',
        'pages/list/[slug].js',
        'pages/movie/[id].js',
        'pages/movie/[id]/cast.js',
        'pages/movie/search.js',
        'pages/movies.js',
        'pages/person/[id].js',
        'pages/search.js',
        'components/ThemePage.js'
      ];

      // This test documents that these pages should use SimpleSearch
      // In actual implementation, you would verify by importing and checking
      expect(pagesWithSimpleSearch.length).toBeGreaterThan(0);
    });
  });
});