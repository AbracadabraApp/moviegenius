/**
 * CollectionPage Component
 *
 * Displays a movie collection with subcategories and a 3-column poster grid.
 * Section headers are designed as aisle markers — dominant landmarks, not labels.
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { FavoritesManager } from './FavoritesManager';

export default function CollectionPage({ collection, movies }) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState({});

  // Load bookmarked state from localStorage on mount
  useEffect(() => {
    const refresh = () => {
      if (!collection?.subcategories) return;
      const state = {};
      collection.subcategories.forEach(sub => {
        state[sub.name] = FavoritesManager.isSubcategoryBookmarked(collection.id, sub.name);
      });
      setBookmarked(state);
    };
    refresh();
    window.addEventListener('subcategoriesUpdated', refresh);
    return () => window.removeEventListener('subcategoriesUpdated', refresh);
  }, [collection]);

  const handleBookmark = (e, subcategory, subcategoryMovies) => {
    e.stopPropagation();
    FavoritesManager.toggleSubcategoryBookmark(
      collection.id,
      collection.title,
      subcategory.name,
      subcategoryMovies,
    );
    setBookmarked(prev => ({ ...prev, [subcategory.name]: !prev[subcategory.name] }));
  };

  if (!collection || !movies) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Collection Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>{collection.title}</h1>
        {collection.subtitle && (
          <p style={styles.subtitle}>{collection.subtitle}</p>
        )}
      </div>

      {/* Subcategory Sections */}
      {collection.subcategories && collection.subcategories.map((subcategory, index) => {
        const subcategoryMovies = movies.filter(m =>
          subcategory.movie_ids?.includes(m.tmdb_id) ||
          subcategory.movies?.some(sm => sm.tmdb_id === m.tmdb_id)
        ).filter(m => m.poster_url);

        if (subcategoryMovies.length === 0) return null;

        return (
          <div key={index} style={{...styles.section, ...(index === 0 ? styles.sectionFirst : {})}}>
            {/* Aisle marker */}
            <div style={styles.aisleMarker}>
              <div style={styles.aisleAccent} />
              <div style={styles.aisleText}>
                <span style={styles.aisleLabel}>{subcategory.name}</span>
              </div>
              <button
                style={{
                  ...styles.bookmarkBtn,
                  background: bookmarked[subcategory.name] ? '#374151' : 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                }}
                onClick={e => handleBookmark(e, subcategory, subcategoryMovies)}
                aria-label={bookmarked[subcategory.name] ? 'Remove bookmark' : 'Bookmark subcategory'}
              >
                {bookmarked[subcategory.name]
                  ? <BookmarkCheck size={18} color="#ffffff" />
                  : <Bookmark size={18} color="#9ca3af" />
                }
                <span style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: bookmarked[subcategory.name] ? '#ffffff' : '#9ca3af',
                  marginLeft: '4px',
                }}>Save</span>
              </button>
            </div>

            {subcategory.description && (
              <p style={styles.sectionDesc}>{subcategory.description}</p>
            )}

            <div style={styles.movieGrid}>
              {subcategoryMovies.map((movie, movieIndex) => (
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
                  {movie.year && <div style={styles.movieYear}>{movie.year}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <footer style={styles.footer}>
        {movies.length} films&ensp;·&ensp;{collection.title}
      </footer>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background: '#ffffff',
    color: '#111827',
    paddingBottom: '48px',
  },

  // Collection-level header
  header: {
    padding: '20px 16px 20px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '4px',
  },

  title: {
    fontWeight: '700',
    fontSize: '26px',
    lineHeight: '1.2',
    color: '#111827',
    margin: '0 0 6px 0',
  },

  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: '0 0 10px 0',
  },


  // Section = one subcategory
  section: {
    paddingTop: '32px',
    paddingBottom: '8px',
  },

  sectionFirst: {
    paddingTop: '16px',
  },

  // Aisle marker: gold left border + label stacked above count
  aisleMarker: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '16px',
    paddingRight: '16px',
    marginBottom: '6px',
  },

  aisleAccent: {
    width: '3px',
    minHeight: '22px',
    borderRadius: '2px',
    background: '#d4af37',
    flexShrink: 0,
    alignSelf: 'stretch',
  },

  aisleText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },

  bookmarkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },

  aisleLabel: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#111827',
    lineHeight: '1.2',
    letterSpacing: '-0.01em',
  },


  sectionDesc: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: '0 0 14px 0',
    padding: '0 16px',
  },

  // Rule under the aisle marker
  rule: {
    height: '1px',
    background: '#f0f0f0',
    margin: '12px 16px 16px',
  },

  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '14px 16px 0',
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
    boxShadow: 'var(--shadow-sm)',
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
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    hyphens: 'none',
  },

  movieYear: {
    fontSize: '11px',
    color: '#9ca3af',
  },

  footer: {
    padding: '24px 16px 0',
    borderTop: '1px solid #f0f0f0',
    fontSize: '11px',
    color: '#9ca3af',
    letterSpacing: '0.03em',
    marginTop: '32px',
  },
};
