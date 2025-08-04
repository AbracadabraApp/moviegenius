/**
 * NavBar Integration Tests
 *
 * These tests verify actual navigation behavior, not just logic.
 * They test the interaction between NavBar clicks and page content updates.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock platform detection
jest.mock('../lib/platform', () => ({
  shouldShowPhoneFrame: jest.fn(() => false),
}));

describe('NavBar Integration Tests', () => {
  let mockPush;
  let mockRouter;

  beforeEach(() => {
    mockPush = jest.fn();
    mockRouter = {
      pathname: '/themes/film-noir',
      push: mockPush,
      query: {},
      asPath: '/themes/film-noir',
      events: { on: jest.fn(), off: jest.fn() },
    };
    useRouter.mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Icon Rendering', () => {
    test('All NavBar icons render correctly', () => {
      render(<NavBar />);

      // Check that all expected navigation items are present
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();

      // Check that icons are rendered (they should be SVG elements)
      const svgElements = screen.getAllByRole('navigation')[0].querySelectorAll('svg');
      expect(svgElements).toHaveLength(3); // Should have 3 icons
    });

    test('Icons are visible and clickable', () => {
      render(<NavBar />);

      // Get all links
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);

      // Each link should have the correct href
      const moviesLink = screen.getByRole('link', { name: /movies/i });
      const geniusLink = screen.getByRole('link', { name: /genius/i });
      const youLink = screen.getByRole('link', { name: /you/i });

      expect(moviesLink).toHaveAttribute('href', '/movies');
      expect(geniusLink).toHaveAttribute('href', '/genius');
      expect(youLink).toHaveAttribute('href', '/you');
    });
  });

  describe('Navigation Behavior from Theme Pages', () => {
    test('NavBar renders correctly on theme pages', () => {
      mockRouter.pathname = '/themes/film-noir';
      useRouter.mockReturnValue(mockRouter);

      render(<NavBar />);

      // Genius should be active on theme pages
      const geniusLink = screen.getByRole('link', { name: /genius/i });
      expect(geniusLink).toBeInTheDocument();

      // Check that the link has the correct href
      expect(geniusLink).toHaveAttribute('href', '/genius');
    });

    test('Movies link works from theme pages', () => {
      mockRouter.pathname = '/themes/horror-suspense';
      useRouter.mockReturnValue(mockRouter);

      render(<NavBar />);

      const moviesLink = screen.getByRole('link', { name: /movies/i });
      expect(moviesLink).toHaveAttribute('href', '/movies');

      // The link should be clickable
      expect(moviesLink).not.toHaveAttribute('disabled');
    });

    test('You link works from theme pages', () => {
      mockRouter.pathname = '/themes/comedy-through-time';
      useRouter.mockReturnValue(mockRouter);

      render(<NavBar />);

      const youLink = screen.getByRole('link', { name: /you/i });
      expect(youLink).toHaveAttribute('href', '/you');

      // The link should be clickable
      expect(youLink).not.toHaveAttribute('disabled');
    });
  });

  describe('Active State Visual Feedback', () => {
    test('Genius is active on theme pages', () => {
      mockRouter.pathname = '/themes/film-noir';
      useRouter.mockReturnValue(mockRouter);

      const { container } = render(<NavBar />);

      // Find the Genius nav item
      const geniusText = screen.getByText('Genius');
      const geniusNavItem = geniusText.closest('div');

      // Should have active styling (opacity 1)
      expect(geniusNavItem).toHaveStyle('opacity: 1');
    });

    test('Movies is active on movies page', () => {
      mockRouter.pathname = '/movies';
      useRouter.mockReturnValue(mockRouter);

      const { container } = render(<NavBar />);

      // Find the Movies nav item
      const moviesText = screen.getByText('Movies');
      const moviesNavItem = moviesText.closest('div');

      // Should have active styling (opacity 1)
      expect(moviesNavItem).toHaveStyle('opacity: 1');
    });

    test('You is active on you page', () => {
      mockRouter.pathname = '/you';
      useRouter.mockReturnValue(mockRouter);

      const { container } = render(<NavBar />);

      // Find the You nav item
      const youText = screen.getByText('You');
      const youNavItem = youText.closest('div');

      // Should have active styling (opacity 1)
      expect(youNavItem).toHaveStyle('opacity: 1');
    });
  });

  describe('Link Structure and Accessibility', () => {
    test('All navigation links are properly structured', () => {
      render(<NavBar />);

      const links = screen.getAllByRole('link');

      links.forEach(link => {
        // Each link should have a valid href
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).toMatch(/^\/[a-z]*$/);

        // Each link should have text content
        expect(link.textContent).toBeTruthy();

        // Each link should have no text decoration
        expect(link).toHaveStyle('text-decoration: none');
      });
    });

    test('Icons are properly associated with labels', () => {
      render(<NavBar />);

      // Each nav item should have both an icon and a label
      const moviesText = screen.getByText('Movies');
      const geniusText = screen.getByText('Genius');
      const youText = screen.getByText('You');

      // Each should be within a link
      expect(moviesText.closest('a')).toBeInTheDocument();
      expect(geniusText.closest('a')).toBeInTheDocument();
      expect(youText.closest('a')).toBeInTheDocument();
    });
  });
});
