// components/FeaturedFilmsSection.js - Reusable Featured Films section with gold dividers
import React, { memo } from 'react';
import MediaCard from './MediaCard';

function FeaturedFilmsSection({ 
  movies, 
  title = "Featured Films",
  style = {} 
}) {
  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div style={{ ...styles.movieSection, ...style }}>
      <div style={styles.movieSectionHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>{title}</span>
        <div style={styles.sectionDivider} />
      </div>
      <div style={styles.movieGrid}>
        {movies.map((movie, movieIndex) => (
          <div key={`${movie.title}-${movie.year}-${movieIndex}`} style={styles.movieCardWrapper}>
            <MediaCard
              title={movie.title}
              year={movie.year}
              initialSlug={movie.slug}
              initialPoster={movie.poster || movie.poster_url}
              initialStreaming={movie.initialStreaming || movie.streaming}
              tmdbId={movie.tmdb_id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  movieSection: {
    padding: '20px',
    backgroundColor: '#ffffff',
    marginBottom: '20px',
  },
  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d4af37',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  movieCardWrapper: {
    marginBottom: 0,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
};

/**
 * Custom prop comparison for FeaturedFilmsSection memoization
 * Only re-render if title, movies array length, or movie content changes
 */
const arePropsEqual = (prevProps, nextProps) => {
  // Quick checks for primitive props
  if (prevProps.title !== nextProps.title) return false;
  
  // Check movies array length
  const prevMovies = prevProps.movies || [];
  const nextMovies = nextProps.movies || [];
  if (prevMovies.length !== nextMovies.length) return false;
  
  // Deep comparison of movies array (only essential props)
  return prevMovies.every((movie, index) => {
    const nextMovie = nextMovies[index];
    return movie.title === nextMovie?.title && 
           movie.year === nextMovie?.year &&
           movie.tmdb_id === nextMovie?.tmdb_id &&
           movie.slug === nextMovie?.slug;
  });
};

// Export memoized component with custom comparison
export default memo(FeaturedFilmsSection, arePropsEqual);