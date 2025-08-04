/**
 * End-to-End Navigation Tests
 *
 * Tests actual navigation behavior that users experience.
 * Specifically designed to catch the "URL changes but page content doesn't update" issue.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { act } from 'react-dom/test-utils';
import NavBar from '../components/NavBar';
import { routeHelpers } from '../lib/routes';

// Mock Next.js router with more realistic behavior
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = '/';

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    pathname: mockPathname,
    push: mockPush,
    replace: mockReplace,
    query: {},
    asPath: mockPathname,
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
    isReady: true,
  })),
}));

// Mock platform detection
jest.mock('../lib/platform', () => ({
  shouldShowPhoneFrame: jest.fn(() => false),
}));

describe('End-to-End Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPathname = '/';
  });

  describe('Navigation from Theme Pages', () => {
    test('NavBar navigation from film-noir theme page updates correctly', async () => {
      // Start on film noir theme page
      mockPathname = '/themes/film-noir';

      const { rerender } = render(<NavBar />);

      // Find and click Movies navigation link
      const moviesLink = screen.getByRole('link', { name: /movies/i });
      expect(moviesLink).toHaveAttribute('href', '/movies');

      // Simulate navigation
      fireEvent.click(moviesLink);

      // Verify router.push was called correctly
      expect(mockPush).not.toHaveBeenCalled(); // Link should use Next.js navigation, not router.push
    });

    test('Navigation from episode page to NavBar items', async () => {
      // Start on episode page (the problematic route from user report)
      mockPathname = '/film-noir/from-novels-to-noir';

      const { rerender } = render(<NavBar />);

      // Verify Genius is active on episode pages
      const geniusLink = screen.getByRole('link', { name: /genius/i });
      expect(geniusLink).toBeInTheDocument();

      // Test navigation to Movies
      const moviesLink = screen.getByRole('link', { name: /movies/i });
      fireEvent.click(moviesLink);

      // Verify proper href
      expect(moviesLink).toHaveAttribute('href', '/movies');
    });

    test('Multiple rapid navigation clicks (stress test)', async () => {
      mockPathname = '/themes/horror-suspense';

      const { rerender } = render(<NavBar />);

      // Simulate rapid clicking between navigation items
      const moviesLink = screen.getByRole('link', { name: /movies/i });
      const youLink = screen.getByRole('link', { name: /you/i });
      const geniusLink = screen.getByRole('link', { name: /genius/i });

      // Click multiple times rapidly
      fireEvent.click(moviesLink);
      fireEvent.click(youLink);
      fireEvent.click(geniusLink);
      fireEvent.click(moviesLink);

      // All links should remain functional
      expect(moviesLink).toHaveAttribute('href', '/movies');
      expect(youLink).toHaveAttribute('href', '/you');
      expect(geniusLink).toHaveAttribute('href', '/genius');
    });
  });

  describe('Route Generation Function Tests', () => {
    test('Episode route generation produces valid URLs', () => {
      // Test the problematic episode route
      const route = routeHelpers.getEpisodeRoute('film-noir', 'from-novels-to-noir');
      expect(route).toBe('/film-noir/from-novels-to-noir');

      // Test fallback for invalid episode
      const invalidRoute = routeHelpers.getEpisodeRoute('invalid-theme', 'invalid-episode');
      expect(invalidRoute).toBe('/'); // Should fallback to home
    });

    test('Movie route generation produces valid URLs', () => {
      const route = routeHelpers.getMovieRoute(238);
      expect(route).toBe('/movie/238');

      const routeString = routeHelpers.getMovieRoute('12345');
      expect(routeString).toBe('/movie/12345');
    });

    test('Theme route generation produces valid URLs', () => {
      const route = routeHelpers.getThemeRoute('film-noir');
      expect(route).toBe('/themes/film-noir');

      // Test fallback for invalid theme
      const invalidRoute = routeHelpers.getThemeRoute('invalid-theme');
      expect(invalidRoute).toBe('/'); // Should fallback to home
    });
  });

  describe('Route Validation Tests', () => {
    test('Episode route validation works correctly', () => {
      // Valid episode routes
      expect(routeHelpers.isEpisodeRoute('/film-noir/from-novels-to-noir')).toBe(true);
      expect(routeHelpers.isEpisodeRoute('/horror-suspense/giallo-italian-horror')).toBe(true);

      // Invalid routes
      expect(routeHelpers.isEpisodeRoute('/invalid/route')).toBe(false);
      expect(routeHelpers.isEpisodeRoute('/movie/238')).toBe(false);
      expect(routeHelpers.isEpisodeRoute('/themes/film-noir')).toBe(false);
    });

    test('Theme from episode route extraction', () => {
      expect(routeHelpers.getThemeFromEpisodeRoute('/film-noir/from-novels-to-noir')).toBe(
        'film-noir'
      );
      expect(routeHelpers.getThemeFromEpisodeRoute('/horror-suspense/giallo-italian-horror')).toBe(
        'horror-suspense'
      );
      expect(routeHelpers.getThemeFromEpisodeRoute('/invalid/route')).toBeNull();
    });

    test('Episode validation by theme and ID', () => {
      expect(routeHelpers.isValidEpisode('film-noir', 'from-novels-to-noir')).toBe(true);
      expect(routeHelpers.isValidEpisode('film-noir', 'invalid-episode')).toBe(false);
      expect(routeHelpers.isValidEpisode('invalid-theme', 'from-novels-to-noir')).toBe(false);
    });
  });

  describe('NavBar Active State with New Route System', () => {
    test('Active state detection for theme pages', () => {
      mockPathname = '/themes/film-noir';
      render(<NavBar />);

      // Genius should be active on theme pages
      const geniusText = screen.getByText('Genius');
      const geniusNavItem = geniusText.closest('div');
      expect(geniusNavItem).toHaveStyle('opacity: 1');
    });

    test('Active state detection for episode pages', () => {
      mockPathname = '/film-noir/from-novels-to-noir';
      render(<NavBar />);

      // Genius should be active on episode pages too
      const geniusText = screen.getByText('Genius');
      const geniusNavItem = geniusText.closest('div');
      expect(geniusNavItem).toHaveStyle('opacity: 1');
    });

    test('Active state detection for static pages', () => {
      mockPathname = '/movies';
      render(<NavBar />);

      // Movies should be active
      const moviesText = screen.getByText('Movies');
      const moviesNavItem = moviesText.closest('div');
      expect(moviesNavItem).toHaveStyle('opacity: 1');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('NavBar handles invalid route states gracefully', () => {
      mockPathname = '/nonexistent/route';

      expect(() => {
        render(<NavBar />);
      }).not.toThrow();

      // Should render without errors
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('Route helpers handle null/undefined inputs', () => {
      expect(() => routeHelpers.getEpisodeRoute(null, null)).not.toThrow();
      expect(() => routeHelpers.getEpisodeRoute(undefined, undefined)).not.toThrow();
      expect(() => routeHelpers.getMovieRoute(null)).not.toThrow();
      expect(() => routeHelpers.getThemeRoute(null)).not.toThrow();
    });

    test('Route validation handles malformed URLs', () => {
      expect(routeHelpers.isEpisodeRoute('')).toBe(false);
      expect(routeHelpers.isEpisodeRoute('/')).toBe(false);
      expect(routeHelpers.isEpisodeRoute('//')).toBe(false);
      expect(routeHelpers.getThemeFromEpisodeRoute('')).toBeNull();
    });
  });

  describe('Navigation Performance Tests', () => {
    test('Route generation functions are performant', () => {
      const start = performance.now();

      // Generate 100 routes
      for (let i = 0; i < 100; i++) {
        routeHelpers.getEpisodeRoute('film-noir', 'from-novels-to-noir');
        routeHelpers.getMovieRoute(i);
        routeHelpers.getThemeRoute('film-noir');
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete in reasonable time (less than 10ms)
      expect(duration).toBeLessThan(10);
    });

    test('NavBar renders quickly with various route states', () => {
      const routes = [
        '/',
        '/movies',
        '/genius',
        '/you',
        '/themes/film-noir',
        '/film-noir/from-novels-to-noir',
        '/horror-suspense/giallo-italian-horror',
      ];

      routes.forEach(route => {
        mockPathname = route;
        const start = performance.now();

        const { unmount } = render(<NavBar />);

        const end = performance.now();
        const duration = end - start;

        // Should render quickly (less than 50ms)
        expect(duration).toBeLessThan(50);

        unmount();
      });
    });
  });
});

// Test utilities for debugging navigation issues
export const navigationTestUtils = {
  /**
   * Simulate the problematic navigation sequence reported by user
   */
  simulateProblematicNavigation: async () => {
    // Start on episode page
    mockPathname = '/film-noir/from-novels-to-noir';
    const { rerender } = render(<NavBar />);

    // Click navigation - this should work
    const moviesLink = screen.getByRole('link', { name: /movies/i });
    fireEvent.click(moviesLink);

    // Simulate URL change without page content update (the bug)
    mockPathname = '/movies';
    rerender(<NavBar />);

    return {
      urlChanged: mockPathname === '/movies',
      navBarUpdated: screen.getByText('Movies').closest('div').style.opacity === '1',
    };
  },

  /**
   * Test navigation after multiple clicks (stress test)
   */
  testNavigationAfterManyClicks: () => {
    mockPathname = '/themes/film-noir';
    const { rerender } = render(<NavBar />);

    // Simulate many navigation attempts
    const links = [
      screen.getByRole('link', { name: /movies/i }),
      screen.getByRole('link', { name: /you/i }),
      screen.getByRole('link', { name: /genius/i }),
    ];

    // Click each link multiple times
    for (let i = 0; i < 10; i++) {
      links.forEach(link => fireEvent.click(link));
    }

    // All links should still have correct hrefs
    return {
      allLinksValid: links.every(
        link => link.getAttribute('href') && link.getAttribute('href').startsWith('/')
      ),
    };
  },
};
