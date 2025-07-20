// pages/you-redesign.js - Redesigned You page with consistent styling
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import PlatformSelector from '../components/PlatformSelector';
import MediaCard from '../components/MediaCard';
import CinematicProfile from '../components/CinematicProfile';
import { Heart, Bookmark, ChevronDown, ChevronRight, Tv2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function YouRedesignPage() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    hearted: false,
    bookmarked: false,
    platforms: false,
  });

  const toggleSection = section => {
    setExpandedSections({
      hearted: false,
      bookmarked: false,
      platforms: false,
      [section]: true,
    });
  };

  const handleWipeData = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all your data? This will remove all selected platforms, hearted movies, and bookmarked movies.'
      )
    ) {
      localStorage.removeItem('selectedPlatforms');
      localStorage.removeItem('heartedMovies');
      localStorage.removeItem('bookmarkedMovies');

      // Update local state
      setSelectedPlatforms([]);
      setHeartedMovies([]);
      setBookmarkedMovies([]);

      // Notify other components
      window.dispatchEvent(new CustomEvent('platformsUpdated'));
      window.dispatchEvent(new CustomEvent('moviesUpdated'));

      console.log('All user data cleared');
    }
  };

  // Load data from localStorage (same functionality as original)
  useEffect(() => {
    const loadSelectedPlatforms = () => {
      try {
        const saved = localStorage.getItem('selectedPlatforms');
        if (saved) {
          const platforms = JSON.parse(saved);
          setSelectedPlatforms(platforms);
        } else {
          setSelectedPlatforms([]);
        }
      } catch (error) {
        console.error('Error loading platforms from localStorage:', error);
        setSelectedPlatforms([]);
      }
    };

    const loadHeartedMovies = () => {
      try {
        const saved = localStorage.getItem('heartedMovies');
        if (saved) {
          const movies = JSON.parse(saved);
          setHeartedMovies(movies);
        } else {
          setHeartedMovies([]);
        }
      } catch (error) {
        console.error('Error loading hearted movies from localStorage:', error);
        setHeartedMovies([]);
      }
    };

    const loadBookmarkedMovies = () => {
      try {
        const saved = localStorage.getItem('bookmarkedMovies');
        if (saved) {
          const movies = JSON.parse(saved);
          setBookmarkedMovies(movies);
        } else {
          setBookmarkedMovies([]);
        }
      } catch (error) {
        console.error('Error loading bookmarked movies from localStorage:', error);
        setBookmarkedMovies([]);
      }
    };

    loadSelectedPlatforms();
    loadHeartedMovies();
    loadBookmarkedMovies();

    // Same event listeners as original
    const handleStorageChange = e => {
      if (e.key === 'selectedPlatforms') {
        loadSelectedPlatforms();
      } else if (e.key === 'heartedMovies') {
        loadHeartedMovies();
      } else if (e.key === 'bookmarkedMovies') {
        loadBookmarkedMovies();
      }
    };

    const handlePlatformUpdate = () => loadSelectedPlatforms();
    const handleMoviesUpdate = () => {
      loadHeartedMovies();
      loadBookmarkedMovies();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('platformsUpdated', handlePlatformUpdate);
    window.addEventListener('moviesUpdated', handleMoviesUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('platformsUpdated', handlePlatformUpdate);
      window.removeEventListener('moviesUpdated', handleMoviesUpdate);
    };
  }, []);

  // Handle hash navigation (same as original)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#platforms') {
      setExpandedSections(prev => ({ ...prev, platforms: true }));
      window.history.replaceState(null, null, window.location.pathname);
    }
  }, [router.asPath]);

  const handleSearchResults = results => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on You Redesign page:', results);
  };

  const handlePlatformSelectionChange = selectedPlatforms => {
    localStorage.setItem('selectedPlatforms', JSON.stringify(selectedPlatforms));
    setSelectedPlatforms(selectedPlatforms);
    window.dispatchEvent(new CustomEvent('platformsUpdated'));
  };

  const totalItems = heartedMovies.length + bookmarkedMovies.length + selectedPlatforms.length;

  return (
    <PhoneFrame active="you">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar */}
        <div style={styles.fixedInputArea}>
          <SimpleSearch onResults={handleSearchResults} />
        </div>

        {/* Scrollable Content */}
        <div style={styles.scrollableContent}>
          {/* Primary Navigation Bar */}
          <div style={styles.primaryNav}>
            <div
              style={{
                ...styles.navItem,
                ...(expandedSections.hearted ? styles.navItemActive : {}),
              }}
              onClick={() => toggleSection('hearted')}
            >
              <Heart
                size={24}
                color={expandedSections.hearted ? '#ef4444' : '#6b7280'}
                fill={expandedSections.hearted ? '#ef4444' : 'none'}
              />
              <div style={styles.navLabel}>
                <span style={styles.navTitle}>Loved</span>
                <span style={styles.navCount}>{heartedMovies.length}</span>
              </div>
            </div>
            <div
              style={{
                ...styles.navItem,
                ...(expandedSections.bookmarked ? styles.navItemActive : {}),
              }}
              onClick={() => toggleSection('bookmarked')}
            >
              <Bookmark
                size={24}
                color={expandedSections.bookmarked ? '#000000' : '#6b7280'}
                fill={expandedSections.bookmarked ? '#000000' : 'none'}
              />
              <div style={styles.navLabel}>
                <span style={styles.navTitle}>To Watch</span>
                <span style={styles.navCount}>{bookmarkedMovies.length}</span>
              </div>
            </div>
            <div
              style={{
                ...styles.navItem,
                ...(expandedSections.platforms ? styles.navItemActive : {}),
              }}
              onClick={() => toggleSection('platforms')}
            >
              <Tv2 size={24} color="#6b7280" />
              <div style={styles.navLabel}>
                <span style={styles.navTitle}>Services</span>
                <span style={styles.navCount}>{selectedPlatforms.length}</span>
              </div>
            </div>
          </div>

          <div style={styles.content}>
            {/* Genius Insight Section */}
            <h2 style={styles.pageTitle}>Genius Insight</h2>

            {/* Cinematic Profile - Always show, but position changes */}
            <CinematicProfile
              userData={{
                heartedMovies,
                bookmarkedMovies,
                selectedPlatforms,
              }}
              style={styles.profileSection}
              onProfileChange={setCurrentProfile}
            />

            {/* User Content Sections - Appear between profile and recommendations */}
            {expandedSections.hearted && (
              <div style={styles.userContentSection}>
                <h3 style={styles.userContentTitle}>Movies You Love</h3>
                <div style={styles.contentSection}>
                  {heartedMovies.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p style={styles.emptyMessage}>No loved movies yet</p>
                      <p style={styles.emptySubtext}>Heart some movies to see them here</p>
                    </div>
                  ) : (
                    <div style={styles.movieGrid}>
                      {heartedMovies.map(movie => (
                        <MediaCard
                          key={movie.id}
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          tmdbId={movie.tmdb_id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {expandedSections.bookmarked && (
              <div style={styles.userContentSection}>
                <h3 style={styles.userContentTitle}>Movies To Watch</h3>
                <div style={styles.contentSection}>
                  {bookmarkedMovies.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p style={styles.emptyMessage}>No bookmarked movies yet</p>
                      <p style={styles.emptySubtext}>Bookmark movies to watch them later</p>
                    </div>
                  ) : (
                    <div style={styles.movieGrid}>
                      {bookmarkedMovies.map(movie => (
                        <MediaCard
                          key={movie.id}
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          tmdbId={movie.tmdb_id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {expandedSections.platforms && (
              <div style={styles.userContentSection}>
                <h3 style={styles.userContentTitle}>Streaming Services</h3>
                <div style={styles.contentSection}>
                  <div style={styles.platformSelector}>
                    <PlatformSelector
                      onSelectionChange={handlePlatformSelectionChange}
                      initialSelected={selectedPlatforms}
                      showSelectedSection={false}
                      showHeader={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* More Ideas Section - Always appears after all content */}
            <div style={styles.moreIdeasSection}>
              <h3 style={styles.moreIdeasTitle}>
                {currentProfile?.recommendationHeader || 'More Ideas'}
              </h3>
              <div style={styles.movieGrid}>
                <MediaCard
                  title="The Maltese Falcon"
                  year="1941"
                  initialSlug="the-maltese-falcon-1941"
                  tmdbId={558}
                />
                <MediaCard
                  title="Casablanca"
                  year="1942"
                  initialSlug="casablanca-1942"
                  tmdbId={289}
                />
                <MediaCard
                  title="Seven Samurai"
                  year="1954"
                  initialSlug="seven-samurai-1954"
                  tmdbId={346}
                />
                <MediaCard title="8½" year="1963" initialSlug="8-half-1963" tmdbId={392} />
                <MediaCard
                  title="Chungking Express"
                  year="1994"
                  initialSlug="chungking-express-1994"
                  tmdbId={11104}
                />
                <MediaCard
                  title="Bicycle Thieves"
                  year="1948"
                  initialSlug="bicycle-thieves-1948"
                  tmdbId={14430}
                />
                <MediaCard
                  title="Tokyo Story"
                  year="1953"
                  initialSlug="tokyo-story-1953"
                  tmdbId={18148}
                />
                <MediaCard title="Vertigo" year="1958" initialSlug="vertigo-1958" tmdbId={5690} />
                <MediaCard title="Persona" year="1966" initialSlug="persona-1966" tmdbId={13297} />
                <MediaCard
                  title="In the Mood for Love"
                  year="2000"
                  initialSlug="in-the-mood-for-love-2000"
                  tmdbId={843}
                />
              </div>
            </div>

            {/* Clear Data Section */}
            <div style={styles.dangerZone}>
              <button onClick={handleWipeData} style={styles.dangerButton}>
                Clear All Data
              </button>
              <p style={styles.dangerDescription}>Reset all preferences and start fresh</p>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  primaryNav: {
    display: 'flex',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    gap: '8px',
  },
  navItemActive: {
    backgroundColor: '#f9fafb',
  },
  navLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  navTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  navCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  content: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  contentSection: {
    padding: '16px',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 16px',
  },
  emptyMessage: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0',
  },
  platformSelector: {
    // Platform selector inherits its own styling
  },
  dangerZone: {
    textAlign: 'center',
    padding: '40px 16px',
    marginTop: '40px',
    borderTop: '1px solid #e5e7eb',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: '8px',
  },
  dangerDescription: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
  },
  profileSection: {
    marginBottom: '16px',
  },
  moreIdeasSection: {
    marginTop: '0px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
    textAlign: 'left',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
    textAlign: 'left',
  },
  userContentSection: {
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f3f4f6',
  },
  userContentTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
    textAlign: 'left',
  },
};
