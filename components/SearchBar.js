// components/SearchBar.js - Live movie search component
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  onSearch,
  onResults,
  placeholder = 'Search movies...',
  style = {},
  showSuggestions = true,
}) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    async searchQuery => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        setShowSuggestionsList(false);
        if (onResults) onResults([]);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/multi-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery.trim(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.movies || [];

          if (showSuggestions) {
            // Limit suggestions to 8 items for dropdown
            const suggestions = results.slice(0, 8);
            setSuggestions(suggestions);
            setShowSuggestionsList(suggestions.length > 0);
          }

          if (onResults) onResults(results);
          if (onSearch) onSearch(searchQuery, results);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowSuggestionsList(false);
      } finally {
        setIsLoading(false);
      }
    },
    [onSearch, onResults, showSuggestions]
  );

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    e => {
      const value = e.target.value;
      setQuery(value);

      // Clear existing timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      // Set new timeout for search
      searchTimeout.current = setTimeout(() => {
        debouncedSearch(value);
      }, 300); // 300ms debounce
    },
    [debouncedSearch]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    movie => {
      setQuery(`${movie.title} (${movie.year})`);
      setShowSuggestionsList(false);

      if (onSearch) onSearch(movie.title, [movie]);
      if (onResults) onResults([movie]);
    },
    [onSearch, onResults]
  );

  // Handle clear button
  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestionsList(false);
    if (onResults) onResults([]);
    if (inputRef.current) inputRef.current.focus();
  }, [onResults]);

  // Handle key navigation
  const handleKeyDown = useCallback(e => {
    if (e.key === 'Escape') {
      setShowSuggestionsList(false);
      if (inputRef.current) inputRef.current.blur();
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestionsList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  return (
    <div style={{ ...styles.container, ...style }} ref={inputRef}>
      <div style={styles.searchBox}>
        <Search size={20} style={styles.searchIcon} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestionsList(true);
            }
          }}
          placeholder={placeholder}
          style={styles.input}
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button onClick={handleClear} style={styles.clearButton} type="button">
            <X size={16} />
          </button>
        )}
        {isLoading && (
          <div style={styles.loadingSpinner}>
            <div style={styles.spinner} />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && showSuggestionsList && suggestions.length > 0 && (
        <div style={styles.suggestionsDropdown}>
          {suggestions.map((movie, index) => (
            <div
              key={`${movie.tmdb_id || movie.title}-${movie.year}-${index}`}
              style={styles.suggestionItem}
              onClick={() => handleSuggestionClick(movie)}
            >
              <div style={styles.suggestionContent}>
                {movie.poster_url && (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    style={styles.suggestionPoster}
                    onError={e => {
                      e.target.src = '/images/placeholder-poster.jpg';
                    }}
                  />
                )}
                <div style={styles.suggestionText}>
                  <div style={styles.suggestionTitle}>{movie.title}</div>
                  <div style={styles.suggestionYear}>{movie.year}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  searchIcon: {
    color: '#6b7280',
    marginRight: '12px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#374151',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    transition: 'color 0.2s ease',
  },
  loadingSpinner: {
    marginLeft: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #6b7280',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    maxHeight: '320px',
    overflowY: 'auto',
    marginTop: '4px',
  },
  suggestionItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s ease',
  },
  suggestionContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  suggestionPoster: {
    width: '40px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '4px',
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  suggestionYear: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
};

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
