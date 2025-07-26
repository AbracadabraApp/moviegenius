// pages/movie/[id].js - Movie detail page with TMDB integration
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchMovie = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tmdb-movie?id=${id}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch movie: ${response.status}`);
        }
        
        const data = await response.json();
        setMovie(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [router.isReady, id]);

  if (loading) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Loading...</h1>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Error: {error}</h1>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : '';
  const posterUrl = movie?.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/images/placeholder-poster.jpg';

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <MovieHeaderLarge
          title={movie?.title || `Movie: ${id}`}
          year={year}
          initialSlug={movie?.overview}
          initialPoster={posterUrl}
          tmdbId={movie?.id}
        />
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#374151',
    margin: '0',
  },
};