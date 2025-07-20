// pages/test/people-linking.js
import { useState, useEffect } from 'react';
import {
  processEntityLinksForReact,
  extractEpisodeMovies,
  analyzeTextForEntityLinks,
} from '../../lib/enhanced-entity-linker';
import { extractEpisodePeople, getEpisodePeopleSummary } from '../../lib/episode-people-extractor';
import LinkedText from '../../components/LinkedText';

export default function PeopleLinkingTest() {
  const [testText, setTestText] = useState(
    `Billy Wilder's "Double Indemnity" (1944) is considered one of the finest examples of film noir. Wilder directed this masterpiece with a screenplay adapted from James M. Cain's novella. The film stars Fred MacMurray as insurance salesman Walter Neff and Barbara Stanwyck as the seductive Phyllis Dietrichson. Edward G. Robinson delivers a memorable performance as claims investigator Barton Keyes.`
  );

  const [enableLinking, setEnableLinking] = useState(true);
  const [episodePeople, setEpisodePeople] = useState(null);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Sample episode movies for testing
  const sampleMovies = [
    { title: 'Double Indemnity', year: 1944, slug: 'double-indemnity-1944', tmdb_id: 18 },
    { title: 'The Maltese Falcon', year: 1941, slug: 'the-maltese-falcon-1941', tmdb_id: 331 },
    { title: 'Sunset Boulevard', year: 1950, slug: 'sunset-boulevard-1950', tmdb_id: 599 },
  ];

  // Sample episode content to extract people from
  const sampleEpisodeContent = {
    sections: [
      {
        type: 'movies',
        movies: sampleMovies,
      },
    ],
  };

  // Load people data
  useEffect(() => {
    async function loadPeople() {
      try {
        setPeopleLoading(true);
        const people = await extractEpisodePeople(sampleEpisodeContent);
        setEpisodePeople(people);
        console.log('Test people loaded:', getEpisodePeopleSummary(people));
      } catch (error) {
        console.error('Failed to load people:', error);
        setEpisodePeople({ directors: [], actors: [], writers: [], allPeople: [] });
      } finally {
        setPeopleLoading(false);
      }
    }

    loadPeople();
  }, []);

  const processedParts = episodePeople
    ? processEntityLinksForReact(testText, sampleMovies, episodePeople)
    : [testText];

  const analysis = episodePeople
    ? analyzeTextForEntityLinks(testText, sampleMovies, episodePeople)
    : { totalMatches: 0, movieMatches: 0, peopleMatches: 0, matches: [] };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>People Linking Test</h1>
        <p style={styles.subtitle}>Test movie and people entity linking with TMDB credits</p>
      </div>

      <div style={styles.controls}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={enableLinking}
            onChange={e => setEnableLinking(e.target.checked)}
            style={styles.checkbox}
          />
          Enable Entity Linking
        </label>
      </div>

      {peopleLoading && (
        <div style={styles.loading}>Loading TMDB credits for episode movies...</div>
      )}

      <div style={styles.testSection}>
        <h2 style={styles.sectionTitle}>Test Text</h2>
        <textarea
          value={testText}
          onChange={e => setTestText(e.target.value)}
          style={styles.textarea}
          placeholder="Enter text mentioning directors and movies..."
          rows={6}
        />
      </div>

      <div style={styles.resultsGrid}>
        <div style={styles.resultSection}>
          <h3 style={styles.resultTitle}>Original Text</h3>
          <div style={styles.textOutput}>{testText}</div>
        </div>

        <div style={styles.resultSection}>
          <h3 style={styles.resultTitle}>With Entity Linking</h3>
          <div style={styles.textOutput}>
            <LinkedText
              parts={processedParts}
              enableLinking={enableLinking}
              linkStyle={{
                color: 'inherit',
                textDecorationColor: '#d4af37',
                textDecorationThickness: '1px',
                fontWeight: '500',
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
            <span style={styles.statLabel}>Movie Matches:</span>
            <span style={styles.statValue}>{analysis.movieMatches}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>People Matches:</span>
            <span style={styles.statValue}>{analysis.peopleMatches}</span>
          </div>
        </div>

        {analysis.matches.length > 0 && (
          <div style={styles.matchesList}>
            <h4 style={styles.matchesTitle}>Found Matches:</h4>
            {analysis.matches.map((match, index) => (
              <div key={index} style={styles.matchItem}>
                <span style={styles.matchText}>{match.text}</span>
                <span style={styles.matchType}>{match.type}</span>
                <span
                  style={{
                    ...styles.matchStatus,
                    color: match.linked ? '#16a34a' : '#dc2626',
                  }}
                >
                  {match.linked ? '✓ Linked' : '✗ Not found'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {episodePeople && (
        <div style={styles.peopleDataSection}>
          <h3 style={styles.resultTitle}>Episode People Data</h3>

          <div style={styles.peopleCategory}>
            <h4 style={styles.categoryTitle}>Directors ({episodePeople.directors?.length || 0})</h4>
            <div style={styles.peopleGrid}>
              {episodePeople.directors?.map((person, index) => (
                <div key={index} style={styles.personCard}>
                  <div style={styles.personInfo}>
                    <span style={styles.personName}>{person.name}</span>
                    <span style={styles.personMovies}>
                      {person.episodeMovies.map(m => m.title).join(', ')}
                    </span>
                  </div>
                  <span style={styles.personId}>TMDB: {person.tmdb_id}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.peopleCategory}>
            <h4 style={styles.categoryTitle}>Top Cast ({episodePeople.actors?.length || 0})</h4>
            <div style={styles.peopleGrid}>
              {episodePeople.actors?.slice(0, 6).map((person, index) => (
                <div key={index} style={styles.personCard}>
                  <div style={styles.personInfo}>
                    <span style={styles.personName}>{person.name}</span>
                    <span style={styles.personMovies}>
                      {person.episodeMovies
                        .map(m => `${m.title} (${person.character || 'Actor'})`)
                        .join(', ')}
                    </span>
                  </div>
                  <span style={styles.personId}>TMDB: {person.tmdb_id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
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
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
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
    padding: '20px',
    fontSize: '16px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  testSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '30px',
  },
  resultSection: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '15px',
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151',
  },
  textOutput: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    minHeight: '100px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  analysisSection: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  stats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
  },
  matchesList: {
    marginTop: '15px',
  },
  matchesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#374151',
  },
  matchItem: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    marginBottom: '4px',
    alignItems: 'center',
  },
  matchText: {
    fontSize: '14px',
    fontFamily: 'monospace',
    color: '#374151',
  },
  matchType: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  matchStatus: {
    fontSize: '12px',
    fontWeight: '500',
  },
  peopleDataSection: {
    padding: '20px',
    backgroundColor: '#fefdf8',
    borderRadius: '8px',
    border: '1px solid #fbbf24',
  },
  peopleCategory: {
    marginBottom: '20px',
  },
  categoryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151',
  },
  peopleGrid: {
    display: 'grid',
    gap: '8px',
  },
  personCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px solid #f3f4f6',
  },
  personInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  personName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  personMovies: {
    fontSize: '12px',
    color: '#6b7280',
  },
  personId: {
    fontSize: '11px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
};
