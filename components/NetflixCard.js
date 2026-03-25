/**
 * NetflixCard Component - Individual movie card with Netflix-style hover effects
 *
 * Features:
 * - Hover overlay with gradient
 * - Action buttons (Play, Add to List, More Info)
 * - Smooth transitions
 * - Title and description on hover
 */

import { useRouter } from 'next/router';

export default function NetflixCard({ movie }) {
  const router = useRouter();

  const handleCardClick = () => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  return (
    <div style={styles.card} onClick={handleCardClick}>
      <div style={styles.imageContainer}>
        <img
          src={movie.poster_url || '/images/placeholder-poster.jpg'}
          alt={movie.title}
          style={styles.poster}
        />
      </div>
    </div>
  );
}

const styles = {
  card: {
    cursor: 'pointer',
    width: '100%',
    aspectRatio: '2/3',
  },

  imageContainer: {
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
};
