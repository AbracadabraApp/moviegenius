/**
 * New Releases Page - Discovery for fresh cinema
 * Target audience: Film buffs interested in quality new releases
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import MediaCard from '../components/MediaCard';
import AskInputBar from '../components/AskInputBar';
import { useRouter } from 'next/router';

export default function NewReleasesPage() {
  const router = useRouter();
  const [newReleases, setNewReleases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  useEffect(() => {
    fetchNewReleases();
  }, []);

  const fetchNewReleases = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/new-releases');
      const data = await response.json();
      
      if (data.success) {
        setNewReleases(data.releases);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load new releases');
      console.error('Error fetching new releases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.inputArea}>
          <AskInputBar 
            onSubmit={handleAsk}
            placeholder="Ask about new releases or discover cinema..."
          />
        </div>

        <div style={styles.content}>
          <div style={styles.header}>
            <h1 style={styles.title}>What's New in Cinema</h1>
            <p style={styles.subtitle}>
              Fresh releases and discoveries for the discerning film buff
            </p>
          </div>

          {isLoading && (
            <div style={styles.loading}>
              <div style={styles.loadingText}>Discovering new releases...</div>
            </div>
          )}

          {error && (
            <div style={styles.error}>
              <div style={styles.errorText}>
                Unable to load new releases: {error}
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {newReleases.length > 0 ? (
                <div style={styles.releasesSection}>
                  <div style={styles.movieList}>
                    {newReleases.map((movie, index) => (
                      <MediaCard
                        key={`new-release-${movie.id}-${index}`}
                        title={movie.title}
                        year={new Date(movie.release_date).getFullYear()}
                        initialSlug="New release - analysis coming soon"
                        tmdbId={movie.id}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyText}>
                    No new releases discovered yet. Check back tomorrow!
                  </div>
                </div>
              )}

              <div style={styles.comingSoon}>
                <h3 style={styles.comingSoonTitle}>Coming Soon</h3>
                <div style={styles.comingSoonText}>
                  • Daily auto-discovery of quality new releases<br/>
                  • Claude analysis for noteworthy films<br/>
                  • Curated recommendations for film enthusiasts<br/>
                  • Integration with your existing favorites
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  content: {
    flex: 1,
    padding: '20px 16px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 16px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  error: {
    textAlign: 'center',
    padding: '40px 16px',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  releasesSection: {
    marginBottom: '32px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  comingSoon: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  comingSoonTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px',
  },
  comingSoonText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
  },
};