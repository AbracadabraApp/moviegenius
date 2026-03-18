/**
 * MoreIdeasContainer - Independent More Ideas data fetching wrapper
 *
 * Fetches More Ideas recommendations independently and renders them as MediaCards.
 * Works for any movie regardless of whether it has full analysis.
 */
import { useState, useEffect } from 'react';
import MediaCard from './MediaCard';

export default function MoreIdeasContainer({ tmdbId, title = "More Ideas", style }) {
  const [moreIdeas, setMoreIdeas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tmdbId) {
      setLoading(false);
      return;
    }

    const fetchMoreIdeas = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/more-ideas?tmdbId=${tmdbId}`);

        if (response.ok) {
          const data = await response.json();
          setMoreIdeas(data);
          setError(null);
        } else {
          console.warn(`More Ideas API failed for movie ${tmdbId}:`, response.status);
          setMoreIdeas(null);
          setError('Failed to load related movies');
        }
      } catch (err) {
        console.error('More Ideas fetch error:', err);
        setMoreIdeas(null);
        setError('Failed to load related movies');
      } finally {
        setLoading(false);
      }
    };

    fetchMoreIdeas();
  }, [tmdbId]);

  // Don't render while data is loading
  if (loading) {
    return null;
  }

  if (error || !moreIdeas || !moreIdeas.hasData || moreIdeas.moreIdeas.length === 0) {
    return null; // Fail silently - don't show broken or empty states
  }

  return (
    <div style={{ ...styles.movieSection, ...styles.fadeIn }}>
      <div style={styles.movieSectionHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>MORE IDEAS</span>
        <div style={styles.sectionDivider} />
      </div>
      <div style={styles.movieList}>
        {moreIdeas.moreIdeas.map((movieItem, movieIndex) => (
          <MediaCard
            key={`more-idea-${movieIndex}`}
            title={movieItem.title}
            year={movieItem.year}
            initialSlug={movieItem.connection}
            initialPoster={movieItem.posterUrl}
            tmdbId={movieItem.tmdbId}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  movieSection: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fadeIn: {
    animation: 'fadeIn 0.3s ease-in',
  }
};