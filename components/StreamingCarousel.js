/**
 * Streaming Platform Carousel
 * 
 * High-profile homepage feature showcasing best movies on each platform
 * with movie posters, platform badges, and direct links to platform best-of lists
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function StreamingCarousel({ onMovieClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Featured movies with their best streaming platform
  const streamingShowcase = [
    {
      tmdbId: 278,
      title: "The Shawshank Redemption",
      poster: "https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflyCy3dHqTLtfOr.jpg",
      platform: "Netflix",
      platformBadge: "/images/streaming/netflix-badge.png",
      platformColor: "#E50914",
      description: "Drama masterpiece",
      href: "/browse/netflix-best"
    },
    {
      tmdbId: 238,
      title: "The Godfather", 
      poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      platform: "Amazon Prime",
      platformBadge: "/images/streaming/prime-badge.png", 
      platformColor: "#00A8E1",
      description: "Crime epic",
      href: "/browse/prime-best"
    },
    {
      tmdbId: 424,
      title: "Schindler's List",
      poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
      platform: "HBO Max",
      platformBadge: "/images/streaming/hbo-badge.png",
      platformColor: "#9146FF", 
      description: "Historical drama",
      href: "/browse/hbo-best"
    },
    {
      tmdbId: 389,
      title: "12 Angry Men",
      poster: "https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
      platform: "Apple TV+",
      platformBadge: "/images/streaming/apple-badge.png",
      platformColor: "#000000",
      description: "Courtroom classic", 
      href: "/browse/apple-best"
    },
    {
      tmdbId: 129,
      title: "Spirited Away",
      poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", 
      platform: "Disney+",
      platformBadge: "/images/streaming/disney-badge.png",
      platformColor: "#113CCF",
      description: "Animation wonder",
      href: "/browse/disney-best"
    },
    {
      tmdbId: 155,
      title: "The Dark Knight",
      poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      platform: "Hulu", 
      platformBadge: "/images/streaming/hulu-badge.png",
      platformColor: "#1CE783",
      description: "Superhero thriller",
      href: "/browse/hulu-best"
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % streamingShowcase.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, streamingShowcase.length]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % streamingShowcase.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false); 
    setCurrentIndex((prev) => (prev - 1 + streamingShowcase.length) % streamingShowcase.length);
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
      <div style={styles.header}>
        <h2 style={styles.title}>Best Movies on Streaming</h2>
        <div style={styles.subtitle}>Handpicked favorites from every platform</div>
      </div>

      <div style={styles.carouselContainer}>
        {/* Navigation arrows */}
        <button 
          style={{...styles.navButton, ...styles.navButtonLeft}} 
          onClick={prevSlide}
          onMouseEnter={() => setIsAutoPlaying(false)}
        >
          <ChevronLeft size={20} color="#ffffff" />
        </button>
        
        <button 
          style={{...styles.navButton, ...styles.navButtonRight}} 
          onClick={nextSlide}
          onMouseEnter={() => setIsAutoPlaying(false)}
        >
          <ChevronRight size={20} color="#ffffff" />
        </button>

        {/* Main featured item */}
        <div style={styles.featuredItem}>
          <div 
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

            {/* Movie info overlay */}
            <div style={styles.movieInfo}>
              <div style={styles.movieTitle}>
                {streamingShowcase[currentIndex].title}
              </div>
              <div style={styles.movieDescription}>
                {streamingShowcase[currentIndex].description}
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div style={styles.thumbnailStrip}>
          {streamingShowcase.map((movie, index) => (
            <div
              key={movie.tmdbId}
              style={{
                ...styles.thumbnail,
                opacity: index === currentIndex ? 1 : 0.6,
                transform: index === currentIndex ? 'scale(1.1)' : 'scale(1)'
              }}
              onClick={() => {
                setCurrentIndex(index);
                setIsAutoPlaying(false);
              }}
            >
              <img
                src={movie.poster}
                alt={movie.title}
                style={styles.thumbnailImage}
                onError={(e) => {
                  e.target.src = '/images/placeholder-poster.jpg';
                }}
              />
              <div 
                style={{
                  ...styles.thumbnailBadge,
                  backgroundColor: movie.platformColor
                }}
              />
            </div>
          ))}
        </div>

        {/* Progress indicators */}
        <div style={styles.indicators}>
          {streamingShowcase.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.indicator,
                backgroundColor: index === currentIndex ? '#d4af37' : '#e5e7eb'
              }}
              onClick={() => {
                setCurrentIndex(index);
                setIsAutoPlaying(false);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  carousel: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: '16px 20px 20px 20px',
    borderBottom: '1px solid #f0f0f0'
  },

  header: {
    textAlign: 'center',
    marginBottom: '16px'
  },

  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.2'
  },

  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    fontWeight: '500'
  },

  carouselContainer: {
    position: 'relative',
    width: '100%'
  },

  navButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },

  navButtonLeft: {
    left: '8px'
  },

  navButtonRight: {
    right: '8px'
  },

  featuredItem: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '12px'
  },

  posterContainer: {
    position: 'relative',
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    width: '160px',
    height: '240px'
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
    transition: 'transform 0.2s ease'
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

  thumbnailStrip: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '12px',
    padding: '0 10px'
  },

  thumbnail: {
    position: 'relative',
    width: '32px',
    height: '48px',
    borderRadius: '4px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },

  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  thumbnailBadge: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    border: '1px solid #ffffff'
  },

  indicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px'
  },

  indicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  }
};