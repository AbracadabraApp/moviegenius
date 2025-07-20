// components/FeaturedFilmsSection.EXPERIMENT.js - EXPERIMENT: Using MovieHeader cards for Related Movies
import React, { memo } from 'react';
import MovieHeaderLarge from './MovieHeaderLarge';

function FeaturedFilmsSectionExperiment({ movies, title = 'Featured Films', style = {} }) {
  // Debug logging
  console.log('🧪 EXPERIMENT FeaturedFilmsSection:', {
    title,
    moviesCount: movies?.length,
    movies: movies?.slice(0, 3).map(m => ({ title: m.title, year: m.year, tmdb_id: m.tmdb_id })),
  });

  if (!movies || movies.length === 0) {
    console.log('🧪 EXPERIMENT FeaturedFilmsSection: No movies to display');
    return null;
  }

  return (
    <div style={{ ...styles.movieSection, ...style }}>
      <div style={styles.movieSectionHeader}>
        <div style={styles.sectionDivider} />
        <span style={styles.sectionLabel}>{title}</span>
        <div style={styles.sectionDivider} />
      </div>

      {/* EXPERIMENT: Individual MovieHeader cards instead of grid */}
      <div style={styles.movieHeaderGrid}>
        {movies
          .filter(movie => movie.tmdb_id) // Only show movies with TMDB IDs
          .slice(0, 3) // Limit to 3 for visual testing
          .map((movie, movieIndex) => (
            <div
              key={`${movie.title}-${movie.year}-${movieIndex}`}
              style={styles.movieHeaderWrapper}
            >
              <div style={styles.movieHeaderCard}>
                <div style={styles.experimentLabel}>🧪 EXPERIMENT</div>
                <MovieHeaderLarge
                  title={movie.title}
                  year={movie.year}
                  initialSlug={
                    movie.description || movie.overview || `${movie.title} (${movie.year})`
                  }
                  initialPoster={movie.poster || movie.poster_url}
                  initialStreaming={movie.initialStreaming || movie.streaming}
                  tmdbId={movie.tmdb_id}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

const styles = {
  movieSection: {
    marginBottom: '24px',
    padding: '0 16px',
  },

  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    paddingTop: '8px',
  },

  sectionDivider: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
  },

  sectionLabel: {
    margin: '0 16px',
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#000',
    whiteSpace: 'nowrap',
  },

  // EXPERIMENT: New grid layout for MovieHeader cards
  movieHeaderGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 8px',
  },

  movieHeaderWrapper: {
    display: 'flex',
    justifyContent: 'center',
  },

  movieHeaderCard: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    border: '2px solid #FFD700',
    position: 'relative',
    transform: 'scale(0.9)', // Scale down to fit better
    transformOrigin: 'top center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },

  experimentLabel: {
    position: 'absolute',
    top: '-8px',
    right: '16px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '12px',
    zIndex: 10,
  },
};

export default memo(FeaturedFilmsSectionExperiment);
