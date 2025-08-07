/**
 * MovieCardGlass Component - Apple-inspired translucent movie card
 * 
 * Modern glassmorphism card design featuring:
 * - Translucent backdrop blur effect with subtle borders
 * - Poster-dominant layout with elegant typography
 * - Integrated trailer preview functionality
 * - Seamless FavoritesManager integration
 * - Smooth hover and interaction animations
 * - Optimized for horizontal scrolling layouts
 * 
 * @component
 * @example
 * <MovieCardGlass
 *   title="The Matrix"
 *   year={1999}
 *   tmdbId={603}
 *   slug="Reality is a simulation"
 *   poster_url="https://image.tmdb.org/t/p/w500/..."
 *   trailer_url="dQw4w9WgXcQ"
 * />
 */
import { useState, useEffect, useRef } from 'react';
import { Plus, Check, Play, X } from 'lucide-react';
import { FavoritesManager } from './FavoritesManager';

/**
 * @param {Object} props - Component props
 * @param {string} props.title - Movie title
 * @param {number} props.year - Movie release year
 * @param {number} props.tmdbId - TMDB movie ID for navigation
 * @param {string} props.slug - Movie description/tagline
 * @param {string} props.poster_url - Movie poster URL
 * @param {string} [props.trailer_url] - YouTube trailer video ID
 * @param {Function} [props.onClick] - Custom click handler
 * @param {boolean} [props.showTrailerButton=true] - Show/hide trailer button
 * @param {string} [props.size='medium'] - Card size: 'small', 'medium', 'large'
 */
