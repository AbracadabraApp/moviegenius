// pages/movie-minimal/[id].js - Minimal movie page without PhoneFrame
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function MinimalMoviePage() {
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
      <div style={styles.container}>
        <h1>Loading...</h1>
        <p>Router ready: {router.isReady.toString()}</p>
        <p>ID: {id || 'undefined'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>Error</h1>
        <p>{error}</p>
        <p>Router ready: {router.isReady.toString()}</p>
        <p>ID: {id || 'undefined'}</p>
      </div>
    );
  }

  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : '';

  return (
    <div style={styles.container}>
      <h1>{movie?.title || `Movie: ${id}`} {year && `(${year})`}</h1>
      <p>Router ready: {router.isReady.toString()}</p>
      <p>Movie ID: {id}</p>
      <p>TMDB ID: {movie?.id}</p>
      {movie?.overview && <p>Overview: {movie.overview.substring(0, 200)}...</p>}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
  },
};