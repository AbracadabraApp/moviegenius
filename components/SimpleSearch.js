// components/SimpleSearch.js - Ultra-simple search component
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';

export default function SimpleSearch({ onResults, placeholder = "Search movies..." }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fallback, setFallback] = useState(null);
  const router = useRouter();

  const search = async (searchQuery) => {
    const q = searchQuery.trim();
    if (!q) {
      onResults([]);
      setFallback(null);
      return;
    }

    setIsLoading(true);
    setFallback(null);
    
    try {
      const response = await fetch('/api/simple-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      if (response.ok) {
        const data = await response.json();
        
        // V1 Feature: Auto-navigate to single results
        if (data.movies.length === 1) {
          const movie = data.movies[0];
          if (movie.tmdb_id) {
            router.push(`/movie/${movie.tmdb_id}`);
            return;
          }
        }
        
        onResults(data.movies || []);
        
        // V1 Feature: Handle fallback for empty results
        if (data.fallback) {
          setFallback(data.fallback);
        }
      } else {
        onResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      onResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    search(query);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    onResults([]);
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={styles.input}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={styles.clearButton}
            >
              ×
            </button>
          )}
        </div>
      </form>
      
      {/* V1 Feature: Movie Genius fallback */}
      {fallback && (
        <div style={styles.fallbackBox}>
          <span style={styles.fallbackText}>{fallback.message}</span>
          <button 
            onClick={() => router.push(fallback.askUrl)} 
            style={{...styles.fallbackLink, background: 'none', border: 'none', cursor: 'pointer'}}
          >
            Ask Movie Genius →
          </button>
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
    padding: '8px 16px',
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
    fontSize: '14px',
    color: '#374151',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
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