/**
 * MovieGenius Page - Same as Search Page
 *
 * Shows movie search results using database-first search
 * Supports both text queries and category filters
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import SearchResultCard from '../components/SearchResultCard';
import TrailerModal from '../components/TrailerModal';
import ErrorBoundary from '../components/ErrorBoundary';

export default function MovieGeniusPage() {
  const router = useRouter();
  const { q, category, 'new-releases': newReleases } = router.query;

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [trailerModal, setTrailerModal] = useState({ isOpen: false, videoId: null, title: null });
  // Background images from /public/images/backgrounds/
  // Add any jpg/png files to that folder and they'll automatically rotate
  const backgroundImages = [
    '/images/backgrounds/1.jpg',
    '/images/backgrounds/2.jpg',
    '/images/backgrounds/3.jpg',
    '/images/backgrounds/4.jpg',
    '/images/backgrounds/5.jpg',
    '/images/backgrounds/6.jpg',
    '/images/backgrounds/7.jpg',
    '/images/backgrounds/8.jpg',
    '/images/backgrounds/9.jpg',
    '/images/backgrounds/10.jpg',
    '/images/backgrounds/11.jpg',
    '/images/backgrounds/12.jpg',
    '/images/backgrounds/13.jpg',
    '/images/backgrounds/14.jpg',
    '/images/backgrounds/15.jpg',
    '/images/backgrounds/16.jpg',
    '/images/backgrounds/17.jpg',
    '/images/backgrounds/18.jpg',
    '/images/backgrounds/19.jpg',
    '/images/backgrounds/20.jpg',
    '/images/backgrounds/21.jpg',
    '/images/backgrounds/22.jpg',
    '/images/backgrounds/23.jpg',
    '/images/backgrounds/24.jpg',
    '/images/backgrounds/25.jpg',
    '/images/backgrounds/26.jpg',
    '/images/backgrounds/27.jpg',
    '/images/backgrounds/28.jpg',
    '/images/backgrounds/29.jpg',
  ];

  // Pick random image on mount
  const [currentImageIndex] = useState(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    console.log('🎬 Background image selected:', randomIndex, backgroundImages[randomIndex]);
    return randomIndex;
  });

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

  const handleTrailerPlay = (videoId, title) => {
    console.log('Playing trailer:', videoId, 'for', title);
    setTrailerModal({ isOpen: true, videoId, title });
  };

  const closeTrailerModal = () => {
    setTrailerModal({ isOpen: false, videoId: null, title: null });
  };

  const getCategoryTitle = () => {
    if (category && categoryQueries[category]) {
      return categoryQueries[category].charAt(0).toUpperCase() + categoryQueries[category].slice(1);
    }
    return currentQuery ? `Search: "${currentQuery}"` : 'Search Results';
  };

  // Show background when no results
  const showBackground = !currentQuery && searchResults.length === 0 && !loading;

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Random Background Image */}
        {showBackground && (
          <div style={styles.backgroundContainer}>
            <div
              style={{
                ...styles.backgroundImage,
                backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
              }}
            />
          </div>
        )}

        {/* Search header */}
        <div style={{
          ...styles.header,
          ...(showBackground ? styles.headerWithBackground : {})
        }}>
          <SimpleSearch
            onResults={handleSearchResults}
            placeholder="Search movies..."
            initialQuery={q}
            useUnifiedSearch={false}
          />
        </div>

        {/* Content */}
        <div style={{
          ...styles.content,
          backgroundColor: showBackground ? 'transparent' : '#f9fafb',
        }}>
          {/* Results header - only show when there's a query/results */}
          {!showBackground && (
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
          )}

          {/* Results grid */}
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Searching movies...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <ErrorBoundary level="section">
              <div style={styles.movieGrid}>
                {console.log(
                  '🔍 Rendering search results with SearchResultCard:',
                  searchResults.length,
                  'movies'
                )}
                {searchResults.map((movie, index) => (
                  <SearchResultCard
                    key={`${movie.tmdb_id || movie.title}-${index}`}
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    initialPoster={movie.poster_url}
                    tmdbId={movie.tmdb_id}
                    whyWatch={movie.whyWatch}
                    analysisPreview={movie.analysisPreview}
                    onMovieClick={handleMovieClick}
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
          ) : !showBackground ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <div style={styles.emptyTitle}>Search for Movies</div>
              <div style={styles.emptyText}>
                Find movies by title, director, actor, or browse by category.
              </div>
            </div>
          ) : null}
        </div>

        {/* Trailer Modal */}
        <TrailerModal
          isOpen={trailerModal.isOpen}
          onClose={closeTrailerModal}
          videoId={trailerModal.videoId}
          movieTitle={trailerModal.title}
        />
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
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundImage: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '150%',
    height: '150%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px',
    position: 'relative',
    zIndex: 10,
  },
  headerWithBackground: {
    backgroundColor: 'transparent',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'relative',
    zIndex: 10,
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
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movieGridItem: {
    cursor: 'pointer',
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
