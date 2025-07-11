// pages/you.js
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import SelectedPlatforms from '../components/SelectedPlatforms';
import MediaCard from '../components/MediaCard';
import PlatformSelector from '../components/PlatformSelector';
import CinematicProfile from '../components/CinematicProfile';
import { Check, Plus, Film, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Essential Films data for learning analysis
const essentialFilmsData = {
  'film-noir': {
    title: 'Film Noir',
    movies: [
      { title: 'The Maltese Falcon', year: 1941, tmdb_id: 963 },
      { title: 'Double Indemnity', year: 1944, tmdb_id: 996 },
      { title: 'The Big Sleep', year: 1946, tmdb_id: 910 },
      { title: 'Out of the Past', year: 1947, tmdb_id: 678 },
      { title: 'Sunset Boulevard', year: 1950, tmdb_id: 599 }
    ]
  },
  'world-cinema': {
    title: 'World Cinema',
    movies: [
      { title: '8½', year: 1963, tmdb_id: 139 },
      { title: 'The Rules of the Game', year: 1939, tmdb_id: 36386 },
      { title: 'Tokyo Story', year: 1953, tmdb_id: 18148 },
      { title: 'Bicycle Thieves', year: 1948, tmdb_id: 11224 },
      { title: 'Persona', year: 1966, tmdb_id: 3082 }
    ]
  },
  'horror-suspense': {
    title: 'Horror & Suspense',
    movies: [
      { title: 'Psycho', year: 1960, tmdb_id: 539 },
      { title: 'The Exorcist', year: 1973, tmdb_id: 9552 },
      { title: 'Halloween', year: 1978, tmdb_id: 530 },
      { title: 'Night of the Living Dead', year: 1968, tmdb_id: 10625 },
      { title: 'Rosemary\'s Baby', year: 1968, tmdb_id: 10110 }
    ]
  }
};

// Episode suggestions based on viewing patterns
const episodeSuggestions = {
  'film-noir': [
    { id: 'german-expressionism', title: 'German Expressionism', theme: 'film-noir' },
    { id: 'from-novels-to-noir', title: 'From Novels to Noir', theme: 'film-noir' }
  ],
  'world-cinema': [
    { id: 'italian-neorealism', title: 'Italian Neorealism', theme: 'world-cinema' },
    { id: 'french-new-wave', title: 'French New Wave', theme: 'world-cinema' }
  ],
  'horror-suspense': [
    { id: 'psychological-horror', title: 'Psychological Horror', theme: 'horror-suspense' },
    { id: 'supernatural-cinema', title: 'Supernatural Cinema', theme: 'horror-suspense' }
  ]
};

export default function YouPage() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    profile: true,
    stats: false,
    hearted: true,
    bookmarked: true,
    platforms: false,
    learning: false
  });
  const [learningInsights, setLearningInsights] = useState({
    completedCollections: [],
    suggestedEpisodes: [],
    progressData: {}
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

  const handleSearchResults = (results) => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on You page:', results);
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

  // Analyze user's collection for learning insights
  const analyzeLearningProgress = () => {
    const insights = {
      completedCollections: [],
      suggestedEpisodes: [],
      progressData: {}
    };

    // Check progress in each essential films collection
    Object.entries(essentialFilmsData).forEach(([collectionKey, collection]) => {
      const matchedMovies = collection.movies.filter(movie => 
        heartedMovies.some(hearted => 
          hearted.title.toLowerCase() === movie.title.toLowerCase() || 
          hearted.tmdb_id === movie.tmdb_id
        )
      );
      
      const progress = matchedMovies.length / collection.movies.length;
      insights.progressData[collectionKey] = {
        count: matchedMovies.length,
        total: collection.movies.length,
        progress: progress,
        title: collection.title
      };

      // Collection is considered "in progress" if user has 2+ films
      if (matchedMovies.length >= 2) {
        if (progress >= 0.8) {
          insights.completedCollections.push(collectionKey);
        }
        
        // Suggest episodes for collections with progress
        if (episodeSuggestions[collectionKey]) {
          insights.suggestedEpisodes.push(...episodeSuggestions[collectionKey]);
        }
      }
    });

    return insights;
  };

  // Update learning insights when movies change
  useEffect(() => {
    if (heartedMovies.length > 0) {
      const insights = analyzeLearningProgress();
      setLearningInsights(insights);
    }
  }, [heartedMovies]);

  return (
    <PhoneFrame active="you">
      <div style={styles.container}>
        {/* Fixed Search Bar */}
        <div style={styles.fixedInputArea}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
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

            {/* Cinematic Journey Section */}
            {(learningInsights.suggestedEpisodes.length > 0 || Object.keys(learningInsights.progressData).length > 0) && (
              <div style={styles.learningSection}>
                <div 
                  style={styles.learningHeader}
                  onClick={() => toggleSection('learning')}
                >
                  <div style={styles.learningHeaderLeft}>
                    <Film size={20} color="#9ca3af" />
                    <h2 style={styles.learningTitle}>Collections Progress</h2>
                  </div>
                  <div style={styles.learningHeaderRight}>
                    <span style={styles.expandIcon}>
                      {expandedSections.learning ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
                {expandedSections.learning && (
                  <div style={styles.learningContent}>
                    {/* Progress Cards */}
                    <div style={styles.progressCards}>
                      {Object.entries(learningInsights.progressData).map(([key, data]) => (
                        data.count > 0 && (
                          <div key={key} style={styles.progressCard}>
                            <div style={styles.progressHeader}>
                              <span style={styles.progressTitle}>{data.title}</span>
                              <span style={styles.progressCount}>{data.count}/{data.total}</span>
                            </div>
                            <div style={styles.progressBar}>
                              <div 
                                style={{
                                  ...styles.progressFill,
                                  width: `${data.progress * 100}%`
                                }}
                              />
                            </div>
                            <div style={styles.progressStatus}>
                              {data.progress >= 0.8 ? 'Deep dive complete' : 
                               data.progress >= 0.4 ? 'Getting into it' : 'Just getting started'}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                    
                    {/* Episode Suggestions */}
                    {learningInsights.suggestedEpisodes.length > 0 && (
                      <div style={styles.episodeSection}>
                        <h3 style={styles.episodeTitle}>Explore Further</h3>
                        <div style={styles.episodeGrid}>
                          {learningInsights.suggestedEpisodes.slice(0, 3).map((episode, index) => (
                            <Link 
                              key={index} 
                              href={`/${episode.theme}/${episode.id}`}
                              style={styles.episodeCard}
                            >
                              <div style={styles.episodeCardContent}>
                                <span style={styles.episodeCardIcon}>→</span>
                                <span style={styles.episodeCardTitle}>{episode.title}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                  <Heart size={20} color="#9ca3af" fill="none" />
                  <div style={styles.movieTitleSection}>
                    <h2 style={styles.movieTitle}>Films You Love</h2>
                    {heartedMovies.length > 0 && (
                      <p style={styles.movieSubtitle}>
                        {heartedMovies.length >= 10 ? 'Your taste spans multiple worlds of cinema' :
                         heartedMovies.length >= 5 ? 'Developing a sophisticated palate' :
                         'The beginning of your collection'}
                      </p>
                    )}
                  </div>
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
                      <Heart size={24} color="#cccccc" style={styles.emptyIcon} />
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
                    color="#9ca3af"
                    fill="none"
                    style={styles.bookmarkIcon}
                  />
                  <div style={styles.movieTitleSection}>
                    <h2 style={styles.movieTitle}>Films to Watch</h2>
                    {bookmarkedMovies.length > 0 && (
                      <p style={styles.movieSubtitle}>
                        {bookmarkedMovies.length >= 10 ? 'Ambitious queue spanning different eras' :
                         bookmarkedMovies.length >= 5 ? 'Thoughtfully curated viewing ahead' :
                         'Your next cinematic adventures'}
                      </p>
                    )}
                  </div>
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
                      <Bookmark size={24} color="#cccccc" style={styles.emptyIcon} />
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
    backgroundColor: '#fafafa',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '24px 24px 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f0f0f0',
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
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f0f0f0',
    gap: '32px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navCount: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#666666',
  },
  navSeparator: {
    fontSize: '14px',
    color: '#e0e0e0',
    fontWeight: '300',
  },
  tvIcon: {
    fontSize: '16px',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: '32px 24px',
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
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
    marginBottom: '32px',
  },
  movieHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  movieHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  movieHeaderLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    flex: 1,
  },
  heartIcon: {
    opacity: 0.6,
    marginTop: '2px',
  },
  bookmarkIcon: {
    opacity: 0.6,
    marginTop: '2px',
  },
  platformIcon: {
    opacity: 0.6,
    marginTop: '2px',
  },
  movieTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  movieCount: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#999999',
    backgroundColor: '#f8f8f8',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  expandIcon: {
    fontSize: '10px',
    color: '#cccccc',
    transition: 'transform 0.2s ease',
  },
  movieList: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingLeft: '32px',
    paddingRight: '32px',
    paddingBottom: '24px',
  },
  movieCardWrapper: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    transition: 'all 0.2s ease',
  },
  platformList: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '32px',
    paddingRight: '32px',
  },
  platformItem: {
    fontSize: '15px',
    color: '#666666',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 32px',
    backgroundColor: '#fafafa',
    borderRadius: '16px',
    border: '1px solid #f0f0f0',
    margin: '24px 32px',
  },
  emptyIcon: {
    marginBottom: '16px',
    opacity: 0.4,
  },
  emptyMessage: {
    fontSize: '15px',
    color: '#666666',
    fontWeight: '500',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#999999',
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
  learningSection: {
    marginBottom: '32px',
  },
  learningHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  learningHeaderLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    flex: 1,
  },
  learningHeaderRight: {
    display: 'flex',
    alignItems: 'center',
  },
  learningTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  learningContent: {
    marginTop: '24px',
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  journeyIcon: {
    opacity: 0.6,
    marginTop: '2px',
  },
  progressCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  progressCard: {
    padding: '24px',
    backgroundColor: '#fafafa',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    transition: 'all 0.2s ease',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  progressTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: '-0.01em',
  },
  progressCount: {
    fontSize: '12px',
    color: '#999999',
    fontWeight: '500',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  progressBar: {
    width: '100%',
    height: '3px',
    backgroundColor: '#f0f0f0',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1a1a1a',
    transition: 'width 0.3s ease',
  },
  progressStatus: {
    fontSize: '11px',
    color: '#999999',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  episodeSection: {
    paddingTop: '32px',
    borderTop: '1px solid #f0f0f0',
  },
  episodeTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#cccccc',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  episodeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  episodeCard: {
    padding: '16px 20px',
    backgroundColor: '#fafafa',
    border: '1px solid #f0f0f0',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  episodeCardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  episodeCardIcon: {
    fontSize: '12px',
    color: '#cccccc',
    fontWeight: '300',
  },
  episodeCardTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
    letterSpacing: '-0.01em',
  },
  movieTitleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  movieSubtitle: {
    fontSize: '13px',
    color: '#999999',
    margin: 0,
    fontWeight: '400',
    lineHeight: '1.4',
  },
};