export default function MovieCardGlass({
  title,
  year,
  tmdbId,
  slug,
  poster_url,
  trailer_url,
  onClick,
  showTrailerButton = true,
  size = 'medium'
}) {
  // State management
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerVideoId, setTrailerVideoId] = useState(trailer_url);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Refs for animations
  const cardRef = useRef(null);

  // Generate media ID for favorites
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  const movieData = { 
    title, 
    year, 
    slug, 
    poster: poster_url, 
    id: mediaId,
    tmdbId 
  };

  // Load favorites state
  useEffect(() => {
    try {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    } catch (error) {
      console.error('Error loading favorites state:', error);
    }
  }, [mediaId]);

  // Listen for favorites updates
  useEffect(() => {
    const handleMoviesUpdate = () => {
      try {
        setHearted(FavoritesManager.isMovieHearted(mediaId));
        setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
      } catch (error) {
        console.error('Error updating favorites state:', error);
      }
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, [mediaId]);

  // Handle card click navigation
  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons
    if (e.target.closest('button') || e.target.closest('[data-action]')) {
      return;
    }

    if (onClick) {
      onClick(movieData);
    } else if (tmdbId) {
      window.location.href = `/movie/${tmdbId}`;
    }
  };

  // Handle trailer loading and display
  const handlePlayTrailer = async (e) => {
    e.stopPropagation();
    
    if (!tmdbId && !trailerVideoId) return;
    
    // If we already have trailer ID, show it
    if (trailerVideoId) {
      setShowTrailer(true);
      return;
    }

    // Fetch trailer from TMDB API
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
  };

  const handleCloseTrailer = () => {
    setShowTrailer(false);
  };

  // Handle favorites actions
  const handleToggleHeart = (e) => {
    e.stopPropagation();
    try {
      const newState = FavoritesManager.toggleHeart(movieData);
      setHearted(newState);
    } catch (error) {
      console.error('Error toggling heart:', error);
    }
  };

  const handleToggleBookmark = (e) => {
    e.stopPropagation();
    try {
      const newState = FavoritesManager.toggleBookmark(movieData);
      setBookmarked(newState);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Get size-specific styles
  const sizeStyles = getSizeStyles(size);
  const styles = getStyles(sizeStyles, isHovered, imageLoaded);

  return (
    <>
      {/* Trailer Modal */}
      {showTrailer && trailerVideoId && (
        <div style={styles.trailerOverlay} onClick={handleCloseTrailer}>
          <div style={styles.trailerModal} onClick={(e) => e.stopPropagation()}>
            <button 
              style={styles.closeButton}
              onClick={handleCloseTrailer}
              aria-label="Close trailer"
            >
              <X size={20} />
            </button>
            <div style={styles.trailerContainer}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${trailerVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title={`${title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={styles.trailerIframe}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div
        ref={cardRef}
        style={styles.card}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${title} (${year})`}
      >
        {/* Poster Section */}
        <div style={styles.posterContainer}>
          {!imageError ? (
            <img
              src={poster_url || '/images/placeholder-poster.jpg'}
              alt={`${title} poster`}
              style={styles.poster}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div style={styles.posterPlaceholder}>
              <div style={styles.placeholderIcon}>🎬</div>
              <div style={styles.placeholderText}>No Image</div>
            </div>
          )}

          {/* Action Buttons Overlay */}
          <div style={styles.actionOverlay}>
            <button
              onClick={handleToggleHeart}
              style={{
                ...styles.actionButton,
                ...styles.heartButton,
                backgroundColor: hearted ? 'rgba(34, 197, 94, 0.9)' : 'rgba(0, 0, 0, 0.7)',
              }}
              aria-label={hearted ? 'Remove from seen' : 'Mark as seen'}
              data-action="heart"
            >
              <Check size={16} color="white" strokeWidth={hearted ? 3 : 2} />
            </button>

            <button
              onClick={handleToggleBookmark}
              style={{
                ...styles.actionButton,
                ...styles.bookmarkButton,
                backgroundColor: bookmarked ? 'rgba(59, 130, 246, 0.9)' : 'rgba(0, 0, 0, 0.7)',
              }}
              aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
              data-action="bookmark"
            >
              <Plus size={16} color="white" strokeWidth={bookmarked ? 3 : 2} />
            </button>

            {/* Trailer Button */}
            {showTrailerButton && (trailerVideoId || tmdbId) && (
              <button
                onClick={handlePlayTrailer}
                style={styles.trailerButton}
                aria-label="Play trailer"
                data-action="trailer"
                disabled={isLoadingTrailer}
              >
                <Play 
                  size={20} 
                  color="white" 
                  fill={isLoadingTrailer ? "transparent" : "white"}
                />
                {isLoadingTrailer && <div style={styles.loadingSpinner} />}
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div style={styles.content}>
          <div style={styles.titleContainer}>
            <h3 style={styles.title}>{title}</h3>
            <span style={styles.year}>({year})</span>
          </div>
          
          {slug && (
            <p style={styles.slug}>{slug}</p>
          )}
        </div>
      </div>
    </>
  );
}

// Size configurations
const getSizeStyles = (size) => {
  const sizes = {
    small: {
      width: '200px',
      posterHeight: '280px',
      titleSize: '14px',
      slugSize: '12px',
      padding: '12px',
    },
    medium: {
      width: '240px',
      posterHeight: '320px',
      titleSize: '16px',
      slugSize: '13px',
      padding: '16px',
    },
    large: {
      width: '280px',
      posterHeight: '380px',
      titleSize: '18px',
      slugSize: '14px',
      padding: '20px',
    },
  };
  
  return sizes[size] || sizes.medium;
};

// Main styles function
const getStyles = (sizeStyles, isHovered, imageLoaded) => ({
  card: {
    width: sizeStyles.width,
    minWidth: sizeStyles.width, // Prevent compression
    flexShrink: 0, // Don't allow flex container to shrink this item
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    
    // Apple-style glassmorphism
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: isHovered 
      ? '0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
      : '0 10px 30px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  posterContainer: {
    position: 'relative',
    width: '100%',
    height: sizeStyles.posterHeight,
    overflow: 'hidden',
    borderRadius: '12px 12px 0 0',
  },

  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: imageLoaded ? 1 : 0.8,
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
  },

  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(0, 0, 0, 0.5)',
  },

  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },

  placeholderText: {
    fontSize: '12px',
    fontWeight: '500',
  },

  actionOverlay: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    opacity: isHovered ? 1 : 0.7,
    transition: 'opacity 0.3s ease',
  },

  actionButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },

  heartButton: {
    // Styles handled dynamically in component
  },

  bookmarkButton: {
    // Styles handled dynamically in component
  },

  trailerButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    position: 'relative',
  },

  loadingSpinner: {
    position: 'absolute',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  content: {
    padding: sizeStyles.padding,
    paddingTop: '16px',
  },

  titleContainer: {
    marginBottom: '8px',
  },

  title: {
    fontSize: sizeStyles.titleSize,
    fontWeight: '600',
    margin: 0,
    marginBottom: '4px',
    color: 'rgba(0, 0, 0, 0.9)',
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
  },

  year: {
    fontSize: '13px',
    color: 'rgba(0, 0, 0, 0.6)',
    fontWeight: '500',
  },

  slug: {
    fontSize: sizeStyles.slugSize,
    color: 'rgba(0, 0, 0, 0.7)',
    lineHeight: '1.4',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textShadow: '0 1px 1px rgba(255, 255, 255, 0.8)',
  },

  // Trailer Modal Styles
  trailerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },

  trailerModal: {
    position: 'relative',
    width: '100%',
    maxWidth: '900px',
    aspectRatio: '16/9',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  },

  closeButton: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    transition: 'background-color 0.2s',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
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
});

// Add keyframe animation for loading spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}