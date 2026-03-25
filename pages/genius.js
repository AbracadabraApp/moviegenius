/**
 * Genius Page — Collection Recommendations
 *
 * Shows collections derived from the user's seen history and watchlist.
 * "Because you watched X..." sections, each with 1-3 matching collections.
 * Zero Claude cost — pure SQL overlap matching.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import { FavoritesManager } from '../components/FavoritesManager';

export default function GeniusPage() {
  const router = useRouter();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    const seenMovies = FavoritesManager.getHeartedMovies();
    const savedMovies = FavoritesManager.getBookmarkedMovies();

    const seenIds = seenMovies.map(m => m.tmdbId).filter(Boolean);
    const savedIds = savedMovies.map(m => m.tmdbId).filter(Boolean);

    if (seenIds.length === 0 && savedIds.length === 0) {
      setLoading(false);
      setIsEmpty(true);
      return;
    }

    fetch('/api/genius-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seenIds, savedIds }),
    })
      .then(r => r.json())
      .then(data => {
        setSections(data.sections || []);
        setIsEmpty(data.empty || data.sections?.length === 0);
      })
      .catch(err => {
        console.error('Genius recs error:', err);
        setIsEmpty(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search */}
        <div style={styles.searchBar}>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        <div style={styles.content}>
          {loading && (
            <div style={styles.skeletonWrapper}>
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -600px 0; }
                  100% { background-position: 600px 0; }
                }
                .sk {
                  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                  background-size: 600px 100%;
                  animation: shimmer 1.4s infinite linear;
                  border-radius: 6px;
                }
              `}</style>
              {[0, 1, 2].map(i => (
                <div key={i} style={styles.skeletonSection}>
                  <div className="sk" style={{ height: '14px', width: '220px', marginBottom: '12px' }} />
                  {[0, 1].map(j => (
                    <div className="sk" key={j} style={{ height: '72px', borderRadius: '10px', marginBottom: '10px' }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loading && isEmpty && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎬</div>
              <div style={styles.emptyTitle}>Nothing yet</div>
              <div style={styles.emptyText}>
                Mark films as Seen or Add them to your list — Genius will find collections that match your taste.
              </div>
            </div>
          )}

          {!loading && !isEmpty && sections.map((section, i) => (
            <div key={i} style={styles.section}>
              {/* Section label */}
              <div style={styles.sectionLabel}>
                <span style={styles.because}>
                  {section.seedType === 'seen' ? 'Because you watched' : 'Because you saved'}
                </span>
                <span style={styles.seedTitle}> {section.seedMovie.title}</span>
              </div>

              {/* Collection cards */}
              {section.collections.map(collection => (
                <div
                  key={collection.id}
                  style={styles.card}
                  onClick={() => router.push(`/collection/${collection.id}`)}
                >
                  {/* Poster strip */}
                  <div style={styles.posterStrip}>
                    {collection.previewMovies.slice(0, 4).map((m, idx) => (
                      <img
                        key={idx}
                        src={m.poster_url}
                        alt={m.title}
                        style={styles.poster}
                      />
                    ))}
                  </div>

                  {/* Info */}
                  <div style={styles.cardInfo}>
                    <div style={styles.cardTitle}>{collection.title}</div>
                    <div style={styles.cardMeta}>
                      {collection.overlapCount} of your films
                      {collection.categories[0] ? ` · ${collection.categories[0]}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  searchBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '16px',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '8px 0 40px',
  },

  skeletonWrapper: {
    padding: '16px',
  },

  skeletonSection: {
    marginBottom: '28px',
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 32px',
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '56px',
    marginBottom: '16px',
  },

  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '10px',
  },

  emptyText: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.5',
  },

  // Sections
  section: {
    padding: '16px 16px 8px',
    borderBottom: '1px solid #f3f4f6',
  },

  sectionLabel: {
    fontSize: '13px',
    marginBottom: '12px',
    lineHeight: '1.4',
  },

  because: {
    color: '#6b7280',
    fontWeight: '400',
  },

  seedTitle: {
    color: '#111827',
    fontWeight: '600',
  },

  // Collection card
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    cursor: 'pointer',
    borderTop: '1px solid #f9fafb',
  },

  posterStrip: {
    display: 'flex',
    gap: '3px',
    flexShrink: 0,
  },

  poster: {
    width: '36px',
    height: '54px',
    objectFit: 'cover',
    borderRadius: '4px',
    display: 'block',
  },

  cardInfo: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '3px',
    lineHeight: '1.3',
  },

  cardMeta: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '400',
  },
};
