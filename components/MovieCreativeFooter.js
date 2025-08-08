import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const MovieCreativeFooter = ({ analysis, movie }) => {
  const router = useRouter();
  const [contributors, setContributors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get movie ID from movie prop or router
  const movieId = movie?.tmdb_id || router.query.id;
  
  // Fetch contributors from Railway database
  useEffect(() => {
    if (!movieId) {
      setLoading(false);
      return;
    }
    
    const fetchContributors = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/movie-contributors', {
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
  }, [movieId]);
  
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

  // Handle person click - navigate to person page
  const handlePersonClick = (person) => {
    // If person is an object with personId, use ID-based system
    if (typeof person === 'object' && person.personId) {
      router.push(`/person/${person.personId}`);
    } else {
      // Fallback to name-based system for legacy data
      const personName = typeof person === 'string' ? person : person.name || person;
      const nameSlug = personName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      router.push(`/person/${nameSlug}`);
    }
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
  if (!hasContributors && Object.keys(keyElements).length === 0) return null;
  
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
            return (
              <span key={index}>
                <span 
                  className="person-name"
                  onClick={() => handlePersonClick(star)}
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
          <span 
            className="person-name"
            onClick={() => handlePersonClick(displayData.director)}
          >
            {typeof displayData.director === 'string' ? displayData.director : displayData.director.name || displayData.director.legacyName}
          </span>
        </div>
      )}

      {/* Writers */}
      {displayData.writers && displayData.writers.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Written by: </span>
          {displayData.writers.map((writer, index) => {
            const displayName = typeof writer === 'string' ? writer : writer.name || writer.legacyName;
            return (
              <span key={index}>
                <span 
                  className="person-name"
                  onClick={() => handlePersonClick(writer)}
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
          <span 
            className="person-name"
            onClick={() => handlePersonClick(displayData.cinematographer)}
          >
            {typeof displayData.cinematographer === 'string' ? displayData.cinematographer : displayData.cinematographer.name || displayData.cinematographer.legacyName}
          </span>
        </div>
      )}

      {/* Composer */}
      {displayData.composer && (
        <div style={styles.row}>
          <span style={styles.label}>Composer: </span>
          <span 
            className="person-name"
            onClick={() => handlePersonClick(displayData.composer)}
          >
            {typeof displayData.composer === 'string' ? displayData.composer : displayData.composer.name || displayData.composer.legacyName}
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

  loadingText: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center',
  },
};

export default MovieCreativeFooter;