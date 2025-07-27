// pages/movie/[id].js - Movie detail page using exact legacy MovieHeaderLarge
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import DiscoveryFooter from '../../components/DiscoveryFooter';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Feature flag for page-level loading (can be enabled later if needed)
  const ENABLE_PAGE_LOADING = false;
  
  // API data state
  const [movie, setMovie] = useState(null);
  const [streaming, setStreaming] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // API data fetching
  useEffect(() => {
    if (!router.isReady || !id) {
      return;
    }

    const fetchMovie = async () => {
      try {
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

        // Fetch analysis data
        const analysisResponse = await fetch(`/api/movie-analysis?tmdbId=${id}`);
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          // Format analysis data for MovieAnalysisWithEntities component
          
          const formattedAnalysis = {
            claude_response: {
              raw_content: analysisData.analysis || analysisData.rawAnalysis
            },
            entity_linking_data: (analysisData.entityData || analysisData.movieData) ? {
              entityData: analysisData.entityData || analysisData.movieData,
              processedAt: new Date().toISOString()
            } : null,
            // Also include the movie data directly for easier access
            entityData: analysisData.entityData || analysisData.movieData
          };
          setAnalysis(formattedAnalysis);
        } else {
          setAnalysis(null);
        }
        
      } catch (err) {
        setError(err.message);
      }
    };

    fetchMovie();
  }, [router.isReady, id]);

  if (error) {
    return (
      <PhoneFrame>
        <div>Error: {error}</div>
      </PhoneFrame>
    );
  }

  // Always render the frame - let components handle their own loading
  if (!movie && !error) {
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
          {/* Simple Search Bar */}
          <div style={{ padding: '16px 16px 8px 16px' }}>
            <SimpleSearch
              onResults={() => {}}
              placeholder="Search movies..."
              useUnifiedSearch={true}
            />
          </div>
          <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
            {router.isReady && id ? 'Loading movie data...' : 'Initializing...'}
          </div>
          <DiscoveryFooter />
        </div>
      </PhoneFrame>
    );
  }

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
    <ErrorBoundary level="page">
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
          {/* Simple Search Bar */}
          <ErrorBoundary level="section">
            <div style={{ padding: '16px 16px 8px 16px' }}>
              <SimpleSearch
                onResults={handleSearchResults}
                placeholder="Search movies..."
                useUnifiedSearch={true}
              />
            </div>
          </ErrorBoundary>

          {/* Movie Header */}
          <ErrorBoundary level="section">
            <MovieHeaderLarge
              title={movie.title}
              year={year}
              initialSlug={movie.overview}
              initialPoster={posterUrl}
              initialStreaming={streaming?.streaming_data}
              tmdbId={parseInt(id)}
            />
          </ErrorBoundary>

          {/* Movie Analysis with Entity Linking */}
          <ErrorBoundary level="section">
            <MovieAnalysisWithEntities
              analysis={analysis}
              movie={movie}
            />
          </ErrorBoundary>

          {/* Discovery Footer */}
          <ErrorBoundary level="section">
            <DiscoveryFooter />
          </ErrorBoundary>
        </div>
      </PhoneFrame>
    </ErrorBoundary>
  );
}