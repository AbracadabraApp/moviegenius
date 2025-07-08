// Film Noir theme page
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import themeMapping from '../data/theme-episode-mapping.json';

export default function FilmNoirPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const themeData = themeMapping.themes['film-noir'];

  const handleSearchResults = (results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };
  
  const handleEpisodeClick = (episode) => {
    router.push(`/film-noir/${episode.id}`);
  };
  
  useEffect(() => {
    if (themeData) {
      setEpisodes(themeData.episodes);
      setLoading(false);
    }
  }, [themeData]);

  if (!themeData) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.errorText}>Theme not found</div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        
        {/* Search Area */}
        <div style={styles.inputArea}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search film noir movies..."
          />
        </div>
        
        {/* Content Area */}
        <div style={styles.contentArea}>
          
          {/* Hero Section */}
          <div style={styles.heroSection}>
            <video 
              src="/images/hero/film-noir/noir2.mov" 
              autoPlay
              muted
              loop
              playsInline
              style={styles.heroImage}
            />
          </div>
          <button style={styles.heroTitleButton}>
            <h1 style={styles.heroTitle}>Film Noir</h1>
            <p style={styles.heroSubtitle}>Shadows, moral ambiguity, and the dark side of cinema</p>
          </button>
          
          {showSearchResults ? (
            <div style={styles.searchResults}>
              <div style={styles.resultsHeader}>
                <span>{searchResults.length} movie{searchResults.length !== 1 ? 's' : ''} found</span>
              </div>
              <div style={styles.movieList}>
                {searchResults.map((movie, index) => (
                  <div key={`${movie.tmdb_id || movie.title}-${index}`} onClick={() => handleMovieClick(movie)} style={styles.movieItem}>
                    <MediaCard
                      title={movie.title}
                      year={movie.year}
                      initialSlug={movie.slug}
                      initialPoster={movie.poster_url}
                      initialStreaming={movie.streaming_data}
                      tmdbId={movie.tmdb_id}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.episodesSection}>
              {loading ? (
                <div style={styles.loadingText}>Loading episodes...</div>
              ) : (
                <div style={styles.episodeGrid}>
                  {episodes.map((episode, index) => (
                    <button 
                      key={episode.id}
                      style={styles.episodeButton}
                      onClick={() => handleEpisodeClick(episode)}
                    >
                      <div style={styles.episodeButtonTitle}>{episode.title}</div>
                      <div style={styles.episodeButtonSubtitle}>{episode.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Theme Navigation */}
          <div style={styles.navigationSection}>
            <h3 style={styles.navigationTitle}>Explore Other Themes</h3>
            <div style={styles.themeGrid}>
              {Object.entries(themeMapping.themes).map(([themeKey, themeInfo]) => {
                if (themeKey === 'film-noir') return null; // Hide current theme
                return (
                  <button
                    key={themeKey}
                    onClick={() => router.push(`/${themeKey}`)}
                    style={styles.themeButton}
                  >
                    <div style={styles.themeButtonTitle}>{themeInfo.title}</div>
                    <div style={styles.themeButtonDescription}>{themeInfo.description}</div>
                  </button>
                );
              })}
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
    backgroundColor: '#ffffff',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#1a1a1a',
  },
  contentArea: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '0',
    background: 'linear-gradient(to bottom, #1a1a1a 0%, #374151 100%)',
  },
  
  // Hero Section Styles
  heroSection: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2 / 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '0',
    borderRadius: '0',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '120%',
    height: '120%',
    objectFit: 'cover',
    objectPosition: 'center center',
    transform: 'translate(-8.33%, -8.33%)',
    zIndex: 1,
  },
  heroTitleButton: {
    backgroundColor: '#1a1a1a',
    padding: '4px 20px 16px 20px',
    textAlign: 'left',
    paddingLeft: '36px',
    borderLeft: '8px solid #d4af37',
    border: 'none',
    width: '100%',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    wordWrap: 'break-word',
    hyphens: 'auto',
  },
  heroSubtitle: {
    fontSize: '16px',
    color: '#d4af37',
    lineHeight: '1.3',
    margin: 0,
    opacity: 1,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
    wordWrap: 'break-word',
    hyphens: 'auto',
  },
  
  searchResults: {
    padding: '16px',
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '8px',
  },
  resultsHeader: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  movieItem: {
    cursor: 'pointer',
  },
  episodesSection: {
    padding: '16px',
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '8px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '40px 0',
  },
  episodeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    justifyItems: 'start',
  },
  episodeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    width: '280px',
  },
  episodeButtonTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  episodeButtonSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    textAlign: 'center',
    padding: '40px 0',
  },
  
  // Navigation Styles
  navigationSection: {
    marginTop: '40px',
    padding: '0 16px',
  },
  navigationTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: '16px',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    justifyItems: 'start',
  },
  themeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    width: '280px',
  },
  themeButtonTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '6px',
    lineHeight: '1.3',
  },
  themeButtonDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
};