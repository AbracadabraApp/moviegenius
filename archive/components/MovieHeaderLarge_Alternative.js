/**
 * ARCHIVED: MovieHeaderLarge_Alternative Component - Layout B for A/B Testing
 *
 * This component was used for AB testing and has been consolidated into
 * the production MovieHeaderLarge component with enhanced features.
 *
 * Archived: Production deployment cleanup
 * Replacement: components/MovieHeaderLarge.js (production version)
 *
 * Alternative large poster format for movie detail pages with enhanced interactivity.
 * Features vertical layout, larger poster, floating action bar, and double-click interactions.
 *
 * @component
 * @example
 * <MovieHeaderLarge_Alternative
 *   title="Fight Club"
 *   year={1999}
 *   initialSlug="An insomniac office worker..."
 *   initialPoster="https://image.tmdb.org/..."
 *   tmdbId={550}
 * />
 */
import { Heart, CirclePlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';

export default function MovieHeaderLarge_Alternative({
  title,
  year,
  initialSlug,
  initialPoster,
  initialStreaming,
  tmdbId,
}) {
  // State management for favorites and user interactions
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [slug, setSlug] = useState(initialSlug || '');
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');

  // Action bar interaction states
  const [addedToList, setAddedToList] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);

  // Generate unique media ID from title and year for favorites management
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;

  // Movie data object for FavoritesManager integration
  const movieData = { title, year, slug, poster, id: mediaId };

  /**
   * Updates poster state when props change (navigation between movies)
   */
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
    }
  }, [initialPoster]);

  /**
   * Updates slug state when props change
   */
  useEffect(() => {
    if (initialSlug) {
      setSlug(initialSlug);
    }
  }, [initialSlug]);

  /**
   * Loads initial favorite state from localStorage on component mount
   */
  useEffect(() => {
    setHearted(FavoritesManager.isMovieHearted(mediaId));
    setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
  }, [mediaId]);

  /**
   * Listens for favorites updates from other components to keep state synchronized
   */
  useEffect(() => {
    const handleMoviesUpdate = () => {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, [mediaId]);

  /**
   * Handles double-click on poster to add/remove from list with animation
   */
  const handlePosterDoubleClick = () => {
    setAddedToList(!addedToList);
    setShowAddedAnimation(true);
    setTimeout(() => setShowAddedAnimation(false), 1500);
  };

  /**
   * Handles plus button click to toggle add-to-list state
   */
  const handlePlusClick = () => {
    setAddedToList(!addedToList);
  };

  /**
   * Handles heart button click using FavoritesManager
   */
  const handleHeartClick = () => {
    const newState = FavoritesManager.toggleHeart(movieData);
    setHearted(newState);
  };

  return (
    <>
      {/* CSS-in-JS keyframe animation for "+ added" text */}
      <style jsx>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
      `}</style>

      <div style={styles.movieHeader}>
        {/* Floating Action Bar - Right side with hover effects */}
        <div
          style={styles.actionBarContainer}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Add to List Button */}
          <button onClick={handlePlusClick} style={styles.actionButton} aria-label="Add to list">
            <CirclePlus size={32} color="#6b7280" fill={addedToList ? '#9ca3af' : 'none'} />
          </button>

          {/* Heart/Favorites Button */}
          <button
            onClick={handleHeartClick}
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

        {/* Large Poster Container with Double-Click Interaction */}
        <div style={styles.posterContainer}>
          <img
            src={poster}
            alt={`Poster for ${title}`}
            style={styles.largePoster}
            onDoubleClick={handlePosterDoubleClick}
          />
          {/* Animation overlay for double-click feedback */}
          {showAddedAnimation && <div style={styles.addedAnimation}>+ added</div>}
        </div>

        {/* Movie Title and Year */}
        <div style={styles.titleContainer}>
          <div style={styles.title}>{title}</div>
          <div style={styles.year}>({year})</div>
        </div>

        {/* Streaming Information */}
        <div style={styles.streamingInfo}>
          <span style={styles.streamingText}>Streaming on TBD</span>
        </div>
      </div>
    </>
  );
}

/**
 * Styles object containing all component styling
 * Uses CSS-in-JS approach for component encapsulation
 */
const styles = {
  // Main container for the movie header
  movieHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'relative', // For positioning the floating action bar
  },

  // Floating action bar container
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
    boxShadow:
      '0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'center',
  },

  // Individual action buttons (plus, heart)
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

  // Poster container with padding and positioning
  posterContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '8px',
    paddingLeft: '20px',
    paddingRight: '20px',
    paddingTop: '4px',
    paddingBottom: '10px',
  },

  // Large poster image styling
  largePoster: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },

  // Title and year container
  titleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
    marginBottom: '7px',
    gap: '8px',
    width: '100%',
    paddingLeft: '20px',
  },

  // Movie title styling
  title: {
    fontSize: '22px',
    fontWeight: '400',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    margin: 0,
  },

  // Release year styling
  year: {
    fontSize: '18px',
    color: '#666',
    fontWeight: '300',
    fontFamily: 'inherit',
    margin: 0,
  },

  // Streaming information container
  streamingInfo: {
    width: '100%',
    textAlign: 'left',
    marginBottom: '5px',
    marginTop: '-10px',
    paddingLeft: '20px',
  },

  // Streaming text styling
  streamingText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit',
    wordWrap: 'break-word',
    lineHeight: '1.3',
  },

  // Animation overlay for double-click feedback
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
