/**
 * MovieHeaderCompact Component - Compact Movie Display for Search Results
 * 
 * Adapted from MovieHeaderLarge for use in search result containers:
 * - Compact layout that fits in grey rounded containers
 * - Proportionate poster height (maintains aspect ratio)
 * - Full width usage with proper scaling
 * - Floating action bar with Add, Seen, Play buttons
 * - Progressive loading and error handling
 * 
 * @component
 * @example
 * <MovieHeaderCompact 
 *   title="Fight Club"
 *   year={1999}
 *   tmdbId={550}
 *   posterUrl="https://image.tmdb.org/t/p/w500/..."
 *   onMovieClick={() => navigate('/movie/550')}
 * />
 */
import { Plus, Check, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';

/**
 * @param {Object} props - Component props
 * @param {string} props.title - Movie title
 * @param {number} props.year - Movie release year
 * @param {number} props.tmdbId - TMDB movie ID for API calls
 * @param {string} props.posterUrl - Movie poster URL
 * @param {Function} [props.onMovieClick] - Callback when movie is clicked
 * @param {string} [props.streamingInfo] - Streaming availability text
 * @param {number} [props.voteAverage] - Movie rating (optional)
 */
export default function MovieHeaderCompact({ 
  title, 
  year, 
  tmdbId,
  posterUrl, 
  onMovieClick,
  streamingInfo,
  voteAverage
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [poster, setPoster] = useState(posterUrl || '/images/placeholder-poster.jpg');
  
  // Progressive loading states
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Trailer states
  const [trailerVideoId, setTrailerVideoId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  
  // Movie data object for FavoritesManager
  const movieData = { title, year, poster, id: mediaId };

  // Update poster when prop changes
  useEffect(() => {
    if (posterUrl) {
      setPoster(posterUrl);
    }
  }, [posterUrl]);

  // Load initial state from localStorage
  useEffect(() => {
    try {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    } catch (error) {
      console.error('Failed to load favorites state:', error);
      setHearted(false);
      setBookmarked(false);
    }
  }, [mediaId]);

  // Progressive loading: Show content immediately for faster UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 100); // Faster than MovieHeaderLarge for search results
    
    return () => clearTimeout(timer);
  }, []);

  // Reset loading state when poster changes
  useEffect(() => {
    setIsImageLoaded(false);
    setIsImageError(false);
  }, [poster]);

  // Listen for favorites updates
  useEffect(() => {
    const handleMoviesUpdate = () => {
      try {
        setHearted(FavoritesManager.isMovieHearted(mediaId));
        setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
      } catch (error) {
        console.error('Failed to update favorites state:', error);
      }
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, [mediaId]);

  // Fetch trailer data for Play button
  useEffect(() => {
    const fetchTrailer = async () => {
      if (tmdbId && !trailerVideoId && !isLoadingTrailer) {
        setIsLoadingTrailer(true);
        try {
          const response = await fetch(`/api/tmdb-trailer?tmdbId=${tmdbId}`);
          const data = await response.json();
          
          if (data.videoId) {
            setTrailerVideoId(data.videoId);
          }
        } catch (error) {
          console.error('Error fetching trailer:', error);
        } finally {
          setIsLoadingTrailer(false);
        }
      }
    };

    fetchTrailer();
  }, [tmdbId]);

  // Handle trailer modal
  const handlePlayTrailer = async () => {
    if (!tmdbId) return;
    
    if (!trailerVideoId && !isLoadingTrailer) {
      setIsLoadingTrailer(true);
      try {
        const response = await fetch(`/api/tmdb-trailer?tmdbId=${tmdbId}`);
        const data = await response.json();
        
        if (data.videoId) {
          setTrailerVideoId(data.videoId);
          setShowTrailer(true);
        }
      } catch (error) {
        console.error('Error fetching trailer:', error);
      } finally {
        setIsLoadingTrailer(false);
      }
    } else if (trailerVideoId) {
      setShowTrailer(true);
    }
  };

  const handleCloseTrailer = () => {
    setShowTrailer(false);
  };

  const handleContainerClick = () => {
    if (onMovieClick) {
      onMovieClick();
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
      `}</style>
      
      <div style={styles.container}>
        <div style={styles.movieHeader} onClick={handleContainerClick}>
          
          {/* Action Bar */}
          <div 
            style={styles.actionBarContainer}
            onClick={(e) => e.stopPropagation()} // Prevent movie click when using action bar
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <button
              onClick={() => {
                try {
                  const newState = FavoritesManager.toggleBookmark(movieData);
                  setBookmarked(newState);
                } catch (error) {
                  console.error('Failed to toggle bookmark state:', error);
                }
              }}
              style={styles.actionButton}
              aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
            >
              <div style={styles.iconWithText}>
                <Plus
                  size={20}
                  color="#6b7280"
                />
                <span style={{
                  ...styles.iconLabel,
                  color: '#1f2937',
                  fontWeight: bookmarked ? '600' : '400'
                }}>
                  Add
                </span>
              </div>
            </button>
            
            <button
              onClick={() => {
                try {
                  const newState = FavoritesManager.toggleHeart(movieData);
                  setHearted(newState);
                } catch (error) {
                  console.error('Failed to toggle heart state:', error);
                }
              }}
              style={styles.actionButton}
              aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
            >
              <div style={styles.iconWithText}>
                <Check
                  size={20}
                  color="#6b7280"
                  strokeWidth={hearted ? 2.5 : 1.5}
                />
                <span style={{
                  ...styles.iconLabel,
                  color: '#1f2937',
                  fontWeight: hearted ? '600' : '400'
                }}>
                  Seen
                </span>
              </div>
            </button>
            
            {/* Play Trailer Button - Only show if trailer exists */}
            {trailerVideoId && (
              <button
                onClick={handlePlayTrailer}
                style={styles.actionButton}
                aria-label="Play trailer"
              >
                <div style={styles.iconWithText}>
                  <PlayCircle
                    size={20}
                    color="#6b7280"
                    fill="none"
                  />
                  <span style={{
                    ...styles.iconLabel,
                    color: "#1f2937",
                    fontWeight: "400"
                  }}>
                    Play
                  </span>
                </div>
              </button>
            )}
          </div>
          
          {/* Poster Section */}
          <div style={styles.posterContainer}>
            {showContent && (
              <img 
                src={poster} 
                alt={`Poster for ${title}`} 
                style={{
                  ...styles.poster,
                  opacity: isImageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                onLoad={() => {
                  setIsImageLoaded(true);
                  setIsImageError(false);
                }}
                onError={() => {
                  setIsImageError(true);
                  setIsImageLoaded(false);
                }}
              />
            )}
            
            {/* Loading placeholder */}
            {showContent && !isImageLoaded && !isImageError && (
              <div style={styles.posterPlaceholder}>
                <div style={styles.loadingText}>•••</div>
              </div>
            )}
            
            {/* Error fallback */}
            {isImageError && (
              <div style={styles.posterPlaceholder}>
                <div style={styles.errorText}>📷</div>
                <div style={styles.errorSubtext}>No poster</div>
              </div>
            )}
            
            {/* Initial loading state */}
            {!showContent && (
              <div style={styles.posterPlaceholder}>
                <div style={styles.loadingText}>•••</div>
              </div>
            )}
          </div>
          
          {/* Movie Info Section */}
          <div style={styles.infoContainer}>
            {/* Streaming info */}
            {streamingInfo && streamingInfo !== 'TBD' && (
              <div style={styles.streamingContainer}>
                <span style={styles.streamingText}>{streamingInfo}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* YouTube Trailer Modal */}
        {showTrailer && trailerVideoId && (
          <div style={styles.trailerOverlay} onClick={handleCloseTrailer}>
            <div style={styles.trailerModal} onClick={(e) => e.stopPropagation()}>
              <button 
                style={styles.closeButton}
                onClick={handleCloseTrailer}
                aria-label="Close trailer"
              >
                ×
              </button>
              <div style={styles.trailerContainer}>
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${trailerVideoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="Movie Trailer"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={styles.trailerIframe}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Center everything
    padding: '0px 16px 36px 16px', // Added 36px bottom margin between movies
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'relative', // For positioning the action bar
    cursor: 'pointer',
  },
  movieHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  actionBarContainer: {
    position: 'absolute',
    right: '16px',
    bottom: '100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '13px 4.5px',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'center',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'scale(1)',
  },
  iconWithText: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexDirection: 'column',
  },
  iconLabel: {
    fontSize: '11px',
    lineHeight: '1',
    userSelect: 'none',
    textAlign: 'center',
  },
  posterContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '5px',
    paddingLeft: '20px',
    paddingRight: '20px',
    paddingTop: '0px',
    paddingBottom: '5px',
  },
  poster: {
    width: '100%',     // Fill container width
    height: '400px',   // Fixed height for consistent layout
    objectFit: 'cover', // Intelligent center cropping
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Add some shadow for depth
  },
  posterPlaceholder: {
    width: '100%',
    height: '400px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    border: '2px dashed #e2e8f0',
  },
  loadingText: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  errorText: {
    fontSize: '48px',
    opacity: 0.3,
    marginBottom: '8px',
  },
  errorSubtext: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  streamingContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  streamingText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: '1.3',
  },
  // Trailer modal styles (same as MovieHeaderLarge but smaller)
  trailerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  trailerModal: {
    position: 'relative',
    width: '100%',
    maxWidth: '600px',
    aspectRatio: '16/9',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2001,
    transition: 'background-color 0.2s',
  },
  trailerContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  trailerIframe: {
    border: 'none',
    borderRadius: '12px',
  },
};