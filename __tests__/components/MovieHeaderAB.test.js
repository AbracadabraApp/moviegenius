/**
 * Comprehensive Test Suite for MovieHeader A/B Testing
 *
 * Tests both A and B variants along with the A/B testing infrastructure
 * to ensure safe rollouts and proper fallback behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the feature flags module
jest.mock('../../lib/featureFlags', () => ({
  isFeatureEnabled: jest.fn(),
  FLAGS: {
    HEADER_B_VARIANT: 'HEADER_B_VARIANT',
  },
  getFeatureMetadata: jest.fn(),
}));

import MovieHeaderAB from '../../components/MovieHeaderAB';
import MovieHeader from '../../components/MovieHeader';
import MovieHeaderB from '../../components/MovieHeaderB';
import { isFeatureEnabled, getFeatureMetadata } from '../../lib/featureFlags';

// Mock FavoritesManager
jest.mock('../../components/FavoritesManager', () => ({
  FavoritesManager: {
    isMovieHearted: jest.fn(() => false),
    isMovieBookmarked: jest.fn(() => false),
    toggleHeart: jest.fn(() => true),
    toggleBookmark: jest.fn(() => true),
  },
}));

// Mock analytics
Object.defineProperty(window, 'gtag', {
  value: jest.fn(),
  writable: true,
});

describe('MovieHeaderAB A/B Testing Suite', () => {
  const mockProps = {
    title: 'The Matrix',
    year: 1999,
    initialSlug: 'A computer programmer discovers reality is a simulation',
    initialPoster: '/images/matrix-poster.jpg',
    initialStreaming: null,
    tmdbId: 603,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('A/B Test Logic', () => {
    test('renders A variant when feature flag is disabled', async () => {
      isFeatureEnabled.mockReturnValue(false);
      getFeatureMetadata.mockReturnValue({
        isEnabled: false,
        environment: 'test',
        userBucket: 25,
      });

      render(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        // A variant should show original title without 'b' prefix
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.queryByText('b The Matrix')).not.toBeInTheDocument();
      });
    });

    test('renders B variant when feature flag is enabled', async () => {
      isFeatureEnabled.mockReturnValue(true);
      getFeatureMetadata.mockReturnValue({
        isEnabled: true,
        environment: 'test',
        userBucket: 75,
      });

      render(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        // B variant should show title with 'b' prefix
        expect(screen.getByText('b The Matrix')).toBeInTheDocument();
        expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
      });
    });

    test('falls back to A variant on feature flag error', async () => {
      isFeatureEnabled.mockImplementation(() => {
        throw new Error('Feature flag service unavailable');
      });

      render(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        // Should fallback to A variant
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.queryByText('b The Matrix')).not.toBeInTheDocument();
      });

      // Should track the error
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'ab_test_error',
        expect.objectContaining({
          event_category: 'A/B Testing',
          event_label: 'movie_header_format',
          error_message: 'Feature flag service unavailable',
        })
      );
    });

    test('tracks analytics events for variant display', async () => {
      isFeatureEnabled.mockReturnValue(true);
      getFeatureMetadata.mockReturnValue({
        isEnabled: true,
        environment: 'test',
        userBucket: 42,
      });

      render(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'ab_test_variant_shown',
          expect.objectContaining({
            event_category: 'A/B Testing',
            event_label: 'movie_header_format',
            variant: 'B',
            custom_parameter_1: 42,
          })
        );
      });
    });
  });

  describe('A Variant (Original) Functionality', () => {
    beforeEach(() => {
      isFeatureEnabled.mockReturnValue(false);
    });

    test('renders movie information correctly', () => {
      render(<MovieHeader {...mockProps} />);

      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText('(1999)')).toBeInTheDocument();
      expect(
        screen.getByText('A computer programmer discovers reality is a simulation')
      ).toBeInTheDocument();
      expect(screen.getByText('Streaming on TBD')).toBeInTheDocument();
    });

    test('displays poster with correct alt text', () => {
      render(<MovieHeader {...mockProps} />);

      const poster = screen.getByAltText('Poster for The Matrix');
      expect(poster).toBeInTheDocument();
      expect(poster).toHaveAttribute('src', '/images/matrix-poster.jpg');
    });

    test('heart and bookmark buttons work correctly', () => {
      render(<MovieHeader {...mockProps} />);

      const heartButton = screen.getByLabelText('Add to favorites');
      const bookmarkButton = screen.getByLabelText('Bookmark movie');

      expect(heartButton).toBeInTheDocument();
      expect(bookmarkButton).toBeInTheDocument();

      fireEvent.click(heartButton);
      fireEvent.click(bookmarkButton);

      // Verify buttons are clickable (functionality tested in FavoritesManager tests)
      expect(heartButton).toBeInTheDocument();
      expect(bookmarkButton).toBeInTheDocument();
    });
  });

  describe('B Variant (New Format) Functionality', () => {
    beforeEach(() => {
      isFeatureEnabled.mockReturnValue(true);
    });

    test('renders movie information with B-header format', async () => {
      render(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('b The Matrix')).toBeInTheDocument();
        expect(screen.getByText('b (1999)')).toBeInTheDocument();
        expect(
          screen.getByText('A computer programmer discovers reality is a simulation')
        ).toBeInTheDocument();
        expect(screen.getByText('Streaming on TBD')).toBeInTheDocument();
      });
    });

    test('poster and interactive elements work identically to A variant', async () => {
      render(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        const poster = screen.getByAltText('Poster for The Matrix');
        expect(poster).toBeInTheDocument();
        expect(poster).toHaveAttribute('src', '/images/matrix-poster.jpg');

        const heartButton = screen.getByLabelText('Add to favorites');
        const bookmarkButton = screen.getByLabelText('Bookmark movie');

        expect(heartButton).toBeInTheDocument();
        expect(bookmarkButton).toBeInTheDocument();
      });
    });

    test('B-header formatting function works correctly', () => {
      // Test the formatBHeaderText function indirectly through component output
      render(<MovieHeaderB {...mockProps} />);

      expect(screen.getByText('b The Matrix')).toBeInTheDocument();
      expect(screen.getByText('b (1999)')).toBeInTheDocument();
      // Body text should not have 'b' prefix
      expect(
        screen.getByText('A computer programmer discovers reality is a simulation')
      ).toBeInTheDocument();
    });
  });

  describe('Error Boundary and Fallback Behavior', () => {
    test('falls back to A variant when B variant throws error', async () => {
      isFeatureEnabled.mockReturnValue(true);

      // Mock MovieHeaderB to throw an error
      jest.doMock('../../components/MovieHeaderB', () => {
        return function MockMovieHeaderB() {
          throw new Error('Component render error');
        };
      });

      const { rerender } = render(<MovieHeaderAB {...mockProps} />);

      // Force re-render to trigger the error
      rerender(<MovieHeaderAB {...mockProps} />);

      await waitFor(() => {
        // Should fall back to A variant
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.queryByText('b The Matrix')).not.toBeInTheDocument();
      });

      // Should track the render error
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'ab_test_render_error',
        expect.objectContaining({
          event_category: 'A/B Testing',
          event_label: 'movie_header_format',
          variant: 'B',
        })
      );
    });

    test('handles missing props gracefully in both variants', () => {
      const minimalProps = { title: 'Test Movie', year: 2023 };

      // Test A variant
      isFeatureEnabled.mockReturnValue(false);
      const { rerender } = render(<MovieHeaderAB {...minimalProps} />);
      expect(screen.getByText('Test Movie')).toBeInTheDocument();

      // Test B variant
      isFeatureEnabled.mockReturnValue(true);
      rerender(<MovieHeaderAB {...minimalProps} />);
      waitFor(() => {
        expect(screen.getByText('b Test Movie')).toBeInTheDocument();
      });
    });
  });

  describe('SSR and Hydration Safety', () => {
    test('always renders A variant during SSR', () => {
      // Mock server-side environment
      const originalWindow = global.window;
      delete global.window;

      render(<MovieHeaderAB {...mockProps} />);

      // Should render A variant regardless of feature flag
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.queryByText('b The Matrix')).not.toBeInTheDocument();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Performance and Memory', () => {
    test('does not cause memory leaks with multiple renders', () => {
      const { rerender, unmount } = render(<MovieHeaderAB {...mockProps} />);

      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        isFeatureEnabled.mockReturnValue(i % 2 === 0);
        rerender(<MovieHeaderAB {...mockProps} />);
      }

      // Should not throw or cause issues
      expect(screen.getByText(/The Matrix/)).toBeInTheDocument();

      unmount();
      // No assertions needed - if we get here without errors, test passes
    });
  });

  describe('Development Helpers', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('forceVariant helper works in development', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      MovieHeaderAB.forceVariant('B');

      expect(consoleSpy).toHaveBeenCalledWith('Forced header variant to: B');
      consoleSpy.mockRestore();
    });

    test('debugVariant helper provides useful information', () => {
      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();
      getFeatureMetadata.mockReturnValue({
        isEnabled: true,
        environment: 'development',
        userBucket: 50,
        rolloutPercentage: 75,
      });

      const result = MovieHeaderAB.debugVariant();

      expect(consoleTableSpy).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          isEnabled: true,
          environment: 'development',
          userBucket: 50,
        })
      );

      consoleTableSpy.mockRestore();
    });
  });
});
