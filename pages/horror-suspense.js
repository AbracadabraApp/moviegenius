import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import BackButton from '../components/BackButton';
import MediaCard from '../components/MediaCard';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function HorrorSuspensePage() {
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
            placeholder="Search horror movies..."
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
                <div style={styles.themeIcon}>🎭</div>
                <h1 style={styles.title}>Horror & Suspense</h1>
                <p style={styles.description}>
                  From psychological thrillers to supernatural terror, explore cinema's darkest corners
                </p>
              </div>
              
              <div style={styles.content}>
                <p>Horror and suspense content will be displayed here.</p>
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
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b2d 50%, #1a1a1a 100%)',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '12px',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
  },
  description: {
    fontSize: '16px',
    color: '#d1d5db',
    lineHeight: '1.6',
    maxWidth: '300px',
    margin: '0 auto',
  },
  content: {
    fontSize: '15px',
    color: '#e5e7eb',
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
    color: '#d1d5db',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  movieItem: {
    cursor: 'pointer',
  },
};