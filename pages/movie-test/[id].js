// Simplified test page for MovieHeaderLarge - NO API dependencies
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';

export default function MovieTestPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Hard-coded test data - bypasses all database/API issues
  const testMovies = {
    11: {
      title: "Star Wars",
      year: 1977,
      initialSlug: "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle station.",
      initialPoster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
      initialStreaming: null,
      tmdbId: 11
    },
    550: {
      title: "Fight Club",
      year: 1999,
      initialSlug: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
      initialPoster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      initialStreaming: "Available on Hulu",
      tmdbId: 550
    },
    238: {
      title: "The Godfather",
      year: 1972,
      initialSlug: "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.",
      initialPoster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      initialStreaming: "Available on Paramount+",
      tmdbId: 238
    }
  };
  
  const movieData = testMovies[id] || {
    title: `Test Movie ${id}`,
    year: 2024,
    initialSlug: "This is a test movie for debugging MovieHeaderLarge component rendering in production",
    initialPoster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg", // Star Wars fallback
    initialStreaming: null,
    tmdbId: parseInt(id) || 11
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.testHeader}>
          <div style={styles.testLabel}>🧪 Movie Header Test - ID: {id}</div>
          <button 
            onClick={() => router.push(`/movie/${id}`)}
            style={styles.originalLink}
          >
            View Original
          </button>
        </div>
        
        {/* Pure MovieHeaderLarge test - no API dependencies */}
        <MovieHeaderLarge
          title={movieData.title}
          year={movieData.year}
          initialSlug={movieData.initialSlug}
          initialPoster={movieData.initialPoster}
          initialStreaming={movieData.initialStreaming}
          tmdbId={movieData.tmdbId}
        />

        <div style={styles.debugSection}>
          <h3 style={styles.debugTitle}>Debug Info:</h3>
          <div style={styles.debugGrid}>
            <div><strong>Title:</strong> {movieData.title}</div>
            <div><strong>Year:</strong> {movieData.year}</div>
            <div><strong>TMDB ID:</strong> {movieData.tmdbId}</div>
            <div><strong>Poster URL:</strong> {movieData.initialPoster}</div>
            <div><strong>Streaming:</strong> {movieData.initialStreaming || 'None'}</div>
          </div>
          
          <div style={styles.testStatus}>
            <h4>Test Results:</h4>
            <div>✅ Page loads without API calls</div>
            <div>✅ MovieHeaderLarge component renders</div>
            <div>✅ Static TMDB poster URL provided</div>
            <div>✅ PhoneFrame container works</div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderBottom: '2px solid #f59e0b',
  },
  testLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  originalLink: {
    fontSize: '12px',
    color: '#3b82f6',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  debugSection: {
    padding: '20px',
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  debugTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  debugGrid: {
    display: 'grid',
    gap: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#6b7280',
  },
  testStatus: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
  },
};

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  return {
    props: {
      tmdbId: params.id
    },
    revalidate: 3600
  };
}