// pages/you.js - Apple-inspired minimal You page design
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import CinematicProfile from '../components/CinematicProfile';
import ThemeFooter from '../components/ThemeFooter';
import {
  Check,
  Plus,
  Film,
  ChevronRight,
  Star,
  TrendingUp,
  CirclePlus,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  components,
} from '../lib/design-tokens';
import { getThemeRepresentatives } from '../data/essential-movies';
import { routeHelpers } from '../lib/routes';

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

  const navigateToCollection = type => {
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
    return (
      <div
        style={{
          marginBottom: spacing[3],
        }}
      >
        {/* Header with profile and seen count */}
        {hasContent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing[2],
              padding: `0 ${spacing[4]}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexWrap: 'nowrap',
                }}
              >
                <Check size={16} color={components.youPage.goldAccent} strokeWidth={2.5} />
                <span
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.normal,
                    color: colors.gray[700],
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  based on
                </span>
                <button
                  onClick={() => router.push('/seen')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: typography.fontSize.base,
                    color: components.youPage.goldAccent,
                    fontWeight: typography.fontWeight.normal,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {heartedMovies.length} {heartedMovies.length === 1 ? 'film' : 'films'}
                </button>
                <button
                  onClick={() => router.push('/you/suggestions')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: typography.fontSize.base,
                    color: colors.gray[500],
                    fontWeight: typography.fontWeight.light,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                  }}
                >
                  (add more)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cinematic Profile */}
        {hasContent ? (
          <div
            style={{
              backgroundColor: colors.gold[100],
              borderRadius: borderRadius.md,
              padding: spacing[4],
              border: `1px solid ${colors.gold[200]}`,
              margin: `0 ${spacing[4]}`,
            }}
          >
            <CinematicProfile
              userData={{
                heartedMovies,
                bookmarkedMovies,
                selectedPlatforms,
              }}
              profileType={activeProfileType}
              minimal={true}
            />
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: `${spacing[4]} ${spacing[4]}`,
              color: colors.gray[700],
            }}
          >
            <Film size={48} color={colors.gray[300]} style={{ margin: '0 auto 16px' }} />
            <div
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.normal,
                margin: 0,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textAlign: 'center',
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              <div style={{ marginBottom: '8px' }}>Track the movies you've seen.</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '8px',
                }}
              >
                <span>Use</span>
                <CheckCircle size={16} color={colors.gray[600]} />
                <span>to add films to your "seen" list.</span>
              </div>
              <button
                onClick={() => router.push('/you/suggestions')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: colors.gray[500],
                  fontWeight: typography.fontWeight.light,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  textDecoration: 'underline',
                  textDecorationColor: colors.gray[500],
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '2px',
                }}
              >
                Suggestions
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render watchlist section (primary content)
  const renderWatchlistSection = () => {
    return (
      <div
        style={{
          marginBottom: spacing[3],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: spacing[2],
            gap: '16px',
            padding: `0 ${spacing[4]}`,
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#d4af37',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Movies to Watch
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
        </div>

        {bookmarkedMovies.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing[4],
              padding: `0 ${spacing[4]}`,
            }}
          >
            {bookmarkedMovies.slice(0, 4).map(movie => (
              <div
                key={`${movie.tmdb_id || movie.id}-watchlist`}
                style={{
                  aspectRatio: '2/3',
                  borderRadius: borderRadius.md,
                  overflow: 'hidden',
                  backgroundColor: colors.gray[100],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
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
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: `${spacing[4]} ${spacing[4]}`,
              color: colors.gray[700],
            }}
          >
            <Plus size={48} color={colors.gray[300]} style={{ margin: '0 auto 8px' }} />
            <div
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.normal,
                margin: 0,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textAlign: 'center',
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              <div>Track the movies you want to watch.</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  marginBottom: '8px',
                }}
              >
                <span>Use</span>
                <CirclePlus size={16} color={colors.gray[600]} />
                <span>to add them to your "watch" list.</span>
              </div>
              <button
                onClick={() => router.push('/you/suggestions')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: colors.gray[500],
                  fontWeight: typography.fontWeight.light,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  textDecoration: 'underline',
                  textDecorationColor: colors.gray[500],
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '2px',
                }}
              >
                Suggestions
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render suggestions section (from mockup)
  const renderSuggestionsSection = () => {
    // Get one representative movie from each theme
    const themeRepresentatives = getThemeRepresentatives();
    const suggestions = themeRepresentatives.map(movie => ({
      title: movie.title,
      year: movie.year.toString(),
      tmdbId: movie.tmdb_id,
    }));

    return (
      <div
        style={{
          marginBottom: spacing[3],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: spacing[2],
            gap: '16px',
            padding: `0 ${spacing[4]}`,
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#d4af37',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Suggestions
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: `0 ${spacing[4]}`,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  flex: 1,
                  gap: '4px',
                }}
              >
                <span
                  onClick={() => router.push(routeHelpers.getMovieRoute(suggestion.tmdbId))}
                  style={{
                    fontSize: '14px',
                    color: '#374151',
                    textDecoration: 'underline',
                    textDecorationColor: '#d4af37',
                    textDecorationThickness: '1px',
                    textUnderlineOffset: '2px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {suggestion.title}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    fontWeight: '300',
                  }}
                >
                  ({suggestion.year})
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '6px',
                  alignItems: 'center',
                }}
              >
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Check size={16} color="#9ca3af" strokeWidth={1.5} />
                    <span
                      style={{
                        fontSize: '12px',
                        lineHeight: '1',
                        userSelect: 'none',
                        color: '#9ca3af',
                        fontWeight: '400',
                      }}
                    >
                      Seen
                    </span>
                  </div>
                </button>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Plus size={16} color="#9ca3af" />
                    <span
                      style={{
                        fontSize: '12px',
                        lineHeight: '1',
                        userSelect: 'none',
                        color: '#9ca3af',
                        fontWeight: '400',
                      }}
                    >
                      Add
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* More suggestions link */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: `8px ${spacing[4]} 0`,
          }}
        >
          <button
            onClick={() => router.push('/suggestions')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: colors.gray[500],
              fontWeight: typography.fontWeight.light,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textDecoration: 'underline',
              textDecorationColor: colors.gray[500],
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
            }}
          >
            More Suggestions
          </button>
        </div>
      </div>
    );
  };

  // Render discovery section
  const renderDiscoverySection = () => (
    <div
      style={{
        marginBottom: spacing[2],
      }}
    >
      <ThemeFooter />
    </div>
  );

  return (
    <PhoneFrame>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          paddingBottom: '100px',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: `1px solid ${colors.border}`,
            padding: spacing[4],
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Main Content */}
        <div
          style={{
            padding: spacing[4],
            paddingTop: spacing[4],
          }}
        >
          {/* Cinematic Profile Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: spacing[3],
              gap: '16px',
              padding: `0 ${spacing[4]}`,
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#d4af37',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Cinematic Profile
            </span>
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
              }}
            />
          </div>

          {renderCinematicProfileSection()}
          {renderWatchlistSection()}
          {renderSuggestionsSection()}
          {renderDiscoverySection()}
        </div>
      </div>
    </PhoneFrame>
  );
}
