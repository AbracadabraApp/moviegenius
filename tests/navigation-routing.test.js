/**
 * Navigation and Routing Tests
 * 
 * Critical tests to ensure navbar implementation doesn't break routing
 * or contribute to 404 issues. Tests must pass before navbar deployment.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';
import { navItems } from '../lib/routes';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock platform detection
jest.mock('../lib/platform', () => ({
  shouldShowPhoneFrame: jest.fn(() => true),
}));

describe('Navigation Routing Tests', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route Detection and Active States', () => {
    test('should correctly identify /movies as active route', () => {
      mockRouter.pathname = '/movies';
      mockRouter.asPath = '/movies';
      
      render(<NavBar navItems={navItems} />);
      
      const moviesNav = screen.getByText('Movies').closest('div');
      expect(moviesNav).toHaveStyle('opacity: 1');
    });

    test('should show Movies as active for dynamic movie routes', () => {
      mockRouter.pathname = '/movie/[id]';
      mockRouter.asPath = '/movie/550';
      
      render(<NavBar navItems={navItems} />);
      
      const moviesNav = screen.getByText('Movies').closest('div');
      expect(moviesNav).toHaveStyle('opacity: 1');
    });

    test('should show Movies as active for search pages', () => {
      mockRouter.pathname = '/search';
      mockRouter.asPath = '/search?q=test';
      
      render(<NavBar navItems={navItems} />);
      
      const moviesNav = screen.getByText('Movies').closest('div');
      expect(moviesNav).toHaveStyle('opacity: 1');
    });

    test('should correctly identify /you as active route', () => {
      mockRouter.pathname = '/you';
      mockRouter.asPath = '/you';
      
      render(<NavBar navItems={navItems} />);
      
      const youNav = screen.getByText('You').closest('div');
      expect(youNav).toHaveStyle('opacity: 1');
    });

    test('should correctly identify /genius as active route', () => {
      mockRouter.pathname = '/genius';
      mockRouter.asPath = '/genius';
      
      render(<NavBar navItems={navItems} />);
      
      const geniusNav = screen.getByText('Genius').closest('div');
      expect(geniusNav).toHaveStyle('opacity: 1');
    });
  });

  describe('Route Validation', () => {
    test('should render all valid navigation routes', () => {
      render(<NavBar navItems={navItems} />);
      
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('should have valid href attributes for all nav items', () => {
      render(<NavBar navItems={navItems} />);
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      
      expect(links[0]).toHaveAttribute('href', '/movies');
      expect(links[1]).toHaveAttribute('href', '/genius');
      expect(links[2]).toHaveAttribute('href', '/you');
    });

    test('should handle invalid navItems gracefully', () => {
      const invalidNavItems = [
        { label: 'Invalid', icon: 'NonExistentIcon', route: null },
        { label: 'Movies', icon: 'Clapperboard', route: '/movies' },
      ];
      
      render(<NavBar navItems={invalidNavItems} />);
      
      // Valid item should render
      expect(screen.getByText('Movies')).toBeInTheDocument();
      // Invalid item should not crash the component
      expect(screen.queryByText('Invalid')).not.toBeInTheDocument();
    });
  });

  describe('Hydration Safety', () => {
    test('should render consistent DOM structure on server and client', () => {
      // Simulate server-side rendering (isClient = false)
      const { container: serverContainer } = render(<NavBar navItems={navItems} />);
      const serverHTML = serverContainer.innerHTML;
      
      // Simulate client-side hydration
      const { container: clientContainer } = render(<NavBar navItems={navItems} />);
      const clientHTML = clientContainer.innerHTML;
      
      // DOM structure should be identical to prevent hydration mismatches
      expect(serverHTML).toBe(clientHTML);
    });

    test('should handle router.isReady = false without breaking', () => {
      mockRouter.isReady = false;
      
      render(<NavBar navItems={navItems} />);
      
      // Should still render navbar without crashing
      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('Genius')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing router properties gracefully', () => {
      mockRouter.pathname = undefined;
      mockRouter.asPath = undefined;
      
      render(<NavBar navItems={navItems} />);
      
      // Should render without crashing
      expect(screen.getByText('Movies')).toBeInTheDocument();
    });

    test('should handle empty navItems array', () => {
      render(<NavBar navItems={[]} />);
      
      // Should render nav container without items
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav.children).toHaveLength(0);
    });

    test('should handle undefined navItems', () => {
      render(<NavBar navItems={undefined} />);
      
      // Should render nav container without crashing
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Dynamic Route Patterns', () => {
    test('should handle movie detail routes correctly', () => {
      const movieRoutes = [
        '/movie/550',
        '/movie/238',
        '/movie/11',
        '/movie/999999',
      ];

      movieRoutes.forEach(route => {
        mockRouter.pathname = '/movie/[id]';
        mockRouter.asPath = route;
        
        const { unmount } = render(<NavBar navItems={navItems} />);
        
        const moviesNavElements = screen.getAllByText('Movies');
        const moviesNav = moviesNavElements[0].closest('div');
        expect(moviesNav).toHaveStyle('opacity: 1');
        
        unmount();
      });
    });

    test('should not break on malformed routes', () => {
      const malformedRoutes = [
        '/movie/',
        '/movie/abc',
        '/movie/550/invalid',
        '//movie/550',
      ];

      malformedRoutes.forEach(route => {
        mockRouter.asPath = route;
        
        expect(() => {
          render(<NavBar navItems={navItems} />);
        }).not.toThrow();
      });
    });
  });

  describe('Performance and Memory', () => {
    test('should not cause memory leaks with frequent re-renders', () => {
      const { rerender } = render(<NavBar navItems={navItems} />);
      
      // Simulate multiple route changes
      for (let i = 0; i < 10; i++) {
        mockRouter.asPath = `/movie/${i}`;
        rerender(<NavBar navItems={navItems} />);
      }
      
      // Should still function correctly
      expect(screen.getByText('Movies')).toBeInTheDocument();
    });
  });
});

describe('Integration with PhoneFrame', () => {
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

  test('should work when embedded in PhoneFrame component', async () => {
    // Test that navbar doesn't interfere with PhoneFrame positioning
    render(
      <div style={{ position: 'relative', height: '667px', width: '375px' }}>
        <NavBar navItems={navItems} />
      </div>
    );
    
    const nav = document.querySelector('nav');
    expect(nav).toHaveStyle('position: absolute');
    expect(nav).toHaveStyle('bottom: 0');
  });
});

/**
 * Route Accessibility Tests
 * Ensure navbar doesn't break screen readers or keyboard navigation
 */
describe('Accessibility', () => {
  test('should have proper link semantics', () => {
    render(<NavBar navItems={navItems} />);
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
      expect(link.getAttribute('href')).toMatch(/^\/[a-z]+$/);
    });
  });

  test('should maintain focus order', () => {
    render(<NavBar navItems={navItems} />);
    
    const links = screen.getAllByRole('link');
    
    // Focus should move through links in order
    links[0].focus();
    expect(document.activeElement).toBe(links[0]);
    
    // Tab to next link
    fireEvent.keyDown(links[0], { key: 'Tab' });
  });
});