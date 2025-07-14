// pages/you-minimal.js - Apple-inspired minimal You page design
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import CinematicProfile from '../components/CinematicProfile';
import { Heart, Bookmark, Film, RotateCcw, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { colors, spacing, typography, borderRadius, shadows, components } from '../lib/design-tokens';

export default function YouMinimalPage() {
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

  const refreshProfile = () => {
    // Force a new profile generation
    window.dispatchEvent(new CustomEvent('refresh-cinematic-profile'));
  };

  const navigateToCollection = (type) => {
    if (type === 'hearted' || type === 'bookmarked') {
      // Route to movies page where users can browse/search
      window.location.href = '/movies';
    } else {
      window.location.href = '/you'; // Safe fallback
    }
  };

  const navigateToDiscovery = () => {
    // Use existing genius page for discovery
    window.location.href = '/genius';
  };

  const navigateToSettings = () => {
    // Disable for now - no settings page yet
    console.log('Settings navigation disabled - page not implemented yet');
  };

  // Render main profile section
  const renderProfileSection = () => (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing[6],
      marginBottom: spacing[6],
      boxShadow: shadows.sm,
      border: `1px solid ${colors.border}`,
    }}>
      {/* Profile Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[6],
      }}>
        <div>
          <h1 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.gray[900],
            margin: 0,
            marginBottom: spacing[1],
          }}>
            Your Cinematic Profile
          </h1>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.gray[600],
            margin: 0,
          }}>
            Discover your unique film taste
          </p>
        </div>
        <button
          onClick={refreshProfile}
          style={{
            padding: spacing[2],
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.md,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = colors.gray[50];
            e.target.style.borderColor = components.youPage.goldAccent;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = colors.border;
          }}
        >
          <RotateCcw size={16} color={colors.gray[600]} />
        </button>
      </div>

      {/* Cinematic Profile Component */}
      {hasContent ? (
        <CinematicProfile 
          userData={{
            heartedMovies,
            bookmarkedMovies,
            selectedPlatforms
          }}
          profileType={activeProfileType}
          minimal={true}
        />
      ) : (
        <div style={{
          textAlign: 'center',
          padding: spacing[8],
          color: colors.gray[500],
        }}>
          <Film size={components.youPage.emptyStateIconSize} style={{ margin: '0 auto 16px' }} />
          <p style={{
            fontSize: typography.fontSize.base,
            margin: 0,
            marginBottom: spacing[4],
          }}>
            Start building your profile
          </p>
          <p style={{
            fontSize: typography.fontSize.sm,
            margin: 0,
            lineHeight: typography.lineHeight.relaxed,
          }}>
            Heart movies you love to discover your cinematic DNA
          </p>
        </div>
      )}
    </div>
  );

  // Render collection overview
  const renderCollectionOverview = () => (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing[5],
      marginBottom: spacing[6],
      boxShadow: shadows.sm,
      border: `1px solid ${colors.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[4],
      }}>
        <h2 style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.gray[900],
          margin: 0,
        }}>
          Your Collection
        </h2>
        {hasContent && (
          <button
            onClick={() => navigateToCollection('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `${spacing[1]} ${spacing[2]}`,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              color: components.youPage.goldAccent,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            View All
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {hasContent ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[4],
        }}>
          {/* Hearted Movies */}
          <button
            onClick={() => navigateToCollection('hearted')}
            style={{
              padding: spacing[4],
              backgroundColor: colors.gray[50],
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.gold[50];
              e.target.style.borderColor = components.youPage.goldAccent;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.gray[50];
              e.target.style.borderColor = colors.border;
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              marginBottom: spacing[2],
            }}>
              <Heart size={20} color={components.youPage.goldAccent} fill={components.youPage.goldAccent} />
              <span style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
                color: colors.gray[900],
              }}>
                Favorites
              </span>
            </div>
            <p style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.gray[900],
              margin: 0,
            }}>
              {heartedMovies.length}
            </p>
          </button>

          {/* Bookmarked Movies */}
          <button
            onClick={() => navigateToCollection('bookmarked')}
            style={{
              padding: spacing[4],
              backgroundColor: colors.gray[50],
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.gold[50];
              e.target.style.borderColor = components.youPage.goldAccent;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.gray[50];
              e.target.style.borderColor = colors.border;
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              marginBottom: spacing[2],
            }}>
              <Bookmark size={20} color={colors.gray[600]} />
              <span style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
                color: colors.gray[900],
              }}>
                Watchlist
              </span>
            </div>
            <p style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.gray[900],
              margin: 0,
            }}>
              {bookmarkedMovies.length}
            </p>
          </button>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: spacing[6],
          color: colors.gray[500],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: spacing[4],
            marginBottom: spacing[4],
          }}>
            <Heart size={32} color={colors.gray[300]} />
            <Bookmark size={32} color={colors.gray[300]} />
          </div>
          <p style={{
            fontSize: typography.fontSize.base,
            margin: 0,
            marginBottom: spacing[2],
          }}>
            No movies yet
          </p>
          <p style={{
            fontSize: typography.fontSize.sm,
            margin: 0,
            lineHeight: typography.lineHeight.relaxed,
          }}>
            Heart favorites and bookmark movies to watch later
          </p>
        </div>
      )}
    </div>
  );

  // Render recent activity
  const renderRecentActivity = () => {
    const recentMovies = [...heartedMovies, ...bookmarkedMovies]
      .sort((a, b) => {
        // Add fallbacks for missing date fields
        const dateA = new Date(a.dateAdded || a.timestamp || Date.now());
        const dateB = new Date(b.dateAdded || b.timestamp || Date.now());
        return dateB - dateA;
      })
      .slice(0, 3);

    if (recentMovies.length === 0) return null;

    return (
      <div style={{
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing[5],
        marginBottom: spacing[6],
        boxShadow: shadows.sm,
        border: `1px solid ${colors.border}`,
      }}>
        <h2 style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.gray[900],
          margin: 0,
          marginBottom: spacing[4],
        }}>
          Recent Activity
        </h2>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[3],
        }}>
          {recentMovies.map((movie) => (
            <div key={`${movie.tmdb_id || movie.id}-recent`} style={{ width: '100%' }}>
              <MediaCard 
                title={movie.title}
                year={movie.year}
                initialSlug={movie.slug}
                initialPoster={movie.poster}
                initialStreaming={movie.streaming}
                tmdbId={movie.tmdb_id || movie.tmdbId}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render discovery section
  const renderDiscoverySection = () => (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      padding: spacing[5],
      boxShadow: shadows.sm,
      border: `1px solid ${colors.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[4],
      }}>
        <h2 style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.gray[900],
          margin: 0,
        }}>
          Discover More
        </h2>
        <button
          onClick={navigateToDiscovery}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
            padding: `${spacing[1]} ${spacing[2]}`,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: 'pointer',
            fontSize: typography.fontSize.sm,
            color: components.youPage.goldAccent,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          Explore
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: spacing[3],
      }}>
        <div style={{
          padding: spacing[4],
          backgroundColor: colors.gray[50],
          borderRadius: borderRadius.md,
          textAlign: 'center',
        }}>
          <Star size={24} color={components.youPage.goldAccent} style={{ margin: '0 auto 8px' }} />
          <p style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.gray[900],
            margin: 0,
            marginBottom: spacing[1],
          }}>
            Essential Films
          </p>
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.gray[600],
            margin: 0,
          }}>
            Curated classics
          </p>
        </div>

        <div style={{
          padding: spacing[4],
          backgroundColor: colors.gray[50],
          borderRadius: borderRadius.md,
          textAlign: 'center',
        }}>
          <TrendingUp size={24} color={components.youPage.goldAccent} style={{ margin: '0 auto 8px' }} />
          <p style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.gray[900],
            margin: 0,
            marginBottom: spacing[1],
          }}>
            Learning Paths
          </p>
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.gray[600],
            margin: 0,
          }}>
            Guided discovery
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PhoneFrame>
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.surface,
        paddingBottom: '100px',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: colors.background,
          borderBottom: `1px solid ${colors.border}`,
          padding: spacing[4],
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <SimpleSearch />
        </div>

        {/* Main Content */}
        <div style={{
          padding: spacing[4],
          paddingTop: spacing[6],
        }}>
          {renderProfileSection()}
          {renderCollectionOverview()}
          {renderRecentActivity()}
          {renderDiscoverySection()}
        </div>
      </div>
    </PhoneFrame>
  );
}