/**
 * Dynamic Browse List Page - [listName].js
 * 
 * Shows movies for a specific browse list (e.g., /browse/virtual-reality-horror)
 * Uses SearchResultCard for consistent display with search results
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import MovieResultsList from '../../components/MovieResultsList';
import { ChevronLeft, Loader2 } from 'lucide-react';

export default function BrowseListPage() {
  const router = useRouter();
  const { listName } = router.query;
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listDisplayName, setListDisplayName] = useState('');

  useEffect(() => {
    if (!listName) return;
    
    fetchListMovies();
  }, [listName]);

  const fetchListMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert URL slug back to display name
      const displayName = listName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setListDisplayName(displayName);
      
      console.log(`🔍 Fetching movies for list: ${listName}`);
      
      const response = await fetch(`/api/browse-list-movies?listName=${encodeURIComponent(listName)}`);
      const data = await response.json();
      
      if (response.ok) {
        setMovies(data.movies || []);
        console.log(`🎬 Loaded ${data.movies?.length || 0} movies for "${displayName}"`);
      } else {
        throw new Error(data.error || 'Failed to load list movies');
      }
    } catch (err) {
      console.error('Error fetching list movies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleMovieClick = ({ tmdb_id }) => {
    router.push(`/movie/${tmdb_id}`);
  };

  if (!listName) {
    return (
      <PhoneFrame>
        <div style={styles.loadingContainer}>
          <Loader2 className="animate-spin" size={24} color="#d4af37" />
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>
            <ChevronLeft size={20} color="#374151" />
          </button>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>{listDisplayName}</h1>
            <p style={styles.subtitle}>Curated movie collection</p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchSection}>
          <SimpleSearch
            placeholder="Search all movies..."
            useUnifiedSearch={true}
          />
        </div>

        {/* Content */}
        <div style={styles.contentSection}>
          {loading && (
            <div style={styles.loadingContainer}>
              <Loader2 className="animate-spin" size={24} color="#d4af37" />
              <p style={styles.loadingText}>Loading movies...</p>
            </div>
          )}

          {error && (
            <div style={styles.errorContainer}>
              <p style={styles.errorText}>Error: {error}</p>
              <button onClick={fetchListMovies} style={styles.retryButton}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && movies.length === 0 && (
            <div style={styles.emptyContainer}>
              <p style={styles.emptyText}>No movies found in this list</p>
            </div>
          )}

          {!loading && !error && movies.length > 0 && (
            <>
              <div style={styles.resultsHeader}>
                <p style={styles.resultsCount}>{movies.length} movies</p>
              </div>
              
              <MovieResultsList
                movies={movies}
                onMovieClick={handleMovieClick}
                showTrailer={true}
              />
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
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },

  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },

  backButton: {
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  headerContent: {
    flex: 1
  },

  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.2'
  },

  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },

  searchSection: {
    padding: '0 20px 16px 20px',
    borderBottom: '1px solid #f3f4f6'
  },

  contentSection: {
    flex: 1,
    padding: '16px 0'
  },

  resultsHeader: {
    padding: '0 20px 12px 20px'
  },

  resultsCount: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },

  moviesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px'
  },

  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },

  errorContainer: {
    padding: '40px 20px',
    textAlign: 'center'
  },

  errorText: {
    fontSize: '14px',
    color: '#dc2626',
    marginBottom: '16px'
  },

  retryButton: {
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  emptyContainer: {
    padding: '40px 20px',
    textAlign: 'center'
  },

  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  }
};