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
  const handlePersonClick = (personName) => {
    // Convert person name to URL slug
    const nameSlug = personName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    router.push(`/person/${nameSlug}`);
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
  if (Object.keys(keyElements).length === 0) return null;

  return (
    <div style={styles.container}>
      {/* Starring */}
      {keyElements.stars && keyElements.stars.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Starring: </span>
          {keyElements.stars.map((star, index) => (
            <span key={index}>
              <span 
                className="person-name"
                onClick={() => handlePersonClick(star)}
              >
                {star}
              </span>
              {index < keyElements.stars.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {/* Director */}
      {keyElements.director && (
        <div style={styles.row}>
          <span style={styles.label}>Director: </span>
          <span 
            className="person-name"
            onClick={() => handlePersonClick(keyElements.director)}
          >
            {keyElements.director}
          </span>
        </div>
      )}

      {/* Writers */}
      {keyElements.writers && keyElements.writers.length > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Written by: </span>
          {keyElements.writers.map((writer, index) => (
            <span key={index}>
              <span 
                className="person-name"
                onClick={() => handlePersonClick(writer)}
              >
                {writer}
              </span>
              {index < keyElements.writers.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {/* Cinematographer */}
      {keyElements.cinematographer && (
        <div style={styles.row}>
          <span style={styles.label}>Cinematographer: </span>
          <span 
            className="person-name"
            onClick={() => handlePersonClick(keyElements.cinematographer)}
          >
            {keyElements.cinematographer}
          </span>
        </div>
      )}

      {/* Composer */}
      {keyElements.composer && (
        <div style={styles.row}>
          <span style={styles.label}>Composer: </span>
          <span 
            className="person-name"
            onClick={() => handlePersonClick(keyElements.composer)}
          >
            {keyElements.composer}
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