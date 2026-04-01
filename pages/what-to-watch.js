/**
 * What to Watch Page
 * Requires Google sign-in. Favorites synced to DB per user.
 */
import { Check, Bookmark, ChevronRight, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from 'next-auth/react';
import { FavoritesManager } from '../components/FavoritesManager';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';

export default function WhatToWatchPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [savedSubcategories, setSavedSubcategories] = useState([]);
  const [activeTab, setActiveTab] = useState('bookmarked');
  const [showAll, setShowAll] = useState(false);
  const [synced, setSynced] = useState(false);
  const sentinelRef = useRef(null);
  const INITIAL_COUNT = 20;

  // On sign-in: migrate localStorage favorites to DB, then load from DB
  useEffect(() => {
    if (status !== 'authenticated' || synced) return;

    async function syncAndLoad() {
      // Migrate any existing localStorage favorites up to the server
      const localHearted = FavoritesManager.getHeartedMovies();
      const localBookmarked = FavoritesManager.getBookmarkedMovies();
      const toSync = [
        ...localHearted.map(m => ({ ...m, type: 'hearted', tmdb_id: m.tmdbId || m.tmdb_id })),
        ...localBookmarked.map(m => ({ ...m, type: 'bookmarked', tmdb_id: m.tmdbId || m.tmdb_id })),
      ].filter(m => m.tmdb_id);

      if (toSync.length > 0) {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorites: toSync }),
        });
      }

      // Load from DB
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const { favorites } = await res.json();
        setHeartedMovies(favorites.filter(f => f.type === 'hearted'));
        setBookmarkedMovies(favorites.filter(f => f.type === 'bookmarked'));
      }

      // Load local subcategories (these stay local for now)
      setSavedSubcategories(FavoritesManager.getBookmarkedSubcategories() || []);
      setSynced(true);
    }

    syncAndLoad();
  }, [status, synced]);

  // Remove movie from bookmarked list when unbookmarked via MediaCard
  useEffect(() => {
    const handler = () => {
      const currentIds = new Set(FavoritesManager.getBookmarkedMovies().map(m => String(m.tmdbId || m.tmdb_id)));
      setBookmarkedMovies(prev => prev.filter(m => currentIds.has(String(m.tmdb_id))));
    };
    window.addEventListener('moviesUpdated', handler);
    return () => window.removeEventListener('moviesUpdated', handler);
  }, []);

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
  }, [showAll, activeTab, synced]);

  const movies = activeTab === 'hearted' ? heartedMovies : bookmarkedMovies;
  const visibleMovies = showAll ? movies : movies.slice(0, INITIAL_COUNT);
  const hasMore = movies.length > INITIAL_COUNT && !showAll;
  const isEmpty = movies.length === 0;

  // Decade grouping for Seen tab
  const decadeGroups = (() => {
    if (activeTab !== 'hearted' || visibleMovies.length === 0) return null;
    const groups = {};
    for (const m of visibleMovies) {
      const decade = m.year ? Math.floor(m.year / 10) * 10 : 0;
      const label = decade ? `${decade}s` : 'Unknown';
      if (!groups[label]) groups[label] = [];
      groups[label].push(m);
    }
    return Object.entries(groups).sort((a, b) => {
      const da = parseInt(a[0]) || 0;
      const db = parseInt(b[0]) || 0;
      return db - da;
    });
  })();

  // --- Sign-in wall ---
  if (status === 'loading') {
    return (
      <PhoneFrame>
        <div style={styles.centeredPage}>
          <div style={styles.loadingDot} />
        </div>
      </PhoneFrame>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <PhoneFrame>
        <div style={styles.centeredPage}>
          <div style={styles.signInCard}>
            <div style={styles.signInIcon}>🎬</div>
            <h2 style={styles.signInTitle}>Your movies, everywhere</h2>
            <p style={styles.signInSubtitle}>
              Sign in to save your Watch Later list and Seen movies across all your devices.
            </p>
            <button
              onClick={() => signIn('google')}
              style={styles.googleButton}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // --- Authenticated view ---
  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search Bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px' }}>
          <SimpleSearch
            onResults={() => {}}
            placeholder="Search Movies . . ."
            useUnifiedSearch={true}
          />
        </div>

        {/* User header */}
        <div style={styles.userRow}>
          {session.user.image && (
            <img src={session.user.image} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
          )}
          <span style={styles.userName}>{session.user.name || session.user.email}</span>
          <button onClick={() => signOut()} style={styles.signOutBtn} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('bookmarked')}
            style={{ ...styles.tab, ...(activeTab === 'bookmarked' ? styles.tabActive : {}) }}
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
            style={{ ...styles.tab, ...(activeTab === 'hearted' ? styles.tabActive : {}) }}
          >
            <Check size={16} color={activeTab === 'hearted' ? '#d4af37' : '#6b7280'} />
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
          {!synced ? (
            <div style={styles.emptyState}>
              <div style={styles.loadingDot} />
            </div>
          ) : isEmpty ? (
            <div style={styles.emptyState}>
              {activeTab === 'hearted' ? (
                <>
                  <Check size={48} color="#d1d5db" strokeWidth={1.5} />
                  <h3 style={styles.emptyTitle}>No movies marked seen yet</h3>
                  <p style={styles.emptyText}>
                    Tap <Check size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Seen on any movie page
                  </p>
                </>
              ) : (
                <>
                  <Bookmark size={48} color="#d1d5db" strokeWidth={1.5} />
                  <h3 style={styles.emptyTitle}>Watch later list is empty</h3>
                  <p style={styles.emptyText}>
                    Tap the <Bookmark size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> to save movies for later
                  </p>
                </>
              )}
            </div>
          ) : decadeGroups ? (
            <>
              {decadeGroups.map(([decade, group]) => (
                <div key={decade}>
                  <div style={styles.decadeHeader}>{decade}</div>
                  {group.map((movie, index) => (
                    <MediaCard
                      key={movie.tmdb_id || index}
                      title={movie.title}
                      year={movie.year}
                      initialSlug={movie.slug}
                      initialPoster={movie.poster}
                      tmdbId={movie.tmdb_id}
                    />
                  ))}
                </div>
              ))}
              {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
            </>
          ) : (
            <>
              {visibleMovies.map((movie, index) => (
                <MediaCard
                  key={movie.tmdb_id || index}
                  title={movie.title}
                  year={movie.year}
                  initialSlug={movie.slug}
                  initialPoster={movie.poster}
                  tmdbId={movie.tmdb_id}
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
  centeredPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: '40px 24px',
  },
  loadingDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #e5e7eb',
    borderTopColor: '#d4af37',
    animation: 'spin 0.8s linear infinite',
  },
  signInCard: {
    width: '100%',
    maxWidth: '320px',
    textAlign: 'center',
  },
  signInIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  signInTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '10px',
  },
  signInSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '32px',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '13px 20px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 20px 14px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signOutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 20px 0',
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
  decadeHeader: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '16px 0 8px',
  },
};
