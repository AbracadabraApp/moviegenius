// pages/movie/[id].js - Movie detail page
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import MovieCreativeFooter from '../../components/MovieCreativeFooter';
import ErrorBoundary from '../../components/ErrorBoundary';
import WhyWatchContainer from '../../components/WhyWatchContainer';
import MoreIdeasContainer from '../../components/MoreIdeasContainer';

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const movieId = id || (typeof window !== 'undefined' && window.location.pathname.match(/\/movie\/(\d+)/)?.[1]);
  const [finalMovieId, setFinalMovieId] = useState(movieId);

  useEffect(() => {
    if (router.isReady) {
      const extractedId = id || (typeof window !== 'undefined' && window.location.pathname.match(/\/movie\/(\d+)/)?.[1]);
      setFinalMovieId(extractedId);
    }
  }, [router.isReady, id]);

  const [movie, setMovie] = useState(null);
  const [streaming, setStreaming] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady || !finalMovieId) return;

    const fetchMovie = async () => {
      try {
        // Fetch movie metadata from TMDB
        let tmdbData = null;
        try {
          const tmdbResponse = await fetch(`/api/tmdb-movie?id=${finalMovieId}`);
          if (tmdbResponse.ok) {
            tmdbData = await tmdbResponse.json();
          }
        } catch (tmdbError) {
          console.warn('TMDB API unavailable:', tmdbError.message);
        }

        if (tmdbData) {
          setMovie(tmdbData);
        }

        // Fetch streaming availability
        const streamingResponse = await fetch(`/api/movie-streaming?id=${finalMovieId}`);
        if (streamingResponse.ok) {
          const streamingData = await streamingResponse.json();
          setStreaming(streamingData);
        } else {
          setStreaming({ streaming_data: null });
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchMovie();
  }, [router.isReady, finalMovieId]);

  if (error) {
    const isNotFound = error.includes('could not be found') || error.includes('404');
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%', padding: '20px', textAlign: 'center' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#ffffff', padding: '16px 20px' }}>
            <SimpleSearch onResults={() => {}} placeholder="Search Movies . . ." useUnifiedSearch={true} />
          </div>
          <div style={{ marginTop: '60px' }}>
            {isNotFound ? (
              <>
                <h2 style={{ fontSize: '24px', color: '#374151', marginBottom: '12px' }}>Movie Not Found</h2>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
                  Movie ID {finalMovieId} doesn't exist in our database.
                </p>
              </>
            ) : (
              <h2 style={{ fontSize: '24px', color: '#374151', marginBottom: '12px' }}>404 - Page Not Found</h2>
            )}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (!movie && !error) {
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#ffffff', padding: '16px 20px' }}>
            <SimpleSearch onResults={() => {}} placeholder="Search Movies . . ." useUnifiedSearch={true} />
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
    <ErrorBoundary level="page">
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>

          {/* Search */}
          <ErrorBoundary level="section">
            <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#ffffff', padding: '16px 20px' }}>
              <SimpleSearch onResults={() => {}} placeholder="Search Movies . . ." useUnifiedSearch={true} />
            </div>
          </ErrorBoundary>

          {/* Header */}
          <ErrorBoundary level="section">
            <MovieHeaderLarge
              title={movie?.title}
              year={year}
              initialSlug={movie?.overview}
              initialPoster={posterUrl}
              initialStreaming={streaming?.streaming_data}
              tmdbId={parseInt(finalMovieId)}
            />
          </ErrorBoundary>

          {/* Why Watch */}
          <ErrorBoundary level="section">
            <div style={{
              padding: '0 20px',
              backgroundColor: '#ffffff',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              <WhyWatchContainer
                tmdbId={parseInt(finalMovieId)}
                streaming={streaming?.streaming_data}
              />
            </div>
          </ErrorBoundary>

          {/* More Ideas */}
          <ErrorBoundary level="section">
            <MoreIdeasContainer tmdbId={parseInt(finalMovieId)} />
          </ErrorBoundary>

          {/* Footer */}
          <ErrorBoundary level="section">
            <MovieCreativeFooter movie={movie} />
          </ErrorBoundary>

        </div>
      </PhoneFrame>
    </ErrorBoundary>
  );
}

export async function getStaticPaths() {
  if (process.env.NODE_ENV === 'development') {
    return {
      paths: [
        { params: { id: '153' } },
        { params: { id: '550' } },
        { params: { id: '996' } }
      ],
      fallback: 'blocking'
    };
  }

  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT m.tmdb_id
        FROM movies m
        JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE ma.claude_response IS NOT NULL
          AND m.tmdb_id IS NOT NULL
        ORDER BY m.tmdb_id
      `);
      const paths = result.rows.map(row => ({ params: { id: row.tmdb_id.toString() } }));
      console.log(`🎬 Pre-generating ${paths.length} movie paths from database (DISTINCT query)`);
      console.log(`   Range: ${result.rows[0]?.tmdb_id} to ${result.rows[result.rows.length - 1]?.tmdb_id}`);
      return { paths, fallback: 'blocking' };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('❌ Database error in getStaticPaths:', error);
    return {
      paths: ['153', '550', '996', '2', '3', '5'].map(id => ({ params: { id } })),
      fallback: 'blocking'
    };
  }
}

export async function getStaticProps({ params }) {
  return {
    props: { movieId: params.id },
    revalidate: 86400
  };
}
