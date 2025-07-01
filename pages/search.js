/**
 * Search Results Page
 * 
 * Shows movie search results using TMDB-first search system
 * Supports both text queries and category filters
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';

export default function SearchPage() {
  const router = useRouter();
  const { q, category } = router.query;
  
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  // Category to search query mapping
  const categoryQueries = {
    'action': 'action movies',
    'comedy': 'comedy films',
    'horror': 'horror movies',
    'thriller': 'thriller films',
    'drama': 'drama films',
    'sci-fi': 'science fiction',
    'romance': 'romance movies',
    'animated': 'animated movies',
    'documentary': 'documentary films',
    'foreign': 'international cinema',
    'marvel': 'marvel movies',
    'noir': 'film noir'
  };

  // Load search results on page load or query change
  useEffect(() => {
    if (q || category) {
      const searchQuery = q || categoryQueries[category] || category;
      setCurrentQuery(searchQuery);
      performSearch(searchQuery);
    }
  }, [q, category]);

  const performSearch = async (query) => {
    if (!query) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/simple-search-v2?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.movies || []);
      } else {
        console.error('Search failed:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResults = (results) => {
    setSearchResults(results);
    setCurrentQuery(''); // Clear the query display since it's handled by SimpleSearch
  };

  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  const getCategoryTitle = () => {
    if (category && categoryQueries[category]) {
      return categoryQueries[category].charAt(0).toUpperCase() + categoryQueries[category].slice(1);
    }
    return currentQuery ? `Search: "${currentQuery}"` : 'Search Results';
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search header */}
        <div style={styles.header}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search movies..."
            initialQuery={q}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Results header */}
          <div style={styles.resultsHeader}>
            <h1 style={styles.resultsTitle}>{getCategoryTitle()}</h1>
            {(searchResults.length > 0 || loading) && (
              <span style={styles.resultsCount}>
                {loading ? 'Searching...' : `${searchResults.length} movie${searchResults.length !== 1 ? 's' : ''} found`}
              </span>
            )}
          </div>

          {/* Results grid */}
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Searching movies...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <div style={styles.movieGrid}>
              {searchResults.map((movie, index) => (
                <div key={`${movie.tmdb_id || movie.title}-${index}`} onClick={() => handleMovieClick(movie)}>
                  <MediaCard
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    initialPoster={movie.poster_url}
                    initialStreaming={movie.streaming_data}
                    tmdbId={movie.tmdb_id}
                  />
                </div>
              ))}
            </div>
          ) : currentQuery ? (
            <div style={styles.noResults}>
              <div style={styles.noResultsIcon}>🎬</div>
              <div style={styles.noResultsTitle}>No movies found</div>
              <div style={styles.noResultsText}>
                Try searching for a different movie title, actor, or director.
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <div style={styles.emptyTitle}>Search for Movies</div>
              <div style={styles.emptyText}>
                Find movies by title, director, actor, or browse by category.
              </div>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  
  resultsHeader: {
    marginBottom: '20px',
  },
  resultsTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  resultsCount: {
    fontSize: '14px',
    color: '#6b7280',
  },
  
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  
  noResults: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  noResultsIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  noResultsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  noResultsText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
};