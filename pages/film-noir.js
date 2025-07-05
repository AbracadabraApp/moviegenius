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
        
        <div style={styles.fixedInputArea}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search film noir movies..."
          />
        </div>
        
        <div style={styles.scrollableContent}>
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
                <div style={styles.episodeList}>
                  {episodes.map((episode, index) => (
                    <div 
                      key={episode.id}
                      style={styles.episodeCard}
                      onClick={() => handleEpisodeClick(episode)}
                    >
                      <h3 style={styles.episodeTitle}>{episode.title}</h3>
                      <p style={styles.episodeSubtitle}>{episode.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    borderBottom: '1px solid #e5e7eb',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px',
  },
  searchResults: {
    marginTop: '16px',
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
    marginTop: '16px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '40px 0',
  },
  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  episodeCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.3',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.4',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    textAlign: 'center',
    padding: '40px 0',
  },
};