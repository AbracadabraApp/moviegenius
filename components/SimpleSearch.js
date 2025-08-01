// components/SimpleSearch.js - Ultra-simple search component
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';

export default function SimpleSearch({
  onResults,
  placeholder = 'Search movies and people...',
  useUnifiedSearch = true,
  initialQuery = '',
}) {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [fallback, setFallback] = useState(null);
  const router = useRouter();
  const currentSearchRef = useRef(null);

  // Update query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery || '');
  }, [initialQuery]);

  const search = async searchQuery => {
    const q = searchQuery.trim();
    if (!q) {
      if (onResults) onResults({ movies: [], people: [] });
      setFallback(null);
      setIsLoading(false);
      return;
    }

    // New UX: Redirect to unified search results page
    if (useUnifiedSearch) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      return;
    }

    // Legacy inline search (kept for compatibility)
    // Create unique search ID to prevent race conditions
    const searchId = Date.now();
    currentSearchRef.current = searchId;

    // Prevent multiple concurrent searches
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setFallback(null);


    try {
      const response = await fetch('/api/multi-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      // Check if this search was cancelled by a newer search
      if (currentSearchRef.current !== searchId) {
        return;
      }

      if (response.ok) {
        const data = await response.json();

        // V1 Feature: Auto-navigate to single movie result
        if (data.movies && data.movies.length === 1) {
          const movie = data.movies[0];
          if (movie.tmdb_id) {
            router.push(`/movie/${movie.tmdb_id}`);
            return;
          }
        }

        if (onResults) onResults(data || { movies: [], people: [] });

        // Handle fallback for empty results
        if (data.fallback) {
          setFallback(data.fallback);
        }
      } else {
        // Search failed - continue gracefully
        if (onResults) onResults({ movies: [], people: [] });
        setFallback({ message: 'Search failed. Please try again.' });
      }
    } catch (error) {
      // Search error - continue gracefully
      if (onResults) onResults({ movies: [], people: [] });
      setFallback({ message: 'Search failed. Please try again.' });
    } finally {
      // Only set loading to false if this is still the current search
      if (currentSearchRef.current === searchId) {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    search(query);
  };

  const handleClear = () => {
    setQuery('');
    onResults({ movies: [], people: [] });
    setFallback(null);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isLoading ? 'Searching...' : placeholder}
            style={styles.input}
            className="search-input-placeholder"
            autoComplete="off"
            disabled={isLoading}
          />
          {query && (
            <button type="button" onClick={handleClear} style={styles.clearButton}>
              ×
            </button>
          )}
        </div>
      </form>

      {/* No results message */}
      {fallback && (
        <div style={styles.fallbackBox}>
          <span style={styles.fallbackText}>{fallback.message}</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  form: {
    width: '100%',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 16px',
    gap: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  },
  searchIcon: {
    color: '#6b7280',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#000000',
    backgroundColor: 'transparent',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '16px',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // V1 Feature: Fallback styles
  fallbackBox: {
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: '14px',
    color: '#64748b',
    fontFamily: 'inherit',
  },
  fallbackLink: {
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '500',
    fontFamily: 'inherit',
    transition: 'color 0.2s ease',
  },
};
