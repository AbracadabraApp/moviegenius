/**
 * EditorialCollection Component
 *
 * Sophisticated, editorial-style collection display with subcategories,
 * annotations, and tags. Inspired by film reference guides.
 */

import { useRouter } from 'next/router';
import MediaCard from './MediaCard';

export default function EditorialCollection({ collection, movies, onBack }) {
  const router = useRouter();

  const handleMovieClick = (tmdbId) => {
    router.push(`/movie/${tmdbId}`);
  };

  if (!collection || !movies) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Gold gradient background wrapper for header and first section */}
      <div style={styles.heroSection}>
        {/* Subtle shimmer overlay */}
        <div style={styles.shimmerOverlay}></div>
        {/* Editorial Header */}
        <div style={styles.header}>
          {/* Title row with back button */}
          <div style={styles.titleRow}>
            {/* Back button next to title */}
            {onBack && (
              <button onClick={onBack} style={styles.backButton}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2d2a26" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
              </button>
            )}
            <h1 style={styles.title}>
              {collection.title}
            </h1>
          </div>

          {collection.subtitle && (
            <p style={styles.subtitle}>{collection.subtitle}</p>
          )}
          <p style={styles.tally}>
            {movies.length} {movies.length === 1 ? 'film' : 'films'}
            {collection.subcategories && ` · ${collection.subcategories.length} ${collection.subcategories.length === 1 ? 'category' : 'categories'}`}
          </p>
        </div>

        {/* First Subcategory (inside gold section) */}
        {collection.subcategories && collection.subcategories.length > 0 && (() => {
          const subcategory = collection.subcategories[0];
          const subcategoryMovies = movies.filter(m =>
            subcategory.movie_ids?.includes(m.tmdb_id) ||
            subcategory.movies?.some(sm => sm.tmdb_id === m.tmdb_id)
          );

          if (subcategoryMovies.length === 0) return null;

          return (
            <div style={styles.sectionFirst}>
              {/* Section Header */}
              <div style={styles.secHead}>
                <span style={styles.secLabel}>{subcategory.name}</span>
                <div style={styles.secRule}></div>
                <span style={styles.secNum}>
                  {subcategoryMovies.length} {subcategoryMovies.length === 1 ? 'film' : 'films'}
                </span>
              </div>

              {/* Movie List */}
              <div style={styles.movieList}>
                {subcategoryMovies.map((movie, movieIndex) => {
                  const editorialData = subcategory.movies?.find(m => m.tmdb_id === movie.tmdb_id);

                  return (
                    <MediaCard
                      key={movieIndex}
                      title={movie.title}
                      year={movie.year}
                      initialSlug={editorialData?.note || ''}
                      initialPoster={movie.poster_url}
                      tmdbId={movie.tmdb_id}
                    />
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Remaining Subcategory Sections */}
      {collection.subcategories && collection.subcategories.slice(1).map((subcategory, index) => {
        const subcategoryMovies = movies.filter(m =>
          subcategory.movie_ids?.includes(m.tmdb_id) ||
          subcategory.movies?.some(sm => sm.tmdb_id === m.tmdb_id)
        );

        if (subcategoryMovies.length === 0) return null;

        return (
          <div key={index} style={styles.section}>
            {/* Section Header */}
            <div style={styles.secHead}>
              <span style={styles.secLabel}>{subcategory.name}</span>
              <div style={styles.secRule}></div>
              <span style={styles.secNum}>
                {subcategoryMovies.length} {subcategoryMovies.length === 1 ? 'film' : 'films'}
              </span>
            </div>

            {/* Movie List */}
            <div style={styles.movieList}>
              {subcategoryMovies.map((movie, movieIndex) => {
                // Find editorial metadata for this movie
                const editorialData = subcategory.movies?.find(m => m.tmdb_id === movie.tmdb_id);

                return (
                  <MediaCard
                    key={movieIndex}
                    title={movie.title}
                    year={movie.year}
                    initialSlug={editorialData?.note || ''}
                    initialPoster={movie.poster_url}
                    tmdbId={movie.tmdb_id}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <footer style={styles.footer}>
        {movies.length} films — a curated collection exploring {collection.title.toLowerCase()}
      </footer>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background: '#ffffff',
    color: '#3A3935',
    paddingBottom: '40px',
  },

  // Hero section (gold is now in parent container background)
  heroSection: {
    paddingBottom: '24px',
    marginBottom: '8px',
    position: 'relative',
    overflow: 'hidden',
  },

  // Header Styles
  header: {
    padding: '20px 20px 24px',
    borderBottom: '1px solid #d4af37',
    position: 'relative',
    zIndex: 1,
  },

  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'background 0.2s ease',
    flexShrink: 0,
    marginLeft: '-8px',
  },

  title: {
    fontWeight: '700',
    fontSize: '32px',
    lineHeight: '1',
    color: '#2d2a26',
    margin: 0,
    letterSpacing: '-0.01em',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    flex: 1,
  },

  subtitle: {
    fontSize: '13px',
    fontWeight: '400',
    color: '#7A7870',
    lineHeight: '1.6',
    marginBottom: '0',
  },

  tally: {
    marginTop: '14px',
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#8B6914',
    fontWeight: '600',
    textShadow: '0 1px 2px rgba(212, 175, 55, 0.2)',
  },

  // Section Styles
  section: {
    padding: '24px 20px 0',
  },

  // First section (inside gold gradient)
  sectionFirst: {
    padding: '24px 20px 0',
    position: 'relative',
    zIndex: 1,
  },

  // Shimmer overlay for Hollywood effect
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0,
  },

  secHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },

  secLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#3A3935',
    whiteSpace: 'nowrap',
  },

  secRule: {
    flex: 1,
    height: '0.5px',
    background: '#E8D49A',
  },

  secNum: {
    fontSize: '10px',
    color: '#B8922A',
    fontWeight: '600',
    letterSpacing: '0.06em',
  },

  // Movie List Styles (following MoreIdeasContainer pattern)
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
  },

  // Footer Styles
  footer: {
    padding: '20px 20px 0',
    borderTop: '0.5px solid #E8D49A',
    fontSize: '11px',
    color: '#C8C6BE',
    letterSpacing: '0.03em',
    marginTop: '16px',
  },
};
