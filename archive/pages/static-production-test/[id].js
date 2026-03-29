// EXACT COPY of pages/movie/[id].js - Adapted for static test data
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

export default function StaticProductionTestPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Add fallback ID extraction from URL path for SSR compatibility
  // During SSR, asPath is '/static-production-test/[id]', so we need to wait for client-side hydration
  const movieId = id || (typeof window !== 'undefined' && window.location.pathname.match(/\/static-production-test\/(\w+)/)?.[1]);
  
  // Final movie ID for rendering components
  const [finalMovieId, setFinalMovieId] = useState(movieId);
  
  // Update finalMovieId when router is ready
  useEffect(() => {
    if (router.isReady) {
      const extractedId = id || (typeof window !== 'undefined' && window.location.pathname.match(/\/static-production-test\/(\w+)/)?.[1]);
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

  // ONLY CHANGE: Load from static JSON instead of APIs
  useEffect(() => {
    if (!router.isReady || !finalMovieId) {
      return;
    }

    const fetchStaticMovie = async () => {
      try {
        // Load static JSON file
        const response = await fetch(`/data/test-movies/${finalMovieId}.json`);
        if (!response.ok) {
          throw new Error(`Static movie ${finalMovieId} not found`);
        }
        
        const staticData = await response.json();
        
        // Convert static data to production format
        const movieData = {
          title: staticData.title,
          release_date: `${staticData.year}-01-01`,
          overview: staticData.overview,
          poster_path: staticData.poster_url ? staticData.poster_url.replace('https://image.tmdb.org/t/p/w500', '') : null,
          // Mark as static data to prevent API calls
          staticData: true,
          keyElements: staticData.keyElements
        };
        setMovie(movieData);
        
        // Set streaming data
        setStreaming({ 
          streaming_data: staticData.streaming && staticData.streaming !== 'TBD' ? staticData.streaming : null 
        });

        // Convert static data to analysis format - ensure proper structure for renderJsonAnalysis
        const sectionTypes = ['text', 'performancesAndVision', 'technicalAnalysis', 'socialAndCultural', 'contemporaryRelevance']; // Use correct types for subheads
        const jsonAnalysisData = {
          // Main content array with varied types to trigger subheads
          content: (staticData.sections || []).map((section, index) => ({
            type: index === 0 ? 'text' : sectionTypes[Math.min(index, sectionTypes.length - 1)], // First section stays 'text', others get different types
            text: section.content  // Component expects 'text' field, not 'content'
          })),
          featuredMovies: staticData.featuredMovies || [],
          exploreTopics: staticData.exploreTopics || [],
          moreIdeas: staticData.moreIdeas || [],
          whyWatch: staticData.whyWatch || null
        };

        const formattedAnalysis = {
          claude_response: {
            // Provide JSON string to trigger renderJsonAnalysis path
            raw_content: JSON.stringify(jsonAnalysisData)
          },
          entity_linking_data: {
            entityData: {
              featuredMovies: staticData.featuredMovies || [],
              exploreTopics: staticData.exploreTopics || [],
              moreIdeas: staticData.moreIdeas || [],
              whyWatch: staticData.whyWatch || null
            },
            processedAt: new Date().toISOString()
          },
          // Also provide entityData at root level for compatibility
          entityData: {
            featuredMovies: staticData.featuredMovies || [],
            exploreTopics: staticData.exploreTopics || [],
            moreIdeas: staticData.moreIdeas || [],
            whyWatch: staticData.whyWatch || null
          },
          // Add keyElements for MovieCreativeFooter to prevent API calls
          keyElements: staticData.keyElements || null
        };
        setAnalysis(formattedAnalysis);
        
      } catch (err) {
        setError(err.message);
      }
    };

    fetchStaticMovie();
  }, [router.isReady, finalMovieId]);

  if (error) {
    // Handle static file "not found" errors gracefully
    const isNotFound = error.includes('not found') || error.includes('404');
    
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
                Static Movie Not Found
              </h2>
              <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
                Movie ID {finalMovieId} doesn't exist in the test environment.
              </p>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                Available movies: test_000059fa, test_00032d9f, test_00014fb9, test_00018052, test_0003155b
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

          {/* Movie Header - EXACT PRODUCTION COMPONENT */}
          <ErrorBoundary level="section">
            <div style={{ paddingLeft: '0px' }}>
              <MovieHeaderLarge
                title={movie?.title}
                year={year}
                initialSlug={movie?.overview}
                initialPoster={posterUrl}
                initialStreaming={streaming?.streaming_data}
                tmdbId={21327} // Real TMDB ID for components that need it
              />
            </div>
          </ErrorBoundary>

          {/* Movie Analysis - EXACT PRODUCTION COMPONENT */}
          <ErrorBoundary 
            level="section"
            fallback={null}
          >
            <MovieAnalysisWithEntities
              analysis={analysis}
              movie={movie}
            />
          </ErrorBoundary>

          {/* Movie Creative Footer - EXACT PRODUCTION COMPONENT */}
          <ErrorBoundary level="section">
            <MovieCreativeFooter 
              analysis={analysis}
              movie={movie}
            />
          </ErrorBoundary>
          
          {/* Static Test Badge */}
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000
          }}>
            STATIC PROD
          </div>
        </div>
      </PhoneFrame>
      
      {/* Performance Dashboard (dev only) */}
      <PerformanceDashboard />
    </ErrorBoundary>
  );
}

// Static generation for test movies
export async function getStaticPaths() {
  // Static movie IDs from test data
  const staticMovieIds = [
    'test_000059fa', // Buena Vista Social Club
    'test_00032d9f', // Less Than Zero
    'test_00014fb9', // Murder, My Sweet
    'test_00018052', // Testament of Orpheus
    'test_0003155b'  // No Time for Sergeants
  ];
  
  const paths = staticMovieIds.map(id => ({ params: { id } }));
  
  console.log(`🎬 Pre-generating ${paths.length} static production test paths`);
  
  return {
    paths,
    fallback: false  // Only allow pre-defined test movies
  };
}

export async function getStaticProps({ params }) {
  const { id } = params;
  
  // For static generation, we don't pre-fetch data
  // The client-side code will handle all data fetching from JSON files
  
  return {
    props: {
      movieId: id
    },
    revalidate: false // Test data doesn't need revalidation
  };
}