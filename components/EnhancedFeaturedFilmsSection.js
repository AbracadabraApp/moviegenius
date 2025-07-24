// components/EnhancedFeaturedFilmsSection.js - Enhanced Featured Films with combined movie pool
import React, { memo } from 'react';
import MediaCard from './MediaCard';

/**
 * Enhanced Featured Films Section
 * 
 * Combines movies from both MOVIES: lines and **bold** references:
 * 1. Combines both pools
 * 2. Removes duplicates (by tmdb_id)
 * 3. Never features self-referential title
 * 4. Random 2-4 bucket size (doesn't interrupt text flow)
 */
function EnhancedFeaturedFilmsSection({ 
  movieData, 
  currentMovieTmdbId = null,
  title = 'Featured Films', 
  style = {} 
}) {
  // Handle both old format (movies array) and new format (movieData object)
  let allMovies = [];
  
  if (movieData && movieData.allMovies) {
    // New format from integrated movie linking
    allMovies = movieData.allMovies;
  } else if (Array.isArray(movieData)) {
    // Fallback: old format - direct movies array
    allMovies = movieData.map(movie => ({
      ...movie,
      source: 'LEGACY'
    }));
  } else {
    // No valid movie data
    console.log('EnhancedFeaturedFilmsSection: No valid movie data provided');
    return null;
  }

  // Step 1: Combine both pools (already combined in allMovies)
  console.log('EnhancedFeaturedFilmsSection: Processing', allMovies.length, 'total movies');

  // Step 2: Remove duplicates by tmdb_id
  const uniqueMovies = allMovies.filter((movie, index, arr) => 
    movie.tmdb_id && arr.findIndex(m => m.tmdb_id === movie.tmdb_id) === index
  );

  console.log('EnhancedFeaturedFilmsSection: After deduplication:', uniqueMovies.length, 'unique movies');

  // Step 3: Never feature self-referential title
  const nonSelfMovies = uniqueMovies.filter(movie => 
    !currentMovieTmdbId || movie.tmdb_id !== currentMovieTmdbId
  );

  console.log('EnhancedFeaturedFilmsSection: After self-reference removal:', nonSelfMovies.length, 'movies');

  // Step 4: Random 2-4 bucket size (doesn't interrupt text flow)
  const bucketSize = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
  const featuredMovies = nonSelfMovies.slice(0, bucketSize);

  console.log('EnhancedFeaturedFilmsSection: Selected', featuredMovies.length, 'movies for display (bucket size:', bucketSize + ')');

  // Filter out movies missing required fields (same as original)
  const validMovies = featuredMovies.filter(movie =>
    movie.title &&
    movie.year &&
    movie.tmdb_id &&
    movie.tmdb_id !== null &&
    movie.tmdb_id !== 'MISSING'
  );

  if (validMovies.length === 0) {
    console.log('EnhancedFeaturedFilmsSection: No valid movies to display after filtering');
    return null;
  }

  console.log('EnhancedFeaturedFilmsSection: Final display:', validMovies.length, 'valid movies');

  return (
    <div style={{ ...styles.movieSection, ...style }}>
      <div style={styles.movieSectionHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>{title}</span>
        <div style={styles.sectionDivider} />
      </div>
      <div style={styles.movieGrid}>
        {validMovies.map((movie, movieIndex) => {
          // Handle slug from both sources (MOVIES: lines have slug, **bold** references might not)
          const movieSlug = movie.slug || movie.database_title || movie.title;
          const isValidClaudeSlug = !!movieSlug;

          // Debug MediaCard props
          console.log(`EnhancedFeaturedFilmsSection MediaCard props for ${movie.title}:`, {
            title: movie.title,
            year: movie.year,
            source: movie.source,
            tmdbId: movie.tmdb_id,
            slug: movieSlug,
            streaming: movie.streaming || movie.initialStreaming
          });

          return (
            <div
              key={`enhanced-${movie.tmdb_id}-${movieIndex}`}
              style={styles.movieCardWrapper}
            >
              <MediaCard
                title={movie.title}
                year={movie.year}
                initialSlug={isValidClaudeSlug ? movieSlug : null}
                initialPoster={movie.poster_url || movie.poster}
                initialStreaming={movie.streaming || movie.initialStreaming}
                tmdbId={movie.tmdb_id}
              />
            </div>
          );
        })}
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={styles.debugInfo}>
          <small style={styles.debugText}>
            Enhanced Featured Films: {validMovies.length}/{allMovies.length} movies 
            ({allMovies.filter(m => m.source === 'MOVIES_LINE').length} from MOVIES:, {allMovies.filter(m => m.source === 'BOLD_PATTERN').length} from **bold**)
          </small>
        </div>
      )}
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
  debugInfo: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  debugText: {
    color: '#666',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
};

/**
 * Custom prop comparison for EnhancedFeaturedFilmsSection memoization
 */
const arePropsEqual = (prevProps, nextProps) => {
  // Quick checks for primitive props
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.currentMovieTmdbId !== nextProps.currentMovieTmdbId) return false;

  // Check movieData structure
  const prevMovies = prevProps.movieData?.allMovies || prevProps.movieData || [];
  const nextMovies = nextProps.movieData?.allMovies || nextProps.movieData || [];
  
  if (prevMovies.length !== nextMovies.length) return false;

  // Deep comparison of movies array (only essential props)
  return prevMovies.every((movie, index) => {
    const nextMovie = nextMovies[index];
    return (
      movie.title === nextMovie?.title &&
      movie.year === nextMovie?.year &&
      movie.tmdb_id === nextMovie?.tmdb_id &&
      movie.source === nextMovie?.source
    );
  });
};

// Export memoized component with custom comparison
export default memo(EnhancedFeaturedFilmsSection, arePropsEqual);