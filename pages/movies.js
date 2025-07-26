// pages/movies.js - Movie search and discovery page
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import CategoryBrowse from '../components/CategoryBrowse';
import ErrorBoundary from '../components/ErrorBoundary';
import { navItems, routeValidation } from '../lib/routes';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Handle search results from multi-search API
  const handleSearchResults = results => {
    // Multi-search returns {movies: [], people: []} - extract movies array
    const movies = results.movies || results || [];
    setSearchResults(movies);
    setShowSearchResults(movies.length > 0);
  };

  // Handle movie click - navigate to movie detail page
  const handleMovieClick = movie => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  // Handle new release category click
  const handleNewReleaseClick = category => {
    router.push(`/search?new-releases=${category}`);
  };

  return (
    <PhoneFrame navItems={navItems} routeValidation={routeValidation}>
      <div style={styles.container}>
        {/* Simple search header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Movies</h1>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {showSearchResults ? (
            /* Search Results */
            <ErrorBoundary level="section">
              <div style={styles.resultsContainer}>
                <div style={styles.resultsHeader}>
                  <span>
                    {searchResults.length} movie{searchResults.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div style={styles.movieList}>
                  {searchResults.map((movie, index) => (
                    <div
                      key={`${movie.tmdb_id || movie.title}-${index}`}
                      onClick={() => handleMovieClick(movie)}
                      style={styles.movieItem}
                    >
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
              </div>
            </ErrorBoundary>
          ) : (
            <>
              {/* New Releases Section */}
              <ErrorBoundary level="section">
                <div style={styles.newReleasesSection}>
                  <h2 style={styles.sectionTitle}>New Releases</h2>
                  <div style={styles.releaseCategories}>
                  <div
                    style={styles.releaseButton}
                    onClick={() => handleNewReleaseClick('now-playing')}
                    onMouseEnter={e => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={e => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    <div style={styles.releaseButtonTitle}>Now Playing</div>
                    <div style={styles.releaseButtonSubtitle}>In theaters now</div>
                  </div>

                  <div
                    style={styles.releaseButton}
                    onClick={() => handleNewReleaseClick('upcoming')}
                    onMouseEnter={e => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={e => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    <div style={styles.releaseButtonTitle}>Coming Soon</div>
                    <div style={styles.releaseButtonSubtitle}>Upcoming releases</div>
                  </div>

                  <div
                    style={styles.releaseButton}
                    onClick={() => handleNewReleaseClick('recent')}
                    onMouseEnter={e => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={e => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    <div style={styles.releaseButtonTitle}>Recent Releases</div>
                    <div style={styles.releaseButtonSubtitle}>Last 60 days</div>
                  </div>

                  <div
                    style={styles.releaseButton}
                    onClick={() => handleNewReleaseClick('trending')}
                    onMouseEnter={e => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={e => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    <div style={styles.releaseButtonTitle}>Trending</div>
                    <div style={styles.releaseButtonSubtitle}>Popular this week</div>
                  </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Browse Categories */}
              <ErrorBoundary level="section">
                <CategoryBrowse />
              </ErrorBoundary>
            </>
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
    gap: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },

  // Search Results
  resultsContainer: {},
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movieItem: {
    cursor: 'pointer',
  },

  // New Releases Section
  newReleasesSection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  releaseCategories: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  releaseButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  releaseButtonTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px',
  },
  releaseButtonSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.3',
  },
};
