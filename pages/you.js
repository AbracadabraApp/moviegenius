// pages/you.js - Apple-inspired minimal You page design
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import CinematicProfile from '../components/CinematicProfile';
import ThemeFooter from '../components/ThemeFooter';
import { Check, Plus, Film, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { colors, spacing, typography, borderRadius, shadows, components } from '../lib/design-tokens';

export default function YouPage() {
  const router = useRouter();
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [activeProfileType, setActiveProfileType] = useState('cinematic-dna');

  // Load data from localStorage
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedHearted = localStorage.getItem('heartedMovies');
        const storedBookmarked = localStorage.getItem('bookmarkedMovies');
        const storedPlatforms = localStorage.getItem('selectedPlatforms');

        if (storedHearted) setHeartedMovies(JSON.parse(storedHearted));
        if (storedBookmarked) setBookmarkedMovies(JSON.parse(storedBookmarked));
        if (storedPlatforms) setSelectedPlatforms(JSON.parse(storedPlatforms));
      } catch (error) {
        console.error('Error loading stored data:', error);
      }
    };

    loadStoredData();
    
    // Listen for storage changes from other components
    const handleStorageChange = () => loadStoredData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const totalMovies = heartedMovies.length + bookmarkedMovies.length;
  const hasContent = totalMovies > 0;

  const navigateToCollection = (type) => {
    if (type === 'hearted' || type === 'bookmarked') {
      // Route to movies page where users can browse/search
      router.push('/movies');
    } else {
      router.push('/you'); // Safe fallback
    }
  };

  const navigateToDiscovery = () => {
    // Use existing genius page for discovery
    router.push('/genius');
  };

  // Render cinematic profile section
  const renderCinematicProfileSection = () => {
    if (!hasContent) {
      return (
        <div style={{
          textAlign: 'center',
          padding: spacing[8],
          color: colors.gray[500],
          marginBottom: spacing[6],
        }}>
          <Film size={48} color={colors.gray[300]} style={{ margin: '0 auto 16px' }} />
          <p style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.medium,
            margin: 0,
            marginBottom: spacing[2],
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            Start building your profile
          </p>
          <p style={{
            fontSize: typography.fontSize.sm,
            margin: 0,
            lineHeight: typography.lineHeight.relaxed,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            Mark movies as seen to discover your cinematic DNA
          </p>
        </div>
      );
    }

    return (
      <div style={{
        marginBottom: spacing[6],
      }}>
        {/* Header with profile and seen count - no box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[4],
          padding: `0 ${spacing[4]}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              flexWrap: 'nowrap',
            }}>
              <Check size={16} color={components.youPage.goldAccent} strokeWidth={2.5} />
              <span style={{
                fontSize: typography.fontSize.sm,
                color: colors.gray[600],
                fontFamily: 'system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
              }}>
                based on
              </span>
              <button
                onClick={() => router.push('/movies')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  color: components.youPage.goldAccent,
                  fontWeight: typography.fontWeight.medium,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                {heartedMovies.length} films
              </button>
              <button
                onClick={() => router.push('/essential-movies')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  color: components.youPage.goldAccent,
                  fontWeight: typography.fontWeight.medium,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                (add more)
              </button>
            </div>
          </div>
        </div>

        {/* Cinematic Profile - Gold highlight box */}
        <div style={{
          backgroundColor: colors.gold[100],
          borderRadius: borderRadius.md,
          padding: spacing[4],
          border: `1px solid ${colors.gold[200]}`,
          margin: `0 ${spacing[4]}`,
        }}>
          <CinematicProfile 
            userData={{
              heartedMovies,
              bookmarkedMovies,
              selectedPlatforms
            }}
            profileType={activeProfileType}
            minimal={true}
          />
        </div>
      </div>
    );
  };

  // Render watchlist section (primary content)
  const renderWatchlistSection = () => {
    if (bookmarkedMovies.length === 0) {
      return (
        <div style={{
          marginBottom: spacing[6],
          textAlign: 'center',
          padding: spacing[6],
        }}>
          <h2 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.gray[900],
            margin: 0,
            marginBottom: spacing[4],
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: `0 ${spacing[4]}`,
          }}>
            Movies to Watch
          </h2>
          <div style={{
            height: '2px',
            backgroundColor: colors.gold[300],
            marginBottom: spacing[4],
          }} />
          <Plus size={48} color={colors.gray[300]} style={{ margin: '0 auto 16px' }} />
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.gray[600],
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            Add movies to your watchlist to see them here
          </p>
        </div>
      );
    }

    return (
      <div style={{
        marginBottom: spacing[6],
      }}>
        <h2 style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.gray[900],
          margin: 0,
          marginBottom: spacing[4],
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: `0 ${spacing[4]}`,
        }}>
          Movies to Watch
        </h2>
        
        <div style={{
          height: '2px',
          backgroundColor: colors.gold[300],
          marginBottom: spacing[4],
        }} />
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[4],
          padding: `0 ${spacing[4]}`,
        }}>
          {bookmarkedMovies.slice(0, 4).map((movie) => (
            <div key={`${movie.tmdb_id || movie.id}-watchlist`} style={{
              aspectRatio: '2/3',
              borderRadius: borderRadius.md,
              overflow: 'hidden',
              backgroundColor: colors.gray[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {movie.poster ? (
                <img 
                  src={movie.poster} 
                  alt={movie.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Film size={32} color={colors.gray[400]} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render suggestions section (from mockup)
  const renderSuggestionsSection = () => {
    // Mock suggestions data - in real app this would come from API
    const suggestions = [
      { title: 'Consider', movie: 'The Great Escape', year: '1956', status: 'Seen' },
      { title: 'Enjoy', movie: 'National Treasure', year: '1995', status: 'Seen' },
      { title: 'Go Deep', movie: 'Blue', year: '1990', status: 'Seen' },
    ];

    return (
      <div style={{
        marginBottom: spacing[6],
      }}>
        <h2 style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.gray[900],
          margin: 0,
          marginBottom: spacing[4],
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: `0 ${spacing[4]}`,
        }}>
          Suggestions
        </h2>
        
        <div style={{
          height: '2px',
          backgroundColor: colors.gold[300],
          marginBottom: spacing[4],
        }} />
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[3],
          padding: `0 ${spacing[4]}`,
        }}>
          {suggestions.map((suggestion, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing[2],
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
              }}>
                <Check size={16} color={components.youPage.goldAccent} strokeWidth={2.5} />
                <span style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.gray[900],
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  {suggestion.title}:
                </span>
                <span className="movie-title" style={{
                  fontSize: typography.fontSize.sm,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  {suggestion.movie} ({suggestion.year})
                </span>
              </div>
              <span style={{
                fontSize: typography.fontSize.xs,
                color: colors.gray[500],
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {suggestion.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render discovery section
  const renderDiscoverySection = () => (
    <div style={{
      marginBottom: spacing[6],
    }}>
      <h2 style={{
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.gray[900],
        margin: 0,
        marginBottom: spacing[4],
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: `0 ${spacing[4]}`,
      }}>
        Discover More
      </h2>
      
      <div style={{
        height: '2px',
        backgroundColor: colors.gold[300],
        marginBottom: spacing[4],
      }} />
      
      <ThemeFooter />
    </div>
  );

  return (
    <PhoneFrame>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        paddingBottom: '100px',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: `1px solid ${colors.border}`,
          padding: spacing[4],
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Main Content */}
        <div style={{
          padding: spacing[4],
          paddingTop: spacing[6],
        }}>
          {renderCinematicProfileSection()}
          {renderWatchlistSection()}
          {renderSuggestionsSection()}
          {renderDiscoverySection()}
        </div>
      </div>
    </PhoneFrame>
  );
}