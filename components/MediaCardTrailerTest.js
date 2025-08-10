/**
 * MediaCardTrailerTest Component - 🧪 TEST VERSION FOR TRAILER PROMINENCE EXPERIMENTS 🧪
 * 
 * This is a test copy of MediaCard specifically for exploring trailer prominence ideas.
 * DO NOT use this component in production - it's for testing and experimentation only.
 * 
 * Based on MediaCard.js - experimenting with trailer integration and prominence
 * 
 * @component
 * @experimental
 */
import { Check, Plus, Play, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';
import { getPerformanceMonitor } from '../lib/performance-monitor';
import MoviePlaceholder from './MoviePlaceholder';

/**
 * MediaCardTrailerTest - Experimental version for trailer prominence testing
 *
 * @param {Object} props
 * @param {string} props.title - Movie title (required)
 * @param {number} props.year - Release year (required)
 * @param {string} props.initialSlug - Initial slug/description (optional)
 * @param {string} props.initialPoster - Initial poster URL (optional)
 * @param {string} props.initialStreaming - Initial streaming text from Claude (optional)
 * @param {boolean} props.isDetailPage - Whether this is on a detail page (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (optional)
 * @param {string} props.variant - Test variant: 'default', 'trailer-button', 'trailer-overlay', 'trailer-badge', 'integrated-action', 'below-content' (optional)
 */
export default function MediaCardTrailerTest({
  title,
  year,
  initialSlug,
  initialPoster,
  initialStreaming,
  isDetailPage = false,
  tmdbId,
  variant = 'default',
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [trailerVideoId, setTrailerVideoId] = useState(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const performanceMonitor = getPerformanceMonitor();

  // 🔒 LOCKED: TMDB plot summary protection - only use valid Claude slugs
  const isValidClaudeSlug =
    initialSlug &&
    !initialSlug.includes('Plot:') && // Reject TMDB plot summaries
    !initialSlug.includes('Overview:') && // Reject TMDB overviews
    !initialSlug.includes('Synopsis:') && // Reject TMDB synopses
    !initialSlug.includes('Summary:'); // Reject other summary formats

  const [slug, setSlug] = useState(isValidClaudeSlug ? initialSlug : '');
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  const [movieTmdbId, setMovieTmdbId] = useState(tmdbId);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  const movieData = { title, year, slug, poster, id: mediaId };

  // Update effects (same as original)
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
    }
  }, [initialPoster]);

  useEffect(() => {
    setMovieTmdbId(tmdbId);
  }, [tmdbId]);

  useEffect(() => {
    if (initialSlug) {
      setSlug(initialSlug);
    }
  }, [initialSlug]);

  // Fetch trailer data for test variants
  useEffect(() => {
    const fetchTrailer = async () => {
      if (tmdbId && !trailerVideoId && !isLoadingTrailer && variant !== 'default') {
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
  }, [tmdbId, trailerVideoId, isLoadingTrailer, variant]);

  // Enhanced data fetching (same as original)
  useEffect(() => {
    const enhanceMovieData = async () => {
      const isValidClaudeSlug =
        slug &&
        slug !== '' &&
        !slug.includes('Plot:') &&
        !slug.includes('Overview:') &&
        !slug.includes('Synopsis:') &&
        !slug.includes('Summary:');

      if (poster !== '/images/placeholder-poster.jpg') {
        return;
      }

      if (isEnhancing) return;
      setIsEnhancing(true);

      try {
        let newPoster = poster;

        if (poster === '/images/placeholder-poster.jpg') {
          const response = await fetch('/api/tmdb-poster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, year }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.poster) {
              newPoster = data.poster;
              setPoster(data.poster);
            }
            if (data.tmdb_id) {
              setMovieTmdbId(data.tmdb_id);
            }
          }
        }

        if (newPoster !== poster && newPoster !== '/images/placeholder-poster.jpg') {
          try {
            await fetch('/api/cache-movie-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                year,
                poster: newPoster,
                dataSource: 'afi100',
              }),
            });
          } catch (cacheError) {
            console.warn('Failed to cache enhanced data:', cacheError);
          }
        }
      } catch (error) {
        console.error('Error enhancing movie data:', error);
      } finally {
        setIsEnhancing(false);
      }
    };

    enhanceMovieData();
  }, [title, year, poster, isEnhancing]);

  // Favorites management (same as original)
  useEffect(() => {
    setHearted(FavoritesManager.isMovieHearted(mediaId));
    setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
  }, [mediaId]);

  useEffect(() => {
    const handleMoviesUpdate = () => {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, [mediaId]);

  const handleCardClick = e => {
    if (e.target.closest('button') || isDetailPage) {
      e.preventDefault();
      return;
    }

    if (!movieTmdbId) {
      e.preventDefault();
      console.warn('MediaCardTrailerTest: Missing TMDB ID, cannot navigate. No fallback allowed.');
    }
  };

  const handleTrailerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (trailerVideoId) {
      setShowTrailer(true);
    }
  };

  const handleCloseTrailer = () => {
    setShowTrailer(false);
  };

  // Render different variants
  const renderCard = () => {
    switch (variant) {
      case 'trailer-button':
        return renderTrailerButtonVariant();
      case 'trailer-overlay':
        return renderTrailerOverlayVariant();
      case 'trailer-badge':
        return renderTrailerBadgeVariant();
      case 'integrated-action':
        return renderIntegratedActionVariant();
      case 'below-content':
        return renderBelowContentVariant();
      default:
        return renderDefaultVariant();
    }
  };

  const renderDefaultVariant = () => (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {renderCardContent()}
    </a>
  );

  const renderTrailerButtonVariant = () => (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {renderCardContent()}
      {/* Additional trailer button in action row */}
      {trailerVideoId && (
        <div style={styles.trailerButtonContainer}>
          <button
            onClick={handleTrailerClick}
            style={styles.trailerButtonGold}
            aria-label="Play trailer"
          >
            <PlayCircle size={20} color="#000000" fill="none" strokeWidth={2} />
            <span style={styles.trailerButtonTextGoldProminent}>Watch Trailer</span>
          </button>
        </div>
      )}
    </a>
  );

  const renderTrailerOverlayVariant = () => (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={styles.topRow}>
        {/* Poster Column with Actions and Streaming */}
        <div style={styles.posterColumn}>
          <div style={styles.posterContainer}>
            {poster === '/images/placeholder-poster.jpg' ? (
              <div style={styles.poster}>
                <MoviePlaceholder title={title} year={year} compact={true} />
              </div>
            ) : (
              <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
            )}
            {trailerVideoId && (
              <button
                onClick={handleTrailerClick}
                style={styles.overlayPlayButtonGold}
                aria-label="Play trailer"
              >
                <PlayCircle size={32} color="#000000" fill="none" strokeWidth={2} />
              </button>
            )}
          </div>
          
          {/* Action bar under poster - right aligned */}
          <div style={styles.posterActionBar}>
            {renderActionButtons()}
          </div>
          
          {/* Streaming info under action bar - left aligned */}
          {initialStreaming && (
            <div style={styles.posterStreamingInfo}>
              <span style={styles.posterStreamingText}>Streaming on {initialStreaming}</span>
            </div>
          )}
        </div>

        {/* Text Column */}
        <div style={styles.textContainer}>
          <div style={styles.titleYearRow}>
            <span style={styles.title}>{title}</span>
            <span style={styles.yearInline}>({year})</span>
          </div>
          <div style={styles.slug}>{slug}</div>
        </div>
      </div>
    </a>
  );

  const renderTrailerBadgeVariant = () => (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={styles.topRow}>
        {/* Poster Column with Actions and Streaming */}
        <div style={styles.posterColumn}>
          <div style={styles.posterContainer}>
            {poster === '/images/placeholder-poster.jpg' ? (
              <div style={styles.poster}>
                <MoviePlaceholder title={title} year={year} compact={true} />
              </div>
            ) : (
              <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
            )}
            {trailerVideoId && (
              <div style={styles.trailerBadgeGoldProminent}>
                <PlayCircle size={16} color="#000000" fill="none" strokeWidth={2} />
              </div>
            )}
          </div>
          
          {/* Action bar under poster - right aligned */}
          <div style={styles.posterActionBar}>
            {renderActionButtons()}
          </div>
          
          {/* Streaming info under action bar - left aligned */}
          {initialStreaming && (
            <div style={styles.posterStreamingInfo}>
              <span style={styles.posterStreamingText}>Streaming on {initialStreaming}</span>
            </div>
          )}
        </div>

        {/* Text Column */}
        <div style={styles.textContainer}>
          <div style={styles.titleYearRow}>
            <span style={styles.title}>{title}</span>
            <span style={styles.yearInline}>({year})</span>
          </div>
          <div style={styles.slug}>{slug}</div>
        </div>
      </div>
    </a>
  );

  const renderIntegratedActionVariant = () => (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ROW 1: Poster, Title, Year, Description */}
      <div style={styles.contentRow}>
        {poster === '/images/placeholder-poster.jpg' ? (
          <div style={styles.poster}>
            <MoviePlaceholder title={title} year={year} compact={true} />
          </div>
        ) : (
          <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
        )}
        
        <div style={styles.textContainerFullWidth}>
          <div style={styles.titleYearRow}>
            <span style={styles.title}>{title}</span>
            <span style={styles.yearInline}>({year})</span>
          </div>
          <div style={styles.slug}>{slug}</div>
        </div>
      </div>

      {/* ROW 2: Streaming info - right aligned */}
      {initialStreaming && (
        <div style={styles.streamingRowRight}>
          <span style={styles.streamingText}>Streaming on {initialStreaming}</span>
        </div>
      )}

      {/* ROW 3: Action buttons - right aligned */}
      <div style={styles.actionRow}>
        {renderIntegratedActionButtons()}
      </div>
    </a>
  );

  const renderBelowContentVariant = () => (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={styles.topRow}>
        {/* Poster Column with Actions and Streaming */}
        <div style={styles.posterColumn}>
          {poster === '/images/placeholder-poster.jpg' ? (
            <div style={styles.poster}>
              <MoviePlaceholder title={title} year={year} compact={true} />
            </div>
          ) : (
            <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
          )}
          
          {/* Action bar under poster - right aligned */}
          <div style={styles.posterActionBar}>
            {renderActionButtons()}
          </div>
          
          {/* Streaming info under action bar - left aligned */}
          {initialStreaming && (
            <div style={styles.posterStreamingInfo}>
              <span style={styles.posterStreamingText}>Streaming on {initialStreaming}</span>
            </div>
          )}
        </div>

        {/* Text Column */}
        <div style={styles.textContainer}>
          <div style={styles.titleYearRow}>
            <span style={styles.title}>{title}</span>
            <span style={styles.yearInline}>({year})</span>
          </div>
          
          {/* Trailer button positioned after year, before slug */}
          {trailerVideoId && (
            <div style={styles.inlineTrailerButton}>
              <button
                onClick={handleTrailerClick}
                style={styles.compactTrailerButton}
                aria-label="Play trailer"
              >
                <PlayCircle size={16} color="#000000" fill="none" strokeWidth={2} />
                <span style={styles.compactTrailerTextProminent}>Watch Trailer</span>
              </button>
            </div>
          )}
          
          <div style={styles.slug}>{slug}</div>
        </div>
      </div>
    </a>
  );

  const renderCardContent = () => (
    <>
      {/* ROW 1: Poster, Title, Year, Description */}
      <div style={styles.contentRow}>
        {poster === '/images/placeholder-poster.jpg' ? (
          <div style={styles.poster}>
            <MoviePlaceholder title={title} year={year} compact={true} />
          </div>
        ) : (
          <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
        )}
        
        <div style={styles.textContainerFullWidth}>
          <div style={styles.titleYearRow}>
            <span style={styles.title}>{title}</span>
            <span style={styles.yearInline}>({year})</span>
          </div>
          <div style={styles.slug}>{slug}</div>
        </div>
      </div>

      {/* ROW 2: Streaming info - right aligned */}
      {initialStreaming && (
        <div style={styles.streamingRowRight}>
          <span style={styles.streamingText}>Streaming on {initialStreaming}</span>
        </div>
      )}

      {/* ROW 3: Action buttons - right aligned */}
      <div style={styles.actionRow}>
        {renderActionButtons()}
      </div>
    </>
  );

  const renderActionButtons = () => (
    <div style={styles.iconRow}>
      <button
        onClick={() => {
          const newState = FavoritesManager.toggleHeart(movieData);
          setHearted(newState);
        }}
        style={styles.iconButton}
        aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
        role="button"
      >
        <div style={styles.iconWithTextHorizontal}>
          <Check
            size={16}
            color={hearted ? '#000000' : '#6b7280'}
            strokeWidth={hearted ? 3 : 2}
          />
          <span
            style={{
              ...styles.prominentIconLabel,
              color: hearted ? '#000000' : '#6b7280',
              fontWeight: '700', // Same as trailer
            }}
          >
            Seen
          </span>
        </div>
      </button>
      <button
        onClick={() => {
          const newState = FavoritesManager.toggleBookmark(movieData);
          setBookmarked(newState);
        }}
        style={styles.iconButton}
        aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
        role="button"
      >
        <div style={styles.iconWithTextHorizontal}>
          <Plus size={16} color={bookmarked ? '#000000' : '#6b7280'} strokeWidth={bookmarked ? 3 : 2} />
          <span
            style={{
              ...styles.prominentIconLabel,
              color: bookmarked ? '#000000' : '#6b7280',
              fontWeight: '700', // Same as trailer
            }}
          >
            Add
          </span>
        </div>
      </button>
    </div>
  );

  const renderIntegratedActionButtons = () => (
    <div style={styles.iconRow}>
      {/* Trailer button integrated with other actions */}
      {trailerVideoId && (
        <button
          onClick={handleTrailerClick}
          style={styles.iconButton}
          aria-label="Play trailer"
          role="button"
        >
          <div style={styles.iconWithTextHorizontal}>
            <PlayCircle
              size={20}
              color="#D4AF37" // Gold color
              fill="none"
              strokeWidth={2}
            />
            <span
              style={{
                ...styles.trailerLinkStyle,
              }}
            >
              Trailer
            </span>
          </div>
        </button>
      )}
      
      <button
        onClick={() => {
          const newState = FavoritesManager.toggleHeart(movieData);
          setHearted(newState);
        }}
        style={styles.iconButton}
        aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
        role="button"
      >
        <div style={styles.iconWithTextHorizontal}>
          <Check
            size={16}
            color={hearted ? '#000000' : '#6b7280'}
            strokeWidth={hearted ? 3 : 2}
          />
          <span
            style={{
              ...styles.prominentIconLabel,
              color: hearted ? '#000000' : '#6b7280',
              fontWeight: '700', // Same as trailer
            }}
          >
            Seen
          </span>
        </div>
      </button>
      <button
        onClick={() => {
          const newState = FavoritesManager.toggleBookmark(movieData);
          setBookmarked(newState);
        }}
        style={styles.iconButton}
        aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
        role="button"
      >
        <div style={styles.iconWithTextHorizontal}>
          <Plus size={16} color={bookmarked ? '#000000' : '#6b7280'} strokeWidth={bookmarked ? 3 : 2} />
          <span
            style={{
              ...styles.prominentIconLabel,
              color: bookmarked ? '#000000' : '#6b7280',
              fontWeight: '700', // Same as trailer
            }}
          >
            Add
          </span>
        </div>
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      {renderCard()}
      
      {/* Trailer Modal */}
      {showTrailer && trailerVideoId && (
        <div style={styles.trailerOverlay} onClick={handleCloseTrailer}>
          <div style={styles.trailerModal} onClick={e => e.stopPropagation()}>
            <button
              onClick={handleCloseTrailer}
              style={styles.closeButton}
              aria-label="Close trailer"
            >
              ×
            </button>
            <div style={styles.trailerContainer}>
              <iframe
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
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  
  // Base card styles (same as original)
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.20)',
    padding: '12px',
    backgroundColor: 'white',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
    cursor: 'pointer',
    marginBottom: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    textDecoration: 'none',
    color: 'inherit',
  },

  topRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '2px',
  },

  poster: {
    width: '125px',
    height: '188px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginRight: '4px', // Reduced from 12px to 4px for tight spacing
    flexShrink: 0,
  },

  // Variant-specific styles
  cardWithOverlay: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '2px',
  },

  cardWithBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '2px',
  },

  posterContainer: {
    position: 'relative',
    marginRight: '12px',
    flexShrink: 0,
  },

  overlayPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0, 0, 0, 0.7)',
    border: 'none',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    zIndex: 1,
  },

  overlayPlayButtonGold: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(212, 175, 55, 0.95)', // Gold with high opacity
    border: '2px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '50%',
    width: '56px', // Larger than original 48px
    height: '56px', // Larger than original 48px
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    zIndex: 1,
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.4)', // Stronger shadow
  },

  trailerBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#ff0000',
    borderRadius: '12px',
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '10px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    zIndex: 1,
  },

  trailerBadgeGold: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#D4AF37', // Gold
    borderRadius: '12px',
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '10px',
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    zIndex: 1,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },

  trailerBadgeGoldProminent: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#D4AF37', // Gold
    borderRadius: '16px', // More rounded
    padding: '6px 8px', // Larger padding
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px', // Larger font
    fontWeight: '700', // Bolder
    color: '#000000',
    textTransform: 'uppercase',
    zIndex: 1,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)', // Stronger shadow
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },

  trailerButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '8px',
  },

  trailerButton: {
    background: '#ff0000',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    transition: 'background-color 0.2s ease',
  },

  trailerButtonGold: {
    background: '#D4AF37', // Gold
    border: '2px solid rgba(0, 0, 0, 0.15)', // Stronger border
    borderRadius: '8px', // More rounded
    padding: '10px 20px', // Larger padding
    display: 'flex',
    alignItems: 'center',
    gap: '8px', // More spacing
    cursor: 'pointer',
    fontSize: '14px', // Larger font
    fontWeight: '700', // Bolder
    color: '#000000',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)', // Stronger shadow
  },

  trailerButtonText: {
    color: 'inherit',
  },

  trailerButtonTextGold: {
    color: 'inherit',
  },

  trailerButtonTextGoldProminent: {
    color: 'inherit',
    fontSize: '15px', // Larger than default
    fontWeight: '700', // Bolder
    letterSpacing: '0.5px',
  },

  // New styles for below-content variant
  inlineTrailerButton: {
    display: 'flex',
    marginTop: '6px',
    marginBottom: '4px',
  },

  compactTrailerButton: {
    background: 'rgba(212, 175, 55, 0.15)', // Slightly more visible light gold
    border: '2px solid #D4AF37', // Stronger border
    borderRadius: '6px', // More rounded
    padding: '6px 10px', // Larger padding
    display: 'flex',
    alignItems: 'center',
    gap: '5px', // More spacing
    cursor: 'pointer',
    fontSize: '12px', // Larger font
    fontWeight: '600', // Bolder
    color: '#D4AF37',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(212, 175, 55, 0.2)', // Gold shadow
  },

  compactTrailerText: {
    color: 'inherit',
  },

  compactTrailerTextProminent: {
    color: 'inherit',
    fontSize: '13px', // Larger than default
    fontWeight: '700', // Bolder
    letterSpacing: '0.2px',
  },

  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
    paddingLeft: '2px', // Only 2px left padding as requested
  },

  header: {
    fontSize: '18px',
    lineHeight: '1.2',
    fontFamily: 'inherit',
  },

  titleYearRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '6px',
  },

  title: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
  },

  yearInline: {
    fontSize: '16px',
    color: '#666',
    fontWeight: '500',
    fontFamily: 'inherit',
    flexShrink: 0, // Prevent year from shrinking
    whiteSpace: 'nowrap', // Keep (XXXX) together as one unit
  },

  year: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 'normal',
    fontFamily: 'inherit',
    marginTop: '2px',
    marginBottom: '2px',
  },

  slug: {
    fontSize: '14px',
    color: '#333',
    marginTop: '4px',
    fontFamily: 'inherit',
  },

  placeholderText: {
    fontSize: '12px',
    color: '#ff0000',
    fontWeight: 'bold',
    marginTop: '12px',
    fontFamily: 'inherit',
    backgroundColor: '#fff3cd',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ffeaa7',
  },

  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '2px',
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

  // New layout styles
  actionBarContainer: {
    display: 'flex',
    justifyContent: 'flex-start', // Left-aligned
    paddingTop: '12px', // 12px spacing below description
    marginBottom: '8px',
  },

  fullWidthStreamingRow: {
    width: '100%',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '8px',
    marginTop: '4px',
  },

  streamingTextFullWidth: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '400',
    fontFamily: 'inherit',
    display: 'block',
    textAlign: 'center',
    lineHeight: '1.4',
  },

  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '4px', // Tighter spacing between action buttons
    alignItems: 'center',
  },

  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px', // Tighter padding for more compact action bar
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    minHeight: '32px',
  },

  iconWithTextHorizontal: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
  },

  iconLabel: {
    fontSize: '11px',
    fontFamily: 'inherit',
    lineHeight: '1',
  },

  prominentIconLabel: {
    fontSize: '14px', // Larger than original 11px
    fontFamily: 'inherit',
    lineHeight: '1',
    letterSpacing: '0.3px',
  },

  trailerLinkStyle: {
    fontSize: '14px',
    fontFamily: 'inherit',
    lineHeight: '1',
    letterSpacing: '0.3px',
    color: '#000000', // Charcoal like movie title
    fontWeight: '700',
    textDecoration: 'underline',
    textDecorationColor: '#D4AF37', // Gold underline
    textUnderlineOffset: '2px',
    textDecorationThickness: '2px',
    cursor: 'pointer',
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
    zIndex: 9999,
    padding: '20px',
  },

  trailerModal: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: '800px',
    aspectRatio: '16 / 9',
  },

  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },

  trailerContainer: {
    width: '100%',
    height: '100%',
    aspectRatio: '16 / 9',
  },

  trailerIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },

  // Poster column layout styles
  posterColumn: {
    display: 'flex',
    flexDirection: 'column',
    marginRight: '12px',
    flexShrink: 0,
  },

  posterActionBar: {
    display: 'flex',
    justifyContent: 'flex-end', // Right-aligned as requested
    marginTop: '8px',
    gap: '4px',
  },

  posterStreamingInfo: {
    marginTop: '6px',
    textAlign: 'left', // Left-aligned as requested
  },

  posterStreamingText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '400',
    fontFamily: 'inherit',
    lineHeight: '1.3',
  },

  // New bottom row layout styles
  bottomRowNew: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },

  actionBarContainerBottom: {
    display: 'flex',
    justifyContent: 'flex-start',
  },

  streamingInfoBottom: {
    flex: 1,
    textAlign: 'right',
    marginLeft: '12px',
  },

  // 3-row layout styles
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },

  textContainerFullWidth: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    paddingLeft: '2px',
    // Remove any width constraints so description can use full available space
  },

  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end', // Right-aligned action buttons
    marginBottom: '6px',
  },

  streamingRow: {
    display: 'flex',
    justifyContent: 'flex-start', // Left-aligned streaming info
  },

  streamingInfoInRow: {
    marginTop: '24px', // 2 lines of spacing beneath description
  },

  streamingRowRight: {
    display: 'flex',
    justifyContent: 'flex-end', // Right-aligned streaming info
    marginBottom: '6px',
  },
};