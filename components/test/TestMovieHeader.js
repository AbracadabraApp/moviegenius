/**
 * TestMovieHeader - Simplified copy of MovieHeader.js for end-to-end testing
 * Removed FavoritesManager dependency for isolated testing
 */
import { Heart, Bookmark } from 'lucide-react';
import { useState } from 'react';

export default function TestMovieHeader({
  title,
  year,
  initialSlug,
  initialPoster,
  initialStreaming,
  tmdbId,
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const poster = initialPoster || '/images/placeholder-poster.jpg';

  return (
    <div style={styles.movieHeader}>
      <div style={styles.contentRow}>
        <img src={poster} alt={`Poster for ${title}`} style={styles.largePoster} />
        <div style={styles.textContainer}>
          <div style={styles.titleColumn}>
            <div style={styles.title}>{title}</div>
            <div style={styles.year}>({year})</div>
          </div>
          <div style={styles.slug}>{initialSlug}</div>
        </div>
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.streamingInfo}>
          <span style={styles.streamingText}>
            {initialStreaming || 'Streaming availability TBD'}
          </span>
        </div>
        <div style={styles.iconRow}>
          <button
            onClick={() => setHearted(!hearted)}
            style={styles.iconButton}
            aria-label={hearted ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={18}
              color={hearted ? '#ef4444' : '#374151'}
              fill={hearted ? '#ef4444' : 'none'}
            />
          </button>
          <button
            onClick={() => setBookmarked(!bookmarked)}
            style={styles.iconButton}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark movie'}
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
  },
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '12px',
  },
  largePoster: {
    width: '150px',
    height: '225px',
    objectFit: 'cover',
    borderRadius: '12px',
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
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    marginBottom: '2px',
  },
  year: {
    fontSize: '20px',
    color: '#666',
    fontWeight: '200',
    fontFamily: 'inherit',
    marginBottom: '8px',
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