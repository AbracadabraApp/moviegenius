// Suggestions page - Shows all 50 essential movies filtered for unseen films
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import { Check, Plus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { colors, spacing, typography } from '../../lib/design-tokens';
import { getAllEssentialMovies } from '../../data/essential-movies';
import { FavoritesManager } from '../../components/FavoritesManager';

export default function SuggestionsPage() {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState(new Set());
  const [bookmarkedMovies, setBookmarkedMovies] = useState(new Set());
  const [unseenMovies, setUnseenMovies] = useState([]);

  // Load data from localStorage and filter for unseen movies
  useEffect(() => {
    const loadData = () => {
      try {
        const allMovies = getAllEssentialMovies();
        const heartedSet = new Set();
        const bookmarkedSet = new Set();
        const unseen = [];

        allMovies.forEach(movie => {
          const movieId = `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
          const isHearted = FavoritesManager.isMovieHearted(movieId);
          const isBookmarked = FavoritesManager.isMovieBookmarked(movieId);

          // Store string IDs consistently for state tracking
          if (isHearted) {
            heartedSet.add(movieId);
          }
          if (isBookmarked) {
            bookmarkedSet.add(movieId);
          }

          // Only include movies that haven't been marked as seen
          if (!isHearted) {
            unseen.push(movie);
          }
        });

        setHeartedMovies(heartedSet);
        setBookmarkedMovies(bookmarkedSet);
        setUnseenMovies(unseen);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
    
    // Listen for storage changes from other components
    const handleStorageChange = () => {
      loadData();
    };
    
    window.addEventListener('moviesUpdated', handleStorageChange);
    return () => window.removeEventListener('moviesUpdated', handleStorageChange);
  }, []);

  // Toggle heart status (seen)
  const toggleHeart = tmdbId => {
    const movie = unseenMovies.find(m => m.tmdb_id === tmdbId);
    if (!movie) return;

    const movieData = { title: movie.title, year: movie.year, tmdb_id: movie.tmdb_id };
    const newState = FavoritesManager.toggleHeart(movieData);
    const movieId = `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;

    const newHearted = new Set(heartedMovies);
    if (newState) {
      newHearted.add(movieId);
      // Remove from unseen list
      setUnseenMovies(prev => prev.filter(m => m.tmdb_id !== tmdbId));
    } else {
      newHearted.delete(movieId);
      // Add back to unseen list
      setUnseenMovies(prev => [...prev, movie].sort((a, b) => a.title.localeCompare(b.title)));
    }
    setHeartedMovies(newHearted);
  };

  // Toggle bookmark status (add to watch list)
  const toggleBookmark = tmdbId => {
    const movie = unseenMovies.find(m => m.tmdb_id === tmdbId);
    if (!movie) return;

    const movieData = { title: movie.title, year: movie.year, tmdb_id: movie.tmdb_id };
    const newState = FavoritesManager.toggleBookmark(movieData);
    const movieId = `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;

    const newBookmarked = new Set(bookmarkedMovies);
    if (newState) {
      newBookmarked.add(movieId);
    } else {
      newBookmarked.delete(movieId);
    }
    setBookmarkedMovies(newBookmarked);
  };

  return (
    <PhoneFrame>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          paddingBottom: '100px',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: `1px solid ${colors.border}`,
            padding: spacing[4],
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[3],
              marginBottom: spacing[3],
            }}
          >
            <button
              onClick={() => router.back()}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} color={colors.gray[600]} />
            </button>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#d4af37',
                margin: 0,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Suggestions
            </h1>
          </div>
          <SimpleSearch placeholder="Search suggestions..." />
        </div>

        {/* Content */}
        <div
          style={{
            padding: spacing[4],
          }}
        >
          {unseenMovies.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {unseenMovies.map(movie => (
                <div
                  key={movie.tmdb_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      flex: 1,
                      gap: '4px',
                    }}
                  >
                    <span
                      onClick={() => router.push(`/movie/${movie.tmdb_id}`)}
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        textDecoration: 'underline',
                        textDecorationColor: '#d4af37',
                        textDecorationThickness: '1px',
                        textUnderlineOffset: '2px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {movie.title}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontWeight: '300',
                      }}
                    >
                      ({movie.year})
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      onClick={() => toggleHeart(movie.tmdb_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check
                          size={16}
                          color={heartedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? '#374151' : '#9ca3af'}
                          strokeWidth={heartedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? 2.5 : 1.5}
                        />
                        <span
                          style={{
                            fontSize: '12px',
                            lineHeight: '1',
                            userSelect: 'none',
                            color: heartedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? '#374151' : '#9ca3af',
                            fontWeight: heartedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? '600' : '400',
                          }}
                        >
                          Seen
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => toggleBookmark(movie.tmdb_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Plus
                          size={16}
                          color={bookmarkedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? '#374151' : '#9ca3af'}
                        />
                        <span
                          style={{
                            fontSize: '12px',
                            lineHeight: '1',
                            userSelect: 'none',
                            color: bookmarkedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? '#374151' : '#9ca3af',
                            fontWeight: bookmarkedMovies.has(`${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`) ? '600' : '400',
                          }}
                        >
                          Add
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: `${spacing[8]} ${spacing[4]}`,
                color: colors.gray[600],
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.medium,
                  marginBottom: spacing[2],
                }}
              >
                All caught up!
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.base,
                  color: colors.gray[500],
                }}
              >
                You've seen all the essential movies. Check back later for more suggestions.
              </div>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
