/**
 * MediaCard Component - 🔒 LOCKED FOR ORGANIC SLUG GENERATION 🔒
 * 
 * ⚠️  CRITICAL: Only uses organic movie poster taglines
 * ⚠️  NO plot summaries, NO TMDB overviews, NO story descriptions
 * ⚠️  ONLY calls /api/generate-organic-slug for marketing copy
 * 
 * 2-row layout design:
 * Row 1: Poster | Title (Year) | Organic Slug (marketing tagline)
 * Row 2: Streaming info | Heart/Bookmark icons
 * 
 * @component
 * @locked true
 * @version LOCKED-2025-07-02
 * @example
 * <MediaCard 
 *   title="The Matrix" 
 *   year={1999} 
 *   initialSlug="Reality is a simulation" 
 *   initialPoster="/images/matrix.jpg" 
 *   tmdbId={603}
 * />
 */
import { Plus, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FavoritesManager } from './FavoritesManager';
// import useStreamingData from '../hooks/useStreamingData'; // Stubbed out

/**
 * MediaCard - Simple movie card with 2-row layout
 * 
 * @param {Object} props
 * @param {string} props.title - Movie title (required)
 * @param {number} props.year - Release year (required)
 * @param {string} props.initialSlug - Initial slug/description (optional)
 * @param {string} props.initialPoster - Initial poster URL (optional)
 * @param {string} props.initialStreaming - Initial streaming text (optional)
 * @param {boolean} props.isDetailPage - Whether this is on a detail page (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (required)
 */
export default function MediaCard({ 
  title, 
  year, 
  initialSlug, 
  initialPoster, 
  initialStreaming, 
  isDetailPage = false,
  tmdbId 
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  const [movieTmdbId, setMovieTmdbId] = useState(tmdbId);
  const [slug, setSlug] = useState(initialSlug || '');

  const router = useRouter();

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  
  // Movie data object for FavoritesManager
  const movieData = { title, year, slug, poster, id: mediaId };

  // 🔒 LOCKED: Check if slug is good quality - preserves marketing copy
  const isGoodSlug = slug && 
    slug.length <= 75 && 
    slug.length > 5 && 
    !slug.includes('Plot:') && // FIXED: Reject TMDB plot summaries
    !slug.includes('Overview:') && // FIXED: Reject TMDB overviews
    !slug.includes('Synopsis:'); // FIXED: Reject TMDB synopses

  // 🔒 LOCKED: Only generate organic slug if missing - posters come from analysis service
  useEffect(() => {
    const generateOrganicSlug = async () => {
      // 🔒 LOCKED: Get organic slug if missing - ONLY movie poster taglines
      if (!isGoodSlug) {
        try {
          console.log(`🌱 Generating organic slug for: ${title} (${year})`);
          const slugRes = await fetch('/api/generate-organic-slug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, year })
          });
          const slugData = await slugRes.json();
          // 🔒 PROTECTED: TMDB plot summary rejection - preserves marketing copy
          if (slugData.slug && !slugData.slug.includes('Plot:') && !slugData.slug.includes('Overview:') && !slugData.slug.includes('Synopsis:') && slugData.slug.length <= 75) {
            console.log(`✅ Organic slug generated: "${slugData.slug}"`);
            setSlug(slugData.slug);
          }
        } catch (e) {
          console.warn('Organic slug generation failed - no fallback', e);
        }
      }
    };
    
    generateOrganicSlug();
  }, []); // 🔒 LOCKED: Only run once per component


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

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons or if this is a detail page
    if (e.target.closest('button') || isDetailPage) return;
    
    // Navigate to movie page - all movies must have tmdb_id
    if (movieTmdbId) {
      router.push(`/movie/${movieTmdbId}`);
    }
  };

  // All movies in DB must have tmdb_id - no fallback needed
  const linkUrl = `/movie/${movieTmdbId}`;

  // All movies must have valid tmdb_id - don't render if missing
  if (!movieTmdbId || movieTmdbId === null || movieTmdbId === 'MISSING') {
    console.warn(`MediaCard: Skipping movie "${title}" (${year}) - missing tmdb_id:`, movieTmdbId);
    return null;
  }

  return (
    <a href={linkUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article
        style={styles.card}
        role="article"
        onClick={handleCardClick}
      onMouseDown={(e) => {
        // Immediate visual feedback on click
        e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Row 1: Poster | Title (Year) with slug flowing below */}
      <div style={styles.firstRow}>
        <img src={poster} alt={`Poster for ${title}`} style={styles.poster} />
        <div style={styles.titleAndSlugSection}>
          <div style={styles.titleRow}>
            <span style={styles.title}>{title}</span>
            <span style={styles.year}>({year})</span>
          </div>
          <div style={styles.slugSection}>
            {slug}
          </div>
        </div>
      </div>
      
      {/* Row 2: Streaming info | Heart/Bookmark icons */}
      <div style={styles.secondRow}>
        <div style={styles.streamingInfo}>
          {initialStreaming && initialStreaming !== 'TBD' && (
            <span style={styles.streamingText}>
              Streaming on {initialStreaming}
            </span>
          )}
        </div>
        <div style={styles.iconRow}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const newState = FavoritesManager.toggleHeart(movieData);
              setHearted(newState);
            }}
            style={styles.iconButton}
            aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
            role="button"
          >
            <div style={styles.iconWithText}>
              <Check
                size={16}
                color={hearted ? '#374151' : '#9ca3af'}
                strokeWidth={hearted ? 2.5 : 1.5}
              />
              <span style={{
                ...styles.iconLabel,
                color: hearted ? '#374151' : '#9ca3af',
                fontWeight: hearted ? '600' : '400'
              }}>
                Seen
              </span>
            </div>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const newState = FavoritesManager.toggleBookmark(movieData);
              setBookmarked(newState);
            }}
            style={styles.iconButton}
            aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
            role="button"
          >
            <div style={styles.iconWithText}>
              <Plus
                size={16}
                color={bookmarked ? '#374151' : '#9ca3af'}
              />
              <span style={{
                ...styles.iconLabel,
                color: bookmarked ? '#374151' : '#9ca3af',
                fontWeight: bookmarked ? '600' : '400'
              }}>
                Add
              </span>
            </div>
          </button>
        </div>
      </div>
    </article>
    </a>
  );
}

const styles = {
  card: {
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
  },
  // Row 1: Poster | Title (Year) with slug flowing below
  firstRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '8px',
  },
  poster: {
    width: '100px',  // Increased from 80px (25% bigger)
    height: '150px', // Increased from 120px (25% bigger)
    objectFit: 'cover',
    borderRadius: '8px',
    flexShrink: 0,
  },
  titleAndSlugSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    lineHeight: '1.2',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
  },
  year: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 'normal',
  },
  slugSection: {
    fontSize: '14px',
    color: '#333',
    lineHeight: '1.3',
    overflow: 'hidden',
    marginTop: '4px',
  },
  // Row 2: Streaming info | Icons (full width below first row)
  secondRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    marginTop: '4px',
    width: '100%',
  },
  streamingInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: '8px',
  },
  streamingText: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '300',
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
    padding: '4px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  iconWithText: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  iconLabel: {
    fontSize: '12px',
    lineHeight: '1',
    userSelect: 'none',
  },
};