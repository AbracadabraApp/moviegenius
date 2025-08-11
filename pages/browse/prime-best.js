/**
 * Amazon Prime Best Movies Browse Page
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import { ChevronLeft, Star } from 'lucide-react';
import { useRouter } from 'next/router';

export default function PrimeBestPage() {
  const router = useRouter();
  
  const primeBestMovies = [
    {
      tmdbId: 238,
      title: "The Godfather",
      year: 1972,
      rating: 9.2,
      genre: "Crime, Drama",
      description: "The aging patriarch of an organized crime dynasty transfers control of his empire to his reluctant son.",
      poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg"
    },
    {
      tmdbId: 424,
      title: "Schindler's List", 
      year: 1993,
      rating: 9.0,
      genre: "Biography, Drama, History",
      description: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce.",
      poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg"
    },
    {
      tmdbId: 240,
      title: "The Godfather Part II",
      year: 1974,
      rating: 9.0,
      genre: "Crime, Drama", 
      description: "The early life and career of Vito Corleone in 1920s New York City is portrayed, while his son, Michael, expands the family business.",
      poster: "https://image.tmdb.org/t/p/w500/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg"
    }
  ];

  const handleMovieClick = (movie) => {
    router.push(`/movie/${movie.tmdbId}`);
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>
            <ChevronLeft size={20} color="#ffffff" />
          </button>
          <div style={styles.headerContent}>
            <div style={styles.platformBadge}>
              <span style={styles.platformText}>Prime Video</span>
            </div>
            <h1 style={styles.title}>Best Movies</h1>
            <p style={styles.subtitle}>Prime's greatest films</p>
          </div>
        </div>

        <div style={styles.searchSection}>
          <SimpleSearch placeholder="Search Prime movies..." useUnifiedSearch={true} />
        </div>

        <div style={styles.moviesSection}>
          {primeBestMovies.map((movie) => (
            <div 
              key={movie.tmdbId}
              style={styles.movieCard}
              onClick={() => handleMovieClick(movie)}
            >
              <img src={movie.poster} alt={movie.title} style={styles.poster} />
              <div style={styles.movieInfo}>
                <h3 style={styles.movieTitle}>{movie.title}</h3>
                <div style={styles.movieMeta}>
                  <span style={styles.year}>{movie.year}</span>
                  <span style={styles.genre}>{movie.genre}</span>
                  <div style={styles.rating}>
                    <Star size={12} color="#d4af37" fill="#d4af37" />
                    <span>{movie.rating}</span>
                  </div>
                </div>
                <p style={styles.description}>{movie.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.comingSoon}>
          <p style={styles.comingSoonText}>
            🚀 Connecting to browse list generation system soon!
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#ffffff'
  },

  header: {
    background: 'linear-gradient(135deg, #00A8E1 0%, #0073A8 100%)',
    padding: '16px 20px 20px 20px',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },

  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    marginTop: '4px'
  },

  headerContent: {
    flex: 1
  },

  platformBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '6px',
    padding: '4px 12px',
    marginBottom: '8px',
    display: 'inline-block'
  },

  platformText: {
    color: '#00A8E1',
    fontSize: '12px',
    fontWeight: '700'
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0'
  },

  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0
  },

  searchSection: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0'
  },

  moviesSection: {
    padding: '16px 20px',
    flex: 1
  },

  movieCard: {
    display: 'flex',
    marginBottom: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },

  poster: {
    width: '100px',
    height: '150px',
    objectFit: 'cover'
  },

  movieInfo: {
    padding: '16px',
    flex: 1
  },

  movieTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
    lineHeight: '1.2'
  },

  movieMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '12px'
  },

  year: {
    color: '#6b7280',
    fontWeight: '500'
  },

  genre: {
    color: '#00A8E1',
    fontWeight: '500'
  },

  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#d4af37',
    fontWeight: '600',
    marginLeft: 'auto'
  },

  description: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: 0
  },

  comingSoon: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #f0f0f0',
    textAlign: 'center'
  },

  comingSoonText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    fontStyle: 'italic'
  }
};