/**
 * Browse Collection Overflow Page
 *
 * Netflix-style grid view for browsing all movies in a collection
 * Accessed via "View All" links from homepage carousels
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import { ChevronLeft, Search } from 'lucide-react';

export default function BrowseCollectionPage() {
  const router = useRouter();
  const { id } = router.query;
  const contentRef = useRef(null);

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

  // Restore scroll position when returning from movie page
  useEffect(() => {
    if (!loading && contentRef.current && id) {
      const scrollPositionKey = `browse-scroll-${id}`;
      const savedPosition = sessionStorage.getItem(scrollPositionKey);
      if (savedPosition) {
        // Use setTimeout to ensure content is rendered
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = parseInt(savedPosition, 10);
          }
        }, 0);
      }
    }
  }, [loading, id]);

  // Save scroll position when scrolling
  const handleScroll = () => {
    if (contentRef.current && id) {
      const scrollPositionKey = `browse-scroll-${id}`;
      sessionStorage.setItem(scrollPositionKey, contentRef.current.scrollTop.toString());
    }
  };

  const handleMovieClick = (tmdbId) => {
    // Save scroll position before navigating
    if (contentRef.current && id) {
      const scrollPositionKey = `browse-scroll-${id}`;
      sessionStorage.setItem(scrollPositionKey, contentRef.current.scrollTop.toString());
    }
    router.push(`/movie/${tmdbId}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <PhoneFrame
      backgroundImage={null}
      showDarkOverlay={false}
    >
      <div style={styles.container}>
        {/* Search Bar - Sticky at top */}
        <div style={styles.searchSection}>
          <button onClick={handleBack} style={styles.backButtonInSearch}>
            <ChevronLeft size={24} color="#111827" />
          </button>
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
        </div>

        {/* Movies Grid - Scrolls under search */}
        <div
          ref={contentRef}
          style={styles.content}
          onScroll={handleScroll}
        >
          {/* Collection Header */}
          <div style={styles.collectionHeader}>
            <h1 style={styles.title}>
              {loading ? 'Loading...' : collection?.title || 'Collection'}
            </h1>
            <p style={styles.subtitle}>
              {loading ? '' : `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'}`}
            </p>
            {searchQuery && (
              <p style={styles.resultCount}>
                {filteredMovies.length} {filteredMovies.length === 1 ? 'result' : 'results'}
              </p>
            )}
          </div>
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
    background: '#ffffff',
  },

  searchSection: {
    position: 'sticky',
    top: 0,
    zIndex: 99,
    background: 'rgba(255, 255, 255, 0.98)',
    padding: '12px 16px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  backButtonInSearch: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'background 0.2s ease',
    flexShrink: 0,
  },

  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },

  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },

  searchInput: {
    width: '100%',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 40px 10px 44px',
    fontSize: '15px',
    color: '#111827',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    outline: 'none',
    transition: 'all 0.2s ease',
  },

  clearButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultCount: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },

  collectionHeader: {
    padding: '20px 16px 16px 16px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '16px',
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
  },

  subtitle: {
    fontSize: '14px',
    color: '#d97706',
    margin: 0,
    fontWeight: '500',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: '32px',
    background: '#ffffff',
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    opacity: 0.8,
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
    color: '#6b7280',
    opacity: 0.8,
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
    backgroundColor: '#f3f4f6',
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
    color: '#111827',
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
    color: '#6b7280',
  },
};
