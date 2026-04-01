/**
 * Genius Page — Collection Recommendations
 *
 * Shows collections derived from the user's seen history and watchlist.
 * "Because you watched X..." sections, each with 1-3 matching collections.
 * Zero Claude cost — pure SQL overlap matching.
 *
 * Cold start: redirects to /genius/start when user has no history.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import { FavoritesManager } from '../../components/FavoritesManager';
import MediaCard from '../../components/MediaCard';

const MIN_SAVES = 1;

export default function GeniusPage() {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(() => {
    FavoritesManager._cache.hearted = null;
    FavoritesManager._cache.bookmarked = null;

    const heartedMovies = FavoritesManager.getHeartedMovies();
    const seenIds = heartedMovies.map(m => m.tmdbId || m.tmdb_id).filter(Boolean);

    const savedMovies = FavoritesManager.getBookmarkedMovies();
    const bookmarkedIds = savedMovies.map(m => m.tmdbId).filter(Boolean);

    // Use both hearted and bookmarked as seeds; dedupe
    const savedIds = [...new Set([...seenIds, ...bookmarkedIds])];

    if (savedIds.length < MIN_SAVES) {
      router.replace('/genius/start');
      return;
    }

    setLoading(true);

    fetch('/api/genius-feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedIds, seenIds }),
    })
      .then(r => r.json())
      .then(data => {
        const items = data.items || [];
        if (items.length === 0) {
          router.replace('/genius/start');
        } else {
          setFeedItems(items);
        }
      })
      .catch(() => router.replace('/genius/start'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);


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

          {!loading && (
            <div style={styles.collectionList}>
              {feedItems.map((item, i) => {
                if (item.type === 'more_ideas') {
                  return (
                    <div key={`mi-${item.seedTmdbId}-${i}`} style={styles.section}>
                      <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}>Films like {item.seedTitle}</span>
                      </div>
                      {item.movies.map((m, idx) => (
                        <MediaCard
                          key={idx}
                          title={m.title}
                          year={m.year}
                          initialPoster={m.poster_url}
                          initialSlug={m.slug}
                          tmdbId={m.tmdb_id}
                        />
                      ))}
                    </div>
                  );
                }

                if (item.type === 'collection') {
                  const covers = item.movies.slice(0, 6);
                  return (
                    <div key={`col-${item.collectionId}-${i}`} style={styles.section}>
                      <div
                        style={styles.sectionHeader}
                        onClick={() => router.push(`/collection/${item.collectionId}`)}
                      >
                        <span style={styles.sectionTitle}>{item.name}</span>
                        <span style={styles.sectionParent}>{item.collectionTitle}</span>
                      </div>
                      <div style={styles.posterGrid}>
                        {covers.map((m, idx) => (
                          <div
                            key={idx}
                            style={styles.posterGridItem}
                            onClick={() => router.push(`/movie/${m.tmdb_id}`)}
                          >
                            <img src={m.poster_url} alt={m.title} style={styles.posterGridImg} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              <div style={styles.miniToggleRow}>
                <button
                  style={styles.miniToggleBtn}
                  onClick={() => router.push('/genius/start')}
                >
                  Improve your recommendations →
                </button>
              </div>
            </div>
          )}
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
  collectionList: {
    padding: '8px 0 40px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    padding: '0 16px 10px',
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    letterSpacing: '-0.01em',
    display: 'block',
    lineHeight: '1.3',
  },
  sectionParent: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '400',
    display: 'block',
    marginTop: '2px',
  },
  posterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '4px',
    padding: '0 16px',
    cursor: 'pointer',
  },
  posterGridItem: {
    aspectRatio: '2/3',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
  },
  posterGridImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  miniToggleRow: {
    padding: '8px 16px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
  miniToggleBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};
