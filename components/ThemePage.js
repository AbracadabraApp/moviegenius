// Reusable theme page component
import PhoneFrame from './PhoneFrame';
import SimpleSearch from './SimpleSearch';
import MediaCard from './MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import themeMapping from '../data/theme-episode-mapping.json';

export default function ThemePage({ themeId, customStyles = {} }) {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const themeData = themeMapping.themes[themeId];

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
    router.push(`/${themeId}/${episode.id}`);
  };
  
  useEffect(() => {
    if (themeData) {
      setEpisodes(themeData.episodes);
      setLoading(false);
    }
  }, [themeData]);

  if (!themeData) {
    return (
      <PhoneFrame active="genius">
        <div style={styles.container}>
          <div style={styles.errorText}>Theme not found</div>
        </div>
      </PhoneFrame>
    );
  }

  const mergedStyles = {
    ...styles,
    ...customStyles
  };

  return (
    <PhoneFrame active="genius">
      <div style={mergedStyles.container || styles.container}>
        
        <div style={mergedStyles.fixedInputArea || styles.fixedInputArea}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder={`Search ${themeData.title.toLowerCase()} movies...`}
          />
        </div>
        
        <div style={mergedStyles.scrollableContent || styles.scrollableContent}>
          {showSearchResults ? (
            <div style={mergedStyles.searchResults || styles.searchResults}>
              <div style={mergedStyles.resultsHeader || styles.resultsHeader}>
                <span>{searchResults.length} movie{searchResults.length !== 1 ? 's' : ''} found</span>
              </div>
              <div style={mergedStyles.movieList || styles.movieList}>
                {searchResults.map((movie, index) => (
                  <div key={`${movie.tmdb_id || movie.title}-${index}`} onClick={() => handleMovieClick(movie)} style={mergedStyles.movieItem || styles.movieItem}>
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
            <>
              <div style={mergedStyles.header || styles.header}>
                {customStyles.themeIcon && (
                  <div style={styles.themeIcon}>{customStyles.themeIcon}</div>
                )}
                <h1 style={mergedStyles.title || styles.title}>{themeData.title}</h1>
                <p style={mergedStyles.description || styles.description}>
                  {themeData.description}
                </p>
              </div>
              
              <div style={mergedStyles.episodesSection || styles.episodesSection}>
                <h2 style={mergedStyles.sectionTitle || styles.sectionTitle}>Episodes</h2>
                {loading ? (
                  <div style={mergedStyles.loadingText || styles.loadingText}>Loading episodes...</div>
                ) : (
                  <div style={mergedStyles.episodeList || styles.episodeList}>
                    {episodes.map((episode, index) => (
                      <div 
                        key={episode.id}
                        style={mergedStyles.episodeCard || styles.episodeCard}
                        onClick={() => handleEpisodeClick(episode)}
                        onMouseEnter={(e) => {
                          if (mergedStyles.episodeCardHover) {
                            Object.assign(e.target.style, mergedStyles.episodeCardHover);
                          }
                        }}
                        onMouseLeave={(e) => {
                          Object.assign(e.target.style, mergedStyles.episodeCard || styles.episodeCard);
                        }}
                      >
                        <h3 style={mergedStyles.episodeTitle || styles.episodeTitle}>{episode.title}</h3>
                        <p style={mergedStyles.episodeSubtitle || styles.episodeSubtitle}>{episode.subtitle}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
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
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  themeIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  description: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  searchResults: {
    
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movieItem: {
    cursor: 'pointer',
  },
  episodesSection: {
    marginTop: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  episodeCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: 0,
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '40px',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    textAlign: 'center',
    padding: '40px',
  },
};