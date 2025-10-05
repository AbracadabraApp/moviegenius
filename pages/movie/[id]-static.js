// pages/movie/[id].js - Movie detail page using static data only
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import MovieCreativeFooter from '../../components/MovieCreativeFooter';
import MovieAnalysisWithEntities from '../../components/MovieAnalysisWithEntities';
import StreamingAvailabilityLink from '../../components/StreamingAvailabilityLink';
import ErrorBoundary from '../../components/ErrorBoundary';
import PerformanceDashboard from '../../components/PerformanceDashboard';
import { getPerformanceMonitor } from '../../lib/performance-monitor';

export default function MovieDetailPage({ movieId, movieData }) {
  const router = useRouter();

  // Performance monitoring
  const performanceMonitor = getPerformanceMonitor();

  // Use static movie data (no client-side fetching except for favorites)
  const finalMovieId = movieId;

  // Transform movieData to component-expected format
  const movie = movieData ? {
    id: movieData.tmdbId,
    title: movieData.title,
    year: movieData.year,
    poster_url: movieData.movieHeader.posterUrl,
    trailer_url: movieData.movieHeader.trailerVideoId,
    overview: movieData.movieHeader.overview,
    staticData: true, // Flag to indicate this is static data
    keyElements: movieData.keyElements // For MovieCreativeFooter
  } : null;

  const streaming = movieData?.movieHeader?.streaming ? {
    streaming_data: movieData.movieHeader.streaming
  } : null;

  // Transform analysis data to component-expected format
  const analysis = movieData?.analysis ? {
    isJsonFormat: true,
    jsonData: {
      sections: movieData.analysis.sections || [],
      whyWatch: movieData.analysis.whyWatch || { recommendation: 'NO', reasons: [] },
      moreIdeas: movieData.analysis.moreIdeas || [],
      featuredMovies: movieData.analysis.featuredMovies || [],
      exploreTopics: movieData.analysis.exploreTopics || []
    },
    entity_linking_data: movieData.analysis.featuredMovies ? {
      entityData: { featuredMovies: movieData.analysis.featuredMovies },
      processedAt: movieData.lastUpdated
    } : null,
    entityData: movieData.analysis.featuredMovies || null,
    staticData: movieData, // Full static data for components
    keyElements: movieData.keyElements // For MovieCreativeFooter
  } : null;

  const keyElements = movieData?.keyElements || null;
  const error = null; // No client-side errors since data is pre-loaded

  // No loading state needed - data is pre-loaded
  const loading = false;

  // Error handling for missing data
  if (!movieData) {
    return (
      <PhoneFrame>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Movie Not Found</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            The movie you're looking for doesn't exist or hasn't been analyzed yet.
          </p>
          <button
            onClick={() => router.push('/movies')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Browse Movies
          </button>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <ErrorBoundary>
      <PhoneFrame>
        <div style={{
          backgroundColor: '#ffffff',
          minHeight: '100%'
        }}>
          {/* Search bar */}
          <div style={{ padding: '16px 20px 16px 20px' }}>
            <SimpleSearch />
          </div>

          {/* Movie header with streaming link */}
          <MovieHeaderLarge
            tmdbId={finalMovieId}
            movie={movie}
            keyElements={keyElements}
            showStreamingLink={true}
          />

          {/* Streaming availability */}
          {streaming?.streaming_data && (
            <div style={{ marginBottom: '20px' }}>
              <StreamingAvailabilityLink streamingData={streaming.streaming_data} />
            </div>
          )}

          {/* Movie analysis content */}
          {analysis && (
            <MovieAnalysisWithEntities
              tmdbId={finalMovieId}
              analysis={analysis}
              movie={movie}
            />
          )}

          {/* Creative footer with cast/crew */}
          {keyElements && (
            <MovieCreativeFooter keyElements={keyElements} />
          )}

          {/* Performance dashboard (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <PerformanceDashboard />
          )}
        </div>
      </PhoneFrame>
    </ErrorBoundary>
  );
}

// Static generation with complete movie data
export async function getStaticProps({ params }) {
  const { id } = params;
  const tmdbId = parseInt(id);

  try {
    // Use enhanced assembly to get complete movie data
    const { assembleEnhancedMovieData } = await import('../../lib/enhanced-assembly.js');
    const movieData = await assembleEnhancedMovieData(tmdbId);

    return {
      props: {
        movieId: id,
        movieData: movieData // Pass complete movie data to component
      },
      revalidate: 86400 // Revalidate once per day
    };
  } catch (error) {
    console.error(`Failed to generate static props for movie ${id}:`, error);

    // Return 404 if movie doesn't exist
    return {
      notFound: true
    };
  }
}

// Static paths - generate for movies in database
export async function getStaticPaths() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();

    // Get a reasonable number of popular movies for static generation
    // In production, you might want to limit this or use ISR
    const result = await client.query(`
      SELECT tmdb_id
      FROM movies
      WHERE tmdb_id IS NOT NULL
      ORDER BY tmdb_id ASC
      LIMIT 1000
    `);

    client.release();
    await pool.end();

    const paths = result.rows.map(row => ({
      params: { id: row.tmdb_id.toString() }
    }));

    return {
      paths,
      fallback: 'blocking' // Generate other pages on demand
    };

  } catch (error) {
    console.error('Failed to generate static paths:', error);

    // Fallback to empty paths - pages will be generated on demand
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}