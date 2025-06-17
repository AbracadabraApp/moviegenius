/**
 * PersonHeader Component
 * 
 * Large format person header for detail pages with flat design.
 * Similar functionality to PersonCard but with different visual presentation.
 * Follows the same pattern as MovieHeader.
 */
import { Heart, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FavoritesManager } from './FavoritesManager';

export default function PersonHeader({ 
  name, 
  birthYear, 
  deathYear,
  initialBiography, 
  initialProfile, 
  knownForDepartment,
  tmdbId 
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [biography, setBiography] = useState(initialBiography || '');
  const [profile, setProfile] = useState(initialProfile || '/images/placeholder-profile.jpg');

  // Generate person ID from name and birth year
  const personId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${birthYear || 'unknown'}`;
  
  // Person data object for FavoritesManager
  const personData = { name, birthYear, deathYear, biography, profile, id: personId };

  // Update state when props change (navigation between people)
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  useEffect(() => {
    if (initialBiography) {
      setBiography(initialBiography);
    }
  }, [initialBiography]);

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
    <div style={styles.personHeader}>
      <div style={styles.contentRow}>
        <img src={profile} alt={`Profile photo of ${name}`} style={styles.largeProfile} />
        <div style={styles.textContainer}>
          <div style={styles.nameColumn}>
            <div style={styles.name}>{name}</div>
            <div style={styles.years}>{formatYears()}</div>
          </div>
          <div style={styles.biography}>{biography}</div>
        </div>
      </div>
      
      {/* Bottom row: department left, icons right - positioned below profile/text */}
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
  );
}

const styles = {
  personHeader: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px', // Same as PersonCard container padding
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // No shadows, borders, or rounded corners - flat design
  },
  contentRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '12px',
  },
  largeProfile: {
    width: '150px',  // 1.5x larger than PersonCard (100px -> 150px)
    height: '225px', // 1.5x larger than PersonCard (150px -> 225px)
    objectFit: 'cover',
    borderRadius: '12px', // Keep some rounding on the profile itself
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  nameColumn: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '8px',
  },
  name: {
    fontSize: '20px', // Match MovieHeader
    fontWeight: '600', // Match PersonCard name weight
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
    marginBottom: '2px',
  },
  years: {
    fontSize: '20px', // Match MovieHeader
    color: '#666',
    fontWeight: '200', // Lighter than PersonCard for contrast
    fontFamily: 'inherit',
    marginBottom: '8px', // Add space after years like MovieHeader
  },
  biography: {
    fontSize: '16px', // Slightly larger than PersonCard (14px -> 16px)
    color: '#333',
    marginTop: '4px',
    marginBottom: '12px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
  },
  departmentInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: '8px',
  },
  departmentText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit',
    wordWrap: 'break-word',
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