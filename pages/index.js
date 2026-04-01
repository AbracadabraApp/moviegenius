/**
 * MovieGenius Homepage - V2 Browse Discovery
 *
 * Netflix-style carousel homepage with featured collections
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import NetflixCarousel from '../components/NetflixCarousel';

export default function MovieGeniusPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [seed, setSeed] = useState(null);
  const FIRST_BATCH = 5;
  const COLLECTIONS_PER_PAGE = 10;
  const MAX_COLLECTIONS = 100;

  // On mount: restore state for back-navigation, generate new seed for fresh loads
  useEffect(() => {
    const navType = performance.getEntriesByType('navigation')[0]?.type;
    const isBackNav = navType === 'back_forward';

    const existingSeed = sessionStorage.getItem('homepage-seed');
    const existingCollections = sessionStorage.getItem('homepage-collections');

    if (isBackNav && existingSeed && existingCollections) {
      // Back navigation — restore previous state instantly
      try {
        setSeed(parseInt(existingSeed));
        setCollections(JSON.parse(existingCollections));
        setLoading(false);
        return;
      } catch {
        // Fall through to fresh load
      }
    }

    // Fresh load — always generate a new seed
    sessionStorage.removeItem('homepage-collections');
    const newSeed = Math.floor(Math.random() * 1000000);
    sessionStorage.setItem('homepage-seed', newSeed.toString());
    setSeed(newSeed);
  }, []);

  // Fetch collections when seed is ready or page changes
  useEffect(() => {
    if (seed === null) return;

    // If seed was restored from session, skip the initial fetch
    const existingCollections = sessionStorage.getItem('homepage-collections');
    if (page === 0 && existingCollections) return;

    const fetchCollections = async () => {
      try {
        if (page === 0) {
          setLoading(true);

          // Fetch first 5 immediately to render fast
          const firstResponse = await fetch(
            `/api/featured-collections?limit=${FIRST_BATCH}&offset=0&moviesPerCollection=10&seed=${seed}`
          );
          if (firstResponse.ok) {
            const firstData = await firstResponse.json();
            const firstBatch = firstData.collections || [];
            setCollections(firstBatch);
            setLoading(false);

            // Immediately fetch the next 5 in the background
            const secondResponse = await fetch(
              `/api/featured-collections?limit=${FIRST_BATCH}&offset=${FIRST_BATCH}&moviesPerCollection=10&seed=${seed}`
            );
            if (secondResponse.ok) {
              const secondData = await secondResponse.json();
              const secondBatch = secondData.collections || [];
              setCollections(prev => {
                const combined = [...prev, ...secondBatch];
                sessionStorage.setItem('homepage-collections', JSON.stringify(combined));
                return combined;
              });
              if (secondBatch.length < FIRST_BATCH) setHasMore(false);
            }
          } else {
            setLoading(false);
          }
        } else {
          setLoadingMore(true);
          const offset = page * COLLECTIONS_PER_PAGE;
          const response = await fetch(
            `/api/featured-collections?limit=${COLLECTIONS_PER_PAGE}&offset=${offset}&moviesPerCollection=10&seed=${seed}`
          );
          if (response.ok) {
            const data = await response.json();
            const newCollections = data.collections || [];
            setCollections(prev => {
              const combined = [...prev, ...newCollections];
              sessionStorage.setItem('homepage-collections', JSON.stringify(combined));
              return combined;
            });
            if (
              newCollections.length < COLLECTIONS_PER_PAGE ||
              collections.length + newCollections.length >= MAX_COLLECTIONS
            ) {
              setHasMore(false);
            }
          }
          setLoadingMore(false);
        }
      } catch (error) {
        console.error('Failed to fetch featured collections:', error);
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchCollections();
  }, [seed, page]);

  // Restore scroll position when navigating back
  useEffect(() => {
    const contentElement = document.getElementById('browse-content');
    if (contentElement) {
      const savedPosition = sessionStorage.getItem('homepage-scroll');
      if (savedPosition) {
        contentElement.scrollTop = parseInt(savedPosition, 10);
      }
    }
  }, [loading]);

  // Infinite scroll handler and scroll position saver
  useEffect(() => {
    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;

      // Save scroll position
      sessionStorage.setItem('homepage-scroll', scrollTop.toString());

      // Load more when user scrolls to bottom 500px
      if (
        scrollHeight - scrollTop - clientHeight < 500 &&
        !loadingMore &&
        !loading &&
        hasMore
      ) {
        setPage(prev => prev + 1);
      }
    };

    const contentElement = document.getElementById('browse-content');
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [loadingMore, loading, hasMore]);

  return (
    <PhoneFrame
      backgroundImage={null}
      showDarkOverlay={false}
    >
      <div style={styles.container}>
        {/* Sticky Search Header */}
        <div style={styles.header}>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Browse Content */}
        <div id="browse-content" style={styles.content}>
          {loading && (
            <div style={styles.skeletonWrapper}>
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -600px 0; }
                  100% { background-position: 600px 0; }
                }
                .skeleton-pulse {
                  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                  background-size: 600px 100%;
                  animation: shimmer 1.4s infinite linear;
                }
              `}</style>
              {[0, 1, 2].map(i => (
                <div key={i} style={styles.skeletonSection}>
                  <div style={styles.skeletonHeader}>
                    <div className="skeleton-pulse" style={styles.skeletonTitle} />
                    <div className="skeleton-pulse" style={styles.skeletonViewAll} />
                  </div>
                  <div style={styles.skeletonRow}>
                    {[0, 1, 2, 3, 4].map(j => (
                      <div className="skeleton-pulse" key={j} style={styles.skeletonCard} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && collections.length === 0 && (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>🎬</div>
              <div style={styles.emptyText}>No collections available</div>
            </div>
          )}

          {collections.length > 0 && (
            <>
              {/* Featured Collection Carousels */}
              {collections.map((collection) => {
                // Use the first category from the collection's categories array
                // Categories are already sorted by percentage (highest first)
                const categoryLabel = collection.categories && collection.categories.length > 0
                  ? collection.categories[0]
                  : null;

                return (
                  <NetflixCarousel
                    key={collection.id}
                    title={collection.title}
                    movies={collection.movies}
                    collectionId={collection.id}
                    showViewAll={true}
                    categoryLabel={categoryLabel}
                  />
                );
              })}

              {/* Loading More Indicator */}
              {loadingMore && (
                <div style={styles.loadingContainer}>
                  <div style={styles.loadingText}>Loading more collections...</div>
                </div>
              )}

            </>
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background: '#ffffff',
    position: 'relative',
  },

  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    borderBottom: 'none',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'relative',
    paddingBottom: '40px',
  },

  // Skeleton loading
  skeletonWrapper: {
    padding: '8px 0',
  },

  skeletonSection: {
    marginBottom: '4px',
  },

  skeletonHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px 8px 16px',
  },

  skeletonTitle: {
    height: '19px',
    width: '160px',
    borderRadius: '4px',
  },

  skeletonViewAll: {
    height: '14px',
    width: '52px',
    borderRadius: '4px',
  },

  skeletonRow: {
    display: 'flex',
    gap: '8px',
    padding: '0 16px 16px 16px',
    overflowX: 'hidden',
  },

  skeletonCard: {
    flex: '0 0 auto',
    width: '140px',
    height: '188px',
    borderRadius: '6px',
  },

  // Empty state
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    opacity: 0.8,
  },

};
