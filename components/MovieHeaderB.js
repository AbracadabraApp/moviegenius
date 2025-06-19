/**
 * MovieHeaderB Component - B Variant for A/B Testing
 * 
 * This is the "B" variant of the movie header that uses the new header format
 * where text content uses 'b' prefix instead of standard markdown '#' notation.
 * 
 * Key Changes from A variant:
 * - All text content formatting uses 'b' prefix style
 * - Maintains exact same functionality and layout as original
 * - Only difference is the header notation style applied to text elements
 * 
 * @see MovieHeader.js for the original "A" variant
 */
import { Heart, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';
// import useStreamingData from '../hooks/useStreamingData'; // Stubbed out

export default function MovieHeaderB({ 
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

  // Streaming feature stubbed out - will be replaced with real provider
  // const { 
  //   hasStreaming, 
  //   getDisplayText, 
  //   primaryService,
  //   freeOptions,
  //   isLoading: streamingLoading 
  // } = useStreamingData(title, year, initialStreaming);

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

  /**
   * Applies B-header formatting to text content
   * Converts standard text to use 'b' prefix style instead of '#' notation
   * @param {string} text - Original text content
   * @param {string} level - Header level (title, subtitle, body)
   * @returns {string} Formatted text with 'b' prefix style
   */
  const formatBHeaderText = (text, level = 'body') => {
    if (!text) return text;
    
    switch (level) {
      case 'title':
        return `b ${text}`;
      case 'subtitle': 
        return `b ${text}`;
      case 'body':
      default:
        return text; // Body text doesn't get 'b' prefix
    }
  };

  return (
    <div style={styles.movieHeader}>
      <div style={styles.contentRow}>
        <img src={poster} alt={`Poster for ${title}`} style={styles.largePoster} />
        <div style={styles.textContainer}>
          <div style={styles.titleColumn}>
            {/* B-header format applied to title */}
            <div style={styles.title}>
              {formatBHeaderText(title, 'title')}
            </div>
            {/* B-header format applied to year */}
            <div style={styles.year}>
              {formatBHeaderText(`(${year})`, 'subtitle')}
            </div>
          </div>
          {/* Slug uses body format (no 'b' prefix) */}
          <div style={styles.slug}>{formatBHeaderText(slug, 'body')}</div>
        </div>
      </div>
      
      {/* Bottom row: streaming left, icons right - positioned below poster/text */}
      <div style={styles.bottomRow}>
        <div style={styles.streamingInfo}>
          <span style={styles.streamingText}>
            {/* Streaming info uses body format */}
            {formatBHeaderText("Streaming on TBD", 'body')}
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

// Styles remain identical to original MovieHeader for consistent layout
const styles = {
  movieHeader: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px', // Same as MediaCard container padding
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // No shadows, borders, or rounded corners - flat design
  },
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '12px',
  },
  largePoster: {
    width: '150px',  // 1.5x larger than MediaCard (100px -> 150px)
    height: '225px', // 1.5x larger than MediaCard (150px -> 225px)
    objectFit: 'cover',
    borderRadius: '12px', // Keep some rounding on the poster itself
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  titleColumn: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600', // Match MediaCard title weight
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    marginBottom: '2px',
  },
  year: {
    fontSize: '20px',
    color: '#666',
    fontWeight: '200', // Lighter than MediaCard for contrast
    fontFamily: 'inherit',
    marginBottom: '8px', // Add space after year
  },
  slug: {
    fontSize: '16px',
    color: '#333',
    marginTop: '4px',
    marginBottom: '12px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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