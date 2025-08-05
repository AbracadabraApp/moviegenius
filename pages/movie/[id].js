// pages/movie/[id].js - Movie detail page using exact legacy MovieHeaderLarge
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import DiscoveryFooter from '../../components/DiscoveryFooter';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';
import ErrorBoundary from '../../components/ErrorBoundary';
import PerformanceDashboard from '../../components/PerformanceDashboard';
import { getPerformanceMonitor } from '../../lib/performance-monitor';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Performance monitoring
  const performanceMonitor = getPerformanceMonitor();
  
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
      // Start performance tracking
      // const pageLoadId = `movie_page_${id}_load`;
      // performanceMonitor.trackMetric('page_load_start', performance.now(), { movieId: id });
      
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

        // Try to fetch processed static file with links first
        let analysisData = null;
        try {
          const staticResponse = await fetch(`/nuclear-static/${id}.json`);
          if (staticResponse.ok) {
            const staticData = await staticResponse.json();
            if (staticData.props && staticData.props.sections) {
              console.log('✅ Using processed static file with links');
              const formattedAnalysis = {
                claude_response: {
                  raw_content: staticData.props.sections.map(s => s.content).join('\n\n')
                },
                entity_linking_data: staticData.props.exploreFurther ? {
                  entityData: { featuredMovies: staticData.props.exploreFurther },
                  processedAt: staticData.props.nuclearTimestamp
                } : null,
                entityData: staticData.props.exploreFurther || null
              };
              setAnalysis(formattedAnalysis);
              analysisData = formattedAnalysis;
            }
          }
        } catch (staticError) {
          console.log('📝 No processed static file, trying database');
        }

        // Fallback to database analysis if no static file
        if (!analysisData) {
          const analysisResponse = await fetch(`/api/movie-analysis?tmdbId=${id}`);
          if (analysisResponse.ok) {
            const apiData = await analysisResponse.json();
            // Format analysis data for MovieAnalysisWithEntities component
            const formattedAnalysis = {
              claude_response: {
                raw_content: apiData.analysis || apiData.rawAnalysis
              },
              entity_linking_data: (apiData.entityData || apiData.movieData) ? {
                entityData: apiData.entityData || apiData.movieData,
                processedAt: new Date().toISOString()
              } : null,
              // Also include the movie data directly for easier access
              entityData: apiData.entityData || apiData.movieData
            };
            
            setAnalysis(formattedAnalysis);
          } else {
            console.error('❌ Analysis API failed:', analysisResponse.status, analysisResponse.statusText);
            setAnalysis(null);
          }
        }
        
        // Track successful page load completion
        // performanceMonitor.trackMetric('page_load_complete', performance.now(), { 
        //   movieId: id,
        //   hasAnalysis: !!analysisData,
        //   hasStreaming: !!streamingData
        // });
        
      } catch (err) {
        // Track failed page load
        // performanceMonitor.trackMetric('page_load_error', performance.now(), { 
        //   movieId: id,
        //   error: err.message
        // });
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
          <div style={{ padding: '16px 20px 16px 20px' }}>
            <SimpleSearch
              onResults={() => {}}
              placeholder="Search Movies . . ."
              useUnifiedSearch={true}
            />
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
            <div style={{ padding: '16px 20px 16px 20px' }}>
              <SimpleSearch
                onResults={handleSearchResults}
                placeholder="Search Movies . . ."
                useUnifiedSearch={true}
              />
            </div>
          </ErrorBoundary>

          {/* Movie Header */}
          <ErrorBoundary level="section">
            <div style={{ paddingLeft: '20px' }}>
              <MovieHeaderLarge
                title={movie?.title}
                year={year}
                initialSlug={movie?.overview}
                initialPoster={posterUrl}
                initialStreaming={streaming?.streaming_data}
                tmdbId={parseInt(id)}
              />
            </div>
          </ErrorBoundary>

          {/* Movie Analysis */}
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
      
      {/* Performance Dashboard (dev only) */}
      <PerformanceDashboard />
    </ErrorBoundary>
  );
}