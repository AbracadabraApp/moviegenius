/**
 * PersonCard Component
 * 
 * Self-contained person card with intelligent data fetching and caching.
 * Handles its own biography data, profile enhancement, and favorites management.
 * Provides consistent functionality across all pages.
 * 
 * @component
 * @example
 * <PersonCard 
 *   name="Orson Welles" 
 *   birthYear={1915} 
 *   deathYear={1985}
 *   initialBiography="Legendary filmmaker and actor" 
 *   initialProfile="/images/orson-welles.jpg" 
 * />
 */
import { Heart, Bookmark } from 'lucide-react';
import React, { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/router';
import { FavoritesManager } from './FavoritesManager';

/**
 * PersonCard - Self-contained interactive person card component
 * 
 * @param {Object} props
 * @param {string} props.name - Person name (required)
 * @param {number} props.birthYear - Birth year (optional)
 * @param {number} props.deathYear - Death year (optional) 
 * @param {string} props.initialBiography - Initial biography/description (optional)
 * @param {string} props.initialProfile - Initial profile image URL (optional)
 * @param {string} props.knownForDepartment - Known for department like "Directing" (optional)
 * @param {boolean} props.isDetailPage - Whether this is on a detail page (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (optional)
 */
function PersonCard({ 
  name, 
  birthYear, 
  deathYear,
  initialBiography, 
  initialProfile, 
  knownForDepartment,
  isDetailPage = false,
  tmdbId 
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [biography, setBiography] = useState(initialBiography || '');
  const [profile, setProfile] = useState(initialProfile || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjkwIiByPSIzNSIgZmlsbD0iI0Q5RDE5OSIvPgo8ZWxsaXBzZSBjeD0iMTAwIiBjeT0iMjEwIiByeD0iNzAiIHJ5PSI0NSIgZmlsbD0iI0Q5RDE5OSIvPgo8L3N2Zz4K');
  const [personTmdbId, setPersonTmdbId] = useState(tmdbId);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const router = useRouter();

  // Update profile when initialProfile prop changes (navigation between people)
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  // Update tmdbId when prop changes
  useEffect(() => {
    setPersonTmdbId(tmdbId);
  }, [tmdbId]);

  // Update biography when initialBiography prop changes
  useEffect(() => {
    if (initialBiography) {
      setBiography(initialBiography);
    }
  }, [initialBiography]);

  // Generate person ID from name and birth year
  const personId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${birthYear || 'unknown'}`;
  
  // Person data object for FavoritesManager
  const personData = { name, birthYear, deathYear, biography, profile, id: personId };

  // Enhanced data fetching for missing biography or profile
  useEffect(() => {
    const enhancePersonData = async () => {
      // Skip if we have both biography and profile, or if already enhancing
      if ((biography && biography !== '') && profile !== '/images/placeholder-profile.jpg') {
        return;
      }
      
      if (isEnhancing) return;
      setIsEnhancing(true);
      
      try {
        let newBiography = biography;
        let newProfile = profile;
        
        // Fetch enhanced data if biography is missing
        if (!biography || biography === '') {
          // Fetching enhanced biography
          const response = await fetch('/api/enhance-person-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, birthYear, needsBiography: true, needsProfile: false })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.biography) {
              newBiography = data.biography;
              setBiography(data.biography);
            }
          }
        }
        
        // Fetch TMDB profile if using placeholder
        if (profile.startsWith('data:image/svg+xml')) {
          // Fetching TMDB profile
          const response = await fetch('/api/tmdb-person-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, birthYear })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.profile) {
              newProfile = data.profile;
              setProfile(data.profile);
            }
          }
        }
        
        // Cache the enhanced data back to database if we got new data
        if ((newBiography !== biography && newBiography) || (newProfile !== profile && !newProfile.startsWith('data:image/svg+xml'))) {
          try {
            await fetch('/api/cache-person-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                name, 
                birthYear,
                deathYear,
                biography: newBiography, 
                profile: newProfile,
                knownForDepartment
              })
            });
            // Cached enhanced data
          } catch (cacheError) {
            console.warn('Failed to cache enhanced data:', cacheError);
            // Don't fail the whole operation if caching fails
          }
        }
        
      } catch (error) {
        console.error('Error enhancing person data:', error);
      } finally {
        setIsEnhancing(false);
      }
    };
    
    enhancePersonData();
  }, [name, birthYear, biography, profile, isEnhancing]);

  // Load initial state from localStorage
  useEffect(() => {
    setHearted(FavoritesManager.isPersonHearted(personId));
    setBookmarked(FavoritesManager.isPersonBookmarked(personId));
  }, [personId]);

  // Listen for favorites updates from other components
  useEffect(() => {
    const handlePeopleUpdate = () => {
      setHearted(FavoritesManager.isPersonHearted(personId));
      setBookmarked(FavoritesManager.isPersonBookmarked(personId));
    };

    window.addEventListener('peopleUpdated', handlePeopleUpdate);
    return () => window.removeEventListener('peopleUpdated', handlePeopleUpdate);
  }, [personId]);

  const handleCardClick = (e) => {
    // Prevent default behavior and stop propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Don't navigate if clicking on action buttons or if this is a detail page
    if (e.target.closest('button') || isDetailPage) return;
    
    // Navigate to person detail page using TMDB ID
    if (personTmdbId) {
      router.push(`/person/${personTmdbId}`);
    } else {
      console.error('PersonCard: Missing TMDB ID for person navigation');
    }
  };

  // Format years display
  const formatYears = () => {
    if (birthYear && deathYear) {
      return `(${birthYear}–${deathYear})`;
    } else if (birthYear) {
      return `(b. ${birthYear})`;
    }
    return '';
  };

  return (
    <article
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <img src={profile} alt={`Profile photo of ${name}`} style={styles.profile} />
      <div style={styles.textContainer}>
        <div style={styles.header}>
          <div style={styles.name}>{name}</div>
          <div style={styles.years}>{formatYears()}</div>
        </div>
        <div style={styles.biography}>{biography}</div>
        
        {/* Bottom row: department left, icons right */}
        <div style={styles.bottomRow}>
          <div style={styles.departmentInfo}>
            {knownForDepartment && (
              <span style={styles.departmentText}>
                {knownForDepartment}
              </span>
            )}
          </div>
          <div style={styles.iconRow}>
          <button
            onClick={() => {
              const newState = FavoritesManager.togglePersonHeart(personData);
              setHearted(newState);
            }}
            style={styles.iconButton}
            aria-label={hearted ? 'Remove from favorites' : 'Add to favorites'}
            role="button"
          >
            <Heart
              size={18}
              color={hearted ? '#ef4444' : '#374151'}
              fill={hearted ? '#ef4444' : 'none'}
            />
          </button>
          <button
            onClick={() => {
              const newState = FavoritesManager.togglePersonBookmark(personData);
              setBookmarked(newState);
            }}
            style={styles.iconButton}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark person'}
            role="button"
          >
            <Bookmark
              size={18}
              color={bookmarked ? '#6b7280' : '#374151'}
              fill={bookmarked ? '#6b7280' : 'none'}
            />
          </button>
          </div>
        </div>
      </div>
    </article>
  );
}

const styles = {
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.20)',
    padding: '12px',
    backgroundColor: 'white',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '100%', // Prevent expansion beyond container
    boxSizing: 'border-box', // Include padding in width calculation
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    cursor: 'pointer',
    marginBottom: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  profile: {
    width: '100px',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginRight: '12px',
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '150px', // Same height as MediaCard
    position: 'relative',
    minWidth: 0, // Allow flex child to shrink below content size
    overflow: 'hidden', // Prevent text overflow
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
    fontSize: '18px',
    lineHeight: '1.2',
    fontFamily: 'inherit',
  },
  name: {
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
  },
  years: {
    color: '#666',
    fontWeight: 'normal',
    fontFamily: 'inherit',
  },
  biography: {
    fontSize: '14px',
    color: '#333',
    marginTop: '4px',
    fontFamily: 'inherit',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto', // Pushes to bottom of flex container
    paddingTop: '8px',
  },
  departmentInfo: {
    flex: 1,
    minWidth: 0, // Allow shrinking
    marginRight: '8px', // Space before icons
  },
  departmentText: {
    fontSize: '14px',
    color: '#6b7280', // Mid grey
    fontWeight: '300', // Light weight
    fontFamily: 'inherit',
    wordWrap: 'break-word', // Wrap long department names
    lineHeight: '1.3',
  },
  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'center',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
};

/**
 * Custom prop comparison for PersonCard memoization
 * Only re-render if person data actually changes
 */
const arePropsEqual = (prevProps, nextProps) => {
  return prevProps.name === nextProps.name &&
         prevProps.birthYear === nextProps.birthYear &&
         prevProps.deathYear === nextProps.deathYear &&
         prevProps.initialBiography === nextProps.initialBiography &&
         prevProps.initialProfile === nextProps.initialProfile &&
         prevProps.knownForDepartment === nextProps.knownForDepartment &&
         prevProps.tmdbId === nextProps.tmdbId &&
         prevProps.isDetailPage === nextProps.isDetailPage;
};

// Export memoized component
export default memo(PersonCard, arePropsEqual);