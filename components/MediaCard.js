/**
 * MediaCard Component - 🔒 LOCKED COMPONENT 🔒
 * @locked true
 *
 * Self-contained movie card with intelligent data fetching and caching.
 * Handles its own streaming data, poster enhancement, and favorites management.
 * NO slug fallback - Claude slugs only, rejects TMDB plot summaries.
 * Provides consistent functionality across all pages.
 *
 * @component
 * @example
 * <MediaCard
 *   title="The Matrix"
 *   year={1999}
 *   initialSlug="Reality is a simulation"
 *   initialPoster="/images/matrix.jpg"
 * />
 */
import { Check, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';
// import useStreamingData from '../hooks/useStreamingData'; // Stubbed out

/**
 * MediaCard - Self-contained interactive movie card component
 *
 * @param {Object} props
 * @param {string} props.title - Movie title (required)
 * @param {number} props.year - Release year (required)
 * @param {string} props.initialSlug - Initial slug/description (optional)
 * @param {string} props.initialPoster - Initial poster URL (optional)
 * @param {string} props.initialStreaming - Initial streaming text from Claude (optional)
 * @param {boolean} props.isDetailPage - Whether this is on a detail page (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (optional)
 */
export default function MediaCard({
  title,
  year,
  initialSlug,
  initialPoster,
  initialStreaming,
  isDetailPage = false,
  tmdbId,
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  // 🔒 LOCKED: TMDB plot summary protection - only use valid Claude slugs
  const isValidClaudeSlug =
    initialSlug &&
    !initialSlug.includes('Plot:') && // Reject TMDB plot summaries
    !initialSlug.includes('Overview:') && // Reject TMDB overviews
    !initialSlug.includes('Synopsis:') && // Reject TMDB synopses
    !initialSlug.includes('Summary:'); // Reject other summary formats

  const [slug, setSlug] = useState(isValidClaudeSlug ? initialSlug : '');
  
  // Debug slug handling
  console.log(`MediaCard ${title}: initialSlug="${initialSlug}", isValidClaudeSlug=${isValidClaudeSlug}, finalSlug="${slug}"`);
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  const [movieTmdbId, setMovieTmdbId] = useState(tmdbId);

  // Update poster when initialPoster prop changes (navigation between movies)
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
    }
  }, [initialPoster]);

  // Update tmdbId when prop changes
  useEffect(() => {
    setMovieTmdbId(tmdbId);
  }, [tmdbId]);

  // Update slug when initialSlug prop changes
  useEffect(() => {
    if (initialSlug) {
      setSlug(initialSlug);
    }
  }, [initialSlug]);
  const [isEnhancing, setIsEnhancing] = useState(false);

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

  // 🔒 PROTECTED: Enhanced data fetching for missing poster only
  // Claude-only slug approach: No fallback slug fetching, only show Claude-provided slugs
  useEffect(() => {
    const enhanceMovieData = async () => {
      // 🔒 LOCKED: TMDB plot summary protection - reject verbose technical descriptions
      const isValidClaudeSlug =
        slug &&
        slug !== '' &&
        !slug.includes('Plot:') && // Reject TMDB plot summaries
        !slug.includes('Overview:') && // Reject TMDB overviews
        !slug.includes('Synopsis:') && // Reject TMDB synopses
        !slug.includes('Summary:'); // Reject other summary formats

      // Skip if we have poster, or if already enhancing
      // NO slug fallback - Claude slugs only
      if (poster !== '/images/placeholder-poster.jpg') {
        return;
      }

      if (isEnhancing) return;
      setIsEnhancing(true);

      try {
        let newPoster = poster;

        // Fetch TMDB poster if using placeholder
        if (poster === '/images/placeholder-poster.jpg') {
          console.log('Fetching TMDB poster for:', title, year);
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

        // Cache the enhanced poster data if we got new poster
        if (newPoster !== poster && newPoster !== '/images/placeholder-poster.jpg') {
          try {
            await fetch('/api/cache-movie-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                year,
                poster: newPoster,
                dataSource: 'afi100', // For now, assume AFI100. Could be made dynamic.
              }),
            });
            console.log('Cached enhanced poster data for:', title, year);
          } catch (cacheError) {
            console.warn('Failed to cache enhanced data:', cacheError);
            // Don't fail the whole operation if caching fails
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

  const handleCardClick = e => {
    // Don't navigate if clicking on action buttons or if this is a detail page
    if (e.target.closest('button') || isDetailPage) {
      e.preventDefault();
      return;
    }

    // 🔒 LOCKED: NO fallback navigation - this enforces TMDB-first architecture
    // For href-based navigation, prevent default if no TMDB ID available
    if (!movieTmdbId) {
      e.preventDefault();
      console.warn('MediaCard: Missing TMDB ID, cannot navigate. No fallback allowed.');
      // NO fallback navigation - enforces data quality and TMDB-first architecture
    }
    // If movieTmdbId exists, let browser handle href navigation naturally
  };

  return (
    <a
      href={movieTmdbId ? `/movie/${movieTmdbId}` : '#'}
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseDown={e => {
        // Immediate visual feedback on click
        e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Row 1: Poster + Text Content */}
      <div style={styles.topRow}>
        <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
        <div style={styles.textContainer}>
          <div style={styles.header}>
            <div style={styles.title}>{title}</div>
          </div>
          <div style={styles.year}>({year})</div>
          <div style={styles.slug}>{slug}</div>
        </div>
      </div>

      {/* Row 2: Streaming + Actions */}
      <div style={styles.bottomRow}>
        <div style={styles.streamingInfo}>
          {initialStreaming && (
            <span style={styles.streamingText}>Streaming on {initialStreaming}</span>
          )}
        </div>
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
                color={hearted ? '#374151' : '#9ca3af'}
                strokeWidth={hearted ? 2.5 : 1.5}
              />
              <span
                style={{
                  ...styles.iconLabel,
                  color: hearted ? '#374151' : '#9ca3af',
                  fontWeight: hearted ? '600' : '400',
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
              <Plus size={16} color={bookmarked ? '#374151' : '#9ca3af'} />
              <span
                style={{
                  ...styles.iconLabel,
                  color: bookmarked ? '#374151' : '#9ca3af',
                  fontWeight: bookmarked ? '600' : '400',
                }}
              >
                Add
              </span>
            </div>
          </button>
        </div>
      </div>
    </a>
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
    width: '100%',
    maxWidth: '100%', // Prevent expansion beyond container
    boxSizing: 'border-box', // Include padding in width calculation
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
    cursor: 'pointer',
    marginBottom: '8px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // Reset link styles for proper card appearance
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
    marginRight: '12px',
    flexShrink: 0, // Prevent poster from shrinking
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0, // Allow flex child to shrink below content size
    overflow: 'hidden', // Prevent text overflow
  },
  header: {
    fontSize: '18px',
    lineHeight: '1.2',
    fontFamily: 'inherit',
  },
  title: {
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
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
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '2px',
  },
  streamingInfo: {
    flex: 1,
    minWidth: 0, // Allow shrinking
    marginRight: '8px', // Space before icons
  },
  streamingText: {
    fontSize: '14px',
    color: '#6b7280', // Mid grey
    fontWeight: '300', // 100 lighter than slug's normal (400)
    fontFamily: 'inherit',
    wordWrap: 'break-word', // Wrap long service names
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
    padding: '4px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  iconWithText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
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
};
