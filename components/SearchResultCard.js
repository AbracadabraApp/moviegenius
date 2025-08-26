/**
 * SearchResultCard Component - Optimized for search result scanning and discovery
 * 
 * Key design principles:
 * - Fast scanning: Compact layout with prominent title/year
 * - Quick trailer access: Integrated play button without disrupting flow
 * - Touch-friendly: Multiple interaction zones
 * - Information hierarchy: Essential info first, details on demand
 * 
 * @component
 */
import { Check, Plus, PlayCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';
import MoviePlaceholder from './MoviePlaceholder';

/**
 * SearchResultCard - Specialized component for search results
 *
 * @param {Object} props
 * @param {string} props.title - Movie title (required)
 * @param {number} props.year - Release year (required)
 * @param {string} props.initialSlug - Initial description/slug (optional)
 * @param {string} props.overview - TMDB overview for search context (optional)
 * @param {string} props.contributors - Key contributors (director, actors) (optional)
 * @param {string} props.initialPoster - Initial poster URL (optional)
 * @param {string} props.initialStreaming - Streaming availability (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (optional)
 * @param {Function} props.onMovieClick - Navigate to movie detail (optional)
 * @param {Function} props.onTrailerPlay - Handle trailer playback (optional)
 * @param {boolean} props.showTrailer - Whether to show trailer integration (optional)
 */
export default function SearchResultCard({
  title,
  year,
  initialSlug,
  overview,
  contributors,
  initialPoster,
  initialStreaming,
  tmdbId,
  onMovieClick,
  onTrailerPlay,
  showTrailer = true,
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [trailerVideoId, setTrailerVideoId] = useState(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  const [slug, setSlug] = useState(initialSlug || '');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  const movieData = { title, year, slug, poster, id: mediaId };

  // Fetch trailer data if enabled
  useEffect(() => {
    const fetchTrailer = async () => {
      if (tmdbId && showTrailer && !trailerVideoId && !isLoadingTrailer) {
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
  }, [tmdbId, showTrailer, trailerVideoId, isLoadingTrailer]);

  // Favorites management
  useEffect(() => {
    setHearted(FavoritesManager.isMovieHearted(mediaId));
    setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
  }, [mediaId]);

  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons
    if (e.target.closest('button')) {
      return;
    }

    if (onMovieClick && tmdbId) {
      onMovieClick({ title, year, tmdb_id: tmdbId });
    }
  };

  const handleTrailerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onTrailerPlay && trailerVideoId) {
      onTrailerPlay(trailerVideoId, title);
    }
  };

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = FavoritesManager.toggleHeart(movieData);
    setHearted(newState);
  };

  const handleBookmarkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = FavoritesManager.toggleBookmark(movieData);
    setBookmarked(newState);
  };

  const handleDescriptionToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  return (
    <div 
      style={styles.card}
      onClick={handleCardClick}
    >
      {/* ROW 1: Poster + Title/Year + Contributors */}
      <div style={styles.contentRow}>
        {poster === '/images/placeholder-poster.jpg' ? (
          <div style={styles.poster}>
            <MoviePlaceholder title={title} year={year} compact={true} />
          </div>
        ) : (
          <img 
            src={poster} 
            alt={`Poster for ${title}`} 
            style={styles.poster}
            loading="lazy"
          />
        )}
        
        <div style={styles.textContainer}>
          <div style={styles.titleRow}>
            <h3 style={styles.title}>{title}</h3>
            <span style={styles.year}>({year})</span>
          </div>
          
          {/* Slug/tagline section */}
          {initialSlug && (
            <div style={styles.slugSection}>
              <p style={styles.slug}>{initialSlug}</p>
            </div>
          )}
          
          {/* Contributors section */}
          {contributors && (
            <div style={styles.contributorsSection}>
              <div style={styles.contributors}>
                {contributors.split('\n').map((line, index) => {
                  const colonIndex = line.indexOf(':');
                  
                  if (colonIndex === -1) {
                    // Line with just names (no colon) - increased margin for actor names
                    return (
                      <div key={index} style={{...styles.contributorLine, marginBottom: '6px'}}>
                        <span>
                          {line.split(', ').map((name, nameIndex) => (
                            <span key={nameIndex}>
                              <span style={styles.contributorNames}>{name.trim()}</span>
                              {nameIndex < line.split(', ').length - 1 && <span style={styles.contributorLabel}>, </span>}
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  }
                  
                  const label = line.substring(0, colonIndex + 1);
                  const names = line.substring(colonIndex + 2);
                  
                  if (names.trim() === '') {
                    // Label-only line (like "Starring:") - reduced margin
                    return (
                      <div key={index} style={{...styles.contributorLine, marginBottom: '2px'}}>
                        <span style={styles.contributorLabel}>{label}</span>
                      </div>
                    );
                  }
                  
                  // Label with names (like "Director: Name")
                  return (
                    <div key={index} style={styles.contributorLine}>
                      <span style={styles.contributorLabel}>{label} </span>
                      <span>
                        {names.split(', ').map((name, nameIndex) => (
                          <span key={nameIndex}>
                            <span style={styles.contributorNames}>{name.trim()}</span>
                            {nameIndex < names.split(', ').length - 1 && <span style={styles.contributorLabel}>, </span>}
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: Streaming info - left aligned */}
      {initialStreaming && (
        <div style={styles.streamingRowLeft}>
          <span style={styles.streamingText}>Streaming on {initialStreaming}</span>
        </div>
      )}

      {/* ROW 3: Overview (only when no slug) */}
      {!initialSlug && overview && (
        <div style={styles.overviewRow}>
          <p style={{
            ...styles.description,
            ...(isDescriptionExpanded ? {} : styles.descriptionTruncated)
          }}>
            {overview}
          </p>
          {overview.length > 280 && (
            <button
              onClick={handleDescriptionToggle}
              style={styles.expandButton}
              aria-label={isDescriptionExpanded ? 'Show less' : 'Show more'}
            >
              {isDescriptionExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* ROW 4: Action buttons - right aligned */}
      <div style={styles.actionRow}>
        {/* Trailer Button (if available) */}
        {showTrailer && trailerVideoId && (
          <button
            onClick={handleTrailerClick}
            style={styles.actionButton}
            aria-label="Play trailer"
          >
            <PlayCircle size={20} color="#D4AF37" fill="none" strokeWidth={2} />
            <span style={styles.trailerLabel}>Trailer</span>
          </button>
        )}

        {/* Seen Button */}
        <button
          onClick={handleHeartClick}
          style={styles.actionButton}
          aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
        >
          <Check 
            size={16} 
            color={hearted ? '#000000' : '#6b7280'} 
            strokeWidth={hearted ? 3 : 2} 
          />
          <span 
            style={{
              ...styles.actionLabel,
              color: hearted ? '#000000' : '#6b7280',
              fontWeight: hearted ? '600' : '500',
            }}
          >
            Seen
          </span>
        </button>

        {/* Add Button */}
        <button
          onClick={handleBookmarkClick}
          style={styles.actionButton}
          aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
        >
          <Plus 
            size={16} 
            color={bookmarked ? '#000000' : '#6b7280'} 
            strokeWidth={bookmarked ? 3 : 2} 
          />
          <span 
            style={{
              ...styles.actionLabel,
              color: bookmarked ? '#000000' : '#6b7280',
              fontWeight: bookmarked ? '600' : '500',
            }}
          >
            Add
          </span>
        </button>
      </div>

    </div>
  );
}

const styles = {
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.20)',
    padding: '12px',
    backgroundColor: 'white',
    width: 'calc(100% - 14px)',
    maxWidth: 'calc(100% - 14px)',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
    cursor: 'pointer',
    margin: '0 7px 8px 7px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    textDecoration: 'none',
    color: 'inherit',
  },

  // ROW 1: Poster + text content
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },

  poster: {
    width: '138px', // 10% wider (125px * 1.1)
    height: 'auto', // Let height adjust naturally
    aspectRatio: '2/3', // Maintain poster aspect ratio
    objectFit: 'cover',
    borderRadius: '8px',
    marginRight: '4px', // Tight spacing
    flexShrink: 0,
  },

  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    paddingLeft: '2px', // Precise alignment like approved layout
  },

  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '4px',
    gap: '6px',
  },

  title: {
    fontSize: '16px', // Standardized at 16px for titles
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'inherit',
    margin: 0,
    flex: 1,
    lineHeight: '1.25', // Better line height for titles
    minWidth: 0, // Allows text to wrap if needed
    wordWrap: 'break-word',
  },

  year: {
    fontSize: '14px', // Reduced from 16px
    color: '#6b7280',
    fontWeight: '500',
    fontFamily: 'inherit',
    margin: 0,
    flexShrink: 0,
    whiteSpace: 'nowrap', // Keep (XXXX) together
  },

  slugSection: {
    marginTop: '2px',
    marginBottom: '20px',
  },

  slug: {
    fontSize: '14px', // Reduce by 1px
    color: '#333',
    fontFamily: 'inherit',
    margin: 0,
    lineHeight: '1.2', // Tighten line spacing
  },

  contributorsBottomRight: {
    display: 'flex',
    alignItems: 'flex-end', // Align to bottom of Row 1
    marginLeft: '2px', // 2px right of poster
    flexShrink: 0,
    paddingBottom: '4px', // Small padding from very bottom
  },

  contributorsSection: {
    marginTop: '8px', // Reduced white space above contributors
  },

  contributors: {
    fontSize: '14px', // Back to 14px for names
    fontFamily: 'inherit',
    margin: 0,
    lineHeight: '1.4',
  },

  contributorLine: {
    marginBottom: '4px',
  },

  contributorLabel: {
    fontSize: '13px', // Slight smaller for labels
    color: '#6b7280',
    fontWeight: '500',
  },

  contributorNames: {
    fontSize: '13px', // Match label size
    color: '#374151',
    fontWeight: '500',
  },

  // Streaming info styling
  streamingRowLeft: {
    marginTop: '8px',
  },

  streamingText: {
    fontSize: '12px',
    color: '#059669',
    fontWeight: '600',
    backgroundColor: '#ecfdf5',
    padding: '3px 8px',
    borderRadius: '12px',
    display: 'inline-block',
  },

  // Action button row - aligned right
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '8px',
    gap: '12px',
  },

  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'color 0.15s ease',
  },

  actionLabel: {
    fontSize: '12px',
    fontWeight: '500',
  },

  trailerLabel: {
    color: '#D4AF37',
    fontSize: '12px',
    fontWeight: '500',
  },

  // Description/Overview styling
  description: {
    fontSize: '14px',
    color: '#4b5563',
    fontFamily: 'inherit',
    margin: 0,
    lineHeight: '1.4',
  },

  descriptionTruncated: {
    display: '-webkit-box',
    WebkitLineClamp: 6,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  expandButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '4px',
    padding: 0,
  },

  overviewRow: {
    marginBottom: '8px',
  },

  overviewRowLast: {
    marginTop: '12px', // Space above the overview when it's at the bottom
  },

  contributorsSectionBelowSlug: {
    marginTop: '12px', // Different spacing when below slug
  },

  // Improved spacing for contributor text that's below overview
  contributorsBottomLeft: {
    marginTop: '6px',
  },
};