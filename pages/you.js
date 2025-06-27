// pages/you.js
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import SelectedPlatforms from '../components/SelectedPlatforms';
import MediaCard from '../components/MediaCard';
import PlatformSelector from '../components/PlatformSelector';
import CinematicProfile from '../components/CinematicProfile';
import { Heart, Bookmark, Star, Film } from 'lucide-react';
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
    profile: true,
    stats: false,
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
            {/* Cinematic Profile Section */}
            <div style={styles.profileSection}>
              <div 
                style={styles.profileHeader}
                onClick={() => toggleSection('profile')}
              >
                <div style={styles.profileHeaderLeft}>
                  <span style={styles.profileIcon}>🥠</span>
                  <h2 style={styles.profileTitle}>Your Cinematic Profile</h2>
                </div>
                <div style={styles.profileHeaderRight}>
                  <span style={styles.expandIcon}>
                    {expandedSections.profile ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              <div style={{
                ...styles.profileContent,
                display: expandedSections.profile ? 'block' : 'none'
              }}>
                <CinematicProfile 
                  userData={{
                    heartedMovies,
                    bookmarkedMovies,
                    selectedPlatforms
                  }}
                  className="cinematicProfile"
                />
                
                {/* Analysis Type Indicators */}
                <div style={styles.analysisTypes}>
                  <div style={styles.analysisGrid}>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>🔬</span>
                      <span style={styles.analysisLabel}>Scientific</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>🧠</span>
                      <span style={styles.analysisLabel}>Psychological</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>🌟</span>
                      <span style={styles.analysisLabel}>Mystical</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>🥠</span>
                      <span style={styles.analysisLabel}>Fortune</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>🧬</span>
                      <span style={styles.analysisLabel}>Cinematic DNA</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>🎭</span>
                      <span style={styles.analysisLabel}>Personality</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>📝</span>
                      <span style={styles.analysisLabel}>Report Card</span>
                    </div>
                    <div style={styles.analysisType}>
                      <span style={styles.analysisIcon}>💭</span>
                      <span style={styles.analysisLabel}>Philosophical</span>
                    </div>
                  </div>
                  <div style={styles.refreshNote}>
                    <span style={styles.refreshText}>✨ Refresh for different analysis types ✨</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Film Statistics Section */}
            <div style={styles.statsSection}>
              <div 
                style={styles.statsHeader}
                onClick={() => toggleSection('stats')}
              >
                <div style={styles.statsHeaderLeft}>
                  <Film size={20} color="#d4af37" />
                  <h2 style={styles.statsTitle}>Your Film Journey</h2>
                </div>
                <div style={styles.statsHeaderRight}>
                  <span style={styles.expandIcon}>
                    {expandedSections.stats ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              {expandedSections.stats && (
                <div style={styles.statsContent}>
                  <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{heartedMovies.length}</div>
                      <div style={styles.statLabel}>Films Loved</div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{bookmarkedMovies.length}</div>
                      <div style={styles.statLabel}>Queue Length</div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{selectedPlatforms.length}</div>
                      <div style={styles.statLabel}>Platforms</div>
                    </div>
                    <div style={styles.statCard}>
                      <div style={styles.statNumber}>{heartedMovies.length + bookmarkedMovies.length}</div>
                      <div style={styles.statLabel}>Total Curated</div>
                    </div>
                  </div>
                  
                  {/* Platform Analysis */}
                  {selectedPlatforms.length > 0 && (
                    <div style={styles.platformAnalysis}>
                      <h3 style={styles.analysisTitle}>Your Platform Profile</h3>
                      <div style={styles.platformTags}>
                        {selectedPlatforms.map((platform, index) => (
                          <span key={index} style={styles.platformTag}>
                            {platform}
                          </span>
                        ))}
                      </div>
                      <div style={styles.analysisInsight}>
                        {selectedPlatforms.length === 1 ? (
                          <span style={styles.insightText}>Minimalist approach—focused curation</span>
                        ) : selectedPlatforms.length <= 3 ? (
                          <span style={styles.insightText}>Optimized selection—quality over quantity</span>
                        ) : selectedPlatforms.length <= 5 ? (
                          <span style={styles.insightText}>Comprehensive coverage—thorough explorer</span>
                        ) : (
                          <span style={styles.insightText}>Maximalist access—complete cinematic freedom</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={styles.movieSection}>
              <div 
                style={styles.movieHeader}
                onClick={() => toggleSection('hearted')}
              >
                <div style={styles.movieHeaderLeft}>
                  <Heart size={20} color="#ef4444" fill="#ef4444" />
                  <h2 style={styles.movieTitle}>Films You Love</h2>
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
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>🎬</div>
                      <p style={styles.emptyMessage}>Your film collection awaits</p>
                      <p style={styles.emptySubtext}>Heart movies as you discover them</p>
                    </div>
                  ) : (
                    heartedMovies.map((movie) => (
                      <div key={movie.id} style={styles.movieCardWrapper}>
                        <MediaCard 
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          initialStreaming={movie.streaming}
                          tmdbId={movie.tmdb_id || movie.tmdbId}
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
                  <h2 style={styles.movieTitle}>Films to Watch</h2>
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
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>📖</div>
                      <p style={styles.emptyMessage}>Your viewing queue is empty</p>
                      <p style={styles.emptySubtext}>Bookmark films for later</p>
                    </div>
                  ) : (
                    bookmarkedMovies.map((movie) => (
                      <div key={movie.id} style={styles.movieCardWrapper}>
                        <MediaCard 
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          initialStreaming={movie.streaming}
                          tmdbId={movie.tmdb_id || movie.tmdbId}
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
                  <h2 style={styles.movieTitle}>Streaming Platforms</h2>
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
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e5e7eb',
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
  profileSection: {
    marginBottom: '24px',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  profileHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  profileHeaderRight: {
    display: 'flex',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: '24px',
  },
  profileTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  profileContent: {
    marginTop: '16px',
    padding: '4px',
  },
  analysisTypes: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#fafbfc',
    borderRadius: '12px',
    border: '1px solid #f3f4f6',
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  analysisType: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  analysisIcon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  analysisLabel: {
    fontSize: '10px',
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  refreshNote: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  refreshText: {
    fontSize: '12px',
    color: '#d4af37',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  statsSection: {
    marginBottom: '24px',
  },
  statsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  statsHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statsHeaderRight: {
    display: 'flex',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  statsContent: {
    marginTop: '16px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#d4af37',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  platformAnalysis: {
    paddingTop: '20px',
    borderTop: '1px solid #f3f4f6',
  },
  analysisTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  platformTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  platformTag: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  analysisInsight: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#fafbfc',
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
  },
  insightText: {
    fontSize: '13px',
    fontStyle: 'italic',
    color: '#d4af37',
    fontWeight: '500',
  },
  movieSection: {
    marginBottom: '20px',
  },
  movieHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  movieHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  movieHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    color: '#111827',
    margin: 0,
  },
  movieCount: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#9ca3af',
    transition: 'transform 0.2s ease',
  },
  movieList: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  movieCardWrapper: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
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
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    backgroundColor: '#fafbfc',
    borderRadius: '12px',
    border: '1px solid #f3f4f6',
    margin: '16px 0',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    opacity: 0.6,
  },
  emptyMessage: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500',
    margin: '0 0 4px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: 0,
  },
  platformSelectorContainer: {
    marginTop: '16px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  wipeSection: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
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
    color: '#6b7280',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
};
