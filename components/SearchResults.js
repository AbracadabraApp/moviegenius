// components/SearchResults.js - Display search results in a movie grid
import { useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import { Grid, List } from 'lucide-react';

export default function SearchResults({ 
  movies = [], 
  loading = false, 
  query = '', 
  onMovieClick,
  style = {},
  showViewToggle = true 
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Show loading state
  if (loading) {
    return (
      <div style={{ ...styles.container, ...style }}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Searching movies...</div>
        </div>
      </div>
    );
  }

  // Show empty state for no results
  if (!loading && query && movies.length === 0) {
    return (
      <div style={{ ...styles.container, ...style }}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎬</div>
          <div style={styles.emptyTitle}>No movies found</div>
          <div style={styles.emptyMessage}>
            Try searching for a different title, actor, or director
          </div>
        </div>
      </div>
    );
  }

  // Show initial state when no search has been performed
  if (!query && movies.length === 0) {
    return (
      <div style={{ ...styles.container, ...style }}>
        <div style={styles.initialState}>
          <div style={styles.initialIcon}>🔍</div>
          <div style={styles.initialMessage}>
            Start typing to search for movies
          </div>
        </div>
      </div>
    );
  }

  // Handle movie card click
  const handleMovieClick = (movie) => {
    if (onMovieClick) {
      onMovieClick(movie);
    }
  };

  return (
    <div style={{ ...styles.container, ...style }}>
      {/* Results header */}
      {movies.length > 0 && (
        <div style={styles.resultsHeader}>
          <div style={styles.resultsInfo}>
            <span style={styles.resultsCount}>
              {movies.length} movie{movies.length !== 1 ? 's' : ''}
            </span>
            {query && (
              <span style={styles.resultsQuery}>
                for "{query}"
              </span>
            )}
          </div>
          
          {showViewToggle && (
            <div style={styles.viewToggle}>
              <button
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'grid' ? styles.viewButtonActive : {})
                }}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid size={16} />
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'list' ? styles.viewButtonActive : {})
                }}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results grid/list */}
      <div style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
        {movies.map((movie, index) => (
          <div
            key={`${movie.tmdb_id || movie.title}-${movie.year}-${index}`}
            style={viewMode === 'grid' ? styles.gridItem : styles.listItem}
            onClick={() => handleMovieClick(movie)}
          >
            <MediaCard
              title={movie.title}
              year={movie.year}
              initialSlug={movie.slug}
              initialPoster={movie.poster_url}
              initialStreaming={movie.streaming_data}
              tmdbId={movie.tmdb_id}
              isDetailPage={false}
            />
          </div>
        ))}
      </div>

      {/* Load more hint */}
      {movies.length >= 20 && (
        <div style={styles.loadMoreHint}>
          <div style={styles.loadMoreText}>
            Showing first {movies.length} results. Try a more specific search for better results.
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  
  // Loading state
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #6b7280',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  emptyMessage: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },

  // Initial state
  initialState: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  initialIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.6,
  },
  initialMessage: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Results header
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  resultsInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultsCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  resultsQuery: {
    fontSize: '14px',
    color: '#6b7280',
  },
  
  // View toggle
  viewToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f3f4f6',
    padding: '4px',
    borderRadius: '8px',
  },
  viewButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  viewButtonActive: {
    backgroundColor: '#ffffff',
    color: '#374151',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },

  // Grid layout
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  gridItem: {
    cursor: 'pointer',
  },

  // List layout (same as grid for mobile-first design)
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  listItem: {
    cursor: 'pointer',
  },

  // Load more hint
  loadMoreHint: {
    textAlign: 'center',
    padding: '24px 16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '16px',
  },
  loadMoreText: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
};

// Add CSS animation for spinner (if not already added)
if (typeof document !== 'undefined' && !document.querySelector('#search-results-styles')) {
  const style = document.createElement('style');
  style.id = 'search-results-styles';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}