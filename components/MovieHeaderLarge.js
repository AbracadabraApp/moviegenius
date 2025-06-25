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
import { Heart, Bookmark, CirclePlus, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  tmdbId 
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [slug, setSlug] = useState(initialSlug || '');
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  
  // Action bar states
  const [addedToList, setAddedToList] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  
  // Movie data object for FavoritesManager
  const movieData = { title, year, slug, poster, id: mediaId };

  // Update state when props change (navigation between movies)
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
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
      console.error('Failed to load favorites state:', error);
      // Set safe defaults
      setHearted(false);
      setBookmarked(false);
    }
  }, [mediaId]);

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
      {/* Action Bar */}
      <div 
        style={styles.actionBarContainer}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <button
          onClick={() => setAddedToList(!addedToList)}
          style={styles.actionButton}
          aria-label="Add to list"
        >
          <CirclePlus
            size={32}
            color="#6b7280"
            fill={addedToList ? '#9ca3af' : 'none'}
          />
        </button>
        
        <button
          onClick={() => {
            try {
              const newState = FavoritesManager.toggleHeart(movieData);
              setHearted(newState);
            } catch (error) {
              console.error('Failed to toggle heart state:', error);
              // Optionally show user feedback here
            }
          }}
          style={styles.actionButton}
          aria-label={hearted ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={24}
            color={hearted ? '#ef4444' : '#6b7280'}
            fill={hearted ? '#ef4444' : 'none'}
          />
        </button>
      </div>
      
      {/* Large poster at top, left-aligned */}
      <div style={styles.posterContainer}>
        <img 
          src={poster} 
          alt={`Poster for ${title}`} 
          style={styles.largePoster}
          onDoubleClick={() => {
            setAddedToList(!addedToList);
            setShowAddedAnimation(true);
            setTimeout(() => setShowAddedAnimation(false), 1500);
          }}
        />
        {showAddedAnimation && (
          <div style={styles.addedAnimation}>
            + added
          </div>
        )}
      </div>
      
      {/* Title and year below poster */}
      <div style={styles.titleContainer}>
        <div style={styles.title}>{title}</div>
        <div style={styles.year}>({year})</div>
      </div>
      
      {/* Streaming info directly under title */}
      <div style={styles.streamingInfo}>
        <span style={styles.streamingText}>
          Streaming on TBD
        </span>
      </div>
      
      </div>
    </>
  );
}

const styles = {
  movieHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Center everything
    padding: '0px 16px 8px 16px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'relative', // For positioning the action bar
  },
  actionBarContainer: {
    position: 'absolute',
    right: '16px',
    bottom: '130px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '13px 4.5px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'center',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'scale(1)',
  },
  posterContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '5px',
    paddingLeft: '20px',
    paddingRight: '20px',
    paddingTop: '4px',
    paddingBottom: '5px',
  },
  largePoster: {
    width: '100%',     // Fill container width
    height: 'auto',   // Maintain aspect ratio
    objectFit: 'cover',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Add some shadow for depth
    clipPath: 'inset(0 0 30px 0)', // Crop 30px from bottom
    // Note: Browser fallbacks handled via CSS detection in real implementation
  },
  titleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
    marginBottom: '7px', // Reduced from 12px to 7px (40% tighter)
    marginTop: '-30px',
    gap: '8px',
    width: '100%',
    paddingLeft: '20px',
  },
  title: {
    fontSize: '22px', // Slightly larger than MovieHeader (20px -> 22px)
    fontWeight: '400', // Reduced from 600 to 400
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    margin: 0,
  },
  year: {
    fontSize: '18px', // Slightly larger than MovieHeader (20px -> 18px but more prominent)
    color: '#666',
    fontWeight: '300',
    fontFamily: 'inherit',
    margin: 0,
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
    marginBottom: '0px',
    marginTop: '-10px', // Move up 10px (was -20px, now -10px = moved down 10px)
    paddingLeft: '20px',
  },
  streamingText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit',
    wordWrap: 'break-word',
    lineHeight: '1.3',
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
};