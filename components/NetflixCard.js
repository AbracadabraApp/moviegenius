/**
 * NetflixCard Component - Individual movie card with Netflix-style hover effects
 *
 * Features:
 * - Hover overlay with gradient
 * - Action buttons (Play, Add to List, More Info)
 * - Smooth transitions
 * - Title and description on hover
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { Play, Plus, ChevronDown } from 'lucide-react';

export default function NetflixCard({ movie }) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons
    if (e.target.closest('button')) {
      e.preventDefault();
      return;
    }

    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    // TODO: Implement add to favorites/watchlist functionality
    console.log('Add to list:', movie.title);
  };

  const handleMoreClick = (e) => {
    e.stopPropagation();
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  return (
    <div
      style={styles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Poster Image */}
      <div style={styles.imageContainer}>
        <img
          src={movie.poster_url || '/images/placeholder-poster.jpg'}
          alt={movie.title}
          style={styles.poster}
        />

        {/* Hover Overlay */}
        <div
          style={{
            ...styles.overlay,
            opacity: isHovered ? 1 : 0,
          }}
        >
          <div style={styles.overlayContent}>
            {/* Title */}
            <h3 style={styles.movieTitle}>{movie.title}</h3>

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button
                onClick={handlePlayClick}
                style={styles.playButton}
                aria-label="Play"
                onMouseEnter={(e) => e.currentTarget.style.background = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'}
              >
                <Play size={16} fill="currentColor" />
              </button>
              <button
                onClick={handleAddClick}
                style={styles.iconButton}
                aria-label="Add to list"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.borderColor = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}
              >
                <Plus size={16} />
              </button>
              <button
                onClick={handleMoreClick}
                style={styles.iconButton}
                aria-label="More info"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.borderColor = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(42, 42, 42, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Year */}
            {movie.year && (
              <p style={styles.movieYear}>{movie.year}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    position: 'relative',
    cursor: 'pointer',
    width: '100%',
    aspectRatio: '2/3',
  },

  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },

  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 50%, transparent 100%)',
    transition: 'opacity 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },

  overlayContent: {
    padding: '12px',
  },

  movieTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  actions: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
  },

  playButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    color: '#000000',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    padding: 0,
  },

  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(42, 42, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: 0,
  },

  movieYear: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};
