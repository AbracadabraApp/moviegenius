// pages/test/entity-linking.js
import { useState } from 'react';
import { processMovieLinksForReact, analyzeTextForLinks } from '../../lib/simple-entity-linker';
import LinkedText from '../../components/LinkedText';

export default function EntityLinkingTest() {
  const [testText, setTestText] = useState(`Otto Preminger's "Laura" exemplifies how Expressionist techniques could create an atmosphere of obsession and uncertainty. Similarly, Robert Siodmak's "The Spiral Staircase" (1946) employs expressionistic techniques to build psychological tension. Carol Reed's "The Third Man" (1949), though British, represents perhaps the fullest realization of these principles.`);
  
  const [enableLinking, setEnableLinking] = useState(true);
  
  // Sample episode movies for testing
  const sampleMovies = [
    { title: "Laura", year: 1944, slug: "laura-1944", tmdb_id: 396 },
    { title: "The Spiral Staircase", year: 1946, slug: "the-spiral-staircase-1946", tmdb_id: 25843 },
    { title: "The Third Man", year: 1949, slug: "the-third-man-1949", tmdb_id: 271 },
    { title: "The Cabinet of Dr. Caligari", year: 1920, slug: "the-cabinet-of-dr-caligari-1920", tmdb_id: 313 }
  ];

  const processedParts = processMovieLinksForReact(testText, sampleMovies);
  const analysis = analyzeTextForLinks(testText, sampleMovies);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Entity Linking Test</h1>
        <p style={styles.subtitle}>Test conservative movie title linking with "Title" (Year) pattern</p>
      </div>

      <div style={styles.controls}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={enableLinking}
            onChange={(e) => setEnableLinking(e.target.checked)}
            style={styles.checkbox}
          />
          Enable Movie Linking
        </label>
      </div>

      <div style={styles.testSection}>
        <h2 style={styles.sectionTitle}>Test Text</h2>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          style={styles.textarea}
          placeholder="Enter text with quoted movie titles and years..."
          rows={6}
        />
      </div>

      <div style={styles.resultsGrid}>
        <div style={styles.resultSection}>
          <h3 style={styles.resultTitle}>Original Text</h3>
          <div style={styles.textOutput}>
            {testText}
          </div>
        </div>

        <div style={styles.resultSection}>
          <h3 style={styles.resultTitle}>Processed Text</h3>
          <div style={styles.textOutput}>
            <LinkedText 
              parts={processedParts}
              enableLinking={enableLinking}
              linkStyle={{ 
                color: 'inherit', 
                textDecorationColor: '#d4af37',
                textDecorationThickness: '1px',
                fontWeight: '500' 
              }}
            />
          </div>
        </div>
      </div>

      <div style={styles.analysisSection}>
        <h3 style={styles.resultTitle}>Analysis</h3>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Total Matches:</span>
            <span style={styles.statValue}>{analysis.totalMatches}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Linked:</span>
            <span style={styles.statValue}>{analysis.linkedMatches}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Unlinked:</span>
            <span style={styles.statValue}>{analysis.unlinkedMatches}</span>
          </div>
        </div>

        {analysis.matches.length > 0 && (
          <div style={styles.matchesList}>
            <h4 style={styles.matchesTitle}>Found Matches:</h4>
            {analysis.matches.map((match, index) => (
              <div key={index} style={styles.matchItem}>
                <span style={styles.matchText}>{match.text}</span>
                <span style={{
                  ...styles.matchStatus,
                  color: match.linked ? '#16a34a' : '#dc2626'
                }}>
                  {match.linked ? '✓ Linked' : '✗ Not in episode data'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.movieDataSection}>
        <h3 style={styles.resultTitle}>Sample Episode Movies</h3>
        <div style={styles.movieList}>
          {sampleMovies.map((movie, index) => (
            <div key={index} style={styles.movieItem}>
              <span style={styles.movieTitle}>"{movie.title}" ({movie.year})</span>
              <span style={styles.movieSlug}>{movie.slug}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#111827'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0'
  },
  controls: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    cursor: 'pointer'
  },
  checkbox: {
    marginRight: '8px',
    transform: 'scale(1.2)'
  },
  testSection: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '30px'
  },
  resultSection: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px'
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151'
  },
  textOutput: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    minHeight: '100px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  analysisSection: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  stats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px'
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827'
  },
  matchesList: {
    marginTop: '15px'
  },
  matchesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#374151'
  },
  matchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    marginBottom: '4px'
  },
  matchText: {
    fontSize: '14px',
    fontFamily: 'monospace',
    color: '#374151'
  },
  matchStatus: {
    fontSize: '12px',
    fontWeight: '500'
  },
  movieDataSection: {
    padding: '20px',
    backgroundColor: '#fefdf8',
    borderRadius: '8px',
    border: '1px solid #fbbf24'
  },
  movieList: {
    display: 'grid',
    gap: '8px'
  },
  movieItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px solid #f3f4f6'
  },
  movieTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  movieSlug: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace'
  }
};