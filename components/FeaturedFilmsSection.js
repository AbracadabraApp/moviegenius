// components/FeaturedFilmsSection.js - Reusable Featured Films section with gold dividers
import React, { memo } from 'react';
import MediaCard from './MediaCard';

function FeaturedFilmsSection({ movies, title = 'Featured Films', style = {} }) {

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
        {movies
          .filter(
            movie =>
              movie.title &&
              movie.year &&
              movie.tmdb_id &&
              movie.tmdb_id !== null &&
              movie.tmdb_id !== 'MISSING'
          ) // Show movies with required fields including valid tmdb_id
          .map((movie, movieIndex) => {
            // 🔒 TMDB Protection: Filter contaminated slugs before passing to MediaCard
            const isValidClaudeSlug =
              movie.slug &&
              !movie.slug.includes('Plot:') &&
              !movie.slug.includes('Overview:') &&
              !movie.slug.includes('Synopsis:') &&
              !movie.slug.includes('Summary:') &&
              !movie.slug.includes(' leads this ') &&
              !movie.slug.includes(' adapts ') &&
              !movie.slug.includes(' starring ') &&
              !movie.slug.includes('directed by') &&
              !movie.slug.includes(' plays ') && // Reject "Humphrey Bogart plays"
              !movie.slug.includes(' in ') && // Reject "in Howard Hawks' noir"  
              !movie.slug.includes(' investigating ') && // Reject plot summaries
              !movie.slug.includes(' and ') && // Reject compound plot descriptions
              movie.slug.length <= 80; // Reject overly long descriptions


            return (
              <div
                key={`${movie.title}-${movie.year}-${movieIndex}`}
                style={styles.movieCardWrapper}
              >
                <MediaCard
                  title={movie.title}
                  year={movie.year}
                  initialSlug={isValidClaudeSlug ? movie.slug : null}
                  initialPoster={movie.poster || movie.poster_url}
                  initialStreaming={movie.initialStreaming || movie.streaming}
                  tmdbId={movie.tmdb_id || movie.tmdbId}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

const styles = {
  movieSection: {
    padding: '0px',
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
    background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
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
    return (
      movie.title === nextMovie?.title &&
      movie.year === nextMovie?.year &&
      movie.tmdb_id === nextMovie?.tmdb_id &&
      movie.slug === nextMovie?.slug
    );
  });
};

// Export memoized component with custom comparison
export default memo(FeaturedFilmsSection, arePropsEqual);
