// Essential Movies component - Compact list with progress tracking
import { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { FavoritesManager } from './FavoritesManager';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { routeHelpers, episodes } from '../lib/routes';

export default function EssentialMovies({ theme }) {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState(new Set());
  const [bookmarkedMovies, setBookmarkedMovies] = useState(new Set());
  const [clickedMovie, setClickedMovie] = useState(null);

  // Define essential movies for each theme
  const essentialMovies = {
    'film-noir': [
      { title: 'The Maltese Falcon', year: 1941, tmdb_id: 963 },
      { title: 'Double Indemnity', year: 1944, tmdb_id: 996 },
      { title: 'The Big Sleep', year: 1946, tmdb_id: 910 },
      { title: 'Out of the Past', year: 1947, tmdb_id: 678 },
      { title: 'Sunset Boulevard', year: 1950, tmdb_id: 599 }
    ],
    'horror-suspense': [
      { title: 'Psycho', year: 1960, tmdb_id: 539 },
      { title: 'The Exorcist', year: 1973, tmdb_id: 9552 },
      { title: 'Halloween', year: 1978, tmdb_id: 530 },
      { title: 'Night of the Living Dead', year: 1968, tmdb_id: 10625 },
      { title: 'Rosemary\'s Baby', year: 1968, tmdb_id: 10110 }
    ],
    'comedy-through-time': [
      { title: 'Everything Everywhere All at Once', year: 2022, tmdb_id: 545611 },
      { title: 'Modern Times', year: 1936, tmdb_id: 3082 },
      { title: 'Some Like It Hot', year: 1959, tmdb_id: 239 },
      { title: 'Dr. Strangelove', year: 1964, tmdb_id: 935 },
      { title: 'Annie Hall', year: 1977, tmdb_id: 703 }
    ],
    'sci-fi-evolution': [
      { title: 'Metropolis', year: 1927, tmdb_id: 19 },
      { title: '2001: A Space Odyssey', year: 1968, tmdb_id: 62 },
      { title: 'Blade Runner', year: 1982, tmdb_id: 78 },
      { title: 'The Matrix', year: 1999, tmdb_id: 603 },
      { title: 'Arrival', year: 2016, tmdb_id: 329865 }
    ],
    'action-adventure': [
      { title: 'Seven Samurai', year: 1954, tmdb_id: 346 },
      { title: 'Raiders of the Lost Ark', year: 1981, tmdb_id: 85 },
      { title: 'Terminator 2: Judgment Day', year: 1991, tmdb_id: 280 },
      { title: 'The Adventures of Robin Hood', year: 1938, tmdb_id: 10907 },
      { title: 'Mad Max: Fury Road', year: 2015, tmdb_id: 76341 }
    ],
    'romance-through-decades': [
      { title: 'Gone with the Wind', year: 1939, tmdb_id: 770 },
      { title: 'Casablanca', year: 1943, tmdb_id: 289 },
      { title: 'The Princess Bride', year: 1987, tmdb_id: 2493 },
      { title: 'When Harry Met Sally', year: 1989, tmdb_id: 639 },
      { title: 'Eternal Sunshine of the Spotless Mind', year: 2004, tmdb_id: 38 }
    ],
    'drama-human-condition': [
      { title: 'Citizen Kane', year: 1941, tmdb_id: 15 },
      { title: 'The Godfather', year: 1972, tmdb_id: 238 },
      { title: '12 Angry Men', year: 1957, tmdb_id: 389 },
      { title: 'On the Waterfront', year: 1954, tmdb_id: 654 },
      { title: 'Schindler\'s List', year: 1993, tmdb_id: 424 }
    ],
    'western-frontier': [
      { title: 'The Searchers', year: 1956, tmdb_id: 3114 },
      { title: 'High Noon', year: 1952, tmdb_id: 288 },
      { title: 'The Man Who Shot Liberty Valance', year: 1962, tmdb_id: 11697 },
      { title: 'Unforgiven', year: 1992, tmdb_id: 33 },
      { title: 'Butch Cassidy and the Sundance Kid', year: 1969, tmdb_id: 642 }
    ],
    'animation-art': [
      { title: 'Snow White and the Seven Dwarfs', year: 1937, tmdb_id: 408 },
      { title: 'Akira', year: 1988, tmdb_id: 149 },
      { title: 'Beauty and the Beast', year: 1991, tmdb_id: 10020 },
      { title: 'Toy Story', year: 1995, tmdb_id: 862 },
      { title: 'Spirited Away', year: 2001, tmdb_id: 129 }
    ],
    'world-cinema': [
      { title: '8½', year: 1963, tmdb_id: 139 },
      { title: 'The Rules of the Game', year: 1939, tmdb_id: 36386 },
      { title: 'Tokyo Story', year: 1953, tmdb_id: 18148 },
      { title: 'Bicycle Thieves', year: 1948, tmdb_id: 11224 },
      { title: 'Persona', year: 1966, tmdb_id: 3082 }
    ]
  };

  const currentMovies = essentialMovies[theme] || [];
  
  // Use centralized episode data instead of JSON file
  const themeEpisodes = episodes.filter(ep => ep.theme === theme);
  
  // Get theme title from centralized system
  const getThemeTitle = (themeSlug) => {
    const themeTitles = {
      'film-noir': 'Film Noir',
      'horror-suspense': 'Horror & Suspense',
      'comedy-through-time': 'Comedy',
      'women-directors': 'Women Directors',
      'world-cinema': 'International Masters',
      'acclaimed-directors': 'Acclaimed Directors',
      'avant-garde-film': 'Movements in Film',
      'magic-of-moviemaking': 'The Magic of Moviemaking',
      'cinema-through-decades': 'Cinema Through the Decades',
      'cinema-cultural-impact': 'Hollywood Transformed'
    };
    return themeTitles[themeSlug] || 'Theme';
  };
  const seenCount = heartedMovies.size;
  const totalCount = currentMovies.length;
  const progressPercent = totalCount > 0 ? (seenCount / totalCount) * 100 : 0;

  // Progress status descriptions
  const getProgressStatus = () => {
    const statusMap = {
      'film-noir': ['Shadow Walker', 'Night Owl', 'Street Sleuth', 'Dark Detective', 'Noir Scholar', 'Master of Shadows'],
      'horror-suspense': ['Rookie', 'Brave Soul', 'Nightmare Navigator', 'Fear Conqueror', 'Horror Expert', 'Master of Terror'],
      'comedy-through-time': ['Chuckle Rookie', 'Gag Enthusiast', 'Laugh Tracker', 'Comedy Buff', 'Humor Expert', 'Master of Laughter'],
      'sci-fi-evolution': ['Space Cadet', 'Tech Explorer', 'Future Seeker', 'Sci-Fi Scholar', 'Galaxy Expert', 'Master of Tomorrow'],
      'action-adventure': ['Rookie Hero', 'Thrill Seeker', 'Adventure Scout', 'Action Expert', 'Epic Explorer', 'Master of Adventure'],
      'romance-through-decades': ['Romantic Rookie', 'Heart Warmer', 'Love Story Fan', 'Romance Expert', 'Cupid Scholar', 'Master of Love'],
      'drama-human-condition': ['Drama Novice', 'Life Observer', 'Story Seeker', 'Human Expert', 'Drama Scholar', 'Master of Stories'],
      'western-frontier': ['Greenhorn', 'Trail Rider', 'Frontier Scout', 'Western Expert', 'Cowboy Scholar', 'Master of the West'],
      'animation-art': ['Animation Rookie', 'Cartoon Fan', 'Art Enthusiast', 'Animation Expert', 'Studio Scholar', 'Master of Animation'],
      'world-cinema': ['Global Rookie', 'Culture Seeker', 'World Explorer', 'Cinema Expert', 'Cultural Scholar', 'Master of World Cinema'],
      'women-directors': ['Film Rookie', 'Vision Seeker', 'Story Explorer', 'Cinema Expert', 'Auteur Scholar', 'Master of Vision'],
      'acclaimed-directors': ['Film Novice', 'Vision Seeker', 'Auteur Explorer', 'Director Expert', 'Cinema Scholar', 'Master of Vision'],
      'avant-garde-film': ['Film Rookie', 'Art Seeker', 'Movement Explorer', 'Avant-garde Expert', 'Revolution Scholar', 'Master of Innovation'],
      'magic-of-moviemaking': ['Tech Rookie', 'Craft Seeker', 'Magic Explorer', 'Movie Expert', 'Cinema Scholar', 'Master of Magic'],
      'cinema-through-decades': ['Era Rookie', 'Time Traveler', 'Decade Explorer', 'Cinema Expert', 'History Scholar', 'Master of Eras'],
      'cinema-cultural-impact': ['Culture Rookie', 'Change Seeker', 'Impact Explorer', 'Cinema Expert', 'History Scholar', 'Master of Impact']
    };
    
    const statuses = statusMap[theme] || ['Rookie', 'Explorer', 'Enthusiast', 'Expert', 'Scholar', 'Master'];
    return statuses[Math.min(seenCount, statuses.length - 1)];
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

  // Episode navigation now uses direct HTML links

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
            <a 
              href={`/movie/${movie.tmdb_id}`}
              style={{
                ...styles.movieTitleRow, 
                cursor: 'pointer',
                backgroundColor: clickedMovie === movie.tmdb_id ? '#d4af37' : 'transparent',
                padding: '2px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                width: '100%',
                textAlign: 'left',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block'
              }}
              onClick={() => {
                setClickedMovie(movie.tmdb_id);
                setTimeout(() => setClickedMovie(null), 2000);
              }}
            >
              <span style={styles.movieTitle}>
                {movie.title}
              </span>
              <span style={styles.movieYear}>({movie.year})</span>
            </a>
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
        <span style={styles.sectionLabel}>Explore {getThemeTitle(theme)}</span>
        <div style={styles.sectionDivider} />
      </div>

      {/* Episode Links */}
      {themeEpisodes.length > 0 && (
        <div style={styles.episodeSection}>
          {themeEpisodes.map((episode) => (
            <Link 
              key={episode.id} 
              href={routeHelpers.getEpisodeRoute(theme, episode.id)}
              passHref
              legacyBehavior
            >
              <a style={{textDecoration: 'none'}}>
                <div style={{...styles.episodeButton, cursor: 'pointer'}}>
                  <div style={styles.episodeTitle}>{episode.title}</div>
                  <div style={styles.episodeSubtitle}>{episode.subtitle || `Explore ${episode.title}`}</div>
                </div>
              </a>
            </Link>
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
    textDecoration: 'none',
    color: 'inherit',
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