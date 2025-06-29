// pages/movies.js - Movie search and discovery page
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Handle search results
  const handleSearchResults = (results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  // Handle movie click - navigate to movie detail page  
  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <PhoneFrame active="movies">
      <div style={styles.container}>
        {/* Simple search header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Movies</h1>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search movies..."
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {showSearchResults ? (
            /* Search Results */
            <div style={styles.resultsContainer}>
              <div style={styles.resultsHeader}>
                <span>{searchResults.length} movie{searchResults.length !== 1 ? 's' : ''} found</span>
                <button onClick={handleClearSearch} style={styles.clearButton}>
                  Clear
                </button>
              </div>
              <div style={styles.movieList}>
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
            </div>
          ) : (
            /* Browse Categories */
            <div style={styles.browseContainer}>
              <h2 style={styles.browseTitle}>Browse by Category</h2>
              <div style={styles.categoryGrid}>
                {browseCategories.map((category, index) => (
                  <div key={index} style={styles.categoryButton}>
                    {category}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Static browse categories (not tied to search)
const browseCategories = [
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
  resultsContainer: {
    
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  clearButton: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },

  // Browse Categories
  browseContainer: {
    
  },
  browseTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  categoryButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
};