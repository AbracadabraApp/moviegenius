// pages/test/genius-episodes.js
import { useState, useEffect } from 'react';
import {
  processMovieLinksForReact,
  extractEpisodeMovies,
  analyzeTextForLinks,
} from '../../lib/simple-entity-linker';
import LinkedText from '../../components/LinkedText';

export default function GeniusEpisodesTest() {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [enableLinking, setEnableLinking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available test episodes
  useEffect(() => {
    const availableEpisodes = [
      {
        seriesId: '1',
        episodeId: '1',
        title: 'German Expressionism',
        subtitle: 'The template for noir morality',
      },
      {
        seriesId: '1',
        episodeId: '2',
        title: 'From Novels to Noir',
        subtitle: 'Hard-boiled detective fiction meets cinema',
      },
    ];
    setEpisodes(availableEpisodes);
  }, []);

  const loadEpisodeContent = async (seriesId, episodeId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/series-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId, episodeId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load episode: ${response.statusText}`);
      }

      const data = await response.json();
      setSelectedEpisode(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const episodeContent = selectedEpisode?.data;
  const episodeMovies = episodeContent ? extractEpisodeMovies(episodeContent) : [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Genius Episodes Entity Linking Test</h1>
        <p style={styles.subtitle}>Compare original vs linked content in real episodes</p>
      </div>

      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Test Episode:</label>
          <select
            style={styles.select}
            onChange={e => {
              const [seriesId, episodeId] = e.target.value.split('-');
              if (seriesId && episodeId) {
                loadEpisodeContent(seriesId, episodeId);
              }
            }}
            defaultValue=""
          >
            <option value="">Select an episode...</option>
            {episodes.map(ep => (
              <option
                key={`${ep.seriesId}-${ep.episodeId}`}
                value={`${ep.seriesId}-${ep.episodeId}`}
              >
                Series {ep.seriesId}, Episode {ep.episodeId}: {ep.title}
              </option>
            ))}
          </select>
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={enableLinking}
            onChange={e => setEnableLinking(e.target.checked)}
            style={styles.checkbox}
          />
          Enable Movie Linking
        </label>
      </div>

      {loading && <div style={styles.loading}>Loading episode content...</div>}

      {error && <div style={styles.error}>Error: {error}</div>}

      {selectedEpisode && (
        <div style={styles.episodeContainer}>
          <div style={styles.episodeHeader}>
            <h2 style={styles.episodeTitle}>
              {selectedEpisode.episode.title}: {selectedEpisode.episode.subtitle}
            </h2>
            <div style={styles.episodeStats}>
              <span>Movies in episode: {episodeMovies.length}</span>
            </div>
          </div>

          {episodeContent?.sections?.map((section, index) => {
            if (section.type !== 'text') return null;

            const analysis = analyzeTextForLinks(section.content, episodeMovies);
            const processedParts = processMovieLinksForReact(section.content, episodeMovies);

            return (
              <div key={index} style={styles.sectionContainer}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>Text Section {index + 1}</h3>
                  {analysis.totalMatches > 0 && (
                    <div style={styles.sectionStats}>
                      <span style={styles.statBadge}>
                        {analysis.linkedMatches}/{analysis.totalMatches} matches linked
                      </span>
                    </div>
                  )}
                </div>

                <div style={styles.comparisonGrid}>
                  <div style={styles.textColumn}>
                    <h4 style={styles.columnTitle}>Original</h4>
                    <div style={styles.textContent}>{section.content}</div>
                  </div>

                  <div style={styles.textColumn}>
                    <h4 style={styles.columnTitle}>With Linking</h4>
                    <div style={styles.textContent}>
                      <LinkedText
                        parts={processedParts}
                        enableLinking={enableLinking}
                        linkStyle={{
                          color: 'inherit',
                          textDecorationColor: '#d4af37',
                          textDecorationThickness: '1px',
                          textUnderlineOffset: '2px',
                          fontWeight: '500',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {analysis.matches.length > 0 && (
                  <div style={styles.matchesDetails}>
                    <h5 style={styles.matchesTitle}>Detected Patterns:</h5>
                    <div style={styles.matchesList}>
                      {analysis.matches.map((match, matchIndex) => (
                        <div key={matchIndex} style={styles.matchItem}>
                          <span style={styles.matchText}>{match.text}</span>
                          <span
                            style={{
                              ...styles.matchStatus,
                              color: match.linked ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {match.linked ? '✓ Linked' : '✗ Not in episode data'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={styles.movieDataSection}>
            <h3 style={styles.sectionTitle}>Episode Movie Data</h3>
            <div style={styles.movieGrid}>
              {episodeMovies.map((movie, index) => (
                <div key={index} style={styles.movieCard}>
                  <div style={styles.movieInfo}>
                    <span style={styles.movieTitle}>
                      "{movie.title}" ({movie.year})
                    </span>
                    <span style={styles.movieSlug}>{movie.slug}</span>
                  </div>
                  <span style={styles.movieId}>ID: {movie.tmdb_id || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.feedbackSection}>
            <h3 style={styles.sectionTitle}>Quick Feedback</h3>
            <div style={styles.feedbackButtons}>
              <button
                style={{ ...styles.feedbackButton, ...styles.feedbackPositive }}
                onClick={() => console.log('Positive feedback for linking')}
              >
                👍 Helpful
              </button>
              <button
                style={{ ...styles.feedbackButton, ...styles.feedbackNeutral }}
                onClick={() => console.log('Neutral feedback for linking')}
              >
                😐 Neutral
              </button>
              <button
                style={{ ...styles.feedbackButton, ...styles.feedbackNegative }}
                onClick={() => console.log('Negative feedback for linking')}
              >
                👎 Distracting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#111827',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '300px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '8px',
    transform: 'scale(1.2)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#6b7280',
  },
  error: {
    padding: '15px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '20px',
  },
  episodeContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  episodeHeader: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  episodeTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#111827',
  },
  episodeStats: {
    fontSize: '14px',
    color: '#6b7280',
  },
  sectionContainer: {
    padding: '20px',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0',
  },
  sectionStats: {
    display: 'flex',
    gap: '10px',
  },
  statBadge: {
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '15px',
  },
  textColumn: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  columnTitle: {
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px 15px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    margin: '0',
    color: '#374151',
  },
  textContent: {
    padding: '15px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    minHeight: '100px',
  },
  matchesDetails: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  matchesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151',
  },
  matchesList: {
    display: 'grid',
    gap: '6px',
  },
  matchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  matchText: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#374151',
  },
  matchStatus: {
    fontSize: '12px',
    fontWeight: '500',
  },
  movieDataSection: {
    padding: '20px',
    backgroundColor: '#fefdf8',
    borderTop: '1px solid #f3f4f6',
  },
  movieGrid: {
    display: 'grid',
    gap: '10px',
  },
  movieCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #f3f4f6',
  },
  movieInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  movieTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  movieSlug: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  movieId: {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  feedbackSection: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  feedbackButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  feedbackButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  feedbackPositive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  feedbackNeutral: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  feedbackNegative: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
};
