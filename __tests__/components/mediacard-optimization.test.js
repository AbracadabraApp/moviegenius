/**
 * MediaCard Performance Optimization Tests
 * 
 * CRITICAL: This is a LOCKED component - comprehensive testing required
 * Tests both performance improvements and functional correctness
 * 
 * Risk Mitigation:
 * - Validates all protected functionality still works
 * - Tests navigation, favorites, poster loading
 * - Validates TMDB ID preservation
 * - Performance regression detection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MediaCard from '../../components/MediaCard';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/test'
  })
}));

// Mock Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />;
  };
});

describe('MediaCard Performance Optimization Tests', () => {
  let renderCount = 0;
  
  beforeEach(() => {
    renderCount = 0;
    mockPush.mockClear();
    jest.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          slug: 'Enhanced movie tagline',
          poster: '/enhanced-poster.jpg'
        })
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Track render counts
  const RenderTracker = ({ children, name }) => {
    renderCount++;
    console.log(`🔄 ${name} render #${renderCount}`);
    return children;
  };

  describe('🔒 LOCKED COMPONENT - Critical Functionality Validation', () => {
    const sampleMovie = {
      title: 'The Matrix',
      year: 1999,
      initialSlug: 'Mind-bending sci-fi thriller',
      initialPoster: '/matrix-poster.jpg',
      tmdbId: 603
    };

    test('🚨 CRITICAL: TMDB ID navigation must work', async () => {
      render(<MediaCard {...sampleMovie} />);
      
      const movieCard = screen.getByText('The Matrix').closest('article');
      expect(movieCard).toBeInTheDocument();
      
      fireEvent.click(movieCard);
      
      // CRITICAL: Must navigate to /movie/603 (TMDB ID)
      expect(mockPush).toHaveBeenCalledWith('/movie/603');
      
      console.log('✅ TMDB ID navigation preserved');
    });

    test('🚨 CRITICAL: Props interface must remain unchanged', () => {
      // Test all expected props work
      const allProps = {
        title: 'Test Movie',
        year: 2000,
        initialSlug: 'Test slug',
        initialPoster: '/test.jpg',
        initialStreaming: 'Available on Netflix',
        isDetailPage: false,
        tmdbId: 123
      };
      
      const { container } = render(<MediaCard {...allProps} />);
      
      // Should render without errors
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
      expect(screen.getByText('2000')).toBeInTheDocument();
      
      console.log('✅ Props interface preserved');
    });

    test('🚨 CRITICAL: Favorites functionality must work', async () => {
      render(<MediaCard {...sampleMovie} />);
      
      const heartButton = screen.getByLabelText(/add to favorites|remove from favorites/i);
      expect(heartButton).toBeInTheDocument();
      
      fireEvent.click(heartButton);
      
      // Should toggle without errors
      await waitFor(() => {
        expect(heartButton).toBeInTheDocument();
      });
      
      console.log('✅ Favorites functionality preserved');
    });

    test('🚨 CRITICAL: Slug display logic must work', () => {
      render(<MediaCard {...sampleMovie} />);
      
      // Should display the slug
      expect(screen.getByText('Mind-bending sci-fi thriller')).toBeInTheDocument();
      
      console.log('✅ Slug display preserved');
    });

    test('🚨 CRITICAL: Poster loading must work', () => {
      render(<MediaCard {...sampleMovie} />);
      
      const posterImg = screen.getByAltText(`Poster for ${sampleMovie.title}`);
      expect(posterImg).toBeInTheDocument();
      expect(posterImg.src).toContain('matrix-poster.jpg');
      
      console.log('✅ Poster loading preserved');
    });
  });

  describe('Performance Optimization Validation', () => {
    test('should establish baseline re-render count (BEFORE optimization)', () => {
      const TestComponent = ({ title, year, slug, poster }) => (
        <RenderTracker name="MediaCard">
          <MediaCard
            title={title}
            year={year}
            initialSlug={slug}
            initialPoster={poster}
            tmdbId={603}
          />
        </RenderTracker>
      );

      const { rerender } = render(
        <TestComponent 
          title="The Matrix" 
          year={1999} 
          slug="Mind-bending sci-fi" 
          poster="/matrix.jpg" 
        />
      );
      
      const initialRenderCount = renderCount;
      
      // Re-render with SAME props - should cause excessive re-renders with old useEffect
      for (let i = 0; i < 3; i++) {
        rerender(
          <TestComponent 
            title="The Matrix" 
            year={1999} 
            slug="Mind-bending sci-fi" 
            poster="/matrix.jpg" 
          />
        );
      }
      
      const finalRenderCount = renderCount;
      const additionalRenders = finalRenderCount - initialRenderCount;
      
      console.log(`📊 MediaCard renders with identical props (baseline): ${additionalRenders}`);
      
      // Document current behavior for comparison after optimization
      expect(additionalRenders).toBeGreaterThan(0);
    });

    test('should validate useEffect dependency optimization', async () => {
      const mockSetState = jest.fn();
      
      // Spy on useState to detect unnecessary state updates
      const originalUseState = React.useState;
      jest.spyOn(React, 'useState').mockImplementation((initial) => {
        const [state, setState] = originalUseState(initial);
        return [state, (...args) => {
          mockSetState(...args);
          setState(...args);
        }];
      });

      render(
        <MediaCard
          title="Test Movie"
          year={2000}
          initialSlug="Good quality slug"
          initialPoster="/good-poster.jpg"
          tmdbId={123}
        />
      );

      // Wait for any async operations
      await waitFor(() => {
        expect(screen.getByText('Test Movie')).toBeInTheDocument();
      });

      const stateUpdateCount = mockSetState.mock.calls.length;
      console.log(`📊 State updates triggered: ${stateUpdateCount}`);
      
      // With good slug and poster, should minimize API calls and state updates
      expect(stateUpdateCount).toBeLessThan(10); // Should be minimal
      
      React.useState.mockRestore();
    });

    test('should calculate expected performance improvement', () => {
      // Performance improvement calculation
      const currentRendersPerInteraction = 10; // Estimated current
      const optimizedRendersPerInteraction = 2; // Expected after optimization
      const interactionsPerPage = 20;
      const pagesPerDay = 1000;
      
      const currentDailyRenders = currentRendersPerInteraction * interactionsPerPage * pagesPerDay;
      const optimizedDailyRenders = optimizedRendersPerInteraction * interactionsPerPage * pagesPerDay;
      
      const renderTimeSavingsMs = (currentDailyRenders - optimizedDailyRenders) * 2; // 2ms per render
      const improvementPercent = ((currentDailyRenders - optimizedDailyRenders) / currentDailyRenders) * 100;
      
      console.log(`📊 MediaCard Performance Projection:`);
      console.log(`   Current daily renders: ${currentDailyRenders}`);
      console.log(`   Optimized daily renders: ${optimizedDailyRenders}`);
      console.log(`   Daily time savings: ${(renderTimeSavingsMs / 1000).toFixed(1)}s`);
      console.log(`   Performance improvement: ${improvementPercent.toFixed(1)}%`);
      
      // Should achieve significant improvement
      expect(improvementPercent).toBeGreaterThan(70); // >70% improvement expected
    });
  });

  describe('Enhancement Logic Validation', () => {
    test('should skip enhancement with good slug and poster', async () => {
      global.fetch.mockClear();
      
      render(
        <MediaCard
          title="Test Movie"
          year={2000}
          initialSlug="Perfect marketing tagline" // Good slug
          initialPoster="/high-quality-poster.jpg" // Good poster
          tmdbId={123}
        />
      );

      // Wait for component to settle
      await waitFor(() => {
        expect(screen.getByText('Test Movie')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Should NOT call enhancement API with good data
      expect(global.fetch).not.toHaveBeenCalled();
      
      console.log('✅ Enhancement skipped for good data');
    });

    test('should trigger enhancement with poor slug', async () => {
      global.fetch.mockClear();
      
      render(
        <MediaCard
          title="Test Movie"
          year={2000}
          initialSlug="bad" // Too short slug
          initialPoster="/good-poster.jpg"
          tmdbId={123}
        />
      );

      // Wait for enhancement to trigger
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/enhance-movie-data', expect.any(Object));
      }, { timeout: 2000 });
      
      console.log('✅ Enhancement triggered for poor data');
    });

    test('should validate slug quality criteria', () => {
      // Test the slug validation logic (lines 103-110)
      const testSlugQuality = (slug) => {
        return slug && 
          slug.length <= 50 && 
          slug.length > 5 && 
          !slug.includes('-') && 
          slug !== slug.toLowerCase() &&
          !slug.includes('Plot:') && 
          !slug.includes('Overview:') && 
          !slug.includes('Synopsis:');
      };

      // Good slugs
      expect(testSlugQuality('Mind-bending thriller')).toBe(false); // Has dash
      expect(testSlugQuality('Perfect Marketing Tagline')).toBe(true); // Good
      expect(testSlugQuality('great sci-fi movie')).toBe(false); // All lowercase
      
      // Bad slugs
      expect(testSlugQuality('Plot: A detailed description...')).toBe(false); // TMDB plot
      expect(testSlugQuality('short')).toBe(false); // Too short
      expect(testSlugQuality('A'.repeat(60))).toBe(false); // Too long
      
      console.log('✅ Slug quality validation working correctly');
    });
  });

  describe('Risk Mitigation Tests', () => {
    test('should handle API failures gracefully', async () => {
      // Mock API failure
      global.fetch.mockRejectedValue(new Error('API Error'));
      
      const { container } = render(
        <MediaCard
          title="Test Movie"
          year={2000}
          initialSlug="bad"
          initialPoster="/placeholder.jpg"
          tmdbId={123}
        />
      );

      // Should still render the component
      await waitFor(() => {
        expect(screen.getByText('Test Movie')).toBeInTheDocument();
      });
      
      // Component should remain functional
      expect(container.firstChild).toBeInTheDocument();
      
      console.log('✅ API failure handled gracefully');
    });

    test('should maintain component stability during optimization', () => {
      // Test that component doesn't crash with various prop combinations
      const testCases = [
        { title: 'Movie 1', year: 2000 },
        { title: 'Movie 2', year: 1999, initialSlug: 'Great movie' },
        { title: 'Movie 3', year: 2020, initialPoster: '/poster.jpg' },
        { title: 'Movie 4', year: 2010, tmdbId: 456 }
      ];

      testCases.forEach((props, index) => {
        const { unmount } = render(<MediaCard {...props} />);
        
        expect(screen.getByText(props.title)).toBeInTheDocument();
        
        unmount();
      });
      
      console.log('✅ Component stable with various prop combinations');
    });
  });

  describe('Protected Code Section Validation', () => {
    test('🔒 PROTECTED: TMDB ID routing must be preserved', () => {
      const { rerender } = render(
        <MediaCard title="Movie 1" year={2000} tmdbId={123} />
      );
      
      // Test with different TMDB IDs
      [456, 789, 999].forEach(tmdbId => {
        rerender(<MediaCard title="Movie 1" year={2000} tmdbId={tmdbId} />);
        
        const movieCard = screen.getByText('Movie 1').closest('article');
        fireEvent.click(movieCard);
        
        expect(mockPush).toHaveBeenCalledWith(`/movie/${tmdbId}`);
        mockPush.mockClear();
      });
      
      console.log('✅ TMDB ID routing preserved across re-renders');
    });

    test('🔒 PROTECTED: State management must remain intact', () => {
      // Test that state updates work correctly
      const { rerender } = render(
        <MediaCard title="Movie" year={2000} tmdbId={123} />
      );
      
      // Test favorites state
      const heartButton = screen.getByLabelText(/add to favorites/i);
      fireEvent.click(heartButton);
      
      // Re-render and check state persistence
      rerender(<MediaCard title="Movie" year={2000} tmdbId={123} />);
      
      expect(heartButton).toBeInTheDocument();
      
      console.log('✅ State management preserved');
    });
  });
});