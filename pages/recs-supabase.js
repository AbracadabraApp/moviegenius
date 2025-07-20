// pages/recs-supabase.js - Supabase-powered version for testing
import { createClient } from '@supabase/supabase-js';
import MediaCard from '../components/MediaCard';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Initialize Supabase client with build-safe fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function RecsSupabasePage({ movies, error, stats }) {
  const router = useRouter();

  const handleSearchResults = results => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on Recs Supabase page:', results);
  };

  if (error) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.header}>
            <h2 style={styles.title}>🚀 Supabase-Powered Recommendations</h2>
            <div style={styles.error}>Error: {error}</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>🚀 Supabase-Powered Recommendations</h2>
          <div style={styles.stats}>
            <span>📊 Loaded {movies.length} movies from database</span>
            <span>⚡ Query time: {stats.queryTime}ms</span>
          </div>
          <div style={styles.comparison}>
            <Link href="/recs" style={styles.link}>
              ← Back to JSON version
            </Link>
          </div>
        </div>

        <div style={styles.inputArea}>
          <SimpleSearch onResults={handleSearchResults} />
        </div>

        <div style={styles.movieList}>
          {movies.map((movie, index) => (
            <MediaCard
              key={`${movie.title}-${movie.year}-${movie.id}`}
              title={movie.title}
              year={movie.year}
              initialSlug={movie.slug}
              initialPoster={movie.poster_url}
              initialStreaming={movie.streaming_data}
            />
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Server-Side Rendering: Fetch from Supabase before page loads
export async function getServerSideProps() {
  const startTime = Date.now();

  try {
    // Server-side Supabase client with service role
    const serverSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Query equivalent to current recs.js filter
    const { data: movies, error } = await serverSupabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .not('tmdb_id', 'is', null) // Only movies with TMDB IDs (like current filter)
      .order('title') // Alphabetical order
      .limit(100); // Same performance limit as current

    const queryTime = Date.now() - startTime;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    return {
      props: {
        movies: movies || [],
        error: null,
        stats: {
          queryTime,
          count: movies?.length || 0,
        },
      },
    };
  } catch (error) {
    console.error('Server-side fetch error:', error);

    return {
      props: {
        movies: [],
        error: error.message,
        stats: {
          queryTime: Date.now() - startTime,
          count: 0,
        },
      },
    };
  }
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px',
    borderBottom: '2px solid #3498db',
    backgroundColor: '#ecf0f1',
    flexShrink: 0,
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#7f8c8d',
    marginBottom: '8px',
  },
  comparison: {
    fontSize: '14px',
  },
  link: {
    color: '#3498db',
    textDecoration: 'none',
  },
  inputArea: {
    padding: '16px',
    borderBottom: '1px solid #eee',
    flexShrink: 0,
  },
  movieList: {
    flex: 1,
    overflow: 'hidden',
    padding: '8px',
  },
  error: {
    padding: '20px',
    textAlign: 'center',
    color: '#e74c3c',
    backgroundColor: '#fdf2f2',
    borderRadius: '4px',
    margin: '8px 0',
  },
};
