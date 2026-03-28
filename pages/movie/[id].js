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
import { FavoritesManager } from '../../components/FavoritesManager';
import { Check, Plus } from 'lucide-react';

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
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

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

  // Must be before early returns — hooks cannot be conditional
  const mediaId = movie ? `${movie.title?.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.release_date ? new Date(movie.release_date).getFullYear() : ''}` : null;
  useEffect(() => {
    if (!mediaId) return;
    try {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    } catch (e) { /* localStorage unavailable */ }
  }, [mediaId]);

  if (error) {
    const isNotFound = error.includes('could not be found') || error.includes('404');
    return (
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%', padding: '20px', textAlign: 'center' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.98)', padding: '16px', backdropFilter: 'blur(10px)' }}>
            <SimpleSearch placeholder="Search movies..." />
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
          <style>{`
            @keyframes shimmer {
              0% { background-position: -600px 0; }
              100% { background-position: 600px 0; }
            }
            .sk {
              background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
              background-size: 600px 100%;
              animation: shimmer 1.4s infinite linear;
              border-radius: 6px;
            }
          `}</style>
          {/* Search bar */}
          <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.98)', padding: '10px 16px', display: 'flex', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: '267px' }}>
              <SimpleSearch onResults={() => {}} placeholder="Search movies..." compact={true} />
            </div>
          </div>
          {/* Poster skeleton */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 12px 0' }}>
            <div className="sk" style={{ width: '267px', height: '400px', borderRadius: '12px' }} />
          </div>
          {/* Title + year */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '0 32px' }}>
            <div className="sk" style={{ width: '200px', height: '22px' }} />
            <div className="sk" style={{ width: '80px', height: '16px' }} />
          </div>
          {/* Content bars */}
          <div style={{ padding: '20px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="sk" style={{ width: '100%', height: '14px' }} />
            <div className="sk" style={{ width: '85%', height: '14px' }} />
            <div className="sk" style={{ width: '92%', height: '14px' }} />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const year = movie?.release_date ? new Date(movie.release_date).getFullYear() : '';
  const posterUrl = movie?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/images/placeholder-poster.jpg';

  const movieData = movie ? { title: movie.title, year, poster: posterUrl, id: mediaId, tmdbId: parseInt(finalMovieId), slug: streaming?.slug } : null;

  const seenAddSlot = movieData ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => { try { setHearted(FavoritesManager.toggleHeart(movieData)); } catch(e){ /* ignore */ } }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px 4px 9px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
          <Check size={16} color={hearted ? '#000000' : '#6b7280'} strokeWidth={hearted ? 3 : 2} />
          <span style={{ fontSize: 'var(--font-xs)', color: hearted ? '#000000' : '#6b7280', fontWeight: hearted ? '700' : '500', fontFamily: 'inherit', lineHeight: '1' }}>Seen</span>
        </div>
      </button>
      <button
        onClick={() => { try { setBookmarked(FavoritesManager.toggleBookmark(movieData)); } catch(e){ /* ignore */ } }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
          <Plus size={16} color={bookmarked ? '#000000' : '#6b7280'} strokeWidth={bookmarked ? 3 : 2} />
          <span style={{ fontSize: 'var(--font-xs)', color: bookmarked ? '#000000' : '#6b7280', fontWeight: bookmarked ? '700' : '500', fontFamily: 'inherit', lineHeight: '1' }}>Add</span>
        </div>
      </button>
    </div>
  ) : null;

  return (
    <ErrorBoundary level="page">
      <PhoneFrame>
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%' }}>

          {/* Search */}
          <ErrorBoundary level="section">
            <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '10px 16px' }}>
              <SimpleSearch placeholder="Search movies..." />
            </div>
          </ErrorBoundary>

          {/* Header */}
          <ErrorBoundary level="section">
            <MovieHeaderLarge
              title={movie?.title}
              year={year}
              initialSlug={streaming?.slug || movie?.overview}
              initialPoster={posterUrl}
              initialStreaming={streaming?.streaming_data}
              tmdbId={parseInt(finalMovieId)}
            />
          </ErrorBoundary>

          {/* Why Watch */}
          <ErrorBoundary level="section">
            <WhyWatchContainer
              tmdbId={parseInt(finalMovieId)}
              streaming={streaming?.streaming_data}
              rightSlot={seenAddSlot}
            />
          </ErrorBoundary>

          {/* Footer */}
          <ErrorBoundary level="section">
            <MovieCreativeFooter movie={movie} />
          </ErrorBoundary>

          {/* More Ideas */}
          <ErrorBoundary level="section">
            <MoreIdeasContainer tmdbId={parseInt(finalMovieId)} />
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
