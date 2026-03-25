/**
 * MovieHeaderLarge Component - Production Movie Detail Header
 * 
 * Modern large poster format for movie detail pages featuring:
 * - Vertical layout with prominent poster display
 * - Floating action bar with favorites and list management
 * - Interactive poster with double-click functionality
 * - Optimized spacing and visual hierarchy
 * 
 * @component
 * @example
 * <MovieHeaderLarge 
 *   title="Fight Club"
 *   year={1999}
 *   initialSlug="An insomniac office worker..."
 *   initialPoster="https://image.tmdb.org/t/p/w500/..."
 *   tmdbId={550}
 * />
 */
import { Plus, Check, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';

/**
 * @param {Object} props - Component props
 * @param {string} props.title - Movie title
 * @param {number} props.year - Movie release year
 * @param {string} props.initialSlug - Movie description/tagline
 * @param {string} props.initialPoster - Movie poster URL
 * @param {string} [props.initialStreaming] - Initial streaming data (currently unused)
 * @param {number} props.tmdbId - TMDB movie ID for API calls
 */
export default function MovieHeaderLarge({ 
  title, 
  year, 
  initialSlug, 
  initialPoster, 
  initialStreaming,
  tmdbId,
  animationDelay = 0
}) {
  console.log('🖼️ UPDATED MovieHeaderLarge component loaded - no loading poster states!');

  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [slug, setSlug] = useState(initialSlug || '');
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  
  // Error state only - removed loading states for immediate render (loading state removal task)
  const [isImageError, setIsImageError] = useState(false);
  
  // Animation state for smooth entrance
  const [isVisible, setIsVisible] = useState(false);
  
  // Trigger smooth entrance animation immediately
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  // Action bar states
  const [addedToList, setAddedToList] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);
  
  // Trailer states
  const [trailerVideoId, setTrailerVideoId] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;

  // Movie data object for FavoritesManager
  const movieData = { title, year, slug, poster, id: mediaId, tmdbId };

  // Update state when props change (navigation between movies)
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
      setIsImageError(false);
    }
  }, [initialPoster]);

  useEffect(() => {
    if (initialSlug) {
      setSlug(initialSlug);
    }
  }, [initialSlug]);

  // Load initial state from localStorage
  useEffect(() => {
    try {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    } catch (error) {
      // Remove console.error to prevent hydration mismatches
      // Set safe defaults
      setHearted(false);
      setBookmarked(false);
    }
  }, [mediaId]);

  // Progressive loading disabled to prevent hydration mismatches
  // Images will load with opacity transition instead of conditional rendering

  // Reset error state when poster changes
  useEffect(() => {
    if (poster !== initialPoster) {
      setIsImageError(false);
    }
  }, [poster, initialPoster]);

  // Listen for favorites updates from other components
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

  // No poster enhancement - use provided data only for maximum speed

  // Fetch trailer data on component mount for better UX
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

  // Handle trailer modal - fetch trailer on demand
  const handlePlayTrailer = async () => {
    if (!tmdbId) return;
    
    // Only fetch if we don't have trailer data yet
    if (!trailerVideoId && !isLoadingTrailer) {
      setIsLoadingTrailer(true);
      try {
        const response = await fetch(`/api/tmdb-trailer?tmdbId=${tmdbId}`);
        const data = await response.json();
        
        if (data.videoId) {
          setTrailerVideoId(data.videoId);
          setShowTrailer(true); // Show trailer after loading
        }
      } catch (error) {
        console.error('Error fetching trailer:', error);
      } finally {
        setIsLoadingTrailer(false);
      }
    } else if (trailerVideoId) {
      setShowTrailer(true); // Show existing trailer
    }
  };

  const handleCloseTrailer = () => {
    setShowTrailer(false);
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
      <div style={styles.movieHeader}>

      {/* Poster with trailer overlay */}
      <div style={styles.posterContainer}>
        {/* Inner wrapper sized to the image so overlay aligns to poster edges */}
        <div style={styles.posterInner}>
          <img
            src={poster}
            alt={`Poster for ${title}`}
            style={{ ...styles.largePoster, opacity: 1 }}
            onError={() => setIsImageError(true)}
            onDoubleClick={() => {
              setAddedToList(!addedToList);
              setShowAddedAnimation(true);
              setTimeout(() => setShowAddedAnimation(false), 1500);
            }}
          />

          {/* Error fallback */}
          {isImageError && (
            <div style={styles.headerPlaceholder}>
              <div style={styles.headerErrorText}>📷</div>
              <div style={styles.headerErrorSubtext}>Poster unavailable</div>
            </div>
          )}

          {/* Trailer overlay — only shown when trailer exists */}
          {trailerVideoId && (
            <div style={styles.posterFooter}>
              <button
                onClick={handlePlayTrailer}
                style={styles.posterFooterTrailer}
                aria-label="Play trailer"
              >
                <PlayCircle size={36} color="#ffffff" fill="rgba(255,255,255,0.2)" strokeWidth={1.2} />
                <span style={styles.trailerOverlayLabel}>Trailer</span>
              </button>
            </div>
          )}

          {showAddedAnimation && (
            <div style={styles.addedAnimation}>+ added</div>
          )}
        </div>
      </div>

      {/* Streaming availability - commented out due to often incorrect data 
          TBD = placeholder when TMDB/Claude APIs haven't provided streaming data yet */}
      {/* {initialStreaming && initialStreaming.length > 0 && initialStreaming !== 'TBD' && (
        <div style={styles.streamingInfo}>
          <span style={styles.streamingText}>
            {`Streaming on ${initialStreaming}`}
          </span>
          {/* TODO: Add data freshness indicator - track when streaming data was last updated */}
        {/* </div>
      )} */}
      
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
  movieHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Center everything
    padding: '0px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'relative', // For positioning the action bar
  },
  posterContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '0',
  },

  posterInner: {
    position: 'relative',
    width: '267px',
    height: '400px',
    borderRadius: '12px',
    overflow: 'hidden',
  },

  posterFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: '40px 12px 14px',
  },

  posterFooterTrailer: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 0',
  },

  trailerOverlayLabel: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '0.01em',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  utilityRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
    width: '267px',
    padding: '8px 0 0',
  },

  utilityButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  iconWithTextHorizontal: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  },

  iconLabel: {
    fontSize: 'var(--font-xs)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: '1',
  },

  iconWithText: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexDirection: 'column',
  },
  largePoster: {
    width: '267px',
    height: '400px',
    objectFit: 'contain',
    display: 'block',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '12px 20px 0',
  },
  movieTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
    margin: 0,
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  movieYear: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#6b7280',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  slug: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '16px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    textAlign: 'center',
    maxWidth: '100%',
  },
  streamingInfo: {
    width: '100%',
    textAlign: 'left',
    marginBottom: '8px',
    marginTop: '2px',
    paddingLeft: '25px',
  },
  streamingText: {
    fontSize: 'var(--font-sm)', // Responsive: 14px desktop, 16px mobile
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit',
    wordWrap: 'break-word',
    lineHeight: '1.3',
  },
  streamingLink: {
    color: '#777777',
    textDecoration: 'underline',
    textDecorationColor: '#e0e0e0',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    fontSize: 'var(--font-sm)', // Responsive: 14px desktop, 16px mobile
    fontWeight: '400',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  addedAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '32px',
    fontWeight: '600',
    color: '#ffffff',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
    animation: 'fadeInOut 1.5s ease-in-out',
    pointerEvents: 'none',
    zIndex: 10,
  },
  // Trailer modal styles
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
    maxWidth: '800px',
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
    width: '35px',
    height: '35px',
    fontSize: '20px',
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
  // Progressive loading styles
  headerPlaceholder: {
    width: '100%',
    height: '100%',
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
  headerLoadingText: {
    fontSize: 'var(--font-sm)', // Responsive: 14px desktop, 16px mobile
    color: '#94a3b8',
    fontWeight: '500',
  },
  headerErrorText: {
    fontSize: '48px',
    opacity: 0.3,
    marginBottom: '8px',
  },
  headerErrorSubtext: {
    fontSize: 'var(--font-meta)', // Responsive: 12px desktop, 13px mobile
    color: '#94a3b8',
    fontWeight: '500',
  },
};