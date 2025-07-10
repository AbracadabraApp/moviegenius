// Film Noir theme page
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import EssentialMovies from '../components/EssentialMovies';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import themeMapping from '../data/theme-episode-mapping.json';

export default function FilmNoirPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const themeKey = 'film-noir';
  const themeData = themeMapping.themes[themeKey];

  const handleSearchResults = (results) => {
    // Multi-search returns {movies: [], people: []} - extract movies array
    const movies = results.movies || results || [];
    setSearchResults(movies);
    setShowSearchResults(movies.length > 0);
  };

  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };
  
  const handleEpisodeClick = (episode) => {
    router.push(`/genius/${themeKey}/1/${episode.id}`);
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
            placeholder={`Search ${themeData.title.toLowerCase()} movies...`}
          />
        </div>
        
        <video 
          src="/images/hero/film-noir/noir2.mov" 
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: '2.22 / 1',
            objectFit: 'cover'
          }}
        />

        {/* Content Area */}
        <div style={styles.contentArea}>
          
          {/* Essential Movies */}
          <EssentialMovies theme={themeKey} />
          
          {showSearchResults && (
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
          )}
          
          {/* Theme Navigation */}
          <div style={styles.navigationSection}>
            <div style={styles.navigationHeader}>
              <div style={styles.navigationDivider} />
              <span style={styles.navigationLabel}>Explore Other Themes</span>
              <div style={styles.navigationDivider} />
            </div>
            <div style={styles.themeGrid}>
              {Object.entries(themeMapping.themes).map(([otherThemeKey, themeInfo]) => {
                if (otherThemeKey === themeKey) return null; // Hide current theme
                return (
                  <button
                    key={otherThemeKey}
                    onClick={() => router.push(`/${otherThemeKey}`)}
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
    padding: '0',
    background: 'linear-gradient(to bottom, #1a1a1a 0%, #374151 100%)',
  },
  
  // Hero Section Styles
  heroSection: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2.22 / 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '0',
    borderRadius: '0',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a1a1a 100%)',
  },
  heroTitleOverlay: {
    position: 'absolute',
    top: '80%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '2px 20px 0px 20px',
    textAlign: 'left',
    zIndex: 10,
  },
  subheadlineSection: {
    backgroundColor: '#000000',
    padding: '2px 20px 12px 20px',
    textAlign: 'left',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'white',
    margin: '0',
    lineHeight: '1.2',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    wordWrap: 'break-word',
    hyphens: 'auto',
  },
  heroSubtitle: {
    fontSize: '14px',
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
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    textAlign: 'center',
    padding: '40px 0',
  },
  
  // Navigation Styles
  navigationSection: {
    backgroundColor: '#ffffff',
    margin: '16px',
    marginBottom: '76px',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  navigationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  navigationDivider: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d4af37',
  },
  navigationLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
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
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
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
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  themeButtonDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
};