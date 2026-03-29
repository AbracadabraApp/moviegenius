/**
 * Streaming Platform Carousel
 * 
 * High-profile homepage feature showcasing best movies on each platform
 * with movie posters, platform badges, and direct links to platform best-of lists
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Triangle } from 'lucide-react';

export default function StreamingCarousel({ onMovieClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hoveredPoster, setHoveredPoster] = useState(null);
  const [slideDirection, setSlideDirection] = useState(null);

  // Featured movies with their best streaming platform
  const streamingShowcase = [
    {
      tmdbId: 278,
      title: "The Shawshank Redemption",
      poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      platform: "Netflix",
      platformBadge: "/images/streaming/netflix-badge.png",
      platformColor: "#E50914",
      category: "Drama Masterpieces",
      href: "/browse/netflix-best"
    },
    {
      tmdbId: 238,
      title: "The Godfather", 
      poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      platform: "Amazon Prime",
      platformBadge: "/images/streaming/prime-badge.png", 
      platformColor: "#00A8E1",
      category: "Crime Dramas",
      href: "/browse/prime-best"
    },
    {
      tmdbId: 424,
      title: "Schindler's List",
      poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
      platform: "HBO Max",
      platformBadge: "/images/streaming/hbo-badge.png",
      platformColor: "#9146FF", 
      category: "Historical Dramas",
      href: "/browse/hbo-best"
    },
    {
      tmdbId: 389,
      title: "12 Angry Men",
      poster: "https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
      platform: "Apple TV+",
      platformBadge: "/images/streaming/apple-badge.png",
      platformColor: "#000000",
      category: "Classic Dramas", 
      href: "/browse/apple-best"
    },
    {
      tmdbId: 129,
      title: "Spirited Away",
      poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", 
      platform: "Disney+",
      platformBadge: "/images/streaming/disney-badge.png",
      platformColor: "#113CCF",
      category: "Animated Films",
      href: "/browse/disney-best"
    },
    {
      tmdbId: 155,
      title: "The Dark Knight",
      poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      platform: "Hulu", 
      platformBadge: "/images/streaming/hulu-badge.png",
      platformColor: "#1CE783",
      category: "Action Thrillers",
      href: "/browse/hulu-best"
    },
    {
      tmdbId: 72,
      title: "The Godfather",
      poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      platform: "Paramount+", 
      platformBadge: "/images/streaming/paramount-badge.png",
      platformColor: "#0064FF",
      category: "Crime Epics",
      href: "/browse/paramount-best"
    },
    {
      tmdbId: 11216,
      title: "Cinema Paradiso",
      poster: "https://image.tmdb.org/t/p/w500/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg",
      platform: "Criterion", 
      platformBadge: "/images/streaming/criterion-badge.png",
      platformColor: "#000000",
      category: "Arthouse Films",
      href: "/browse/criterion-best"
    },
    {
      tmdbId: 475557,
      title: "Joker",
      poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
      platform: "Peacock", 
      platformBadge: "/images/streaming/peacock-badge.png",
      platformColor: "#00B4D8",
      category: "Psychological Dramas",
      href: "/browse/peacock-best"
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % streamingShowcase.length);
        setTimeout(() => setSlideDirection(null), 100);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, streamingShowcase.length]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % streamingShowcase.length);
      setTimeout(() => setSlideDirection(null), 100);
    }, 200);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false); 
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + streamingShowcase.length) % streamingShowcase.length);
      setTimeout(() => setSlideDirection(null), 100);
    }, 200);
  };

  const goToSlide = (index) => {
    setIsAutoPlaying(false);
    const direction = index > currentIndex ? 'left' : 'right';
    setSlideDirection(direction);
    setTimeout(() => {
      setCurrentIndex(index);
      setTimeout(() => setSlideDirection(null), 100);
    }, 200);
  };

  // Get adjacent movie indices for hints
  const getPrevIndex = () => (currentIndex - 1 + streamingShowcase.length) % streamingShowcase.length;
  const getNextIndex = () => (currentIndex + 1) % streamingShowcase.length;

  // Calculate stable "more" count based on platform
  const getMoreCount = () => {
    const baseCounts = { 
      'Netflix': 24, 
      'Amazon Prime': 19, 
      'HBO Max': 16, 
      'Apple TV+': 12, 
      'Disney+': 28, 
      'Hulu': 21,
      'Paramount+': 18,
      'Criterion': 15,
      'Peacock': 22
    };
    return baseCounts[streamingShowcase[currentIndex].platform] || 20;
  };

  const handlePosterClick = (movie) => {
    if (onMovieClick) {
      onMovieClick(movie);
    } else {
      // Default behavior: navigate to movie page
      window.location.href = `/movie/${movie.tmdbId}`;
    }
  };

  const handlePlatformClick = (movie, e) => {
    e.stopPropagation(); // Prevent poster click
    window.location.href = movie.href;
  };

  return (
    <div style={styles.carousel}>
      <style jsx>{`
        .poster-hover:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.25), 0 0 30px rgba(255,255,255,0.2) !important;
        }
        .hint-hover:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 20px rgba(255,255,255,0.3) !important;
          opacity: 1 !important;
        }
        .carousel-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          transition: all 0.4s ease-out;
          transform-origin: center;
        }
        .slide-left {
          transform: translateX(-15px) scale(0.99);
        }
        .slide-right {
          transform: translateX(15px) scale(0.99);
        }
      `}</style>
      <div style={styles.carouselContainer}>
        {/* Circular side-swipe container */}
        <div 
          className={`carousel-track ${slideDirection === 'left' ? 'slide-left' : slideDirection === 'right' ? 'slide-right' : ''}`}
          style={styles.circularContainer}
        >
          
          {/* Previous movie hint (left) - bleeding with gradient */}
          <div 
            className="hint-hover"
            style={styles.leftHintContainer}
            onClick={() => handlePosterClick(streamingShowcase[getPrevIndex()])}
            onMouseEnter={() => setIsAutoPlaying(false)}
          >
            <div style={styles.leftHintPoster}>
              <img
                src={streamingShowcase[getPrevIndex()].poster}
                alt="Previous"
                style={styles.leftHintImage}
                onError={(e) => {
                  e.target.src = '/images/placeholder-poster.jpg';
                }}
              />
              <div style={styles.leftGradientOverlay}></div>
            </div>
          </div>

          {/* Main featured movie (center) */}
          <div style={styles.mainContainer}>
            <div 
              className="poster-hover"
              style={styles.posterContainer}
              onClick={() => handlePosterClick(streamingShowcase[currentIndex])}
            >
              <img
                src={streamingShowcase[currentIndex].poster}
                alt={streamingShowcase[currentIndex].title}
                style={styles.posterImage}
                onError={(e) => {
                  e.target.src = '/images/placeholder-poster.jpg';
                }}
              />
              
              {/* Platform badge */}
              <div 
                style={{
                  ...styles.platformBadge,
                  backgroundColor: streamingShowcase[currentIndex].platformColor
                }}
                onClick={(e) => handlePlatformClick(streamingShowcase[currentIndex], e)}
              >
                <span style={styles.platformText}>
                  {streamingShowcase[currentIndex].platform}
                </span>
              </div>

            </div>
          </div>

          {/* Next movie hint (right) */}
          <div 
            className="hint-hover"
            style={styles.hintContainer}
            onClick={() => handlePosterClick(streamingShowcase[getNextIndex()])}
            onMouseEnter={() => setIsAutoPlaying(false)}
          >
            <div style={styles.hintPoster}>
              <img
                src={streamingShowcase[getNextIndex()].poster}
                alt="Next"
                style={styles.hintImage}
                onError={(e) => {
                  e.target.src = '/images/placeholder-poster.jpg';
                }}
              />
              <div style={styles.rightGradientOverlay}></div>
            </div>
          </div>

        </div>

        {/* "+ X more" indicator */}
        <div style={styles.moreIndicator}>
          <span 
            style={styles.moreText}
            onClick={() => handlePlatformClick(streamingShowcase[currentIndex], { stopPropagation: () => {} })}
          >
            + {getMoreCount()} more {streamingShowcase[currentIndex].category} on {streamingShowcase[currentIndex].platform}
          </span>
        </div>

        {/* Navigation bar with triangles and dots */}
        <div style={styles.navigationBar}>
          {/* Previous triangle */}
          <button 
            style={styles.triangleButton}
            onClick={prevSlide}
            onMouseEnter={() => setIsAutoPlaying(false)}
          >
            <Triangle size={12} color="#6b7280" style={{ transform: 'rotate(270deg)' }} />
          </button>

          {/* Dot indicators */}
          <div style={styles.dotContainer}>
            {streamingShowcase.map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.dot,
                  backgroundColor: index === currentIndex ? '#d4af37' : '#e5e7eb',
                  transform: index === currentIndex ? 'scale(1.2)' : 'scale(1)'
                }}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>

          {/* Next triangle */}
          <button 
            style={styles.triangleButton}
            onClick={nextSlide}
            onMouseEnter={() => setIsAutoPlaying(false)}
          >
            <Triangle size={12} color="#6b7280" style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  carousel: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: '16px 0px 12px 0px',
    borderBottom: '1px solid #f0f0f0'
  },

  carouselContainer: {
    position: 'relative',
    width: '100%'
  },

  // New circular container styles
  circularContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '13px',
    height: '264px',
    overflow: 'hidden',
    position: 'relative',
    paddingLeft: '0px',
    paddingRight: '0px'
  },

  hintContainer: {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    opacity: 0.6,
    position: 'relative',
    paddingRight: '0px'
  },

  leftHintContainer: {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    opacity: 0.6,
    position: 'relative',
    paddingLeft: '0px'
  },

  hintPoster: {
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '78px',
    height: '200px',
    transition: 'all 0.3s ease',
    position: 'relative'
  },

  leftHintPoster: {
    borderRadius: '0 8px 8px 0',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    width: '78px',
    height: '200px',
    position: 'relative',
    transition: 'all 0.3s ease'
  },

  hintImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },

  leftHintImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },

  leftGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to right, rgba(255,255,255,0.9) 20%, rgba(255,255,255,0) 90%)',
    pointerEvents: 'none'
  },

  rightGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to right, rgba(255,255,255,0) 20%, rgba(255,255,255,0.9) 90%)',
    pointerEvents: 'none'
  },

  mainContainer: {
    flex: '0 0 auto'
  },

  posterContainer: {
    position: 'relative',
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    transition: 'all 0.3s ease',
    width: '176px',
    height: '264px'
  },

  posterImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },

  platformBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    borderRadius: '6px',
    padding: '4px 8px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  platformText: {
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  },

  movieInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    padding: '20px 12px 12px 12px',
    color: '#ffffff'
  },

  movieTitle: {
    fontSize: '14px',
    fontWeight: '700',
    marginBottom: '2px',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    lineHeight: '1.2'
  },

  movieDescription: {
    fontSize: '11px',
    opacity: 0.9,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
  },

  // "+ X more" indicator styles
  moreIndicator: {
    textAlign: 'center',
    marginBottom: '-2px'
  },

  moreText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    opacity: 0.8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#d4af37',
      opacity: 1
    }
  },

  // New navigation bar styles
  navigationBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '6px 0'
  },

  triangleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    ':hover': {
      backgroundColor: 'rgba(0,0,0,0.05)',
      opacity: 1
    }
  },

  dotContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 8px'
  },

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};