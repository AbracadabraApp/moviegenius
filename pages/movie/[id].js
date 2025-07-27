// pages/movie/[id].js - Movie detail page using exact legacy MovieHeaderLarge
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import DiscoveryFooter from '../../components/DiscoveryFooter';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // API data state
  const [movie, setMovie] = useState(null);
  const [streaming, setStreaming] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API data fetching
  useEffect(() => {
    if (!router.isReady || !id) {
      return;
    }

    const fetchMovie = async () => {
      try {
        setLoading(true);
        
        // Fetch TMDB data
        const tmdbResponse = await fetch(`/api/tmdb-movie?id=${id}`);
        if (!tmdbResponse.ok) {
          const errorData = await tmdbResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch movie: ${tmdbResponse.status}`);
        }
        
        const tmdbData = await tmdbResponse.json();
        setMovie(tmdbData);
        
        // Fetch streaming data from database
        const streamingResponse = await fetch(`/api/movie-streaming?id=${id}`);
        if (streamingResponse.ok) {
          const streamingData = await streamingResponse.json();
          setStreaming(streamingData);
        } else {
          setStreaming({ streaming_data: null });
        }
        
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
        <div>Loading...</div>
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame>
        <div>Error: {error}</div>
      </PhoneFrame>
    );
  }

  if (!movie) return null;

  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : '';
  const posterUrl = movie?.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/images/placeholder-poster.jpg';

  // Simple search handler (SimpleSearch handles navigation automatically)
  const handleSearchResults = (results) => {
    // SimpleSearch component handles navigation automatically
    // This is just for any additional result processing if needed
  };

  return (
    <PhoneFrame>
      <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
        {/* Simple Search Bar */}
        <div style={{ padding: '16px 16px 8px 16px' }}>
          <SimpleSearch
            onResults={handleSearchResults}
            placeholder="Search movies..."
            useUnifiedSearch={true}
          />
        </div>

        {/* Movie Header */}
        <MovieHeaderLarge
          title={movie.title}
          year={year}
          initialSlug={movie.overview}
          initialPoster={posterUrl}
          initialStreaming={streaming?.streaming_data}
          tmdbId={parseInt(id)}
        />

        {/* Discovery Footer */}
        <DiscoveryFooter />
      </div>
    </PhoneFrame>
  );
}