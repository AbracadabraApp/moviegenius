/**
 * TestMovieHeaderLarge Component - Test Version of Production Header
 * 
 * Identical to production MovieHeaderLarge but adapted for static test data.
 * Features:
 * - Large poster display with streaming info
 * - Floating action bar with favorites (localStorage-based)
 * - Interactive poster with double-click functionality
 * - Production-grade styling and functionality
 * 
 * @component
 */
import { Plus, Check, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TestMovieHeaderLarge({ 
  title, 
  year, 
  overview,
  poster,
  tmdbId,
  director,
  genre,
  streaming = null,
  animationDelay = 0
}) {
  console.log('🧪 TEST MovieHeaderLarge component loaded');

  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [addedToList, setAddedToList] = useState(false);
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  
  // Movie data object for localStorage management
  const movieData = { 
    title, 
    year, 
    slug: overview, 
    poster: poster || '/images/placeholder-poster.jpg', 
    id: mediaId 
  };

  // Trigger smooth entrance animation immediately
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Load initial state from localStorage (test favorites system)
  useEffect(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem('moviegenius-favorites') || '{"hearted": [], "bookmarked": []}');
      setHearted(favorites.hearted.includes(mediaId));
      setBookmarked(favorites.bookmarked.includes(mediaId));
    } catch (error) {
      setHearted(false);
      setBookmarked(false);
    }
  }, [mediaId]);

  // Simple localStorage-based favorites management for test
  const toggleHeart = () => {
    try {
      const favorites = JSON.parse(localStorage.getItem('moviegenius-favorites') || '{"hearted": [], "bookmarked": []}');
      const newHearted = !hearted;
      
      if (newHearted) {
        if (!favorites.hearted.includes(mediaId)) {
          favorites.hearted.push(mediaId);
        }
      } else {
        favorites.hearted = favorites.hearted.filter(id => id !== mediaId);
      }
      
      localStorage.setItem('moviegenius-favorites', JSON.stringify(favorites));
      setHearted(newHearted);
    } catch (error) {
      console.error('Failed to toggle heart state:', error);
    }
  };

  const toggleBookmark = () => {
    try {
      const favorites = JSON.parse(localStorage.getItem('moviegenius-favorites') || '{"hearted": [], "bookmarked": []}');
      const newBookmarked = !bookmarked;
      
      if (newBookmarked) {
        if (!favorites.bookmarked.includes(mediaId)) {
          favorites.bookmarked.push(mediaId);
        }
      } else {
        favorites.bookmarked = favorites.bookmarked.filter(id => id !== mediaId);
      }
      
      localStorage.setItem('moviegenius-favorites', JSON.stringify(favorites));
      setBookmarked(newBookmarked);
    } catch (error) {
      console.error('Failed to toggle bookmark state:', error);
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
            onClick={toggleBookmark}
            style={styles.actionButton}
            aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
          >
            <div style={styles.iconWithText}>
              <Plus
                size={20}
                color={bookmarked ? '#000000' : '#6b7280'}
                strokeWidth={bookmarked ? 3 : 2}
              />
              <span style={{
                ...styles.iconLabel,
                color: bookmarked ? '#000000' : '#6b7280',
                fontWeight: bookmarked ? '700' : '500'
              }}>
                Add
              </span>
            </div>
          </button>
          
          <button
            onClick={toggleHeart}
            style={styles.actionButton}
            aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
          >
            <div style={styles.iconWithText}>
              <Check
                size={20}
                color={hearted ? '#000000' : '#6b7280'}
                strokeWidth={hearted ? 3 : 2}
              />
              <span style={{
                ...styles.iconLabel,
                color: hearted ? '#000000' : '#6b7280',
                fontWeight: hearted ? '700' : '500'
              }}>
                Seen
              </span>
            </div>
          </button>
          
          {/* Play button (non-functional in test) */}
          <button
            onClick={() => console.log('🧪 TEST: Trailer would play for', title)}
            style={styles.actionButton}
            aria-label="Play trailer (test mode)"
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
        </div>
        
        {/* Large poster at top, centered */}
        <div style={styles.posterContainer}>
          <img 
            src={poster || '/images/placeholder-poster.jpg'} 
            alt={`Poster for ${title}`} 
            style={{
              ...styles.largePoster,
              opacity: 1
            }}
            onError={() => {
              setIsImageError(true);
            }}
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
          
          {showAddedAnimation && (
            <div style={styles.addedAnimation}>
              + added
            </div>
          )}
        </div>
        
        {/* Movie Info */}
        <div style={styles.movieInfo}>
          <h1 style={styles.title}>{title}</h1>
          <div style={styles.metadata}>
            <span style={styles.year}>{year}</span>
            {director && <span style={styles.director}> • {director}</span>}
            {genre && <span style={styles.genre}> • {genre}</span>}
          </div>
          {overview && (
            <p style={styles.overview}>{overview}</p>
          )}
        </div>
        
        {/* Streaming availability */}
        {streaming && streaming.length > 0 && streaming !== 'TBD' && (
          <div style={styles.streamingInfo}>
            <span style={styles.streamingText}>
              {`Streaming on ${streaming}`}
            </span>
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
    alignItems: 'center',
    padding: '0px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'relative',
    paddingBottom: '20px',
  },
  
  actionBarContainer: {
    position: 'absolute',
    right: '16px',
    top: '16px',
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
    justifyContent: 'center',
    marginBottom: '16px',
    paddingTop: '0px',
  },
  
  largePoster: {
    maxWidth: '267px',
    width: 'auto',
    height: '400px',
    objectFit: 'contain',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  
  movieInfo: {
    textAlign: 'center',
    width: '100%',
    paddingLeft: '20px',
    paddingRight: '20px',
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
  },
  
  metadata: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  
  year: {
    fontWeight: '500',
  },
  
  director: {
    fontWeight: '400',
  },
  
  genre: {
    fontWeight: '400',
  },
  
  overview: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.5',
    margin: '0',
    textAlign: 'left',
  },
  
  streamingInfo: {
    width: '100%',
    textAlign: 'left',
    marginTop: '16px',
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
  
  headerPlaceholder: {
    width: '267px',
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
  
  headerErrorText: {
    fontSize: '48px',
    opacity: 0.3,
    marginBottom: '8px',
  },
  
  headerErrorSubtext: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
  },
};