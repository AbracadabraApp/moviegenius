/**
 * What to Watch Page
 * Simple watchlist page showing user's favorited and bookmarked movies
 */
import { Check, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from '../components/FavoritesManager';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';

export default function WhatToWatchPage() {
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('bookmarked'); // 'hearted' or 'bookmarked'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Load favorites from localStorage
    try {
      const hearted = FavoritesManager.getHeartedMovies();
      const bookmarked = FavoritesManager.getBookmarkedMovies();

      setHeartedMovies(hearted);
      setBookmarkedMovies(bookmarked);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, [mounted]);

  const movies = activeTab === 'hearted' ? heartedMovies : bookmarkedMovies;
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
            movies.map((movie, index) => (
              <MediaCard
                key={movie.id || index}
                title={movie.title}
                year={movie.year}
                initialSlug={movie.slug}
                initialPoster={movie.poster}
                tmdbId={movie.tmdbId || movie.tmdb_id}
              />
            ))
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
};
