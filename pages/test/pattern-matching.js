// pages/test/pattern-matching.js
import { useState } from 'react';

export default function PatternMatchingTest() {
  const [testText, setTestText] = useState(`Here are various movie mention patterns to test:

Quoted with year: "The Cabinet of Dr. Caligari" (1920) was groundbreaking.
Quoted without year: "Citizen Kane" is often cited as the greatest film.
Unquoted with year: The Godfather (1972) redefined crime cinema.
Possessive quoted: Hitchcock's "Vertigo" (1958) explores obsession.
Multiple in sentence: Both "Casablanca" (1942) and "The Maltese Falcon" (1941) starred Bogart.
Wrong format: The movie "Inception" from 2010 was innovative.
Parentheses only: Metropolis (1927) influenced science fiction.
Just title: Citizen Kane changed cinema forever.`);

  const patterns = [
    {
      name: 'Conservative: "Title" (Year)',
      regex: /"([^"]+)"\s*\((\d{4})\)/g,
      description: 'Only matches quoted titles with years in parentheses',
      conservative: true
    },
    {
      name: 'Moderate: "Title" or Title (Year)',
      regex: /(?:"([^"]+)"|([A-Z][^.!?]*?))\s*\((\d{4})\)/g,
      description: 'Matches quoted titles with years OR unquoted titles with years',
      conservative: false
    },
    {
      name: 'Aggressive: "Title" anywhere',
      regex: /"([^"]+)"/g,
      description: 'Matches any quoted text (high false positive risk)',
      conservative: false
    },
    {
      name: 'Title (Year) unquoted',
      regex: /\b([A-Z][A-Za-z\s&:.'-]{2,})\s*\((\d{4})\)/g,
      description: 'Matches unquoted titles with years (moderate false positive risk)',
      conservative: false
    }
  ];

  const [selectedPattern, setSelectedPattern] = useState(0);

  const testPattern = (patternIndex) => {
    const pattern = patterns[patternIndex];
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    const matches = [];
    let match;

    while ((match = regex.exec(testText)) !== null) {
      matches.push({
        fullMatch: match[0],
        groups: match.slice(1),
        index: match.index
      });
    }

    return matches;
  };

  const currentMatches = testPattern(selectedPattern);
  const currentPattern = patterns[selectedPattern];

  const highlightMatches = (text, matches) => {
    if (matches.length === 0) return text;

    let result = '';
    let lastIndex = 0;

    // Sort matches by index to process in order
    const sortedMatches = [...matches].sort((a, b) => a.index - b.index);

    sortedMatches.forEach((match, i) => {
      // Add text before this match
      result += text.slice(lastIndex, match.index);
      
      // Add highlighted match
      result += `<mark style="background-color: #fef3c7; padding: 2px 4px; border-radius: 3px;">${match.fullMatch}</mark>`;
      
      lastIndex = match.index + match.fullMatch.length;
    });

    // Add remaining text
    result += text.slice(lastIndex);

    return result;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Pattern Matching Analysis</h1>
        <p style={styles.subtitle}>Compare different regex patterns for entity detection</p>
      </div>

      <div style={styles.testSection}>
        <h2 style={styles.sectionTitle}>Test Text</h2>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          style={styles.textarea}
          rows={10}
          placeholder="Enter text with various movie mention patterns..."
        />
      </div>

      <div style={styles.patternsSection}>
        <h2 style={styles.sectionTitle}>Pattern Selection</h2>
        <div style={styles.patternGrid}>
          {patterns.map((pattern, index) => (
            <div
              key={index}
              style={{
                ...styles.patternCard,
                ...(selectedPattern === index ? styles.patternCardSelected : {}),
                ...(pattern.conservative ? styles.patternCardConservative : styles.patternCardRisky)
              }}
              onClick={() => setSelectedPattern(index)}
            >
              <div style={styles.patternHeader}>
                <h3 style={styles.patternName}>{pattern.name}</h3>
                <span style={{
                  ...styles.patternBadge,
                  backgroundColor: pattern.conservative ? '#dcfce7' : '#fef2f2',
                  color: pattern.conservative ? '#166534' : '#dc2626'
                }}>
                  {pattern.conservative ? 'Conservative' : 'Risky'}
                </span>
              </div>
              <p style={styles.patternDescription}>{pattern.description}</p>
              <code style={styles.patternRegex}>{pattern.regex.source}</code>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.resultsSection}>
        <h2 style={styles.sectionTitle}>Results for: {currentPattern.name}</h2>
        
        <div style={styles.statsBar}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Matches Found:</span>
            <span style={styles.statValue}>{currentMatches.length}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Pattern Safety:</span>
            <span style={{
              ...styles.statValue,
              color: currentPattern.conservative ? '#16a34a' : '#dc2626'
            }}>
              {currentPattern.conservative ? 'Conservative' : 'Risky'}
            </span>
          </div>
        </div>

        <div style={styles.highlightedText}>
          <h3 style={styles.resultTitle}>Highlighted Matches</h3>
          <div 
            style={styles.textDisplay}
            dangerouslySetInnerHTML={{
              __html: highlightMatches(testText, currentMatches)
            }}
          />
        </div>

        {currentMatches.length > 0 && (
          <div style={styles.matchesList}>
            <h3 style={styles.resultTitle}>Match Details</h3>
            <div style={styles.matchesTable}>
              <div style={styles.tableHeader}>
                <span style={styles.tableCell}>Match</span>
                <span style={styles.tableCell}>Groups</span>
                <span style={styles.tableCell}>Position</span>
                <span style={styles.tableCell}>Assessment</span>
              </div>
              {currentMatches.map((match, index) => (
                <div key={index} style={styles.tableRow}>
                  <span style={styles.tableCell}>
                    <code>{match.fullMatch}</code>
                  </span>
                  <span style={styles.tableCell}>
                    {match.groups.filter(g => g).map((group, i) => (
                      <code key={i} style={styles.groupCode}>{group}</code>
                    ))}
                  </span>
                  <span style={styles.tableCell}>{match.index}</span>
                  <span style={styles.tableCell}>
                    <span style={{
                      ...styles.assessmentBadge,
                      backgroundColor: assessMatch(match.fullMatch).color,
                      color: '#ffffff'
                    }}>
                      {assessMatch(match.fullMatch).label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={styles.recommendationSection}>
        <h2 style={styles.sectionTitle}>Recommendation</h2>
        <div style={styles.recommendation}>
          {currentPattern.conservative ? (
            <div style={styles.goodRecommendation}>
              <strong>✅ Recommended for production</strong>
              <p>This conservative pattern minimizes false positives and should work well for Genius episodes.</p>
            </div>
          ) : (
            <div style={styles.cautionRecommendation}>
              <strong>⚠️ Use with caution</strong>
              <p>This pattern may generate false positives. Consider additional validation or user testing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to assess match quality
function assessMatch(match) {
  // Simple heuristics for demonstration
  if (match.includes('"') && match.includes('(') && /\(\d{4}\)/.test(match)) {
    return { label: 'High Confidence', color: '#16a34a' };
  } else if (match.includes('"')) {
    return { label: 'Medium Confidence', color: '#ca8a04' };
  } else {
    return { label: 'Low Confidence', color: '#dc2626' };
  }
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
  testSection: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#374151'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical'
  },
  patternsSection: {
    marginBottom: '30px'
  },
  patternGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  patternCard: {
    padding: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  patternCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  patternCardConservative: {
    borderLeftWidth: '4px',
    borderLeftColor: '#16a34a'
  },
  patternCardRisky: {
    borderLeftWidth: '4px',
    borderLeftColor: '#dc2626'
  },
  patternHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  patternName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
    color: '#374151'
  },
  patternBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  patternDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '10px'
  },
  patternRegex: {
    display: 'block',
    padding: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  resultsSection: {
    marginBottom: '30px'
  },
  statsBar: {
    display: 'flex',
    gap: '30px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  stat: {
    display: 'flex',
    flexDirection: 'column'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827'
  },
  highlightedText: {
    marginBottom: '25px'
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#374151'
  },
  textDisplay: {
    padding: '15px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: 'Georgia, serif',
    whiteSpace: 'pre-wrap'
  },
  matchesList: {
    marginBottom: '20px'
  },
  matchesTable: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr 1fr',
    backgroundColor: '#f9fafb',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr 1fr',
    borderTop: '1px solid #f3f4f6'
  },
  tableCell: {
    padding: '12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  groupCode: {
    padding: '2px 4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    fontSize: '11px'
  },
  assessmentBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  recommendationSection: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  recommendation: {
    fontSize: '14px'
  },
  goodRecommendation: {
    color: '#166534'
  },
  cautionRecommendation: {
    color: '#dc2626'
  }
};