// pages/movies.js - Movie search and discovery page
import PhoneFrame from '../components/PhoneFrame';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import SearchFilters from '../components/SearchFilters';
import MediaCard from '../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load initial trending and popular movies
  useEffect(() => {
    loadInitialMovies();
  }, []);

  const loadInitialMovies = async () => {
    try {
      // Load a curated selection of movies for the discover sections
      const response = await fetch('/api/discover-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: ['trending', 'popular', 'recent'] })
      });

      if (response.ok) {
        const data = await response.json();
        setTrendingMovies(data.trending || []);
        setPopularMovies(data.popular || []);
        setRecentMovies(data.recent || []);
      }
    } catch (error) {
      console.error('Failed to load initial movies:', error);
    }
  };

  // Handle search
  const handleSearch = async (query, results) => {
    setCurrentQuery(query);
    setIsSearching(true);
    setShowSearchResults(true);
  };

  // Handle search results
  const handleSearchResults = (results) => {
    setSearchResults(results);
    setIsSearching(false);
  };

  // Handle movie click - navigate to movie detail page
  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  // Handle filter changes
  const handleFiltersChange = (filters) => {
    setSearchFilters(filters);
    
    // Re-run search with new filters if we have a query
    if (currentQuery) {
      performFilteredSearch(currentQuery, filters);
    }
  };

  // Perform search with filters
  const performFilteredSearch = async (query, filters = searchFilters) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      const response = await fetch('/api/search-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(),
          limit: 20,
          filters 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.movies || []);
      }
    } catch (error) {
      console.error('Filtered search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setCurrentQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setIsSearching(false);
    setSearchFilters({});
  };

  return (
    <PhoneFrame active="movies">
      <div style={styles.container}>
        {/* Header with search */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Movies</h1>
            <p style={styles.subtitle}>Discover and search for movies</p>
          </div>
          
          <div style={styles.searchContainer}>
            <SearchBar
              onSearch={handleSearch}
              onResults={handleSearchResults}
              placeholder="Search movies, actors, directors..."
              showSuggestions={true}
            />
            
            {/* Show filters when searching */}
            {showSearchResults && (
              <div style={styles.filtersContainer}>
                <SearchFilters
                  onFiltersChange={handleFiltersChange}
                  initialFilters={searchFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={styles.scrollableContent}>
          {showSearchResults ? (
            /* Search Results View */
            <div style={styles.searchResultsContainer}>
              <SearchResults
                movies={searchResults}
                loading={isSearching}
                query={currentQuery}
                onMovieClick={handleMovieClick}
              />
              
              {/* Back to browse button */}
              {(currentQuery || searchResults.length > 0) && (
                <div style={styles.backToBrowse}>
                  <button
                    onClick={handleClearSearch}
                    style={styles.backButton}
                  >
                    ← Back to Browse
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Discovery View */
            <div style={styles.discoveryContainer}>
              {/* Trending Section */}
              {trendingMovies.length > 0 && (
                <section style={styles.movieSection}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Trending Now</h2>
                    <p style={styles.sectionDescription}>
                      Movies everyone's talking about
                    </p>
                  </div>
                  <div style={styles.movieGrid}>
                    {trendingMovies.slice(0, 6).map((movie, index) => (
                      <div key={`trending-${movie.tmdb_id || index}`} style={styles.movieCard}>
                        <MediaCard
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster_url}
                          initialStreaming={movie.streaming_data}
                          tmdbId={movie.tmdb_id}
                          onClick={() => handleMovieClick(movie)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Popular Section */}
              {popularMovies.length > 0 && (
                <section style={styles.movieSection}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>All-Time Favorites</h2>
                    <p style={styles.sectionDescription}>
                      Beloved classics and modern masterpieces
                    </p>
                  </div>
                  <div style={styles.movieGrid}>
                    {popularMovies.slice(0, 6).map((movie, index) => (
                      <div key={`popular-${movie.tmdb_id || index}`} style={styles.movieCard}>
                        <MediaCard
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster_url}
                          initialStreaming={movie.streaming_data}
                          tmdbId={movie.tmdb_id}
                          onClick={() => handleMovieClick(movie)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Additions */}
              {recentMovies.length > 0 && (
                <section style={styles.movieSection}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Recently Added</h2>
                    <p style={styles.sectionDescription}>
                      New additions to our collection
                    </p>
                  </div>
                  <div style={styles.movieGrid}>
                    {recentMovies.slice(0, 6).map((movie, index) => (
                      <div key={`recent-${movie.tmdb_id || index}`} style={styles.movieCard}>
                        <MediaCard
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster_url}
                          initialStreaming={movie.streaming_data}
                          tmdbId={movie.tmdb_id}
                          onClick={() => handleMovieClick(movie)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Search Suggestions */}
              <section style={styles.movieSection}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Quick Search</h2>
                  <p style={styles.sectionDescription}>
                    Popular search categories
                  </p>
                </div>
                <div style={styles.quickSearchGrid}>
                  {quickSearchTerms.map((term, index) => (
                    <button
                      key={index}
                      style={styles.quickSearchButton}
                      onClick={() => {
                        // Trigger search for this term
                        const searchBar = document.querySelector('input[placeholder*="Search movies"]');
                        if (searchBar) {
                          searchBar.value = term;
                          searchBar.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        setShowSearchResults(true);
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Quick search suggestions
const quickSearchTerms = [
  'Action Movies',
  'Comedy Films',
  'Sci-Fi Classics',
  'Horror Movies',
  'Drama Films',
  'Animated Movies',
  'Thriller Films',
  'Romance Movies',
  'Documentary',
  'Foreign Films',
  'Marvel Movies',
  'Film Noir'
];

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
    borderBottom: '1px solid #e5e7eb',
    padding: '16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#374151',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  searchContainer: {
    width: '100%',
  },
  filtersContainer: {
    marginTop: '12px',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  
  // Search Results
  searchResultsContainer: {
    padding: '16px',
  },
  backToBrowse: {
    textAlign: 'center',
    padding: '24px 0',
    borderTop: '1px solid #e5e7eb',
    marginTop: '24px',
  },
  backButton: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // Discovery View
  discoveryContainer: {
    padding: '16px',
  },
  movieSection: {
    marginBottom: '32px',
  },
  sectionHeader: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 4px 0',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movieCard: {
    cursor: 'pointer',
  },

  // Quick Search
  quickSearchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  quickSearchButton: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    textAlign: 'center',
  },
};