// Test page for new MovieHeaderLarge - preserves original movie pages
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import PhoneFrame from '../../components/PhoneFrame';
import MediaCard from '../../components/MediaCard';
import MovieHeaderLarge from '../../components/MovieHeaderLarge'; // The header you want to test
import AskInputBar from '../../components/AskInputBar';
import { ArrowLeft, Heart, Bookmark } from 'lucide-react';
import { FavoritesManager } from '../../components/FavoritesManager';
import dynamic from 'next/dynamic';

// Lazy load heavy analysis components
const EntityLinkedText = dynamic(() => import('../../components/EntityLinkedText'), {
  loading: () => <div style={{ padding: '8px', color: '#6b7280', fontSize: '14px' }}>Loading analysis...</div>
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MovieTestPage() {
  const router = useRouter();
  const { id } = router.query;
  
  // Movie data state
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [initialSlug, setInitialSlug] = useState('');
  const [initialPoster, setInitialPoster] = useState('');
  const [initialStreaming, setInitialStreaming] = useState('');
  const [tmdbId, setTmdbId] = useState('');
  
  // Loading and analysis states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [generatedCards, setGeneratedCards] = useState([]);

  // Load movie data
  useEffect(() => {
    if (id) {
      loadMovieData();
    }
  }, [id]);

  const loadMovieData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/load-movie-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: id })
      });
      const data = await response.json();
      
      if (data.success) {
        setTitle(data.movie.title);
        setYear(data.movie.year);
        setInitialSlug(data.movie.slug);
        setInitialPoster(data.movie.poster_url);
        setInitialStreaming(data.movie.streaming_data);
        setTmdbId(data.movie.tmdb_id);
        setAnalysisData(data.analysis);
        setGeneratedCards(data.generatedCards || []);
      }
    } catch (error) {
      console.error('Error loading movie data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async (question) => {
    // Same ask functionality as original
    setIsLoadingAnalysis(true);
    try {
      const response = await fetch('/api/analyze-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          year,
          question,
          tmdbId: id
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalysisData(data.analysis);
      }
    } catch (error) {
      console.error('Error analyzing movie:', error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  if (isLoading) {
    return (
      <PhoneFrame>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingText}>Loading movie...</div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame active="movies">
      <div style={styles.container}>
        <div style={styles.testHeader}>
          <div style={styles.testLabel}>🧪 Testing MovieHeaderLarge - TMDB_ID: {id}</div>
          <button 
            onClick={() => router.push(`/movie/${id}`)}
            style={styles.originalLink}
          >
            View Original
          </button>
        </div>

        <div style={styles.inputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Testing the new MovieHeaderLarge component */}
        <MovieHeaderLarge
          title={title}
          year={year}
          initialSlug={initialSlug}
          initialPoster={initialPoster}
          initialStreaming={initialStreaming}
          tmdbId={tmdbId}
        />

        <div style={styles.claudeSection}>
          {isLoadingAnalysis ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingRow}>
                <div style={styles.loadingIcon}>⏳</div>
                <div style={styles.loadingText}>Claude is analyzing {title}...</div>
              </div>
            </div>
          ) : analysisData ? (
            <div style={styles.analysisContent}>
              <EntityLinkedText 
                text={analysisData} 
                currentTitle={title}
                currentYear={year}
              />
            </div>
          ) : (
            <div style={styles.promptContainer}>
              <div style={styles.promptText}>
                Ask Claude about this movie's cinematography, themes, or cultural impact
              </div>
            </div>
          )}
        </div>

        {generatedCards.length > 0 && (
          <div style={styles.cardsSection}>
            <div style={styles.cardsHeader}>Related</div>
            <div style={styles.cardsGrid}>
              {generatedCards.map((card, index) => (
                <MediaCard
                  key={card.id || index}
                  title={card.title}
                  year={card.year}
                  slug={card.slug}
                  poster={card.poster}
                  tmdbId={card.tmdbId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#fef3c7',
    borderBottom: '1px solid #f59e0b',
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
  },
  inputArea: {
    padding: '5px',
    backgroundColor: '#ffffff',
  },
  claudeSection: {
    flex: 1,
    padding: '0 36px 24px',
    marginTop: '0px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    flexDirection: 'column',
    gap: '12px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  loadingIcon: {
    fontSize: '24px',
    animation: 'spin 2s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
  },
  analysisContent: {
    marginTop: '24px',
  },
  promptContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    padding: '40px 20px',
  },
  promptText: {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: '1.5',
    fontStyle: 'italic',
  },
  cardsSection: {
    padding: '24px 16px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  cardsHeader: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
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