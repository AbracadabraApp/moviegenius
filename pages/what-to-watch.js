/**
 * What to Watch Page
 * Simple watchlist page showing user's favorited and bookmarked movies
 */
import { Heart, Bookmark, Play, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from '../components/FavoritesManager';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import { useRouter } from 'next/router';

export default function WhatToWatchPage() {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('hearted'); // 'hearted' or 'bookmarked'
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

  const handleRemoveHeart = (movie) => {
    FavoritesManager.toggleHeart(movie);
    setHeartedMovies(prev => prev.filter(m => m.id !== movie.id));
  };

  const handleRemoveBookmark = (movie) => {
    FavoritesManager.toggleBookmark(movie);
    setBookmarkedMovies(prev => prev.filter(m => m.id !== movie.id));
  };

  const movies = activeTab === 'hearted' ? heartedMovies : bookmarkedMovies;
  const isEmpty = movies.length === 0;

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Simple Search Bar */}
        <div style={{ padding: '16px 20px 16px 20px' }}>
          <SimpleSearch
            onResults={() => {}}
            placeholder="Search Movies . . ."
            useUnifiedSearch={true}
          />
        </div>

        {/* Page Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>What to Watch</h1>
          <p style={styles.subtitle}>
            Your curated collection of must-watch films
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('hearted')}
            style={{
              ...styles.tab,
              ...(activeTab === 'hearted' ? styles.tabActive : {}),
            }}
          >
            <Heart
              size={16}
              fill={activeTab === 'hearted' ? '#d4af37' : 'none'}
              color={activeTab === 'hearted' ? '#d4af37' : '#6b7280'}
            />
            <span>Favorites ({heartedMovies.length})</span>
          </button>

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
        </div>

        {/* Movie List */}
        <div style={styles.movieList}>
          {isEmpty ? (
            <div style={styles.emptyState}>
              {activeTab === 'hearted' ? (
                <>
                  <Heart size={48} color="#d1d5db" strokeWidth={1.5} />
                  <h3 style={styles.emptyTitle}>No favorites yet</h3>
                  <p style={styles.emptyText}>
                    Tap the <Heart size={14} style={{display: 'inline', verticalAlign: 'middle'}} /> on movies you love
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
              <MovieCard
                key={movie.id || index}
                movie={movie}
                onRemove={activeTab === 'hearted' ? handleRemoveHeart : handleRemoveBookmark}
                showHeart={activeTab === 'hearted'}
                router={router}
              />
            ))
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

/**
 * Individual Movie Card in Watchlist
 */
function MovieCard({ movie, onRemove, showHeart, router }) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = (e) => {
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(movie);
    }, 200); // Brief animation delay
  };

  const handleWatch = () => {
    // Navigate to movie detail page - use tmdbId or tmdb_id field
    const tmdbId = movie.tmdbId || movie.tmdb_id;

    if (tmdbId) {
      router.push(`/movie/${tmdbId}`);
    } else {
      console.warn('Movie has no TMDB ID:', movie);
    }
  };

  return (
    <div
      onClick={handleWatch}
      style={{
        ...styles.movieCard,
        opacity: isRemoving ? 0.3 : 1,
        transform: isRemoving ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      {/* Poster */}
      <div style={styles.posterContainer}>
        <img
          src={movie.poster || '/images/placeholder-poster.jpg'}
          alt={movie.title}
          style={styles.poster}
          onError={(e) => {
            e.target.src = '/images/placeholder-poster.jpg';
          }}
        />
      </div>

      {/* Movie Info */}
      <div style={styles.movieInfo}>
        <h3 style={styles.movieTitle}>
          {movie.title} {movie.year && `(${movie.year})`}
        </h3>
        {movie.slug && (
          <p style={styles.movieSlug}>{movie.slug}</p>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleWatch}
          style={styles.watchButton}
          title="View details"
        >
          <Play size={18} fill="#ffffff" color="#ffffff" />
        </button>

        <button
          onClick={handleRemove}
          style={styles.removeButton}
          title={showHeart ? "Remove from favorites" : "Remove from watch later"}
        >
          <X size={18} color="#6b7280" />
        </button>
      </div>
    </div>
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
    padding: '0 20px',
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
  movieCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  posterContainer: {
    flexShrink: 0,
    width: '60px',
    height: '90px',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  movieInfo: {
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  movieTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  movieSlug: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  watchButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#d4af37',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  removeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
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
