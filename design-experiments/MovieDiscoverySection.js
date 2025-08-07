/**
 * MovieDiscoverySection Component - Complete movie discovery interface
 * 
 * High-level component that combines MovieCardGlass and MovieScrollContainer
 * to create engaging movie discovery sections. Includes:
 * - Automatic data fetching and error handling
 * - Loading states with skeleton cards
 * - Performance optimizations for large datasets
 * - Responsive design patterns
 * - Analytics tracking hooks
 * 
 * @component
 * @example
 * <MovieDiscoverySection 
 *   title="Popular This Week"
 *   endpoint="/api/popular-movies"
 *   cardSize="medium"
 *   showTrailers={true}
 * />
 */
import { useState, useEffect, useCallback } from 'react';
import MovieCardGlass from './MovieCardGlass';
import MovieScrollContainer from './MovieScrollContainer';

/**
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {string|Function} props.endpoint - API endpoint or data fetching function
 * @param {Array} [props.movies] - Pre-loaded movie data (alternative to endpoint)
 * @param {string} [props.cardSize='medium'] - Size of movie cards
 * @param {boolean} [props.showTrailers=true] - Enable trailer functionality
 * @param {boolean} [props.showNavigation=true] - Show navigation arrows
 * @param {number} [props.limit=20] - Maximum number of movies to display
 * @param {Function} [props.onMovieClick] - Custom movie click handler
 * @param {Function} [props.onError] - Error handler callback
 * @param {boolean} [props.lazy=false] - Enable lazy loading
 */
export default function MovieDiscoverySection({
  title,
  endpoint,
  movies: propsMovies,
  cardSize = 'medium',
  showTrailers = true,
  showNavigation = true,
  limit = 20,
  onMovieClick,
  onError,
  lazy = false
}) {
  const [movies, setMovies] = useState(propsMovies || []);
  const [loading, setLoading] = useState(!propsMovies);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch movies from endpoint
  const fetchMovies = useCallback(async () => {
    if (!endpoint || propsMovies) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let data;
      
      if (typeof endpoint === 'function') {
        // Custom data fetcher function
        data = await endpoint();
      } else {
        // API endpoint
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch movies: ${response.statusText}`);
        }
        data = await response.json();
      }
      
      // Handle different response formats
      const movieList = Array.isArray(data) ? data : data.movies || data.results || [];
      
      // Apply limit if specified
      const limitedMovies = limit ? movieList.slice(0, limit) : movieList;
      
      setMovies(limitedMovies);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError(err.message);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, propsMovies, limit, onError]);

  // Load data on mount or when props change
  useEffect(() => {
    if (propsMovies) {
      setMovies(propsMovies);
      setHasLoaded(true);
      setLoading(false);
    } else if (!lazy || hasLoaded) {
      fetchMovies();
    }
  }, [fetchMovies, propsMovies, lazy, hasLoaded]);

  // Lazy loading trigger
  useEffect(() => {
    if (!lazy || hasLoaded) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMovies();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.querySelector(`[data-section="${title}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [lazy, hasLoaded, fetchMovies, title]);

  // Handle movie click with analytics
  const handleMovieClick = (movieData) => {
    // Track interaction
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'movie_card_click', {
        event_category: 'engagement',
        event_label: movieData.title,
        movie_id: movieData.tmdbId,
        section: title
      });
    }

    if (onMovieClick) {
      onMovieClick(movieData);
    } else if (movieData.tmdbId) {
      window.location.href = `/movie/${movieData.tmdbId}`;
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div style={skeletonStyles.container}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} style={skeletonStyles.card}>
          <div style={skeletonStyles.poster} />
          <div style={skeletonStyles.content}>
            <div style={skeletonStyles.title} />
            <div style={skeletonStyles.year} />
            <div style={skeletonStyles.slug} />
          </div>
        </div>
      ))}
    </div>
  );

  // Error component
  const ErrorDisplay = () => (
    <div style={styles.error}>
      <div style={styles.errorIcon}>⚠️</div>
      <div style={styles.errorText}>
        <h3>Unable to load movies</h3>
        <p>{error}</p>
        <button style={styles.retryButton} onClick={fetchMovies}>
          Try Again
        </button>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>🎬</div>
      <div style={styles.emptyText}>
        <h3>No movies found</h3>
        <p>Check back later for new additions.</p>
      </div>
    </div>
  );

  if (error) {
    return <ErrorDisplay />;
  }

  if (loading) {
    return (
      <div data-section={title} style={styles.section}>
        {title && <h2 style={styles.title}>{title}</h2>}
        <LoadingSkeleton />
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div data-section={title} style={styles.section}>
        {title && <h2 style={styles.title}>{title}</h2>}
        <EmptyState />
      </div>
    );
  }

  return (
    <div data-section={title} style={styles.section}>
      <MovieScrollContainer 
        title={title}
        showNavigation={showNavigation}
        showScrollIndicator={movies.length > 4}
        fadeEdges={true}
      >
        {movies.map((movie, index) => (
          <MovieCardGlass
            key={movie.tmdbId || movie.id || `${movie.title}-${movie.year}-${index}`}
            title={movie.title}
            year={movie.year}
            tmdbId={movie.tmdbId}
            slug={movie.slug}
            poster_url={movie.poster_url}
            trailer_url={movie.trailer_url}
            onClick={handleMovieClick}
            showTrailerButton={showTrailers}
            size={cardSize}
          />
        ))}
      </MovieScrollContainer>
    </div>
  );
}

// Component styles
const styles = {
  section: {
    marginBottom: '40px',
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '20px',
    paddingLeft: '20px',
    color: '#000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '40px 20px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '12px',
    margin: '20px',
  },

  errorIcon: {
    fontSize: '48px',
  },

  errorText: {
    flex: 1,
  },

  retryButton: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },

  empty: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '40px 20px',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderRadius: '12px',
    margin: '20px',
  },

  emptyIcon: {
    fontSize: '48px',
  },

  emptyText: {
    flex: 1,
    color: '#6b7280',
  },
};

// Skeleton loading styles
const skeletonStyles = {
  container: {
    display: 'flex',
    gap: '16px',
    paddingLeft: '20px',
    paddingRight: '20px',
    overflowX: 'hidden',
  },

  card: {
    width: '240px',
    borderRadius: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },

  poster: {
    width: '100%',
    height: '320px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '12px 12px 0 0',
  },

  content: {
    padding: '16px',
  },

  title: {
    height: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    marginBottom: '8px',
  },

  year: {
    height: '16px',
    width: '60px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    marginBottom: '8px',
  },

  slug: {
    height: '14px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    marginBottom: '4px',
  },
};

// Add pulse animation for skeleton loading
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `;
  document.head.appendChild(style);
}