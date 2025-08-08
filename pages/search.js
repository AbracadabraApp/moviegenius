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
import MovieHeaderCompact from '../components/MovieHeaderCompact';
import ErrorBoundary from '../components/ErrorBoundary';

export default function SearchPage() {
  const router = useRouter();
  const { q, category, 'new-releases': newReleases } = router.query;

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  // Category to search query mapping
  const categoryQueries = {
    // Special categories
    'popular-all-time': 'Most Popular All Time',
    'top-rated': 'Top Rated Movies',

    // TMDB Genres
    action: 'Action Movies',
    adventure: 'Adventure Films',
    animation: 'Animation Movies',
    comedy: 'Comedy Films',
    crime: 'Crime Movies',
    documentary: 'Documentary Films',
    drama: 'Drama Films',
    family: 'Family Movies',
    fantasy: 'Fantasy Films',
    history: 'History Movies',
    horror: 'Horror Movies',
    music: 'Music Movies',
    mystery: 'Mystery Movies',
    romance: 'Romance Movies',
    'science-fiction': 'Science Fiction',
    thriller: 'Thriller Movies',
    war: 'War Movies',
    western: 'Western Movies',
  };

  // Load search results on page load or query change
  useEffect(() => {
    if (q) {
      // Text search query
      setCurrentQuery(q);
      performSearch(q, false);
    } else if (category) {
      // Category search - handle special categories or genre search
      const displayQuery = categoryQueries[category] || category;
      setCurrentQuery(displayQuery);

      if (category === 'popular-all-time' || category === 'top-rated') {
        performPopularSearch(category);
      } else {
        performGenreSearch(category); // Use proper TMDB genre search
      }
    } else if (newReleases) {
      // New releases search
      performNewReleasesSearch(newReleases);
    }
  }, [q, category, newReleases]);

  const performSearch = async (query, isCategory = false) => {
    if (!query) return;

    setLoading(true);
    try {
      // Use the working simple-search API for all searches (matches SimpleSearch component)
      const response = await fetch('/api/simple-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

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

  const performNewReleasesSearch = async releaseCategory => {
    if (!releaseCategory) return;

    setLoading(true);

    // Set display title for new releases categories
    const releaseTitles = {
      'now-playing': 'Now Playing',
      upcoming: 'Coming Soon',
      recent: 'Recent Releases',
      trending: 'Trending This Week',
    };

    setCurrentQuery(releaseTitles[releaseCategory] || releaseCategory);

    try {
      const response = await fetch('/api/new-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: releaseCategory }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.movies || []);
      } else {
        console.error('New releases failed:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('New releases error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const performPopularSearch = async popularCategory => {
    if (!popularCategory) return;

    setLoading(true);

    try {
      const response = await fetch('/api/popular-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: popularCategory }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.movies || []);
      } else {
        console.error('Popular movies failed:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Popular movies error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const performGenreSearch = async genreCategory => {
    if (!genreCategory) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/tmdb-genre-search?category=${encodeURIComponent(genreCategory)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.movies || []);
      } else {
        console.error('Genre search failed:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Genre search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResults = results => {
    // Handle results from SimpleSearch component directly
    if (results && results.movies) {
      setSearchResults(results.movies);
    }
  };

  const handleMovieClick = movie => {
    console.log('Movie clicked:', movie);
    if (movie.tmdb_id) {
      console.log('Navigating to:', `/movie/${movie.tmdb_id}`);
      router.push(`/movie/${movie.tmdb_id}`);
    } else {
      console.log('No tmdb_id found for movie:', movie);
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
            useUnifiedSearch={false}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Results header */}
          <div style={styles.resultsHeader}>
            <h1 style={styles.resultsTitle}>{getCategoryTitle()}</h1>
            {(searchResults.length > 0 || loading) && (
              <div style={styles.resultsCount}>
                {loading
                  ? 'Searching...'
                  : `${searchResults.length} movie${searchResults.length !== 1 ? 's' : ''} found`}
              </div>
            )}
          </div>

          {/* Results grid */}
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Searching movies...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <ErrorBoundary level="section">
              <div style={styles.movieGrid}>
                {console.log(
                  '🔍 Rendering search results with MovieHeaderCompact:',
                  searchResults.length,
                  'movies'
                )}
                {searchResults.map((movie, index) => (
                  <MovieHeaderCompact
                    key={`${movie.tmdb_id || movie.title}-${index}`}
                    title={movie.title}
                    year={movie.year}
                    tmdbId={movie.tmdb_id}
                    posterUrl={movie.poster_url}
                    voteAverage={movie.vote_average}
                    streamingInfo={movie.streaming_data}
                    onMovieClick={() => handleMovieClick(movie)}
                  />
                ))}
              </div>
            </ErrorBoundary>
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  resultsHeader: {
    marginBottom: '24px',
    padding: '20px 16px 0 16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    paddingBottom: '16px',
  },
  resultsTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
  },
  resultsCount: {
    fontSize: '18px',
    color: '#6b7280',
    fontWeight: '500',
  },

  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
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
    padding: '40px 20px',
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
    padding: '60px 20px',
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
