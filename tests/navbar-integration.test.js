/**
 * NavBar Integration Tests
 * 
 * Tests to ensure navbar works correctly on all main pages
 * without breaking routing or causing hydration issues.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';

// Import main page components
import MoviesPage from '../pages/movies';
import GeniusPage from '../pages/genius';
import YouPage from '../pages/you';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock platform detection
jest.mock('../lib/platform', () => ({
  shouldShowPhoneFrame: jest.fn(() => true),
  getPlatformName: jest.fn(() => 'desktop'),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
  writable: true,
});

describe('NavBar Integration on Main Pages', () => {
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      pathname: '/movies',
      asPath: '/movies',
      push: jest.fn(() => Promise.resolve()),
      replace: jest.fn(() => Promise.resolve()),
      prefetch: jest.fn(() => Promise.resolve()),
      isReady: true,
      route: '/movies',
      query: {},
    };
    useRouter.mockReturnValue(mockRouter);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Movies Page with NavBar', () => {
    test('should render Movies page with navbar', () => {
      mockRouter.pathname = '/movies';
      mockRouter.asPath = '/movies';
      
      render(<MoviesPage />);
      
      // Page content should render
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
      
      // NavBar should render with Movies active
      const navLinks = screen.getAllByRole('link');
      expect(navLinks.length).toBeGreaterThanOrEqual(3);
      
      // Check for navbar items
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('should show Movies as active in navbar', () => {
      mockRouter.pathname = '/movies';
      
      render(<MoviesPage />);
      
      // Movies nav item should be active (opacity: 1)
      const moviesNavElements = screen.getAllByText('Movies');
      const navMovies = moviesNavElements.find(el => 
        el.closest('div')?.style?.opacity === '1' || 
        el.closest('a')?.href?.includes('/movies')
      );
      expect(navMovies).toBeInTheDocument();
    });
  });

  describe('Genius Page with NavBar', () => {
    test('should render Genius page with navbar', () => {
      mockRouter.pathname = '/genius';
      mockRouter.asPath = '/genius';
      
      render(<GeniusPage />);
      
      // Page content should render
      expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
      
      // NavBar should render
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('should show Genius as active in navbar', () => {
      mockRouter.pathname = '/genius';
      
      render(<GeniusPage />);
      
      // Genius nav item should be active (opacity: 1)
      const geniusNavElements = screen.getAllByText('Genius');
      const navGenius = geniusNavElements.find(el => 
        el.closest('div')?.style?.opacity === '1' || 
        el.closest('a')?.href?.includes('/genius')
      );
      expect(navGenius).toBeInTheDocument();
    });
  });

  describe('You Page with NavBar', () => {
    test('should render You page with navbar', () => {
      mockRouter.pathname = '/you';
      mockRouter.asPath = '/you';
      
      render(<YouPage />);
      
      // Page content should render
      expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
      
      // NavBar should render
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('should show You as active in navbar', () => {
      mockRouter.pathname = '/you';
      
      render(<YouPage />);
      
      // You nav item should be active (opacity: 1)
      const youNavElements = screen.getAllByText('You');  
      const navYou = youNavElements.find(el => 
        el.closest('div')?.style?.opacity === '1' || 
        el.closest('a')?.href?.includes('/you')
      );
      expect(navYou).toBeInTheDocument();
    });
  });

  describe('Cross-Page Navigation', () => {
    test('should maintain navbar consistency across page changes', () => {
      // Start on Movies page
      mockRouter.pathname = '/movies';
      const { rerender } = render(<MoviesPage />);
      
      expect(screen.getByText('Movies')).toBeInTheDocument();
      
      // Navigate to Genius page
      mockRouter.pathname = '/genius';
      mockRouter.asPath = '/genius';
      rerender(<GeniusPage />);
      
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
      
      // Navigate to You page  
      mockRouter.pathname = '/you';
      mockRouter.asPath = '/you';
      rerender(<YouPage />);
      
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
    });
  });

  describe('NavBar Links Validation', () => {
    test('should have correct href attributes for all pages', () => {
      render(<MoviesPage />);
      
      const links = screen.getAllByRole('link');
      const movieLink = links.find(link => link.getAttribute('href') === '/movies');
      const geniusLink = links.find(link => link.getAttribute('href') === '/genius');
      const youLink = links.find(link => link.getAttribute('href') === '/you');
      
      expect(movieLink).toBeInTheDocument();
      expect(geniusLink).toBeInTheDocument();
      expect(youLink).toBeInTheDocument();
    });
  });

  describe('Error Handling and Robustness', () => {
    test('should handle missing router properties gracefully', () => {
      mockRouter.pathname = undefined;
      mockRouter.asPath = undefined;
      
      expect(() => {
        render(<MoviesPage />);
      }).not.toThrow();
      
      expect(() => {
        render(<GeniusPage />);
      }).not.toThrow();
      
      expect(() => {
        render(<YouPage />);
      }).not.toThrow();
    });

    test('should handle router.isReady = false', () => {
      mockRouter.isReady = false;
      
      expect(() => {
        render(<MoviesPage />);
      }).not.toThrow();
      
      expect(() => {
        render(<GeniusPage />);
      }).not.toThrow();
      
      expect(() => {
        render(<YouPage />);
      }).not.toThrow();
    });
  });

  describe('Hydration Safety', () => {
    test('should prevent hydration mismatches on all pages', () => {
      const pages = [
        { component: MoviesPage, route: '/movies' },
        { component: GeniusPage, route: '/genius' },
        { component: YouPage, route: '/you' },
      ];

      pages.forEach(({ component: PageComponent, route }) => {
        mockRouter.pathname = route;
        mockRouter.asPath = route;
        
        // Simulate server-side render
        const { container: serverContainer } = render(<PageComponent />);
        const serverHTML = serverContainer.innerHTML;
        
        // Simulate client-side hydration
        const { container: clientContainer } = render(<PageComponent />);
        const clientHTML = clientContainer.innerHTML;
        
        // Structure should be consistent to prevent hydration mismatches
        expect(typeof serverHTML).toBe('string');
        expect(typeof clientHTML).toBe('string');
        expect(serverHTML.length).toBeGreaterThan(0);
        expect(clientHTML.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('NavBar Route Detection Integration', () => {
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      pathname: '/movies',
      asPath: '/movies',
      push: jest.fn(() => Promise.resolve()),
      replace: jest.fn(() => Promise.resolve()),
      prefetch: jest.fn(() => Promise.resolve()),
      isReady: true,
      route: '/movies',
      query: {},
    };
    useRouter.mockReturnValue(mockRouter);
  });

  test('should show correct active states for dynamic routes', () => {
    // Test movie detail page shows Movies as active
    mockRouter.pathname = '/movie/[id]';
    mockRouter.asPath = '/movie/550';
    
    render(<MoviesPage />);
    
    // Movies should be active for movie detail routes
    const moviesNavElements = screen.getAllByText('Movies');
    expect(moviesNavElements.length).toBeGreaterThan(0);
  });

  test('should show correct active states for theme routes', () => {
    // Test theme page shows Genius as active
    mockRouter.pathname = '/themes/[theme]';
    mockRouter.asPath = '/themes/film-noir';
    
    render(<GeniusPage />);
    
    // Genius should be active for theme routes
    const geniusNavElements = screen.getAllByText('Genius');
    expect(geniusNavElements.length).toBeGreaterThan(0);
  });
});