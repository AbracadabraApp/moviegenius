// Hollywood Transformed theme page
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import EssentialMovies from '../components/EssentialMovies';
import ThemeFooter from '../components/ThemeFooter';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import themeMapping from '../data/theme-episode-mapping.json';

export default function CinemaCulturalImpactPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const themeKey = 'cinema-cultural-impact';
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
    router.push(`/${themeKey}/${episode.id}`);
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
    <PhoneFrame active="genius">
      <div style={styles.container}>
        
        {/* Search Area */}
        <div style={styles.inputArea}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder={`Search ${themeData.title.toLowerCase()} movies...`}
          />
        </div>
        
        <video 
          src="/images/hero/cultural-impact/cultural1.mov" 
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
          
          {/* Theme Footer - Navigation for other themes */}
          <ThemeFooter currentTheme={themeKey} />
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
};
