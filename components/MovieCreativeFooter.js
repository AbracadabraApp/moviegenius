import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const MovieCreativeFooter = ({ analysis, movie }) => {
  const router = useRouter();
  const [contributors, setContributors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get movie ID from movie prop or router - handle both tmdb_id and id fields
  const movieId = movie?.tmdb_id || movie?.id || router.query.id;
  
  // Fetch contributors using fast contributors_json approach
  useEffect(() => {
    if (!movieId) {
      setLoading(false);
      return;
    }
    
    // Skip API calls if we have static data with keyElements
    if (movie?.staticData && (movie?.keyElements || analysis?.keyElements)) {
      setLoading(false);
      return;
    }
    
    const fetchContributors = async () => {
      try {
        setLoading(true);
        // Use simple contributors API (reliable core tables)
        const response = await fetch('/api/movie-contributors-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch contributors: ${response.status}`);
        }
        
        const data = await response.json();
        setContributors(data.contributors || {});
        
      } catch (err) {
        console.error('Error fetching contributors:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContributors();
  }, [movieId, movie, analysis]);
  
  // Also try to extract keyElements from legacy analysis format as fallback
  let legacyKeyElements = {};
  if (analysis?.claude_response?.raw_content) {
    try {
      const parsedContent = typeof analysis.claude_response.raw_content === 'string' 
        ? JSON.parse(analysis.claude_response.raw_content)
        : analysis.claude_response.raw_content;
      legacyKeyElements = parsedContent.keyElements || {};
    } catch (error) {
      console.warn('Failed to parse legacy analysis content:', error);
    }
  } else if (analysis?.keyElements) {
    legacyKeyElements = analysis.keyElements;
  }
  
  // Combine Railway contributors with legacy keyElements
  const keyElements = {
    // Use Railway contributor data if available (map "star" role to "stars")
    stars: contributors.star || contributors.stars || legacyKeyElements.stars,
    director: contributors.director?.[0] || legacyKeyElements.director,
    writers: contributors.writer || contributors.writers || legacyKeyElements.writers,
    cinematographer: contributors.cinematographer?.[0] || legacyKeyElements.cinematographer,
    composer: contributors.composer?.[0] || legacyKeyElements.composer
  };

  // Handle person click - navigate to person page (only if we have person ID)
  const handlePersonClick = (person) => {
    // Only navigate if we have a valid person ID
    if (typeof person === 'object' && person.personId) {
      router.push(`/person/${person.personId}`);
    }
    // If no person ID, do nothing (names won't be clickable)
  };

  // Show loading state while fetching contributors
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>Loading contributors...</div>
      </div>
    );
  }
  
  // Don't show footer if no contributors and no legacy keyElements
  const hasContributors = contributors && Object.keys(contributors).length > 0;
  const hasKeyElements = keyElements && (
    keyElements.director || 
    (keyElements.writers && keyElements.writers.length > 0) ||
    (keyElements.stars && keyElements.stars.length > 0) ||
    keyElements.cinematographer ||
    keyElements.composer
  );
  
  if (!hasContributors && !hasKeyElements) return null;
  
  // Build display data - prioritize contributors (with person IDs) over legacy keyElements
  const displayData = hasContributors ? {
    stars: contributors.star || [],
    director: contributors.director?.[0] || null,
    writers: contributors.writer || [],
    cinematographer: contributors.cinematographer?.[0] || null,
    composer: contributors.composer?.[0] || null
  } : keyElements;

  return (
    <div style={styles.container}>
      {/* Starring */}
      {displayData.stars && displayData.stars.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Starring: </span>
          {displayData.stars.map((star, index) => {
            const displayName = typeof star === 'string' ? star : star.name || star.legacyName;
            const hasPersonId = typeof star === 'object' && star.personId;
            return (
              <span key={index}>
                <span 
                  className={hasPersonId ? "person-name" : "person-name-no-link"}
                  onClick={hasPersonId ? () => handlePersonClick(star) : undefined}
                  style={hasPersonId ? { cursor: 'pointer' } : { cursor: 'default' }}
                >
                  {displayName}
                </span>
                {index < displayData.stars.length - 1 && ', '}
              </span>
            );
          })}
        </div>
      )}

      {/* Director */}
      {displayData.director && (
        <div style={styles.row}>
          <span style={styles.label}>Director: </span>
          {(() => {
            const hasPersonId = typeof displayData.director === 'object' && displayData.director.personId;
            const displayName = typeof displayData.director === 'string' ? displayData.director : displayData.director.name || displayData.director.legacyName;
            return (
              <span 
                className={hasPersonId ? "person-name" : "person-name-no-link"}
                onClick={hasPersonId ? () => handlePersonClick(displayData.director) : undefined}
                style={hasPersonId ? { cursor: 'pointer' } : { cursor: 'default' }}
              >
                {displayName}
              </span>
            );
          })()}
        </div>
      )}

      {/* Writers */}
      {displayData.writers && displayData.writers.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Written by: </span>
          {displayData.writers.map((writer, index) => {
            const displayName = typeof writer === 'string' ? writer : writer.name || writer.legacyName;
            const hasPersonId = typeof writer === 'object' && writer.personId;
            return (
              <span key={index}>
                <span 
                  className={hasPersonId ? "person-name" : "person-name-no-link"}
                  onClick={hasPersonId ? () => handlePersonClick(writer) : undefined}
                  style={hasPersonId ? { cursor: 'pointer' } : { cursor: 'default' }}
                >
                  {displayName}
                </span>
                {index < displayData.writers.length - 1 && ', '}
              </span>
            );
          })}
        </div>
      )}

      {/* Cinematographer */}
      {displayData.cinematographer && (
        <div style={styles.row}>
          <span style={styles.label}>Cinematographer: </span>
          {(() => {
            const hasPersonId = typeof displayData.cinematographer === 'object' && displayData.cinematographer.personId;
            const displayName = typeof displayData.cinematographer === 'string' ? displayData.cinematographer : displayData.cinematographer.name || displayData.cinematographer.legacyName;
            return (
              <span 
                className={hasPersonId ? "person-name" : "person-name-no-link"}
                onClick={hasPersonId ? () => handlePersonClick(displayData.cinematographer) : undefined}
                style={hasPersonId ? { cursor: 'pointer' } : { cursor: 'default' }}
              >
                {displayName}
              </span>
            );
          })()}
        </div>
      )}

      {/* Composer */}
      {displayData.composer && (
        <div style={styles.row}>
          <span style={styles.label}>Composer: </span>
          {(() => {
            const hasPersonId = typeof displayData.composer === 'object' && displayData.composer.personId;
            const displayName = typeof displayData.composer === 'string' ? displayData.composer : displayData.composer.name || displayData.composer.legacyName;
            return (
              <span 
                className={hasPersonId ? "person-name" : "person-name-no-link"}
                onClick={hasPersonId ? () => handlePersonClick(displayData.composer) : undefined}
                style={hasPersonId ? { cursor: 'pointer' } : { cursor: 'default' }}
              >
                {displayName}
              </span>
            );
          })()}
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

  loadingText: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center',
  },
};

export default MovieCreativeFooter;