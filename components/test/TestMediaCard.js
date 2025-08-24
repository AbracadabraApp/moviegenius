/**
 * TestMediaCard - Simplified copy for testing Featured Films sections
 * Displays movie cards without database dependencies
 */
import { useState } from 'react';

export default function TestMediaCard({
  movie,
  onClick,
  style = {},
  className = '',
}) {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };

  const handleClick = () => {
    console.log(`🔗 Test: Media card clicked: ${movie.title} (${movie.year})`);
    if (onClick) {
      onClick(movie);
    }
  };

  const posterUrl = !imageError && movie.poster_url 
    ? movie.poster_url 
    : '/images/placeholder-poster.jpg';

  return (
    <div 
      style={{ ...styles.container, ...style }} 
      className={className}
      onClick={handleClick}
    >
      <img 
        src={posterUrl}
        alt={`Poster for ${movie.title}`}
        style={styles.poster}
        onError={handleImageError}
      />
      <div style={styles.textContainer}>
        <div style={styles.title}>
          {movie.title}
        </div>
        <div style={styles.year}>
          ({movie.year})
        </div>
        {movie.slug && (
          <div style={styles.slug}>
            {movie.slug}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  poster: {
    width: '80px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '8px',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  year: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  slug: {
    fontSize: '13px',
    color: '#888',
    lineHeight: '1.4',
  },
};