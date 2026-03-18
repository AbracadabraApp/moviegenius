// components/SimpleSearch.js - Search with Google-style word wheel (predictive dropdown)
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';

export default function SimpleSearch({
  placeholder = 'Search movies and people...',
  initialQuery = '',
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const currentSearchRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Update query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery || '');
  }, [initialQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for word wheel
  const debouncedSearch = async (searchQuery) => {
    const q = searchQuery.trim();

    // Require 3+ characters to reduce API calls and improve relevance
    if (!q || q.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Create unique search ID
    const searchId = Date.now();
    currentSearchRef.current = searchId;

    try {
      const response = await fetch('/api/simple-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      // Check if search was cancelled
      if (currentSearchRef.current !== searchId) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const movies = data.movies || [];

        // Show all results in scrollable dropdown (API returns up to 20)
        setSuggestions(movies);
        setShowDropdown(movies.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Word wheel search error:', error);
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search
    // Faster debounce (200ms) for better UX, fewer API calls due to 3-char minimum
    debounceTimerRef.current = setTimeout(() => {
      debouncedSearch(value);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        // If user selected a suggestion, navigate to it
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const movie = suggestions[selectedIndex];
          if (movie.tmdb_id) {
            router.push(`/movie/${movie.tmdb_id}`);
          }
        }
        // If query exists but no selection, go to search results page
        else if (query.trim().length >= 3) {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          setShowDropdown(false);
        }
        // Close dropdown if query too short
        else {
          setShowDropdown(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate to search results page if query is valid
    if (query.trim().length >= 3) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (movie) => {
    if (movie.tmdb_id) {
      setShowDropdown(false);
      setSuggestions([]);
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.searchBox}>
          <Search size={20} style={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={styles.input}
            className="search-input-placeholder"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={handleClear} style={styles.clearButton}>
              ×
            </button>
          )}
        </div>

        {/* Word Wheel Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div ref={dropdownRef} style={styles.dropdown}>
            {suggestions.map((movie, index) => (
              <div
                key={`${movie.tmdb_id}-${index}`}
                style={{
                  ...styles.suggestionItem,
                  ...(index === selectedIndex ? styles.suggestionItemSelected : {}),
                }}
                onClick={() => handleSuggestionClick(movie)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  style={styles.suggestionPoster}
                />
                <div style={styles.suggestionText}>
                  <div style={styles.suggestionTitle}>{movie.title}</div>
                  {movie.year && (
                    <div style={styles.suggestionYear}>{movie.year}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    position: 'relative',
  },
  form: {
    width: '100%',
    position: 'relative',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px 16px',
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
    fontSize: '18px',
    color: '#000000',
    backgroundColor: 'transparent',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '22px',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Word wheel dropdown
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 1000,
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    gap: '12px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s ease',
  },
  suggestionItemSelected: {
    backgroundColor: '#f9fafb',
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
    fontSize: '16px',
    fontWeight: '500',
    color: '#000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  suggestionYear: {
    fontSize: '14px',
    color: '#6b7280',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    marginTop: '2px',
  },
};
