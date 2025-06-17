// pages/you.js
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import SelectedPlatforms from '../components/SelectedPlatforms';
import MediaCard from '../components/MediaCard';
import PlatformSelector from '../components/PlatformSelector';
import { Heart, Bookmark } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

// Import admin data
import afi100Data from '../data/afi100.json';

export default function YouPage() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    hearted: false,
    bookmarked: false,
    platforms: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleWipeData = () => {
    if (window.confirm('Are you sure you want to clear all your data? This will remove all selected platforms, hearted movies, and bookmarked movies.')) {
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

  // Load data from localStorage
  useEffect(() => {
    const loadSelectedPlatforms = () => {
      try {
        const saved = localStorage.getItem('selectedPlatforms');
        if (saved) {
          const platforms = JSON.parse(saved);
          setSelectedPlatforms(platforms);
          console.log('Loaded platforms from localStorage:', platforms);
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
          console.log('Loaded hearted movies from localStorage:', movies);
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
          console.log('Loaded bookmarked movies from localStorage:', movies);
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

    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'selectedPlatforms') {
        loadSelectedPlatforms();
      } else if (e.key === 'heartedMovies') {
        loadHeartedMovies();
      } else if (e.key === 'bookmarkedMovies') {
        loadBookmarkedMovies();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events for same-tab updates
    const handlePlatformUpdate = () => {
      loadSelectedPlatforms();
    };
    
    const handleMoviesUpdate = () => {
      loadHeartedMovies();
      loadBookmarkedMovies();
    };
    
    window.addEventListener('platformsUpdated', handlePlatformUpdate);
    window.addEventListener('moviesUpdated', handleMoviesUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('platformsUpdated', handlePlatformUpdate);
      window.removeEventListener('moviesUpdated', handleMoviesUpdate);
    };
  }, []);

  // Handle hash navigation to auto-expand sections
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#platforms') {
      setExpandedSections(prev => ({ ...prev, platforms: true }));
      // Clear the hash after expanding
      window.history.replaceState(null, null, window.location.pathname);
    }
  }, [router.asPath]);

  const handleAsk = (query) => {
    // Navigate to Ask page with the query
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  const handlePlatformSelectionChange = (selectedPlatforms) => {
    // Save to localStorage so other components can access the data
    localStorage.setItem('selectedPlatforms', JSON.stringify(selectedPlatforms));
    console.log('Saved platforms to localStorage:', selectedPlatforms);
    
    // Update local state
    setSelectedPlatforms(selectedPlatforms);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('platformsUpdated'));
  };

  return (
    <PhoneFrame active="you">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar */}
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Scrollable Content */}
        <div style={styles.scrollableContent}>
          <div style={styles.miniNav}>
          <div style={styles.navItem}>
            <Heart size={16} color="#ef4444" fill="#ef4444" />
            <span style={styles.navCount}>{heartedMovies.length}</span>
          </div>
          <div style={styles.navSeparator}>|</div>
          <div style={styles.navItem}>
            <Bookmark size={16} color="#374151" fill="#374151" />
            <span style={styles.navCount}>{bookmarkedMovies.length}</span>
          </div>
          <div style={styles.navSeparator}>|</div>
          <div style={styles.navItem}>
            <span style={styles.tvIcon}>📺</span>
            <span style={styles.navCount}>{selectedPlatforms.length}</span>
          </div>
        </div>
        
        <div style={styles.content}>
          <div style={styles.mainContent}>
            <div style={styles.movieSection}>
              <div 
                style={styles.movieHeader}
                onClick={() => toggleSection('hearted')}
              >
                <div style={styles.movieHeaderLeft}>
                  <span style={styles.heartIcon}>❤️</span>
                  <h2 style={styles.movieTitle}>Movies You Love</h2>
                </div>
                <div style={styles.movieHeaderRight}>
                  <div style={styles.movieCount}>({heartedMovies.length})</div>
                  <span style={styles.expandIcon}>
                    {expandedSections.hearted ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              {expandedSections.hearted && (
                <div style={styles.movieList}>
                  {heartedMovies.length === 0 ? (
                    <p style={styles.emptyMessage}>No hearted movies yet. Heart some movies to see them here!</p>
                  ) : (
                    heartedMovies.map((movie) => (
                      <div key={movie.id} style={styles.movieCardWrapper}>
                        <MediaCard 
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          tmdbId={movie.tmdb_id}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={styles.movieSection}>
              <div 
                style={styles.movieHeader}
                onClick={() => toggleSection('bookmarked')}
              >
                <div style={styles.movieHeaderLeft}>
                  <Bookmark
                    size={20}
                    color="#374151"
                    fill="#374151"
                    style={styles.bookmarkIcon}
                  />
                  <h2 style={styles.movieTitle}>Movies To Watch</h2>
                </div>
                <div style={styles.movieHeaderRight}>
                  <div style={styles.movieCount}>({bookmarkedMovies.length})</div>
                  <span style={styles.expandIcon}>
                    {expandedSections.bookmarked ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              {expandedSections.bookmarked && (
                <div style={styles.movieList}>
                  {bookmarkedMovies.length === 0 ? (
                    <p style={styles.emptyMessage}>No bookmarked movies yet. Bookmark some movies to see them here!</p>
                  ) : (
                    bookmarkedMovies.map((movie) => (
                      <div key={movie.id} style={styles.movieCardWrapper}>
                        <MediaCard 
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          tmdbId={movie.tmdb_id}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={styles.movieSection}>
              <div 
                style={styles.movieHeader}
                onClick={() => toggleSection('platforms')}
              >
                <div style={styles.movieHeaderLeft}>
                  <span style={styles.platformIcon}>📺</span>
                  <h2 style={styles.movieTitle}>Edit Streaming Platforms</h2>
                </div>
                <div style={styles.movieHeaderRight}>
                  <div style={styles.movieCount}>({selectedPlatforms.length})</div>
                  <span style={styles.expandIcon}>
                    {expandedSections.platforms ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              {expandedSections.platforms && (
                <div style={styles.platformSelectorContainer}>
                  <PlatformSelector 
                    onSelectionChange={handlePlatformSelectionChange}
                    initialSelected={selectedPlatforms}
                    showSelectedSection={false}
                    showHeader={false}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={styles.wipeSection}>
            <button 
              onClick={handleWipeData}
              style={styles.wipeButton}
            >
              Clear All Data
            </button>
            <p style={styles.wipeText}>Reset all preferences and start fresh</p>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
  miniNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e9ecef',
    gap: '16px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  navCount: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  navSeparator: {
    fontSize: '16px',
    color: '#d1d5db',
    fontWeight: '300',
  },
  tvIcon: {
    fontSize: '16px',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
  },
  mainContent: {
    flex: 1,
  },
  heading: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    fontFamily: 'inherit',
  },
  text: {
    fontSize: '14px',
    fontFamily: 'inherit',
    marginBottom: '8px',
  },
  movieSection: {
    marginBottom: '20px',
  },
  movieHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  movieHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  movieHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  heartIcon: {
    fontSize: '20px',
  },
  bookmarkIcon: {
    fontSize: '20px',
  },
  platformIcon: {
    fontSize: '20px',
  },
  movieTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
  },
  movieCount: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#666',
    transition: 'transform 0.2s ease',
  },
  movieList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  movieCardWrapper: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    overflow: 'hidden',
  },
  platformList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  platformItem: {
    fontSize: '16px',
    color: '#333',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  emptyMessage: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: '16px 0',
  },
  platformSelectorContainer: {
    marginTop: '12px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  wipeSection: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #e9ecef',
    textAlign: 'center',
  },
  wipeButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.2s ease',
  },
  wipeText: {
    fontSize: '12px',
    color: '#666',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
};
