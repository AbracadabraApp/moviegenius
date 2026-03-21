/**
 * MovieCarousel Component - Horizontal scrolling movie poster carousel
 *
 * Mobile-first design with touch scrolling support
 * Preserves scroll position when navigating back from movie pages
 */

import { useRouter } from 'next/router';
import { useRef, useEffect } from 'react';

export default function MovieCarousel({
  title,
  movies = [],
  collectionId = null,
  showViewAll = true,
  totalMovies = null,
  categoryLabel = null
}) {
  const router = useRouter();
  const carouselRef = useRef(null);
  const scrollPositionKey = `carousel-scroll-${collectionId || title}`;

  if (!movies || movies.length === 0) {
    return null;
  }

  // Restore scroll position when component mounts
  useEffect(() => {
    if (carouselRef.current) {
      const savedPosition = sessionStorage.getItem(scrollPositionKey);
      if (savedPosition) {
        carouselRef.current.scrollLeft = parseInt(savedPosition, 10);
      }
    }
  }, [scrollPositionKey]);

  // Save scroll position when scrolling
  const handleScroll = () => {
    if (carouselRef.current) {
      sessionStorage.setItem(scrollPositionKey, carouselRef.current.scrollLeft.toString());
    }
  };

  const handleMovieClick = (tmdbId) => {
    // Save current scroll position before navigating
    if (carouselRef.current) {
      sessionStorage.setItem(scrollPositionKey, carouselRef.current.scrollLeft.toString());
    }
    router.push(`/movie/${tmdbId}`);
  };

  const handleViewAll = () => {
    if (collectionId) {
      router.push(`/browse/${collectionId}`);
    }
  };

  return (
    <section style={styles.section}>
      {/* Category Label */}
      {categoryLabel && (
        <div style={styles.categoryContainer}>
          <span style={styles.categoryLabel}>
            {categoryLabel}
          </span>
        </div>
      )}

      {/* Section Header */}
      <div style={styles.headerContainer}>
        <h2 style={styles.title}>{title}</h2>
      </div>

      {/* Horizontal Scrolling Carousel */}
      <div style={styles.carouselWrapper}>
        <div
          ref={carouselRef}
          style={styles.carousel}
          onScroll={handleScroll}
        >
          {movies.map((movie, index) => (
            <div
              key={`${movie.tmdb_id}-${index}`}
              style={styles.movieCard}
              onClick={() => handleMovieClick(movie.tmdb_id)}
            >
              <img
                src={movie.poster_url || '/images/placeholder-poster.jpg'}
                alt={movie.title}
                style={styles.poster}
              />
            </div>
          ))}
        </div>
      </div>

      {/* View More Button - positioned below carousel */}
      {showViewAll && collectionId && totalMovies && (
        <div style={styles.viewMoreContainer}>
          <button onClick={handleViewAll} style={styles.viewAllButton}>
            {totalMovies} movies
          </button>
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    marginBottom: '32px',
  },

  categoryContainer: {
    padding: '0 16px 4px 16px',
  },

  categoryLabel: {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '4px',
    backgroundColor: '#eab308',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '8px 16px 0 16px',
  },

  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#d97706',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  carouselWrapper: {
    width: '100%',
    overflow: 'hidden',
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
