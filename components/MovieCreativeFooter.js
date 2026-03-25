import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const MovieCreativeFooter = ({ analysis, movie }) => {
  const router = useRouter();
  const [contributors, setContributors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Get movie ID from movie prop or router - handle both tmdb_id and id fields
  const movieId = movie?.tmdb_id || movie?.id || router.query.id;

  // Fetch contributors only when expanded — no point loading until user asks
  useEffect(() => {
    if (!expanded || !movieId) return;
    if (Object.keys(contributors).length > 0) return; // already fetched

    // Skip API calls if we have static data with keyElements
    if (movie?.staticData && (movie?.keyElements || analysis?.keyElements)) {
      setLoading(false);
      return;
    }

    const fetchContributors = async () => {
      try {
        setLoading(true);
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
  }, [expanded, movieId]);
  
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

  // Render nothing while loading — contributors appear when ready
  if (loading) return null;
  
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

  const renderNames = (people) => {
    if (!people) return null;
    const arr = Array.isArray(people) ? people : [people];
    return arr.map((person, index) => {
      const displayName = typeof person === 'string' ? person : person.name || person.legacyName;
      const hasPersonId = typeof person === 'object' && person.personId;
      return (
        <span key={index}>
          <span
            className={hasPersonId ? 'person-name' : 'person-name-no-link'}
            onClick={hasPersonId ? () => handlePersonClick(person) : undefined}
            style={hasPersonId ? { cursor: 'pointer' } : { cursor: 'default' }}
          >
            {displayName}
          </span>
          {index < arr.length - 1 && ', '}
        </span>
      );
    });
  };

  const rows = [
    { label: 'Starring', value: displayData.stars?.length > 0 ? displayData.stars : null },
    { label: 'Director', value: displayData.director || null },
    { label: 'Written by', value: displayData.writers?.length > 0 ? displayData.writers : null },
    { label: 'Cinematographer', value: displayData.cinematographer || null },
    { label: 'Composer', value: displayData.composer || null },
  ].filter(r => r.value);

  return (
    <div style={styles.container}>
      <button style={styles.revealButton} onClick={() => setExpanded(e => !e)}>
        Cast & Crew {expanded ? '↑' : '↓'}
      </button>
      {expanded && (
        <div style={styles.grid}>
          {rows.map(({ label, value }) => (
            <div key={label} style={styles.gridRow}>
              <span style={styles.label}>{label}</span>
              <span style={styles.names}>{renderNames(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginTop: '4px',
    padding: '4px 20px 8px',
    fontSize: 'var(--font-sm)',
    lineHeight: '1.6',
    color: '#374151',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  revealButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-sm)',
    color: '#6b7280',
    fontWeight: '500',
    padding: '0',
    marginBottom: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr',
    gap: '6px 12px',
  },

  gridRow: {
    display: 'contents',
  },

  label: {
    color: '#9ca3af',
    fontWeight: '400',
    fontSize: 'var(--font-sm)',
    alignSelf: 'baseline',
  },

  names: {
    color: '#374151',
    fontWeight: '500',
  },

  loadingText: {
    color: '#6b7280',
    fontSize: 'var(--font-sm)',
    textAlign: 'center',
  },
};

export default MovieCreativeFooter;