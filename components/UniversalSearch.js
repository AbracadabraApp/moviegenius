// components/UniversalSearch.js
// Universal intelligent search for Collections and Movies
// V1: People search commented out - focus on thematic discovery

import { useState, useEffect, useRef } from 'react';
import { Search, Film, Folder } from 'lucide-react'; // Users removed for V1
import { useRouter } from 'next/router';

export default function UniversalSearch({
  placeholder = "What kind of films are you looking for?",
  autoFocus = true
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/universal-search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result) => {
    setShowResults(false);
    setQuery('');

    if (result.type === 'collection') {
      router.push(`/collection/${result.id}`);
    } else if (result.type === 'movie') {
      router.push(`/movie/${result.tmdb_id}`);
    }
    // V1: Person routing disabled
    // else if (result.type === 'person') {
    //   router.push(`/person/${result.id}`);
    // }
  };

  const totalResults = results
    ? (results.collections?.length || 0) + (results.movies?.length || 0) // + (results.people?.length || 0) // V1: People disabled
    : 0;

  return (
    <div style={styles.container}>
      {/* Search Input */}
      <div style={styles.inputWrapper}>
        <Search size={24} color="#9ca3af" style={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          style={styles.input}
          autoFocus={autoFocus}
        />
        {isLoading && (
          <div style={styles.loadingSpinner}>⟳</div>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && results && totalResults > 0 && (
        <div ref={dropdownRef} style={styles.dropdown}>
          {/* Collections Section */}
          {results.collections && results.collections.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <Folder size={16} color="#d4af37" />
                <span style={styles.sectionTitle}>Collections ({results.collections.length})</span>
              </div>
              {results.collections.slice(0, 5).map((collection, index) => (
                <div
                  key={collection.id}
                  onClick={() => handleResultClick(collection)}
                  style={styles.resultItem}
                >
                  <div style={styles.resultMain}>
                    <span style={styles.resultTitle}>{collection.title}</span>
                    <span style={styles.resultMeta}>
                      {collection.total_movies} films · {collection.genre}
                    </span>
                  </div>
                </div>
              ))}
              {results.collections.length > 5 && (
                <div style={styles.moreResults}>
                  +{results.collections.length - 5} more collections
                </div>
              )}
            </div>
          )}

          {/* Movies Section */}
          {results.movies && results.movies.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <Film size={16} color="#d4af37" />
                <span style={styles.sectionTitle}>Movies ({results.movies.length})</span>
              </div>
              {results.movies.slice(0, 5).map((movie, index) => (
                <div
                  key={movie.tmdb_id}
                  onClick={() => handleResultClick(movie)}
                  style={styles.resultItem}
                >
                  <div style={styles.resultMain}>
                    <span style={styles.resultTitle}>
                      {movie.title} {movie.year && `(${movie.year})`}
                    </span>
                    {movie.slug && (
                      <span style={styles.resultMeta}>{movie.slug}</span>
                    )}
                  </div>
                </div>
              ))}
              {results.movies.length > 5 && (
                <div style={styles.moreResults}>
                  +{results.movies.length - 5} more movies
                </div>
              )}
            </div>
          )}

          {/* V1: People Section - Commented out for initial release
          {results.people && results.people.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <Users size={16} color="#d4af37" />
                <span style={styles.sectionTitle}>People ({results.people.length})</span>
              </div>
              {results.people.slice(0, 5).map((person, index) => (
                <div
                  key={person.id}
                  onClick={() => handleResultClick(person)}
                  style={styles.resultItem}
                >
                  <div style={styles.resultMain}>
                    <span style={styles.resultTitle}>{person.name}</span>
                    <span style={styles.resultMeta}>
                      {person.role} · {person.filmCount} films
                    </span>
                  </div>
                </div>
              ))}
              {results.people.length > 5 && (
                <div style={styles.moreResults}>
                  +{results.people.length - 5} more people
                </div>
              )}
            </div>
          )}
          */}
        </div>
      )}

      {/* No Results */}
      {showResults && results && totalResults === 0 && query.length >= 2 && (
        <div ref={dropdownRef} style={styles.dropdown}>
          <div style={styles.noResults}>
            No results found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '18px 20px 18px 56px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
  loadingSpinner: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    color: '#9ca3af',
    animation: 'spin 1s linear infinite',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    maxHeight: '500px',
    overflowY: 'auto',
    zIndex: 1000,
  },
  section: {
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px',
    marginBottom: '4px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  resultItem: {
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    ':hover': {
      backgroundColor: '#f9fafb',
    },
  },
  resultMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  resultTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#111827',
  },
  resultMeta: {
    fontSize: '13px',
    color: '#6b7280',
  },
  moreResults: {
    padding: '8px 20px',
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  noResults: {
    padding: '32px 20px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
  },
};
