/**
 * What to Watch Page
 * Simple watchlist page showing user's favorited and bookmarked movies
 */
import { Check, Bookmark, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { FavoritesManager } from '../components/FavoritesManager';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';

export default function WhatToWatchPage() {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [savedSubcategories, setSavedSubcategories] = useState([]);
  const [activeTab, setActiveTab] = useState('bookmarked'); // 'hearted' or 'bookmarked'
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sentinelRef = useRef(null);
  const INITIAL_COUNT = 20;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Load favorites from localStorage
    try {
      const hearted = FavoritesManager.getHeartedMovies();
      const bookmarked = FavoritesManager.getBookmarkedMovies();
      const subs = FavoritesManager.getBookmarkedSubcategories();

      setHeartedMovies(hearted);
      setBookmarkedMovies(bookmarked);
      setSavedSubcategories(subs || []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, [mounted]);

  // Reset expansion when tab changes
  useEffect(() => { setShowAll(false); }, [activeTab]);

  // Auto-expand when sentinel scrolls into view
  useEffect(() => {
    if (showAll || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShowAll(true); },
      { rootMargin: '100px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [showAll, activeTab, mounted]);

  const movies = activeTab === 'hearted' ? heartedMovies : bookmarkedMovies;
  const visibleMovies = showAll ? movies : movies.slice(0, INITIAL_COUNT);
  const hasMore = movies.length > INITIAL_COUNT && !showAll;
  const isEmpty = movies.length === 0;

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Simple Search Bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px' }}>
          <SimpleSearch
            onResults={() => {}}
            placeholder="Search Movies . . ."
            useUnifiedSearch={true}
          />
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('bookmarked')}
            style={{
              ...styles.tab,
              ...(activeTab === 'bookmarked' ? styles.tabActive : {}),
            }}
          >
            <Bookmark
              size={16}
              fill={activeTab === 'bookmarked' ? '#d4af37' : 'none'}
              color={activeTab === 'bookmarked' ? '#d4af37' : '#6b7280'}
            />
            <span>Watch Later ({bookmarkedMovies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hearted')}
            style={{
              ...styles.tab,
              ...(activeTab === 'hearted' ? styles.tabActive : {}),
            }}
          >
            <Check
              size={16}
              color={activeTab === 'hearted' ? '#d4af37' : '#6b7280'}
            />
            <span>Seen ({heartedMovies.length})</span>
          </button>
        </div>

        {/* Saved Collections — Watch Later tab only */}
        {activeTab === 'bookmarked' && savedSubcategories.length > 0 && (
          <div style={styles.collectionsBlock}>
            <div style={styles.collectionsHeader}>Saved Collections</div>
            {savedSubcategories.map((sub, i) => (
              <div key={i} style={styles.collectionRow}>
                <button
                  style={styles.collectionRowTitle}
                  onClick={() => router.push(`/collection/${sub.collectionId}`)}
                >
                  <span style={styles.collectionRowName}>{sub.subcategoryName}</span>
                  <span style={styles.collectionRowParent}>{sub.collectionTitle}</span>
                  <ChevronRight size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
                </button>
                <div style={styles.posterStrip}>
                  {(sub.movies || []).map((m, mi) => (
                    <div
                      key={mi}
                      style={styles.stripPosterWrap}
                      onClick={() => router.push(`/movie/${m.tmdb_id}`)}
                    >
                      <img
                        src={m.poster_url}
                        alt={m.title}
                        style={styles.stripPoster}
                        onError={e => { e.target.style.backgroundColor = '#e5e7eb'; e.target.src = ''; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Movie List */}
        <div style={styles.movieList}>
          {isEmpty ? (
            <div style={styles.emptyState}>
              {activeTab === 'hearted' ? (
                <>
                  <Check size={48} color="#d1d5db" strokeWidth={1.5} />
                  <h3 style={styles.emptyTitle}>No movies marked seen yet</h3>
                  <p style={styles.emptyText}>
                    Tap <Check size={14} style={{display: 'inline', verticalAlign: 'middle'}} /> Seen on any movie page
                  </p>
                </>
              ) : (
                <>
                  <Bookmark size={48} color="#d1d5db" strokeWidth={1.5} />
                  <h3 style={styles.emptyTitle}>Watch later list is empty</h3>
                  <p style={styles.emptyText}>
                    Tap the <Bookmark size={14} style={{display: 'inline', verticalAlign: 'middle'}} /> to save movies for later
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {visibleMovies.map((movie, index) => (
                <MediaCard
                  key={movie.id || index}
                  title={movie.title}
                  year={movie.year}
                  initialSlug={movie.slug}
                  initialPoster={movie.poster}
                  tmdbId={movie.tmdbId || movie.tmdb_id}
                />
              ))}
              {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    padding: '0 0 20px 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    marginBottom: '24px',
    textAlign: 'center',
    padding: '0 20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    fontWeight: '400',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '0',
    padding: '20px 20px 0',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  tabActive: {
    color: '#111827',
    borderBottomColor: '#d4af37',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '0 20px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 20px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginTop: '16px',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },

  // Saved Collections block
  collectionsBlock: {
    padding: '0 0 8px 0',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '16px',
  },
  collectionsHeader: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '12px 20px 8px',
  },
  collectionRow: {
    marginBottom: '20px',
  },
  collectionRowTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 20px 8px',
    width: '100%',
    textAlign: 'left',
  },
  collectionRowName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  collectionRowParent: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '400',
  },
  posterStrip: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    overflowX: 'auto',
    padding: '0 20px 4px',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  stripPosterWrap: {
    flexShrink: 0,
    width: '72px',
    aspectRatio: '2/3',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
  },
  stripPoster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
};
