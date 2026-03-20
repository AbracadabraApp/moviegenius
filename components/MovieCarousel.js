/**
 * MovieCarousel Component - Horizontal scrolling movie poster carousel
 *
 * Mobile-first design with touch scrolling support
 */

import { useRouter } from 'next/router';
import { useTapDetection } from '../hooks/useTapDetection';

export default function MovieCarousel({
  title,
  movies = [],
  collectionId = null,
  showViewAll = true,
  totalMovies = null
}) {
  const router = useRouter();

  if (!movies || movies.length === 0) {
    return null;
  }

  const handleMovieClick = (tmdbId) => {
    router.push(`/movie/${tmdbId}`);
  };

  const handleViewAll = () => {
    if (collectionId) {
      router.push(`/browse/${collectionId}`);
    }
  };

  return (
    <section style={styles.section}>
      {/* Section Header */}
      <div style={styles.headerContainer}>
        <h2 style={styles.title}>{title}</h2>
      </div>

      {/* Horizontal Scrolling Carousel */}
      <div style={styles.carouselWrapper}>
        <div style={styles.carousel}>
          {movies.map((movie, index) => {
            // Use tap detection hook for each movie card
            const tapHandlers = useTapDetection(() => handleMovieClick(movie.tmdb_id));

            return (
              <div
                key={`${movie.tmdb_id}-${index}`}
                style={styles.movieCard}
                onTouchStart={tapHandlers.handleTouchStart}
                onTouchMove={tapHandlers.handleTouchMove}
                onTouchEnd={tapHandlers.handleTouchEnd}
                onClick={() => handleMovieClick(movie.tmdb_id)}
              >
                <img
                  src={movie.poster_url || '/images/placeholder-poster.jpg'}
                  alt={movie.title}
                  style={styles.poster}
                />
              </div>
            );
          })}
        </div>

        {/* View More Button - positioned outside carousel */}
        {showViewAll && collectionId && totalMovies && (
          <div style={styles.viewMoreContainer}>
            <button onClick={handleViewAll} style={styles.viewAllButton}>
              view {totalMovies} more
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const styles = {
  section: {
    marginBottom: '32px',
  },

  headerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0 16px 12px 16px',
  },

  title: {
    fontSize: '19px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  viewMoreContainer: {
    position: 'absolute',
    right: '16px',
    bottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'none',
    zIndex: 10,
  },

  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#d97706',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    pointerEvents: 'auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  carouselWrapper: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },

  carousel: {
    display: 'flex',
    overflowX: 'auto',
    gap: '12px',
    padding: '0 16px',
    scrollSnapType: 'x mandatory',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    // Hide scrollbar in webkit browsers
    '::-webkit-scrollbar': {
      display: 'none',
    },
  },

  movieCard: {
    flex: '0 0 auto',
    width: '110px',
    cursor: 'pointer',
    scrollSnapAlign: 'start',
  },

  poster: {
    width: '110px',
    height: '165px',
    objectFit: 'cover',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
};

// Add webkit scrollbar hiding via style injection
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .movie-carousel::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);
}
