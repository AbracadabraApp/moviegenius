/**
 * Netflix Best Movies Browse Page
 * 
 * Shows curated list of best movies available on Netflix
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import { ChevronLeft, Star } from 'lucide-react';
import { useRouter } from 'next/router';

export default function NetflixBestPage() {
  const router = useRouter();
  
  // Curated Netflix movies (these would come from the browse list system eventually)
  const netflixBestMovies = [
    {
      tmdbId: 278,
      title: "The Shawshank Redemption",
      year: 1994,
      rating: 9.3,
      genre: "Drama",
      description: "Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.",
      poster: "https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflyCy3dHqTLtfOr.jpg"
    },
    {
      tmdbId: 13,
      title: "Forrest Gump", 
      year: 1994,
      rating: 8.8,
      genre: "Drama, Romance",
      description: "The presidencies of Kennedy and Johnson through the eyes of an Alabama man with an IQ of 75.",
      poster: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg"
    },
    {
      tmdbId: 680,
      title: "Pulp Fiction",
      year: 1994, 
      rating: 8.9,
      genre: "Crime, Drama",
      description: "The lives of two mob hitmen, a boxer, and others intertwine in four tales of violence and redemption.",
      poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"
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
        {/* Header */}
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>
            <ChevronLeft size={20} color="#ffffff" />
          </button>
          <div style={styles.headerContent}>
            <div style={styles.platformBadge}>
              <span style={styles.platformText}>Netflix</span>
            </div>
            <h1 style={styles.title}>Best Movies</h1>
            <p style={styles.subtitle}>Handpicked Netflix favorites</p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchSection}>
          <SimpleSearch
            placeholder="Search Netflix movies..."
            useUnifiedSearch={true}
          />
        </div>

        {/* Movies Grid */}
        <div style={styles.moviesSection}>
          {netflixBestMovies.map((movie) => (
            <div 
              key={movie.tmdbId}
              style={styles.movieCard}
              onClick={() => handleMovieClick(movie)}
            >
              <img
                src={movie.poster}
                alt={movie.title}
                style={styles.poster}
                onError={(e) => {
                  e.target.src = '/images/placeholder-poster.jpg';
                }}
              />
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

        {/* Coming Soon Notice */}
        <div style={styles.comingSoon}>
          <p style={styles.comingSoonText}>
            🚀 More curated lists coming soon! This will connect to our browse list generation system.
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
    background: 'linear-gradient(135deg, #E50914 0%, #B20610 100%)',
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
    color: '#E50914',
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
    color: '#E50914',
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