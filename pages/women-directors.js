import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import BackButton from '../components/BackButton';
import MediaCard from '../components/MediaCard';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function WomenDirectorsPage() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchResults = (results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <BackButton variant="icon" context="theme" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search films by women directors..."
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
            <>
              <div style={styles.header}>
                <div style={styles.themeIcon}>🎬</div>
                <h1 style={styles.title}>Women Directors</h1>
                <p style={styles.description}>
                  Pioneering female voices who shaped cinema from behind the camera
                </p>
              </div>
              
              <div style={styles.content}>
                <p>Women directors content will be displayed here.</p>
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
    background: 'linear-gradient(135deg, #f3e8ff 0%, #a855f7 50%, #7c3aed 100%)',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: 'rgba(243, 232, 255, 0.95)',
    backdropFilter: 'blur(10px)',
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
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#581c87',
    marginBottom: '12px',
    textShadow: '0 2px 4px rgba(255, 255, 255, 0.3)',
  },
  description: {
    fontSize: '16px',
    color: '#6b21a8',
    lineHeight: '1.6',
    maxWidth: '300px',
    margin: '0 auto',
    fontWeight: '500',
  },
  content: {
    fontSize: '15px',
    color: '#581c87',
    lineHeight: '1.6',
  },
  searchResults: {
    
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#6b21a8',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  movieItem: {
    cursor: 'pointer',
  },
};