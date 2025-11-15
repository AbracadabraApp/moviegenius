/**
 * SearchResultCard Component - Abbreviated movie page for search results
 *
 * Design features:
 * - Vertical layout borrowing from MovieHeaderLarge
 * - Large centered poster
 * - Horizontal action buttons (Seen, Add, Play)
 * - Why Watch section with 3 reasons
 * - Analysis preview (3 lines) with Read More link
 *
 * @component
 */
import { Check, Plus, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';
import WhyWatchSection from './WhyWatchSection';
import { useRouter } from 'next/router';

/**
 * SearchResultCard - Abbreviated movie page format for search results
 *
 * @param {Object} props
 * @param {string} props.title - Movie title (required)
 * @param {number} props.year - Release year (required)
 * @param {string} props.initialSlug - Movie overview/slug (optional)
 * @param {string} props.initialPoster - Poster URL (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (optional)
 * @param {Object} props.whyWatch - Why Watch data { reasons: [], recommendation: "YES/NO" } (optional)
 * @param {string} props.analysisPreview - First section of analysis text (optional)
 * @param {Function} props.onMovieClick - Navigate to movie detail (optional)
 */
export default function SearchResultCard({
  title,
  year,
  initialSlug,
  initialPoster,
  tmdbId,
  whyWatch,
  analysisPreview,
  onMovieClick,
}) {
  const router = useRouter();
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [trailerVideoId, setTrailerVideoId] = useState(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  const movieData = { title, year, slug: initialSlug, poster, id: mediaId };

  // Favorites management
  useEffect(() => {
    setHearted(FavoritesManager.isMovieHearted(mediaId));
    setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
  }, [mediaId]);

  // Fetch trailer data
  useEffect(() => {
    const fetchTrailer = async () => {
      if (tmdbId && !trailerVideoId && !isLoadingTrailer) {
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
  }, [tmdbId, trailerVideoId, isLoadingTrailer]);

  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons or links
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    if (tmdbId) {
      router.push(`/movie/${tmdbId}`);
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

  // Truncate analysis preview to ~3 lines (approximately 280 characters)
  const getTruncatedAnalysis = () => {
    if (!analysisPreview) return null;
    if (isExpanded || analysisPreview.length <= 280) return analysisPreview;
    return analysisPreview.substring(0, 280) + '...';
  };

  return (
    <div style={styles.card} onClick={handleCardClick}>
      {/* Large Poster - Centered like MovieHeaderLarge */}
      <div style={styles.posterContainer}>
        <img
          src={poster}
          alt={`Poster for ${title}`}
          style={styles.largePoster}
          loading="lazy"
        />
      </div>

      {/* Title and Year */}
      <div style={styles.titleSection}>
        <h2 style={styles.title}>{title}</h2>
        <span style={styles.year}>({year})</span>
      </div>

      {/* Action Buttons - Horizontal like MovieHeaderLarge action bar */}
      <div style={styles.actionRow}>
        <button
          onClick={handleBookmarkClick}
          style={styles.actionButton}
          aria-label={bookmarked ? 'Remove from list' : 'Add to list'}
        >
          <Plus
            size={20}
            color={bookmarked ? '#000000' : '#6b7280'}
            strokeWidth={bookmarked ? 3 : 2}
          />
          <span style={{
            ...styles.actionLabel,
            color: bookmarked ? '#000000' : '#6b7280',
            fontWeight: bookmarked ? '700' : '500'
          }}>
            Add
          </span>
        </button>

        <button
          onClick={handleHeartClick}
          style={styles.actionButton}
          aria-label={hearted ? 'Mark as unseen' : 'Mark as seen'}
        >
          <Check
            size={20}
            color={hearted ? '#000000' : '#6b7280'}
            strokeWidth={hearted ? 3 : 2}
          />
          <span style={{
            ...styles.actionLabel,
            color: hearted ? '#000000' : '#6b7280',
            fontWeight: hearted ? '700' : '500'
          }}>
            Seen
          </span>
        </button>

        {trailerVideoId && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/movie/${tmdbId}`);
            }}
            style={styles.actionButton}
            aria-label="Play trailer"
          >
            <PlayCircle
              size={20}
              color="#6b7280"
              fill="none"
            />
            <span style={styles.actionLabel}>
              Play
            </span>
          </button>
        )}
      </div>

      {/* Why Watch Section */}
      {whyWatch && whyWatch.reasons && whyWatch.reasons.length > 0 && (
        <WhyWatchSection
          reasons={whyWatch.reasons}
          recommendation={whyWatch.recommendation}
          style={styles.whyWatchSection}
        />
      )}

      {/* Analysis Preview (3 lines) */}
      {analysisPreview && (
        <div style={styles.analysisSection}>
          <p style={styles.analysisText}>{getTruncatedAnalysis()}</p>
          {analysisPreview.length > 280 && !isExpanded && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/movie/${tmdbId}`);
              }}
              style={styles.readMoreLink}
            >
              Read More →
            </button>
          )}
        </div>
      )}

      {/* Read Full Analysis Link - Always visible if there's a tmdbId */}
      {tmdbId && (
        <div style={styles.fullAnalysisSection}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/movie/${tmdbId}`);
            }}
            style={styles.fullAnalysisButton}
          >
            View Full Analysis
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  posterContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
    width: '100%',
  },

  largePoster: {
    maxWidth: '200px',  // Smaller than movie page for search results
    width: 'auto',
    height: '300px',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },

  titleSection: {
    textAlign: 'center',
    marginBottom: '16px',
    width: '100%',
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
  },

  year: {
    fontSize: '18px',
    color: '#6b7280',
    fontWeight: '500',
  },

  actionRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '20px',
    width: '100%',
  },

  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  },

  actionLabel: {
    fontSize: '12px',
    lineHeight: '1',
    userSelect: 'none',
    textAlign: 'center',
    fontFamily: 'inherit',
  },

  whyWatchSection: {
    width: '100%',
    marginBottom: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
  },

  analysisSection: {
    width: '100%',
    paddingLeft: '16px',
    paddingRight: '16px',
    marginBottom: '12px',
  },

  analysisText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    margin: 0,
    fontFamily: 'inherit',
  },

  readMoreLink: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '4px 0',
    marginTop: '8px',
    textDecoration: 'underline',
    fontFamily: 'inherit',
    display: 'inline',
  },

  fullAnalysisSection: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb',
  },

  fullAnalysisButton: {
    background: 'none',
    border: '2px solid #d4af37',
    color: '#d4af37',
    fontSize: '14px',
    fontWeight: '600',
    padding: '8px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};
