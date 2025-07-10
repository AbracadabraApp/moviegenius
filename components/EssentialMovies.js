// Essential Movies component - Compact list with progress tracking
import { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { FavoritesManager } from './FavoritesManager';
import { useRouter } from 'next/router';
import Link from 'next/link';
import themeMapping from '../data/theme-episode-mapping.json';

export default function EssentialMovies({ theme }) {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState(new Set());
  const [bookmarkedMovies, setBookmarkedMovies] = useState(new Set());

  // Define essential movies for each theme
  const essentialMovies = {
    'film-noir': [
      { title: 'The Maltese Falcon', year: 1941, tmdb_id: 963 },
      { title: 'Double Indemnity', year: 1944, tmdb_id: 996 },
      { title: 'The Big Sleep', year: 1946, tmdb_id: 910 },
      { title: 'Out of the Past', year: 1947, tmdb_id: 678 },
      { title: 'Sunset Boulevard', year: 1950, tmdb_id: 599 }
    ]
  };

  const currentMovies = essentialMovies[theme] || [];
  const themeData = themeMapping.themes[theme];
  const episodes = themeData?.episodes || [];
  const seenCount = heartedMovies.size;
  const totalCount = currentMovies.length;
  const progressPercent = totalCount > 0 ? (seenCount / totalCount) * 100 : 0;

  // Progress status descriptions
  const getProgressStatus = () => {
    if (seenCount === 0) return 'Shadow Walker';
    if (seenCount === 1) return 'Night Owl';
    if (seenCount === 2) return 'Street Sleuth';
    if (seenCount === 3) return 'Dark Detective';
    if (seenCount === 4) return 'Noir Scholar';
    return 'Master of Shadows';
  };

  // Load favorites state on mount
  useEffect(() => {
    const updateStates = () => {
      const hearted = new Set();
      const bookmarked = new Set();
      
      currentMovies.forEach(movie => {
        const movieId = `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.year}`;
        if (FavoritesManager.isMovieHearted(movieId)) {
          hearted.add(movie.tmdb_id);
        }
        if (FavoritesManager.isMovieBookmarked(movieId)) {
          bookmarked.add(movie.tmdb_id);
        }
      });
      
      setHeartedMovies(hearted);
      setBookmarkedMovies(bookmarked);
    };

    updateStates();
  }, [theme, currentMovies]);

  // Toggle heart status (seen)
  const toggleHeart = (tmdbId) => {
    const movie = currentMovies.find(m => m.tmdb_id === tmdbId);
    if (!movie) return;
    
    const movieData = { title: movie.title, year: movie.year };
    const newState = FavoritesManager.toggleHeart(movieData);
    
    const newHearted = new Set(heartedMovies);
    if (newState) {
      newHearted.add(tmdbId);
    } else {
      newHearted.delete(tmdbId);
    }
    setHeartedMovies(newHearted);
  };

  // Toggle bookmark status (add to watch list)
  const toggleBookmark = (tmdbId) => {
    const movie = currentMovies.find(m => m.tmdb_id === tmdbId);
    if (!movie) return;
    
    const movieData = { title: movie.title, year: movie.year };
    const newState = FavoritesManager.toggleBookmark(movieData);
    
    const newBookmarked = new Set(bookmarkedMovies);
    if (newState) {
      newBookmarked.add(tmdbId);
    } else {
      newBookmarked.delete(tmdbId);
    }
    setBookmarkedMovies(newBookmarked);
  };

  // Handle episode click
  const handleEpisodeClick = (episode) => {
    router.push(`/${theme}/${episode.id}`);
  };

  if (currentMovies.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>Essential Movies</span>
        <div style={styles.sectionDivider} />
      </div>
      
      {/* Movie List */}
      <div style={styles.movieList}>
        {currentMovies.map((movie) => (
          <div key={movie.tmdb_id} style={styles.movieRow}>
            <div style={styles.movieTitleRow}>
              <Link href={`/movie/${movie.tmdb_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <span style={styles.movieTitle}>
                  {movie.title}
                </span>
              </Link>
              <span style={styles.movieYear}>({movie.year})</span>
            </div>
            <div style={styles.iconRow}>
              <button
                onClick={() => toggleHeart(movie.tmdb_id)}
                style={styles.iconButton}
                aria-label={heartedMovies.has(movie.tmdb_id) ? 'Mark as unseen' : 'Mark as seen'}
              >
                <div style={styles.iconWithText}>
                  <Check
                    size={16}
                    color={heartedMovies.has(movie.tmdb_id) ? '#374151' : '#9ca3af'}
                    strokeWidth={heartedMovies.has(movie.tmdb_id) ? 2.5 : 1.5}
                  />
                  <span style={{
                    ...styles.iconLabel,
                    color: heartedMovies.has(movie.tmdb_id) ? '#374151' : '#9ca3af',
                    fontWeight: heartedMovies.has(movie.tmdb_id) ? '600' : '400'
                  }}>
                    Seen
                  </span>
                </div>
              </button>
              <button
                onClick={() => toggleBookmark(movie.tmdb_id)}
                style={styles.iconButton}
                aria-label={bookmarkedMovies.has(movie.tmdb_id) ? 'Remove from list' : 'Add to list'}
              >
                <div style={styles.iconWithText}>
                  <Plus
                    size={16}
                    color={bookmarkedMovies.has(movie.tmdb_id) ? '#374151' : '#9ca3af'}
                  />
                  <span style={{
                    ...styles.iconLabel,
                    color: bookmarkedMovies.has(movie.tmdb_id) ? '#374151' : '#9ca3af',
                    fontWeight: bookmarkedMovies.has(movie.tmdb_id) ? '600' : '400'
                  }}>
                    Add
                  </span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${progressPercent}%`}} />
        </div>
        <div style={styles.progressText}>
          {seenCount}/{totalCount} - {getProgressStatus()}
        </div>
      </div>

      {/* Learn More Header */}
      <div style={styles.learnMoreHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>Explore {themeData?.title || 'Theme'}</span>
        <div style={styles.sectionDivider} />
      </div>

      {/* Episode Links */}
      {episodes.length > 0 && (
        <div style={styles.episodeSection}>
          {episodes.map((episode) => (
            <button
              key={episode.id}
              onClick={() => handleEpisodeClick(episode)}
              style={styles.episodeButton}
            >
              <div style={styles.episodeTitle}>{episode.title}</div>
              <div style={styles.episodeSubtitle}>{episode.subtitle}</div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    margin: '16px',
    marginTop: '10px',
    marginBottom: '52px',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d4af37',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  },
  progressSection: {
    marginTop: '8px',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4af37',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '11px',
    color: '#6b7280',
    textAlign: 'center',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  movieRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  movieTitleRow: {
    display: 'flex',
    alignItems: 'baseline',
    flex: 1,
    gap: '4px',
  },
  movieTitle: {
    fontSize: '14px',
    color: '#374151',
    textDecoration: 'underline',
    textDecorationColor: '#d4af37',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  movieYear: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '300',
  },
  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
    alignItems: 'center',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  iconWithText: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  iconLabel: {
    fontSize: '12px',
    lineHeight: '1',
    userSelect: 'none',
  },
  learnMoreHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
    marginTop: '16px',
  },
  episodeSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    justifyItems: 'start',
  },
  episodeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    width: '280px',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
};