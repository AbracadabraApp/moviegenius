// pages/you-new.js - Clean implementation matching site design system
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import PlatformSelector from '../components/PlatformSelector';
import CinematicProfile from '../components/CinematicProfile';
import { Check, Plus, Film } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Essential Films collections for progress tracking
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
      { title: 'Tokyo Story', year: 1953, tmdb_id: 18148 },
      { title: 'Bicycle Thieves', year: 1948, tmdb_id: 11224 },
      { title: '8½', year: 1963, tmdb_id: 139 },
      { title: 'The Rules of the Game', year: 1939, tmdb_id: 36386 },
      { title: 'Persona', year: 1966, tmdb_id: 3082 }
    ]
  }
};

export default function YouNewPage() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [heartedMovies, setHeartedMovies] = useState([]);
  const [bookmarkedMovies, setBookmarkedMovies] = useState([]);
  const [progressData, setProgressData] = useState({});

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedPlatforms = localStorage.getItem('selectedPlatforms');
        const savedHearted = localStorage.getItem('heartedMovies');
        const savedBookmarked = localStorage.getItem('bookmarkedMovies');
        
        if (savedPlatforms) setSelectedPlatforms(JSON.parse(savedPlatforms));
        if (savedHearted) setHeartedMovies(JSON.parse(savedHearted));
        if (savedBookmarked) setBookmarkedMovies(JSON.parse(savedBookmarked));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Calculate progress in Essential Films collections
  useEffect(() => {
    const calculateProgress = () => {
      const progress = {};
      
      Object.entries(essentialFilmsData).forEach(([key, collection]) => {
        const matchedMovies = collection.movies.filter(movie => 
          heartedMovies.some(hearted => 
            hearted.title?.toLowerCase() === movie.title.toLowerCase() ||
            hearted.tmdb_id === movie.tmdb_id
          )
        );
        
        if (matchedMovies.length > 0) {
          progress[key] = {
            title: collection.title,
            count: matchedMovies.length,
            total: collection.movies.length,
            percentage: (matchedMovies.length / collection.movies.length) * 100
          };
        }
      });
      
      setProgressData(progress);
    };

    if (heartedMovies.length > 0) {
      calculateProgress();
    }
  }, [heartedMovies]);

  const handleSearchResults = (results) => {
    console.log('Search results:', results);
  };

  const handlePlatformSelectionChange = (platforms) => {
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms));
    setSelectedPlatforms(platforms);
    window.dispatchEvent(new CustomEvent('platformsUpdated'));
  };

  return (
    <PhoneFrame active="you">
      <div style={styles.container}>
        {/* Fixed Search Bar */}
        <div style={styles.fixedInputArea}>
          <SimpleSearch onResults={handleSearchResults} />
        </div>
        
        {/* Content */}
        <div style={styles.content}>
          {/* Profile Section */}
          <div style={styles.section}>
            <CinematicProfile 
              userData={{
                heartedMovies,
                bookmarkedMovies,
                selectedPlatforms
              }}
            />
          </div>

          {/* Progress Section */}
          {Object.keys(progressData).length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionDivider} />
                <span style={styles.sectionLabel}>Collections Progress</span>
                <div style={styles.sectionDivider} />
              </div>
              
              <div style={styles.progressList}>
                {Object.entries(progressData).map(([key, data]) => (
                  <div key={key} style={styles.progressItem}>
                    <div style={styles.progressHeader}>
                      <span style={styles.progressTitle}>{data.title}</span>
                      <span style={styles.progressCount}>{data.count}/{data.total}</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${data.percentage}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Films You've Seen */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionDivider} />
              <span style={styles.sectionLabel}>Films You've Seen ({heartedMovies.length})</span>
              <div style={styles.sectionDivider} />
            </div>
            
            {heartedMovies.length === 0 ? (
              <div style={styles.emptyState}>
                <Check size={24} color="#9ca3af" style={styles.emptyIcon} />
                <p style={styles.emptyMessage}>No films marked as seen yet</p>
                <p style={styles.emptySubtext}>Use the check mark to track films you've watched</p>
              </div>
            ) : (
              <div style={styles.movieGrid}>
                {heartedMovies.map((movie) => (
                  <MediaCard 
                    key={movie.id || `${movie.title}-${movie.year}`}
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    initialPoster={movie.poster}
                    tmdbId={movie.tmdb_id || movie.tmdbId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Films to Watch */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionDivider} />
              <span style={styles.sectionLabel}>Films to Watch ({bookmarkedMovies.length})</span>
              <div style={styles.sectionDivider} />
            </div>
            
            {bookmarkedMovies.length === 0 ? (
              <div style={styles.emptyState}>
                <Plus size={24} color="#9ca3af" style={styles.emptyIcon} />
                <p style={styles.emptyMessage}>No films in your watchlist yet</p>
                <p style={styles.emptySubtext}>Use the plus icon to add films to watch later</p>
              </div>
            ) : (
              <div style={styles.movieGrid}>
                {bookmarkedMovies.map((movie) => (
                  <MediaCard 
                    key={movie.id || `${movie.title}-${movie.year}`}
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    initialPoster={movie.poster}
                    tmdbId={movie.tmdb_id || movie.tmdbId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Platforms */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionDivider} />
              <span style={styles.sectionLabel}>Streaming Platforms ({selectedPlatforms.length})</span>
              <div style={styles.sectionDivider} />
            </div>
            
            <div style={styles.platformContainer}>
              <PlatformSelector 
                onSelectionChange={handlePlatformSelectionChange}
                initialSelected={selectedPlatforms}
                showSelectedSection={false}
                showHeader={false}
              />
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
    backgroundColor: '#f9fafb',
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
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: '0 0 16px 0',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d4af37',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  },
  progressList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  progressItem: {
    padding: '8px 0',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  progressTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  progressCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4af37',
    transition: 'width 0.3s ease',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280',
  },
  emptyIcon: {
    marginBottom: '8px',
  },
  emptyMessage: {
    fontSize: '14px',
    fontWeight: '500',
    margin: '0 0 4px 0',
  },
  emptySubtext: {
    fontSize: '12px',
    margin: 0,
  },
  platformContainer: {
    // Platform selector inherits its styling
  }
};