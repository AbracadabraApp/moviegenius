/**
 * ListHeader Component
 *
 * Large format list header for detail pages with flat design.
 * Follows the same pattern as MovieHeader and PersonHeader.
 */
import { Heart, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';

export default function ListHeader({
  name,
  description,
  movieCount,
  claudeDescription,
  listId,
  generatingDescription,
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Generate list ID for favorites
  const favoriteId = `list-${listId || name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  // List data object for FavoritesManager
  const listData = { name, description, movieCount, id: favoriteId };

  // Load initial state from localStorage
  useEffect(() => {
    setHearted(FavoritesManager.isListHearted(favoriteId));
    setBookmarked(FavoritesManager.isListBookmarked(favoriteId));
  }, [favoriteId]);

  // Listen for favorites updates from other components
  useEffect(() => {
    const handleListsUpdate = () => {
      setHearted(FavoritesManager.isListHearted(favoriteId));
      setBookmarked(FavoritesManager.isListBookmarked(favoriteId));
    };

    window.addEventListener('listsUpdated', handleListsUpdate);
    return () => window.removeEventListener('listsUpdated', handleListsUpdate);
  }, [favoriteId]);

  return (
    <div style={styles.listHeader}>
      <div style={styles.contentRow}>
        <div style={styles.textContainer}>
          <div style={styles.titleColumn}>
            <div style={styles.name}>{name}</div>
            <div style={styles.count}>
              {movieCount} {movieCount === 1 ? 'film' : 'films'}
            </div>
          </div>
          {description && <div style={styles.description}>{description}</div>}
        </div>
      </div>

      {/* Claude Description Section */}
      {(claudeDescription || generatingDescription) && (
        <div style={styles.claudeSection}>
          {generatingDescription ? (
            <div style={styles.generating}>
              <div style={styles.generatingText}>Generating collection overview...</div>
            </div>
          ) : (
            <div style={styles.claudeDescription}>
              {claudeDescription.split('\n\n').map((paragraph, index) => (
                <p key={index} style={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom row: empty left, icons right */}
      <div style={styles.bottomRow}>
        <div style={styles.spacer}></div>
        <div style={styles.iconRow}>
          <button
            onClick={() => {
              const newState = FavoritesManager.toggleListHeart(listData);
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
              const newState = FavoritesManager.toggleListBookmark(listData);
              setBookmarked(newState);
            }}
            style={styles.iconButton}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark list'}
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
  listHeader: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '12px',
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
  name: {
    fontSize: '20px', // Match MovieHeader/PersonHeader
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    marginBottom: '2px',
  },
  count: {
    fontSize: '20px', // Match MovieHeader/PersonHeader year style
    color: '#666',
    fontWeight: '200',
    fontFamily: 'inherit',
    marginBottom: '8px',
  },
  description: {
    fontSize: '16px', // Match PersonHeader biography
    color: '#333',
    marginTop: '4px',
    marginBottom: '12px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  claudeSection: {
    marginBottom: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
  },
  claudeDescription: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
  },
  paragraph: {
    marginBottom: '14px',
  },
  generating: {
    textAlign: 'center',
    padding: '8px',
  },
  generatingText: {
    fontSize: '15px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
  },
  spacer: {
    flex: 1,
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
