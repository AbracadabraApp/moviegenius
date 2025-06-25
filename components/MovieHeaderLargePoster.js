/**
 * MovieHeaderLargePoster Component
 * 
 * Large poster format movie header for detail pages.
 * Preserves original MovieHeader functionality while offering vertical layout with larger poster.
 * Fallback-safe implementation - if this component fails, pages can revert to MovieHeader.
 */
import { Heart, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';

export default function MovieHeaderLargePoster({ 
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
    setHearted(FavoritesManager.isMovieHearted(mediaId));
    setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
  }, [mediaId]);

  // Listen for favorites updates from other components
  useEffect(() => {
    const handleMoviesUpdate = () => {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, [mediaId]);

  return (
    <div style={styles.movieHeader}>
      {/* Large poster at top, centered */}
      <div style={styles.posterContainer}>
        <img 
          src={poster} 
          alt={`Poster for ${title}`} 
          style={styles.largePoster}
        />
      </div>
      
      {/* Title and year below poster */}
      <div style={styles.titleContainer}>
        <div style={styles.title}>{title}</div>
        <div style={styles.year}>({year})</div>
      </div>
      
      {/* Slug below title */}
      <div style={styles.slug}>{slug}</div>
      
      {/* Bottom row: streaming left, icons right */}
      <div style={styles.bottomRow}>
        <div style={styles.streamingInfo}>
          <span style={styles.streamingText}>
            Streaming on TBD
          </span>
        </div>
        <div style={styles.iconRow}>
          <button
            onClick={() => {
              const newState = FavoritesManager.toggleHeart(movieData);
              setHearted(newState);
            }}
            style={styles.iconButton}
            aria-label={hearted ? 'Remove from favorites' : 'Add to favorites'}
            role="button"
          >
            <Heart
              size={18}
              color={hearted ? '#ef4444' : '#374151'}
              fill={hearted ? '#ef4444' : 'none'}
            />
          </button>
          <button
            onClick={() => {
              const newState = FavoritesManager.toggleBookmark(movieData);
              setBookmarked(newState);
            }}
            style={styles.iconButton}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark movie'}
            role="button"
          >
            <Bookmark
              size={18}
              color={bookmarked ? '#6b7280' : '#374151'}
              fill={bookmarked ? '#6b7280' : 'none'}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  movieHeader: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    alignItems: 'center', // Center everything
  },
  
  posterContainer: {
    marginBottom: '16px',
    position: 'relative',
  },
  
  largePoster: {
    width: '200px',  // Larger than standard MovieHeader (150px)
    height: '300px', // Larger than standard MovieHeader (225px)
    objectFit: 'cover',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Add subtle shadow
  },
  
  titleContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '8px',
    textAlign: 'center',
  },
  
  title: {
    fontSize: '24px', // Larger than standard MovieHeader (20px)
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    marginBottom: '4px',
    textAlign: 'center',
  },
  
  year: {
    fontSize: '20px',
    color: '#666',
    fontWeight: '200',
    fontFamily: 'inherit',
    marginBottom: '8px',
    textAlign: 'center',
  },
  
  slug: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '16px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    textAlign: 'center',
    maxWidth: '400px', // Limit width for readability
  },
  
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px', // Match slug width
    paddingTop: '8px',
  },
  
  streamingInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: '8px',
  },
  
  streamingText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit',
    wordWrap: 'break-word',
    lineHeight: '1.3',
  },
  
  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'center',
  },
  
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
};