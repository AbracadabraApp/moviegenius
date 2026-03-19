/**
 * Browse Collection Overflow Page
 *
 * Netflix-style grid view for browsing all movies in a collection
 * Accessed via "View All" links from homepage carousels
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import { ChevronLeft, Search } from 'lucide-react';

export default function BrowseCollectionPage() {
  const router = useRouter();
  const { id } = router.query;

  const [collection, setCollection] = useState(null);
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Background images
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
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    setCurrentImageIndex(randomIndex);
  }, [id]);

  // Fetch collection data
  useEffect(() => {
    if (!id) return;

    const fetchCollection = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/browse-list?id=${id}`);

        if (response.ok) {
          const data = await response.json();
          setCollection(data);
          setMovies(data.movies || []);
          setFilteredMovies(data.movies || []);
        } else {
          console.error('Failed to fetch collection');
        }
      } catch (error) {
        console.error('Error fetching collection:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [id]);

  // Filter movies based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMovies(movies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = movies.filter(movie =>
      movie.title?.toLowerCase().includes(query) ||
      movie.year?.toString().includes(query)
    );
    setFilteredMovies(filtered);
  }, [searchQuery, movies]);

  const handleMovieClick = (tmdbId) => {
    router.push(`/movie/${tmdbId}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <PhoneFrame
      backgroundImage={backgroundImages[currentImageIndex]}
      showDarkOverlay={true}
    >
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#ffffff" />
          </button>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>
              {loading ? 'Loading...' : collection?.title || 'Collection'}
            </h1>
            <p style={styles.subtitle}>
              {loading ? '' : `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'}`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <Search size={20} color="#9ca3af" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <p style={styles.resultCount}>
              {filteredMovies.length} {filteredMovies.length === 1 ? 'result' : 'results'}
            </p>
          )}
        </div>

        {/* Movies Grid */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading movies...</div>
            </div>
          )}

          {!loading && filteredMovies.length === 0 && (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>🎬</div>
              <div style={styles.emptyText}>
                {searchQuery ? 'No movies match your search' : 'No movies in this collection'}
              </div>
            </div>
          )}

          {!loading && filteredMovies.length > 0 && (
            <div style={styles.grid}>
              {filteredMovies.map((movie, index) => (
                <div
                  key={`${movie.tmdb_id}-${index}`}
                  style={styles.posterWrapper}
                  onClick={() => handleMovieClick(movie.tmdb_id)}
                >
                  <div style={styles.posterContainer}>
                    <img
                      src={movie.poster_url || '/images/placeholder-poster.jpg'}
                      alt={movie.title}
                      style={styles.poster}
                      onError={(e) => {
                        e.target.src = '/images/placeholder-poster.jpg';
                      }}
                    />
                  </div>
                  <div style={styles.movieInfo}>
                    <div style={styles.movieTitle}>{movie.title}</div>
                    {movie.year && (
                      <div style={styles.movieYear}>{movie.year}</div>
                    )}
                  </div>
                </div>
              ))}
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
  },

  header: {
    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.8))',
    padding: '16px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'background 0.2s ease',
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
  },

  subtitle: {
    fontSize: '13px',
    color: '#d4af37',
    margin: 0,
  },

  searchSection: {
    position: 'sticky',
    top: 0,
    zIndex: 99,
    background: 'rgba(0, 0, 0, 0.95)',
    padding: '12px 16px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },

  searchInput: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '10px 40px 10px 44px',
    fontSize: '15px',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    outline: 'none',
    transition: 'all 0.2s ease',
  },

  clearButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultCount: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '8px 0 0 0',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: '32px',
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#ffffff',
    opacity: 0.7,
  },

  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  emptyText: {
    fontSize: '16px',
    color: '#ffffff',
    opacity: 0.7,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '16px',
  },

  posterWrapper: {
    cursor: 'pointer',
  },

  posterContainer: {
    position: 'relative',
    aspectRatio: '2/3',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: '8px',
    transition: 'transform 0.2s ease',
  },

  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  movieInfo: {
    paddingTop: '4px',
  },

  movieTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: '1.2',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },

  movieYear: {
    fontSize: '11px',
    color: '#9ca3af',
  },
};
