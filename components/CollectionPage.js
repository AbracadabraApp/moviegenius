/**
 * CollectionPage Component
 *
 * Displays a movie collection with subcategories and a 3-column poster grid.
 * Plain white background throughout.
 */

import { useRouter } from 'next/router';

export default function CollectionPage({ collection, movies, onBack }) {
  const router = useRouter();

  if (!collection || !movies) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          {onBack && (
            <button onClick={onBack} style={styles.backButton} aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
          )}
          <h1 style={styles.title}>{collection.title}</h1>
        </div>

        {collection.subtitle && (
          <p style={styles.subtitle}>{collection.subtitle}</p>
        )}

        <p style={styles.tally}>
          {movies.length} {movies.length === 1 ? 'film' : 'films'}
          {collection.subcategories && ` · ${collection.subcategories.length} ${collection.subcategories.length === 1 ? 'category' : 'categories'}`}
        </p>
      </div>

      {/* Subcategory Sections */}
      {collection.subcategories && collection.subcategories.map((subcategory, index) => {
        const subcategoryMovies = movies.filter(m =>
          subcategory.movie_ids?.includes(m.tmdb_id) ||
          subcategory.movies?.some(sm => sm.tmdb_id === m.tmdb_id)
        );

        if (subcategoryMovies.length === 0) return null;

        return (
          <div key={index} style={styles.section}>
            <div style={styles.secHead}>
              <span style={styles.secLabel}>{subcategory.name}</span>
              <div style={styles.secRule}></div>
              <span style={styles.secNum}>
                {subcategoryMovies.length} {subcategoryMovies.length === 1 ? 'film' : 'films'}
              </span>
            </div>

            <div style={styles.movieGrid}>
              {subcategoryMovies.filter(movie => movie.poster_url).map((movie, movieIndex) => (
                <div
                  key={movieIndex}
                  style={styles.posterWrapper}
                  onClick={() => router.push(`/movie/${movie.tmdb_id}`)}
                >
                  <div style={styles.posterContainer}>
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      style={styles.poster}
                    />
                  </div>
                  <div style={styles.movieTitle}>{movie.title}</div>
                  <div style={styles.movieYear}>{movie.year}</div>
                </div>
              ))}
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
    color: '#111827',
    paddingBottom: '40px',
  },

  header: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '8px',
  },

  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },

  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0,
    marginLeft: '-4px',
  },

  title: {
    fontWeight: '700',
    fontSize: '24px',
    lineHeight: '1.2',
    color: '#111827',
    margin: 0,
  },

  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
  },

  tally: {
    fontSize: '13px',
    color: '#d97706',
    fontWeight: '500',
    margin: 0,
  },

  section: {
    padding: '20px 16px 0',
  },

  secHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },

  secLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    whiteSpace: 'nowrap',
  },

  secRule: {
    flex: 1,
    height: '1px',
    background: '#e5e7eb',
  },

  secNum: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '500',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },

  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '8px',
  },

  posterWrapper: {
    cursor: 'pointer',
  },

  posterContainer: {
    position: 'relative',
    aspectRatio: '2/3',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: '6px',
  },

  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  movieTitle: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#111827',
    lineHeight: '1.3',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },

  movieYear: {
    fontSize: '11px',
    color: '#6b7280',
  },

  footer: {
    padding: '20px 16px 0',
    borderTop: '1px solid #f0f0f0',
    fontSize: '11px',
    color: '#9ca3af',
    letterSpacing: '0.03em',
    marginTop: '24px',
  },
};
