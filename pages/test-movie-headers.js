// pages/test-movie-headers.js - Test page for MovieHeaderCompact component
import { useState } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import MovieHeaderCompact from '../components/MovieHeaderCompact';

export default function TestMovieHeaders() {
  const [selectedMovie, setSelectedMovie] = useState(null);

  // Sample movie data for testing
  const sampleMovies = [
    {
      tmdbId: 550,
      title: 'Fight Club',
      year: 1999,
      posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      voteAverage: 8.4,
      streamingInfo: 'Available on Netflix, Hulu'
    },
    {
      tmdbId: 238,
      title: 'The Godfather',
      year: 1972,
      posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      voteAverage: 9.2,
      streamingInfo: 'Streaming on Paramount+'
    },
    {
      tmdbId: 155,
      title: 'The Dark Knight',
      year: 2008,
      posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      voteAverage: 9.0,
      streamingInfo: 'Rent on Prime Video'
    },
    {
      tmdbId: 13,
      title: 'Forrest Gump',
      year: 1994,
      posterUrl: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
      voteAverage: 8.8,
      streamingInfo: 'Available on Netflix'
    },
    {
      tmdbId: 680,
      title: 'Pulp Fiction',
      year: 1994,
      posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      voteAverage: 8.9,
      streamingInfo: 'Streaming on Prime Video'
    },
    {
      tmdbId: 27205,
      title: 'Inception',
      year: 2010,
      posterUrl: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
      voteAverage: 8.8,
      streamingInfo: 'Available on HBO Max'
    }
  ];

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
    console.log('Movie clicked:', movie.title);
    // In real app, would navigate to /movie/${movie.tmdbId}
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Movie Header Test</h1>
          <p style={styles.subtitle}>Testing MovieHeaderCompact component with sample data</p>
        </div>

        {/* Selected Movie Display */}
        {selectedMovie && (
          <div style={styles.selectedSection}>
            <h2 style={styles.selectedTitle}>Selected Movie:</h2>
            <div style={styles.selectedInfo}>
              <strong>{selectedMovie.title}</strong> ({selectedMovie.year}) - Rating: {selectedMovie.voteAverage}
            </div>
          </div>
        )}

        {/* Movie Grid */}
        <div style={styles.content}>
          <div style={styles.movieGrid}>
            {sampleMovies.map((movie) => (
              <MovieHeaderCompact
                key={movie.tmdbId}
                title={movie.title}
                year={movie.year}
                tmdbId={movie.tmdbId}
                posterUrl={movie.posterUrl}
                voteAverage={movie.voteAverage}
                streamingInfo={movie.streamingInfo}
                onMovieClick={() => handleMovieClick(movie)}
              />
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <h3 style={styles.instructionsTitle}>Testing Features:</h3>
          <ul style={styles.instructionsList}>
            <li>Click on any movie poster to test onMovieClick</li>
            <li>Use the floating action bar to test Add/Seen/Play buttons</li>
            <li>Hover over action bars to see scaling animation</li>
            <li>Movies with trailers will show a Play button</li>
            <li>Progress is saved to localStorage via FavoritesManager</li>
          </ul>
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
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  selectedSection: {
    backgroundColor: '#dbeafe',
    padding: '12px 16px',
    borderBottom: '1px solid #bfdbfe',
  },
  selectedTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    margin: '0 0 4px 0',
  },
  selectedInfo: {
    fontSize: '14px',
    color: '#1e40af',
    margin: 0,
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  instructions: {
    backgroundColor: '#ffffff',
    margin: '16px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  instructionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 12px 0',
  },
  instructionsList: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    paddingLeft: '20px',
  },
};