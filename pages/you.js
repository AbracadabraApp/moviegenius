/**
 * You Page - Netflix-Style Watch Queue
 *
 * Queue tab: Horizontal scrollers of bookmarked movies
 * History tab: Vertical list of watched movies with like buttons
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import NetflixCarousel from '../components/NetflixCarousel';
import { FavoritesManager } from '../components/FavoritesManager';
import MediaCard from '../components/MediaCard';
import { Bookmark, Eye, Plus, Check } from 'lucide-react';

export default function YouPage() {
  const router = useRouter();
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [likedMovies, setLikedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'history'
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites
  useEffect(() => {
    try {
      const bookmarked = FavoritesManager.getBookmarkedMovies();
      const watched = FavoritesManager.getWatchedMovies();
      const liked = FavoritesManager.getLikedMovies();
      setBookmarkedMovies(bookmarked);
      setWatchedMovies(watched);
      setLikedMovies(liked);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setIsLoaded(true);
    }
  }, []);

  // Listen for updates
  useEffect(() => {
    const handleUpdate = () => {
      try {
        setBookmarkedMovies(FavoritesManager.getBookmarkedMovies());
        setWatchedMovies(FavoritesManager.getWatchedMovies());
        setLikedMovies(FavoritesManager.getLikedMovies());
      } catch (error) {
        console.error('Error updating favorites:', error);
      }
    };

    window.addEventListener('moviesUpdated', handleUpdate);
    return () => window.removeEventListener('moviesUpdated', handleUpdate);
  }, []);

  // Check if a movie is liked
  const isMovieLiked = (movieId) => {
    return likedMovies.some(m => (m.tmdbId || m.tmdb_id) === movieId);
  };

  // Toggle like for a movie
  const handleToggleLike = (movie) => {
    FavoritesManager.toggleLiked({
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId || movie.tmdb_id,
      poster: movie.poster,
      slug: movie.slug,
    });
  };

  // Organize bookmarked movies into rows
  const organizeBookmarkedMovies = () => {
    if (bookmarkedMovies.length === 0) return [];

    const rows = [];

    // Recent bookmarks (last 10 added)
    const recent = [...bookmarkedMovies].slice(0, 10);
    if (recent.length > 0) {
      rows.push({
        title: 'Recently Added',
        movies: recent.map(m => ({
          tmdb_id: m.tmdbId || m.tmdb_id,
          title: m.title,
          year: m.year,
          poster_url: m.poster,
          slug: m.slug,
        }))
      });
    }

    // Group by decade if we have year data
    const byDecade = {};
    bookmarkedMovies.forEach(m => {
      if (m.year) {
        const decade = Math.floor(m.year / 10) * 10;
        if (!byDecade[decade]) byDecade[decade] = [];
        byDecade[decade].push(m);
      }
    });

    // Add decade rows (sorted newest to oldest)
    const decades = Object.keys(byDecade)
      .map(d => parseInt(d))
      .sort((a, b) => b - a);

    decades.forEach(decade => {
      if (byDecade[decade].length >= 3) { // Only show if 3+ movies
        rows.push({
          title: `${decade}s Movies`,
          movies: byDecade[decade].map(m => ({
            tmdb_id: m.tmdbId || m.tmdb_id,
            title: m.title,
            year: m.year,
            poster_url: m.poster,
            slug: m.slug,
          }))
        });
      }
    });

    // All bookmarks as fallback
    if (bookmarkedMovies.length > 10) {
      rows.push({
        title: 'Your Full Queue',
        movies: bookmarkedMovies.map(m => ({
          tmdb_id: m.tmdbId || m.tmdb_id,
          title: m.title,
          year: m.year,
          poster_url: m.poster,
          slug: m.slug,
        }))
      });
    }

    return rows;
  };

  const queueRows = organizeBookmarkedMovies();

  if (!isLoaded) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Fixed Search */}
        <div style={styles.searchSection}>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabBar}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'queue' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('queue')}
          >
            <Bookmark size={20} color={activeTab === 'queue' ? '#d4af37' : '#6b7280'} />
            <span style={{
              ...styles.tabLabel,
              color: activeTab === 'queue' ? '#d4af37' : '#6b7280'
            }}>
              Queue
            </span>
            {bookmarkedMovies.length > 0 && (
              <span style={{
                ...styles.tabCount,
                backgroundColor: activeTab === 'queue' ? '#d4af37' : '#e5e7eb',
                color: activeTab === 'queue' ? '#000' : '#6b7280'
              }}>
                {bookmarkedMovies.length}
              </span>
            )}
          </button>

          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'history' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('history')}
          >
            <Eye size={20} color={activeTab === 'history' ? '#d4af37' : '#6b7280'} />
            <span style={{
              ...styles.tabLabel,
              color: activeTab === 'history' ? '#d4af37' : '#6b7280'
            }}>
              History
            </span>
            {watchedMovies.length > 0 && (
              <span style={{
                ...styles.tabCount,
                backgroundColor: activeTab === 'history' ? '#d4af37' : '#e5e7eb',
                color: activeTab === 'history' ? '#000' : '#6b7280'
              }}>
                {watchedMovies.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div style={styles.content} id="you-content">
          {activeTab === 'queue' && (
            <>
              {queueRows.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🔖</div>
                  <p style={styles.emptyTitle}>Your queue is empty</p>
                  <p style={styles.emptyText}>
                    Bookmark movies you want to watch later. They'll appear here organized for easy browsing.
                  </p>
                  <button
                    style={styles.browseButton}
                    onClick={() => router.push('/')}
                  >
                    Browse Movies
                  </button>
                </div>
              ) : (
                <div style={styles.rowsContainer}>
                  {queueRows.map((row, index) => (
                    <NetflixCarousel
                      key={index}
                      title={row.title}
                      movies={row.movies}
                      showViewAll={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {watchedMovies.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>👁️</div>
                  <p style={styles.emptyTitle}>No watch history yet</p>
                  <p style={styles.emptyText}>
                    Mark movies as watched to track what you've seen. Your history will appear here.
                  </p>
                </div>
              ) : (
                <div style={styles.historyList}>
                  <div style={styles.historyHeader}>
                    <h2 style={styles.historyTitle}>Movies You've Seen</h2>
                    <p style={styles.historySubtitle}>
                      {watchedMovies.length} {watchedMovies.length === 1 ? 'movie' : 'movies'}
                    </p>
                  </div>

                  <div style={styles.movieList}>
                    {watchedMovies.map((movie, index) => {
                      const movieId = movie.tmdbId || movie.tmdb_id;
                      const liked = isMovieLiked(movieId);

                      return (
                        <div key={movieId || index} style={styles.movieRow}>
                          <div
                            style={styles.moviePosterContainer}
                            onClick={() => router.push(`/movie/${movieId}`)}
                          >
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              style={styles.moviePoster}
                            />
                          </div>

                          <div style={styles.movieInfo}>
                            <div
                              style={styles.movieTitle}
                              onClick={() => router.push(`/movie/${movieId}`)}
                            >
                              {movie.title}
                            </div>
                            {movie.year && (
                              <div style={styles.movieYear}>{movie.year}</div>
                            )}
                          </div>

                          <button
                            style={{
                              ...styles.likeButton,
                              ...(liked ? styles.likeButtonActive : {})
                            }}
                            onClick={() => handleToggleLike(movie)}
                          >
                            {liked ? (
                              <>
                                <Check size={14} />
                                <span>Liked</span>
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span>Like it</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
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
    backgroundColor: '#0a0a0a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  loadingText: {
    fontSize: '16px',
    color: '#9ca3af',
  },
  searchSection: {
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderBottom: '1px solid #1f1f1f',
  },
  tabBar: {
    display: 'flex',
    backgroundColor: '#0a0a0a',
    borderBottom: '1px solid #1f1f1f',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    gap: '4px',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#141414',
  },
  tabLabel: {
    fontSize: '12px',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  tabCount: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  rowsContainer: {
    padding: '20px 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
    maxWidth: '280px',
  },
  browseButton: {
    backgroundColor: '#d4af37',
    color: '#000',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  historyList: {
    padding: '20px 16px',
  },
  historyHeader: {
    marginBottom: '20px',
  },
  historyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  historySubtitle: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0,
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  movieRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#141414',
    borderRadius: '8px',
    border: '1px solid #1f1f1f',
  },
  moviePosterContainer: {
    flexShrink: 0,
    cursor: 'pointer',
  },
  moviePoster: {
    width: '60px',
    height: '90px',
    objectFit: 'cover',
    borderRadius: '4px',
    backgroundColor: '#1f1f1f',
  },
  movieInfo: {
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  movieTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  movieYear: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  likeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #404040',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#9ca3af',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  likeButtonActive: {
    backgroundColor: '#1a4d2e',
    borderColor: '#2d6a4f',
    color: '#4ade80',
  },
};
