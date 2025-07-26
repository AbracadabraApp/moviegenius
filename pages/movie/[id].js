// pages/movie/[id].js - Movie detail page with TMDB integration
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [movie, setMovie] = useState(null);
  const [streaming, setStreaming] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Router debugging
    console.log('🛣️ Router Debug:', {
      isReady: router.isReady,
      id: id,
      pathname: router.pathname,
      asPath: router.asPath,
      query: router.query,
      timestamp: new Date().toISOString()
    });

    if (!router.isReady || !id) {
      console.log('⏳ Router not ready or no ID, waiting...', { isReady: router.isReady, id });
      return;
    }

    console.log('✅ Router ready, fetching movie data for ID:', id);

    const fetchMovie = async () => {
      try {
        setLoading(true);
        console.log('🎬 Fetching movie data for ID:', id);
        
        // Fetch TMDB data (title, year, overview, poster)
        const tmdbResponse = await fetch(`/api/tmdb-movie?id=${id}`);
        console.log('📡 TMDB Response:', { status: tmdbResponse.status, ok: tmdbResponse.ok });
        
        if (!tmdbResponse.ok) {
          const errorData = await tmdbResponse.json().catch(() => ({}));
          console.error('❌ TMDB Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch movie: ${tmdbResponse.status}`);
        }
        
        const tmdbData = await tmdbResponse.json();
        console.log('✅ TMDB data received:', { 
          title: tmdbData.title, 
          year: tmdbData.release_date?.substring(0, 4),
          id: tmdbData.id,
          hasPoster: !!tmdbData.poster_path
        });
        setMovie(tmdbData);
        
        // Fetch streaming data from database
        console.log('📺 Fetching streaming data for movie ID:', id);
        const streamingResponse = await fetch(`/api/movie-streaming?id=${id}`);
        console.log('📡 Streaming Response:', { status: streamingResponse.status, ok: streamingResponse.ok });
        
        if (streamingResponse.ok) {
          const streamingData = await streamingResponse.json();
          console.log('✅ Streaming data received:', streamingData.streaming_data);
          setStreaming(streamingData);
        } else {
          console.log('⚠️ No streaming data found in database');
          setStreaming({ streaming_data: null });
        }
        
      } catch (err) {
        console.error('💥 Fetch error:', err.message);
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
        {/* Movie Poster */}
        {movie?.poster_path && (
          <div style={styles.posterContainer}>
            <img 
              src={posterUrl}
              alt={`${movie.title} poster`}
              style={styles.poster}
            />
          </div>
        )}
        
        <div style={styles.header}>
          <h1 style={styles.title}>
            {movie?.title || `Movie: ${id}`} {year && `(${year})`}
          </h1>
          {movie?.overview && (
            <p style={styles.overview}>{movie.overview}</p>
          )}
          <div style={styles.streamingInfo}>
            <span style={styles.streamingLabel}>Streaming:</span>
            <span style={styles.streamingText}>
              {streaming?.streaming_data || 'Not currently tracked'}
            </span>
          </div>
        </div>
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
  posterContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  poster: {
    width: '200px',
    height: '300px',
    objectFit: 'cover',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
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
  overview: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#6b7280',
    margin: '12px 0 0 0',
  },
  streamingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
  },
  streamingLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  streamingText: {
    fontSize: '14px',
    color: '#6b7280',
  },
};