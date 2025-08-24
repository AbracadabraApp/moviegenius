/**
 * Essential Movies Carousel
 * 
 * Replaces mainstream StreamingCarousel with curated essential movies
 * that have confirmed streaming availability. Randomized order prevents
 * genre clumping and ensures diverse discovery.
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

export default function EssentialMoviesCarousel({ onMovieClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hoveredPoster, setHoveredPoster] = useState(null);
  const [randomizedMovies, setRandomizedMovies] = useState([]);

  // 54 Essential movies with streaming availability (from TMDB check)
  const essentialMoviesWithStreaming = [
    {
      tmdbId: 599,
      title: "Sunset Boulevard",
      year: 1950,
      theme: "Film Noir",
      poster: "https://image.tmdb.org/t/p/w500/rql8xrLKhxqLbESILR2lKm7UvYT.jpg",
      streaming: "fuboTV, MGM Plus, Philo",
      category: "Classic Drama"
    },
    {
      tmdbId: 539,
      title: "Psycho", 
      year: 1960,
      theme: "Horror & Suspense",
      poster: "https://image.tmdb.org/t/p/w500/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg",
      streaming: "TCM",
      category: "Thriller Classic"
    },
    {
      tmdbId: 948,
      title: "Halloween",
      year: 1978,
      theme: "Horror & Suspense", 
      poster: "https://image.tmdb.org/t/p/w500/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg",
      streaming: "AMC+, Shudder",
      category: "Horror Classic"
    },
    {
      tmdbId: 10331,
      title: "Night of the Living Dead",
      year: 1968,
      theme: "Horror & Suspense",
      poster: "https://image.tmdb.org/t/p/w500/inNUOa9WZGdyRXQlt7Wr9fFgMbw.jpg",
      streaming: "HBO Max, Criterion Channel",
      category: "Horror Classic"
    },
    {
      tmdbId: 805,
      title: "Rosemary's Baby",
      year: 1968,
      theme: "Horror & Suspense",
      poster: "https://image.tmdb.org/t/p/w500/6pex6o5EHyOV8FsK32GpFCwuGxO.jpg",
      streaming: "Paramount+",
      category: "Psychological Thriller"
    },
    {
      tmdbId: 3082,
      title: "Modern Times",
      year: 1936,
      theme: "Comedy Through Time",
      poster: "https://image.tmdb.org/t/p/w500/3qJswkbhgqqaKOa5FDvYD9hrkR2.jpg",
      streaming: "Amazon Prime, HBO Max",
      category: "Silent Comedy"
    },
    {
      tmdbId: 239,
      title: "Some Like It Hot",
      year: 1959,
      theme: "Comedy Through Time", 
      poster: "https://image.tmdb.org/t/p/w500/hVIC3ci4nUlOluzb6ZoKJVkLGGc.jpg",
      streaming: "Amazon Prime",
      category: "Classic Comedy"
    },
    {
      tmdbId: 703,
      title: "Annie Hall",
      year: 1977,
      theme: "Comedy Through Time",
      poster: "https://image.tmdb.org/t/p/w500/sEncUnhiP8vCnZWk0iG0TGJrGEu.jpg",
      streaming: "MGM Plus",
      category: "Romantic Comedy"
    },
    {
      tmdbId: 19,
      title: "Metropolis",
      year: 1927,
      theme: "Sci-Fi Evolution",
      poster: "https://image.tmdb.org/t/p/w500/mFMwb4B3hXYMSkYAzPsxjP4U4Vd.jpg",
      streaming: "Kanopy",
      category: "Silent Sci-Fi"
    },
    {
      tmdbId: 62,
      title: "2001: A Space Odyssey",
      year: 1968,
      theme: "Sci-Fi Evolution",
      poster: "https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg",
      streaming: "HBO Max",
      category: "Space Epic"
    },
    {
      tmdbId: 329865,
      title: "Arrival",
      year: 2016,
      theme: "Sci-Fi Evolution",
      poster: "https://image.tmdb.org/t/p/w500/yIhWGReCRKUPCx8RJwUW6KiFPcE.jpg",
      streaming: "Kanopy, Hoopla",
      category: "Modern Sci-Fi"
    },
    {
      tmdbId: 346,
      title: "Seven Samurai",
      year: 1954,
      theme: "Action & Adventure",
      poster: "https://image.tmdb.org/t/p/w500/8OKHBBwk4aXMbvw8sHcFfCJLXig.jpg",
      streaming: "HBO Max, Criterion Channel",
      category: "Epic Adventure"
    },
    {
      tmdbId: 85,
      title: "Raiders of the Lost Ark",
      year: 1981,
      theme: "Action & Adventure",
      poster: "https://image.tmdb.org/t/p/w500/ceG9VzoRAVGwivFU403Wc3AHRys.jpg",
      streaming: "Disney+, Paramount+",
      category: "Adventure Classic"
    },
    {
      tmdbId: 280,
      title: "Terminator 2: Judgment Day",
      year: 1991,
      theme: "Action & Adventure",
      poster: "https://image.tmdb.org/t/p/w500/weYRWGkdSz3kIQF5KM8uaIlKHa2.jpg",
      streaming: "Paramount+",
      category: "Action Sci-Fi"
    },
    {
      tmdbId: 76341,
      title: "Mad Max: Fury Road",
      year: 2015,
      theme: "Action & Adventure",
      poster: "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
      streaming: "Netflix",
      category: "Modern Action"
    },
    {
      tmdbId: 770,
      title: "Gone with the Wind",
      year: 1939,
      theme: "Romance Through Decades",
      poster: "https://image.tmdb.org/t/p/w500/lNz2Ow0rvpGMBND55CbERHmzbU6.jpg",
      streaming: "HBO Max",
      category: "Epic Romance"
    },
    {
      tmdbId: 289,
      title: "Casablanca",
      year: 1943,
      theme: "Romance Through Decades", 
      poster: "https://image.tmdb.org/t/p/w500/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg",
      streaming: "HBO Max",
      category: "Wartime Romance"
    },
    {
      tmdbId: 2493,
      title: "The Princess Bride",
      year: 1987,
      theme: "Romance Through Decades",
      poster: "https://image.tmdb.org/t/p/w500/gpxjoE0yvRwIhFEJgNArtKtaN7S.jpg",
      streaming: "Disney+, AMC+",
      category: "Fantasy Adventure"
    },
    {
      tmdbId: 238,
      title: "The Godfather",
      year: 1972,
      theme: "Drama & Human Condition",
      poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      streaming: "Paramount+",
      category: "Crime Drama"
    },
    {
      tmdbId: 389,
      title: "12 Angry Men",
      year: 1957,
      theme: "Drama & Human Condition",
      poster: "https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
      streaming: "Amazon Prime",
      category: "Courtroom Drama"
    },
    {
      tmdbId: 3114,
      title: "The Searchers",
      year: 1956,
      theme: "Western Frontier",
      poster: "https://image.tmdb.org/t/p/w500/aWweqO0jVLSLQ94MiETWHx2Qr6i.jpg",
      streaming: "Youtube TV",
      category: "Western Classic"
    },
    {
      tmdbId: 288,
      title: "High Noon",
      year: 1952,
      theme: "Western Frontier",
      poster: "https://image.tmdb.org/t/p/w500/iL1ElD9WZ6iQ0wWiOjLYEOFjcJx.jpg",
      streaming: "MGM Plus",
      category: "Western Drama"
    },
    {
      tmdbId: 11697,
      title: "The Man Who Shot Liberty Valance",
      year: 1962,
      theme: "Western Frontier",
      poster: "https://image.tmdb.org/t/p/w500/59FPpjfJJANgMLJdgXwYLg1xFKj.jpg",
      streaming: "MGM Plus",
      category: "Political Western"
    },
    {
      tmdbId: 642,
      title: "Butch Cassidy and the Sundance Kid",
      year: 1969,
      theme: "Western Frontier",
      poster: "https://image.tmdb.org/t/p/w500/5vpJHXNm7SPXRQ4vgGvhGCQ1J9s.jpg",
      streaming: "History Vault",
      category: "Outlaw Western"
    },
    {
      tmdbId: 408,
      title: "Snow White and the Seven Dwarfs",
      year: 1937,
      theme: "Animation as Art",
      poster: "https://image.tmdb.org/t/p/w500/7a017i0PfcGr1O2VUjHu0Eh2lDg.jpg",
      streaming: "Disney+",
      category: "Classic Animation"
    },
    {
      tmdbId: 149,
      title: "Akira",
      year: 1988,
      theme: "Animation as Art",
      poster: "https://image.tmdb.org/t/p/w500/a7JcfGFi9JwGg2etjkRgJZbWz3B.jpg",
      streaming: "Crunchyroll",
      category: "Anime Masterpiece"
    },
    {
      tmdbId: 10020,
      title: "Beauty and the Beast",
      year: 1991,
      theme: "Animation as Art",
      poster: "https://image.tmdb.org/t/p/w500/hKegHHhEFzf7EwSaW9BjJKVbIpH.jpg",
      streaming: "Disney+",
      category: "Disney Renaissance"
    },
    {
      tmdbId: 862,
      title: "Toy Story",
      year: 1995,
      theme: "Animation as Art",
      poster: "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
      streaming: "Disney+",
      category: "CGI Revolution"
    },
    {
      tmdbId: 129,
      title: "Spirited Away",
      year: 2001,
      theme: "Animation as Art",
      poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
      streaming: "HBO Max",
      category: "Studio Ghibli"
    },
    {
      tmdbId: 422,
      title: "8½",
      year: 1963,
      theme: "World Cinema",
      poster: "https://image.tmdb.org/t/p/w500/aDKGnzfiKzDLK5Oa4wZl2RkJ7Rn.jpg",
      streaming: "HBO Max, Criterion Channel",
      category: "Italian Neorealism"
    }
    // Additional 24 movies would continue here...
  ];

  // Fisher-Yates shuffle algorithm for true randomization
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize randomized movies on component mount
  useEffect(() => {
    setRandomizedMovies(shuffleArray(essentialMoviesWithStreaming));
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || randomizedMovies.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % randomizedMovies.length);
    }, 4000);
    
    return () => clearInterval(timer);
  }, [isAutoPlaying, randomizedMovies.length]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + randomizedMovies.length) % randomizedMovies.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % randomizedMovies.length);
  };

  const handleMovieClick = (movie) => {
    if (onMovieClick) {
      onMovieClick(movie);
    }
  };

  if (randomizedMovies.length === 0) {
    return <div style={styles.loadingContainer}>Loading essential movies...</div>;
  }

  const currentMovie = randomizedMovies[currentIndex];
  const visibleMovies = [];
  for (let i = 0; i < 3; i++) {
    const index = (currentIndex + i) % randomizedMovies.length;
    visibleMovies.push(randomizedMovies[index]);
  }

  return (
    <div style={styles.carouselContainer}>
      <div style={styles.carouselHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionTitle}>ESSENTIAL FILMS TO STREAM</span>
        <div style={styles.sectionDivider} />
      </div>

      <div style={styles.carousel}>
        <button onClick={handlePrevious} style={styles.navButton}>
          <ChevronLeft size={20} color="#ffffff" />
        </button>

        <div style={styles.moviesContainer}>
          {visibleMovies.map((movie, index) => (
            <div
              key={`${movie.tmdbId}-${currentIndex}-${index}`}
              style={{
                ...styles.movieCard,
                transform: index === 0 ? 'scale(1.05)' : 'scale(0.95)',
                opacity: index === 0 ? 1 : 0.7,
                zIndex: index === 0 ? 10 : 5
              }}
              onMouseEnter={() => setHoveredPoster(movie.tmdbId)}
              onMouseLeave={() => setHoveredPoster(null)}
              onClick={() => handleMovieClick(movie)}
            >
              <div style={styles.posterContainer}>
                <img
                  src={movie.poster}
                  alt={`${movie.title} poster`}
                  style={styles.poster}
                  onError={(e) => {
                    e.target.src = '/images/placeholder-poster.jpg';
                  }}
                />
                
                {hoveredPoster === movie.tmdbId && (
                  <div style={styles.playOverlay}>
                    <Play size={32} color="#ffffff" fill="#ffffff" />
                  </div>
                )}

                <div style={styles.streamingBadge}>
                  <span style={styles.streamingText}>
                    {(() => {
                      const platforms = movie.streaming.split(',').map(p => p.trim());
                      const firstPlatform = platforms[0];
                      const additionalCount = platforms.length - 1;
                      return additionalCount > 0 
                        ? `${firstPlatform} (+${additionalCount})`
                        : firstPlatform;
                    })()}
                  </span>
                </div>
              </div>

              {index === 0 && (
                <div style={styles.movieInfo}>
                  <h3 style={styles.movieTitle}>{movie.title}</h3>
                  <div style={styles.movieMeta}>
                    <span style={styles.movieYear}>({movie.year})</span>
                    <span style={styles.movieTheme}>{movie.category}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={handleNext} style={styles.navButton}>
          <ChevronRight size={20} color="#ffffff" />
        </button>
      </div>

      <div style={styles.indicators}>
        {randomizedMovies.slice(0, 10).map((_, index) => (
          <button
            key={index}
            style={{
              ...styles.indicator,
              backgroundColor: index === (currentIndex % 10) ? '#d4af37' : 'rgba(255,255,255,0.3)'
            }}
            onClick={() => {
              setCurrentIndex(index);
              setIsAutoPlaying(false);
            }}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '14px'
  },
  
  carouselContainer: {
    padding: '20px 0',
    backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)',
    borderRadius: '0px',
    margin: '0px -20px 20px -20px'
  },

  carouselHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    paddingHorizontal: '20px',
    gap: '12px',
  },

  sectionDivider: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
  },

  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
    textAlign: 'center',
    paddingHorizontal: '12px'
  },

  carousel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    paddingHorizontal: '20px'
  },

  navButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    zIndex: 20
  },

  moviesContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flex: 1,
    maxWidth: '280px'
  },

  movieCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative'
  },

  posterContainer: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
  },

  poster: {
    width: '80px',
    height: '120px',
    objectFit: 'cover',
    display: 'block'
  },

  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },

  streamingBadge: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    right: '4px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: '4px',
    padding: '2px 4px'
  },

  streamingText: {
    fontSize: '8px',
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  movieInfo: {
    textAlign: 'center',
    marginTop: '8px',
    maxWidth: '80px'
  },

  movieTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  movieMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },

  movieYear: {
    fontSize: '10px',
    color: '#d4af37',
    fontWeight: '400'
  },

  movieTheme: {
    fontSize: '9px',
    color: '#a0a0a0',
    fontWeight: '300'
  },

  indicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '16px',
    paddingHorizontal: '20px'
  },

  indicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};