/**
 * MovieGenius Homepage - V2 Browse Discovery
 *
 * Netflix-style carousel homepage with featured collections
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MovieCarousel from '../components/MovieCarousel';

export default function MovieGeniusPage() {
  const router = useRouter();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const COLLECTIONS_PER_PAGE = 10;
  const MAX_COLLECTIONS = 100;

  // Fetch collections on mount and when page changes
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        if (page === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const offset = page * COLLECTIONS_PER_PAGE;
        const response = await fetch(
          `/api/featured-collections?limit=${COLLECTIONS_PER_PAGE}&offset=${offset}&moviesPerCollection=10`
        );

        if (response.ok) {
          const data = await response.json();
          const newCollections = data.collections || [];

          if (page === 0) {
            setCollections(newCollections);
          } else {
            setCollections(prev => [...prev, ...newCollections]);
          }

          // Check if we should stop loading more
          if (
            newCollections.length < COLLECTIONS_PER_PAGE ||
            collections.length + newCollections.length >= MAX_COLLECTIONS
          ) {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch featured collections:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchCollections();
  }, [page]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;

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
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading collections...</div>
            </div>
          )}

          {!loading && collections.length === 0 && (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>🎬</div>
              <div style={styles.emptyText}>No collections available</div>
            </div>
          )}

          {!loading && collections.length > 0 && (
            <>
              {/* Welcome Message */}
              <div style={styles.welcomeSection}>
                <p style={styles.welcomeText}>
                  MovieGenius.AI - Discover great films in more than 5,000 curated collections
                </p>
              </div>

              {/* Featured Collection Carousels */}
              {collections.map((collection, index) => {
                // Assign rotating category labels for variety
                const categoryLabels = [
                  'Trending Now',
                  'Popular',
                  'Recommended',
                  'Curated',
                  'Staff Picks',
                  'Hidden Gems',
                  'Fan Favorites',
                  'Must Watch'
                ];
                const categoryLabel = categoryLabels[index % categoryLabels.length];

                return (
                  <MovieCarousel
                    key={collection.id}
                    title={collection.title}
                    movies={collection.movies}
                    collectionId={collection.id}
                    showViewAll={true}
                    totalMovies={collection.totalMovies}
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

              {/* Browse All Link - Only show when we've reached the end */}
              {!hasMore && (
                <div style={styles.browseAllSection}>
                  <button
                    onClick={() => router.push('/browse')}
                    style={styles.browseAllButton}
                  >
                    Browse All 5,126 Collections →
                  </button>
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: '16px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid #e5e7eb',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'relative',
    paddingBottom: '40px',
  },

  // Loading state
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    opacity: 0.8,
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

  // Welcome section
  welcomeSection: {
    padding: '32px 16px 24px 16px',
  },

  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
  },

  welcomeText: {
    fontSize: '18px',
    color: '#d97706',
    margin: 0,
    fontWeight: '600',
  },

  // Browse all section
  browseAllSection: {
    padding: '32px 16px',
    textAlign: 'center',
  },

  browseAllButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    border: '1px solid #d4af37',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#d4af37',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};
