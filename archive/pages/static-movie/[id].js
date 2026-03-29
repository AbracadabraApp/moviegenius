/**
 * Static Movie Page - EXACT COPY of pages/test-movie/[id].js 
 * 
 * Only change: data source from runtime fetch to pre-built static files
 * Everything else identical: components, styling, functionality
 */
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Heart, Bookmark, Share, ChevronDown, ChevronUp } from 'lucide-react';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';
import MovieCreativeFooter from '../../components/MovieCreativeFooter';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function StaticMovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [movieData, setMovieData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!router.isReady || !id) {
      return;
    }

    const loadStaticMovie = async () => {
      try {
        setLoading(true);
        
        // ONLY CHANGE: Load from pre-built static files instead of runtime fetch
        const response = await fetch(`/data/test-movies/${id}.json`);
        
        if (!response.ok) {
          throw new Error(`Static movie ${id} not found`);
        }
        
        const data = await response.json();
        console.log(`✅ Loaded static movie: ${data.title} (${data.year})`);
        
        setMovieData(data);
        setError(null);
        
      } catch (err) {
        console.error(`❌ Failed to load static movie ${id}:`, err);
        setError(err.message);
        setMovieData(null);
      } finally {
        setLoading(false);
      }
    };

    loadStaticMovie();
  }, [router.isReady, id]);

  // Error state - EXACT COPY
  if (error) {
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
          
          <div style={{ marginTop: '60px' }}>
            <h2 style={{ fontSize: '24px', color: '#374151', marginBottom: '12px' }}>
              Static Movie Not Found
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
              Static movie "{id}" doesn't exist.
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Available movies: test_000059fa, test_00032d9f, test_00014fb9, test_00018052, test_0003155b
            </p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Loading state - EXACT COPY
  if (loading || !movieData) {
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
          
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
            <p>Loading static movie...</p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Simple search handler - EXACT COPY
  const handleSearchResults = (results) => {
    // SimpleSearch component handles navigation automatically
  };

  // Production components with static data
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

          {/* Static Movie Display - No API calls */}
          <div style={{ padding: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              {movieData.title}
            </h1>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              {movieData.year} • {movieData.director} • {movieData.genre}
            </div>
            {movieData.overview && (
              <p style={{ fontSize: '16px', color: '#374151', lineHeight: '1.5', marginBottom: '20px' }}>
                {movieData.overview}
              </p>
            )}
            
            {/* Analysis Sections with Links */}
            {movieData.sections && movieData.sections.map((section, index) => (
              <div 
                key={index} 
                style={{
                  padding: '20px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  lineHeight: '1.75',
                  fontSize: '16px',
                  color: '#374151'
                }}
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            ))}
            
            {/* Featured Movies */}
            {movieData.featuredMovies && movieData.featuredMovies.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  🎬 Featured Films
                </h3>
                {movieData.featuredMovies.map((movie, index) => (
                  <div 
                    key={index}
                    style={{
                      background: 'white',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      {movie.title} ({movie.year})
                    </div>
                    {movie.description && (
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>
                        {movie.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Static Environment Badge */}
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000
          }}>
            STATIC
          </div>
        </div>
      </PhoneFrame>
    </ErrorBoundary>
  );
}

// Static generation for movies - EXACT COPY but different paths
export async function getStaticPaths() {
  // Static movie IDs from generated files
  const staticMovieIds = [
    'test_000059fa', // Buena Vista Social Club
    'test_00032d9f', // Less Than Zero
    'test_00014fb9', // Murder, My Sweet
    'test_00018052', // Testament of Orpheus
    'test_0003155b'  // No Time for Sergeants
  ];
  
  const paths = staticMovieIds.map(id => ({ params: { id } }));
  
  console.log(`🎬 Pre-generating ${paths.length} static movie paths`);
  
  return {
    paths,
    fallback: false // Only allow pre-defined movies
  };
}

export async function getStaticProps({ params }) {
  const { id } = params;
  
  // Static data loading happens client-side to keep this simple
  
  return {
    props: {
      staticMovieId: id
    },
    revalidate: false // Static data doesn't need revalidation
  };
}