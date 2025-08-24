/**
 * TestMovieCreativeFooter - Simplified copy for testing
 * Shows contributors without database dependencies
 */
import { useRouter } from 'next/router';
import { useState } from 'react';

const TestMovieCreativeFooter = ({ analysis, movie, keyElements = {} }) => {
  const router = useRouter();
  
  // Extract keyElements from analysis if provided
  let extractedKeyElements = keyElements;
  
  if (analysis?.claude_response?.raw_content) {
    try {
      const parsedContent = typeof analysis.claude_response.raw_content === 'string' 
        ? JSON.parse(analysis.claude_response.raw_content)
        : analysis.claude_response.raw_content;
      extractedKeyElements = { ...parsedContent.keyElements, ...keyElements };
    } catch (error) {
      console.warn('Failed to parse analysis content:', error);
    }
  } else if (analysis?.keyElements) {
    extractedKeyElements = { ...analysis.keyElements, ...keyElements };
  }

  // Handle person click - for testing, just log
  const handlePersonClick = (person) => {
    console.log(`🔗 Test: Person clicked: ${person}`);
    // In full system would navigate to /person/[id]
  };

  // Don't show footer if no contributors
  if (!extractedKeyElements || Object.keys(extractedKeyElements).length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Starring */}
      {extractedKeyElements.stars && extractedKeyElements.stars.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Starring: </span>
          {extractedKeyElements.stars.map((star, index) => (
            <span key={index}>
              <span 
                className="person-name-test"
                onClick={() => handlePersonClick(star)}
                style={{ cursor: 'pointer' }}
              >
                {star}
              </span>
              {index < extractedKeyElements.stars.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {/* Director */}
      {extractedKeyElements.director && (
        <div style={styles.row}>
          <span style={styles.label}>Director: </span>
          <span 
            className="person-name-test"
            onClick={() => handlePersonClick(extractedKeyElements.director)}
            style={{ cursor: 'pointer' }}
          >
            {extractedKeyElements.director}
          </span>
        </div>
      )}

      {/* Writers */}
      {extractedKeyElements.writers && extractedKeyElements.writers.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Written by: </span>
          {extractedKeyElements.writers.map((writer, index) => (
            <span key={index}>
              <span 
                className="person-name-test"
                onClick={() => handlePersonClick(writer)}
                style={{ cursor: 'pointer' }}
              >
                {writer}
              </span>
              {index < extractedKeyElements.writers.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {/* Cinematographer */}
      {extractedKeyElements.cinematographer && (
        <div style={styles.row}>
          <span style={styles.label}>Cinematographer: </span>
          <span 
            className="person-name-test"
            onClick={() => handlePersonClick(extractedKeyElements.cinematographer)}
            style={{ cursor: 'pointer' }}
          >
            {extractedKeyElements.cinematographer}
          </span>
        </div>
      )}

      {/* Composer */}
      {extractedKeyElements.composer && (
        <div style={styles.row}>
          <span style={styles.label}>Composer: </span>
          <span 
            className="person-name-test"
            onClick={() => handlePersonClick(extractedKeyElements.composer)}
            style={{ cursor: 'pointer' }}
          >
            {extractedKeyElements.composer}
          </span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginTop: '20px',
    padding: '16px 20px',
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  row: {
    marginBottom: '8px',
  },
  label: {
    color: '#000',
    fontWeight: 'normal',
  },
};

export default TestMovieCreativeFooter;