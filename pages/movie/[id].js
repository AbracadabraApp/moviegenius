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

        // ENHANCED 2-TIER SERVING: Try enhanced static file first, then fallback
        let analysisData = null;
        
        // TIER 1: Try enhanced static file first (future enhanced format) - CLIENT-SIDE ONLY
        if (typeof window !== 'undefined') {
          try {
            const enhancedUrl = `/data/production/movie_${finalMovieId}.json`;
            console.log('🔍 Attempting enhanced static fetch (client-side):', enhancedUrl);
            const enhancedResponse = await fetch(enhancedUrl);
            if (enhancedResponse.ok) {
              const enhancedData = await enhancedResponse.json();
              if (enhancedData.enhancedFormat && enhancedData.analysis) {
                console.log('⚡ TIER 1: Using enhanced static file - zero API calls');
                console.info(`🏆 Enhanced static serving SUCCESS for movie ${finalMovieId}`);
                
                // Enhanced format has pre-resolved data - convert to expected format  
                const processedSections = enhancedData.analysis.sections.map(section => ({
                  type: section.type,
                  text: section.content // Component expects 'text' field, not 'content'
                }));
                
                const componentCompatibleFormat = {
                  content: processedSections, // Component expects 'content' array with 'text' fields
                  featuredMovies: enhancedData.analysis.featuredMovies,
                  whyWatch: enhancedData.analysis.whyWatch,
                  moreIdeas: enhancedData.analysis.moreIdeas,
                  exploreTopics: enhancedData.analysis.exploreTopics
                };
                
                const formattedAnalysis = {
                  claude_response: {
                    raw_content: JSON.stringify(componentCompatibleFormat)
                  },
                  entity_linking_data: enhancedData.analysis.featuredMovies ? {
                    entityData: { featuredMovies: enhancedData.analysis.featuredMovies },
                    processedAt: enhancedData.lastUpdated
                  } : null,
                  entityData: enhancedData.analysis.featuredMovies || null,
                  staticData: enhancedData, // Mark as static data for components
                  keyElements: enhancedData.keyElements // For MovieCreativeFooter
                };
                
                // Update streaming and movie data from enhanced static
                if (enhancedData.movieHeader.streaming) {
                  setStreaming(enhancedData.movieHeader.streaming);
                }
                
                // Update movie object to include staticData flag and keyElements for footer
                setMovie({
                  ...tmdbData,
                  staticData: true,
                  keyElements: enhancedData.keyElements
                });
                
                setAnalysis(formattedAnalysis);
                analysisData = formattedAnalysis;
              }
            }
          } catch (enhancedError) {
            console.log('📝 No enhanced static file, trying current nuclear static');
            console.error('Enhanced static fetch error:', enhancedError.message);
            console.error('Fetch URL was:', `/data/production/movie_${finalMovieId}.json`);
          }
        }

        // TIER 2A: Fallback to current nuclear static (existing format)
        if (!analysisData) {
          try {
            const staticResponse = await fetch(`/nuclear-static/${finalMovieId}.json`);
            if (staticResponse.ok) {
              const staticData = await staticResponse.json();
              if (staticData.props && staticData.props.sections) {
                console.log('🔄 TIER 2A: Using current nuclear static file');
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
            console.log('📝 No nuclear static file, trying database');
          }
        }

        // TIER 2B: Final fallback to dynamic database generation
        if (!analysisData) {
          console.log('🔄 TIER 2B: Generating dynamic analysis from database');
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
    // Handle TMDB "not found" errors gracefully
    const isNotFound = error.includes('could not be found') || error.includes('404');
    
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%', padding: '20px', textAlign: 'center' }}>
          {/* Simple Search Bar */}
          <div style={{ padding: '16px 20px 16px 20px' }}>
            <SimpleSearch
              onResults={() => {}}
              placeholder="Search Movies . . ."
              useUnifiedSearch={true}
            />
          </div>
          
          {isNotFound ? (
            <div style={{ marginTop: '60px' }}>
              <h2 style={{ fontSize: '24px', color: '#374151', marginBottom: '12px' }}>
                Movie Not Found
              </h2>
              <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
                Movie ID {finalMovieId} doesn't exist in our database.
              </p>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                Try searching for a movie above or visit our homepage.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '60px' }}>
              <h2 style={{ fontSize: '24px', color: '#374151', marginBottom: '12px' }}>
                404 - Page Not Found
              </h2>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                The page you're looking for doesn't exist.
              </p>
            </div>
          )}
        </div>
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
            fallback={null}
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
  // In development, use minimal static generation to avoid infinite loops
  if (process.env.NODE_ENV === 'development') {
    return {
      paths: [
        { params: { id: '153' } }, // Test movie
        { params: { id: '550' } }, // Fight Club
        { params: { id: '996' } }  // Double Indemnity
      ],
      fallback: 'blocking' // Allow dynamic generation in development
    };
  }
  
  // Production: Valid TMDB IDs from database (only movies with analyses)
  const movieIds = ['2', '3', '5', '16', '18', '19', '20', '21', '22', '24', '25', '27', '28', '33', '35', '38', '55', '58', '59', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '85', '86', '87', '88', '89', '90', '91', '93', '95', '96', '97', '98', '99', '100', '150', '152', '153', '154', '155', '156', '157', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', '170', '172', '173', '174', '176', '177', '179', '180', '182', '183', '184', '185', '186', '187', '189', '191', '192', '193', '194', '195', '196', '197', '198', '199', '200', '201', '203', '204', '205', '207', '211', '212', '213', '216', '217', '218', '219', '220', '221', '222', '223', '224', '225', '226', '227', '228', '229', '231', '232', '233', '234', '235', '236', '237', '239', '240', '241', '242', '243', '244', '245', '246', '247', '248', '249', '250', '500', '502', '503', '504', '506', '507', '508', '509', '510', '511', '512', '521', '522', '523', '524', '525', '526', '527', '530', '531', '532', '533', '535', '537', '539', '540', '541', '543', '544', '546', '547', '548', '549', '550', '551', '552', '553', '557', '558', '559', '560', '561', '562', '563', '564', '565', '567', '568', '570', '571', '573', '574', '575', '576', '577', '578', '579', '581', '582', '583', '584', '585', '586', '587', '588', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599', '600'];
  
  const paths = movieIds.map(id => ({ params: { id } }));
  
  console.log(`🚀 Pre-generating ${paths.length} movie paths (valid TMDB IDs from database)`);
  
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