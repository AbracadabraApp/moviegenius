// pages/movie/[id].js - Movie detail page using exact legacy MovieHeaderLarge
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import MovieCreativeFooter from '../../components/MovieCreativeFooter';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';
import ErrorBoundary from '../../components/ErrorBoundary';
import PerformanceDashboard from '../../components/PerformanceDashboard';
import { getPerformanceMonitor } from '../../lib/performance-monitor';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Add fallback ID extraction from URL path for SSR compatibility
  // During SSR, asPath is '/movie/[id]', so we need to wait for client-side hydration
  const movieId = id || (typeof window !== 'undefined' && window.location.pathname.match(/\/movie\/(\d+)/)?.[1]);
  
  // Final movie ID for rendering components
  const [finalMovieId, setFinalMovieId] = useState(movieId);
  
  // Update finalMovieId when router is ready
  useEffect(() => {
    if (router.isReady) {
      const extractedId = id || (typeof window !== 'undefined' && window.location.pathname.match(/\/movie\/(\d+)/)?.[1]);
      setFinalMovieId(extractedId);
    }
  }, [router.isReady, id]);
  
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
    if (!router.isReady || !finalMovieId) {
      return;
    }

    const fetchMovie = async () => {
      // Start performance tracking
      // const pageLoadId = `movie_page_${id}_load`;
      // performanceMonitor.trackMetric('page_load_start', performance.now(), { movieId: id });
      
      try {
        // Fetch TMDB data
        const tmdbResponse = await fetch(`/api/tmdb-movie?id=${finalMovieId}`);
        if (!tmdbResponse.ok) {
          const errorData = await tmdbResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch movie: ${tmdbResponse.status}`);
        }
        
        const tmdbData = await tmdbResponse.json();
        setMovie(tmdbData);
        
        // Fetch streaming data from database
        const streamingResponse = await fetch(`/api/movie-streaming?id=${finalMovieId}`);
        if (streamingResponse.ok) {
          const streamingData = await streamingResponse.json();
          setStreaming(streamingData);
        } else {
          setStreaming({ streaming_data: null });
        }

        // Try to fetch processed static file with links first
        let analysisData = null;
        try {
          const staticResponse = await fetch(`/nuclear-static/${finalMovieId}.json`);
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
          const analysisResponse = await fetch(`/api/movie-analysis?tmdbId=${finalMovieId}`);
          if (analysisResponse.ok) {
            const apiData = await analysisResponse.json();
            
            // Defensive data validator - prevents future developer breaks
            function validateAnalysisData(data) {
              if (!data?.analysis && !data?.rawAnalysis) return null;
              const content = data.analysis || data.rawAnalysis;
              return {
                processed_content: content, // Primary field for JSON rendering
                raw_content: content // Fallback for compatibility
              };
            }
            
            const validatedContent = validateAnalysisData(apiData);
            if (!validatedContent) {
              console.error('❌ Invalid analysis data structure:', apiData);
              setAnalysis(null);
              return;
            }
            
            // Format analysis data for MovieAnalysisWithEntities component
            const formattedAnalysis = {
              claude_response: validatedContent,
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
  }, [router.isReady, finalMovieId]);

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
            <div style={{ paddingLeft: '0px' }}>
              <MovieHeaderLarge
                title={movie?.title}
                year={year}
                initialSlug={movie?.overview}
                initialPoster={posterUrl}
                initialStreaming={streaming?.streaming_data}
                tmdbId={parseInt(finalMovieId)}
              />
            </div>
          </ErrorBoundary>

          {/* Movie Analysis - Enhanced error boundary for analysis rendering issues */}
          <ErrorBoundary 
            level="section"
            fallback={
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                <p>Analysis temporarily unavailable</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Please refresh the page or try again later
                </p>
              </div>
            }
          >
            <MovieAnalysisWithEntities
              analysis={analysis}
              movie={movie}
            />
          </ErrorBoundary>

          {/* Movie Creative Footer */}
          <ErrorBoundary level="section">
            <MovieCreativeFooter 
              analysis={analysis}
              movie={movie}
            />
          </ErrorBoundary>
        </div>
      </PhoneFrame>
      
      {/* Performance Dashboard (dev only) */}
      <PerformanceDashboard />
    </ErrorBoundary>
  );
}

// Static generation for production
export async function getStaticPaths() {
  // Generate static paths for movie ID ranges
  const movieIds = [];
  
  // Range 1: 1-100 (early classics)
  for (let i = 1; i <= 100; i++) {
    movieIds.push(i.toString());
  }
  
  // Range 2: 150-250 (more classics) 
  for (let i = 150; i <= 250; i++) {
    movieIds.push(i.toString());
  }
  
  // Range 3: 500-600 (popular range)
  for (let i = 500; i <= 600; i++) {
    movieIds.push(i.toString());
  }
  
  const paths = movieIds.map(id => ({ params: { id } }));
  
  console.log(`🚀 Pre-generating ${paths.length} movie paths (ranges: 1-100, 150-250, 500-600)`);
  
  return {
    paths,
    fallback: false  // Use proven pattern that works in production
  };
}

export async function getStaticProps({ params }) {
  const { id } = params;
  
  // For static generation, we don't pre-fetch data
  // The client-side code will handle all data fetching
  // This keeps the static generation simple and fast
  
  return {
    props: {
      movieId: id
    },
    revalidate: 86400 // Revalidate once per day
  };
}