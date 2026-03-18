/**
 * Search Results Page - V1 List Format
 *
 * Shows search results in same format as dropdown sheet
 * For V2: Add grid view, filters, and advanced features
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch search results when query changes
  useEffect(() => {
    if (!q || q.trim().length < 3) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/simple-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q.trim() }),
        });

        if (response.ok) {
          const data = await response.json();
          setResults(data.movies || []);
        } else {
          setError('Search failed. Please try again.');
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q]);

  // Handle movie click
  const handleMovieClick = (tmdbId) => {
    router.push(`/movie/${tmdbId}`);
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search header - sticky */}
        <div style={styles.header}>
          <SimpleSearch placeholder="Search movies..." initialQuery={q} />
        </div>

        {/* Results content */}
        <div style={styles.content}>
          {/* Loading state */}
          {loading && (
            <div style={styles.messageContainer}>
              <div style={styles.loadingText}>Searching...</div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div style={styles.messageContainer}>
              <div style={styles.errorText}>{error}</div>
            </div>
          )}

          {/* No query state */}
          {!q && !loading && (
            <div style={styles.messageContainer}>
              <div style={styles.messageIcon}>🔍</div>
              <div style={styles.messageText}>
                Type 3+ characters to search for movies
              </div>
            </div>
          )}

          {/* No results state */}
          {q && !loading && !error && results.length === 0 && (
            <div style={styles.messageContainer}>
              <div style={styles.messageIcon}>🎬</div>
              <div style={styles.noResultsTitle}>No movies found</div>
              <div style={styles.messageText}>
                Try a different search term
              </div>
            </div>
          )}

          {/* Results list - same format as dropdown */}
          {!loading && results.length > 0 && (
            <div style={styles.resultsList}>
              {/* Results count */}
              <div style={styles.resultsCount}>
                {results.length} {results.length === 1 ? 'result' : 'results'} for "{q}"
              </div>

              {/* Movie items */}
              {results.map((movie, index) => (
                <div
                  key={`${movie.tmdb_id}-${index}`}
                  style={styles.movieItem}
                  onClick={() => handleMovieClick(movie.tmdb_id)}
                >
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    style={styles.poster}
                  />
                  <div style={styles.movieInfo}>
                    <div style={styles.movieTitle}>{movie.title}</div>
                    {movie.year && (
                      <div style={styles.movieYear}>{movie.year}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#ffffff',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  // Messages
  messageContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  messageIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  messageText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  loadingText: {
    fontSize: '18px',
    color: '#6b7280',
  },
  errorText: {
    fontSize: '16px',
    color: '#ef4444',
  },
  noResultsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },

  // Results list
  resultsList: {
    backgroundColor: '#ffffff',
  },
  resultsCount: {
    padding: '16px 16px 12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Movie item - same as dropdown
  movieItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    gap: '12px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s ease',
  },
  poster: {
    width: '40px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '4px',
    flexShrink: 0,
  },
  movieInfo: {
    flex: 1,
    minWidth: 0,
  },
  movieTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#000000',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  movieYear: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '2px',
  },
};
