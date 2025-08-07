/**
 * Test Page for New Apple-Style Glass Movie Cards
 * 
 * View at: http://localhost:3000/test-glass-cards
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import MovieCardGlass from '../components/MovieCardGlass';
import MovieScrollContainer from '../components/MovieScrollContainer';
import MovieDiscoverySection from '../components/MovieDiscoverySection';

export default function TestGlassCards() {
  // Sample movie data for testing
  const sampleMovies = [
    {
      tmdbId: 278,
      title: "The Shawshank Redemption",
      year: 1994,
      slug: "Hope Sets You Free",
      poster_url: "https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
      trailer_url: "https://www.youtube.com/watch?v=6hB3S9bIaco"
    },
    {
      tmdbId: 238,
      title: "The Godfather",
      year: 1972,
      slug: "An offer you can't refuse",
      poster_url: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      trailer_url: "https://www.youtube.com/watch?v=sY1S34973zA"
    },
    {
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      slug: "Mischief. Mayhem. Soap.",
      poster_url: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      trailer_url: "https://www.youtube.com/watch?v=SUXWAEX2jlg"
    },
    {
      tmdbId: 155,
      title: "The Dark Knight",
      year: 2008,
      slug: "Welcome to a world without rules",
      poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      trailer_url: "https://www.youtube.com/watch?v=EXeTwQWrcwY"
    },
    {
      tmdbId: 680,
      title: "Pulp Fiction",
      year: 1994,
      slug: "Girls like me don't make invitations like this to just anyone",
      poster_url: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      trailer_url: "https://www.youtube.com/watch?v=s7EdQ4FqbhY"
    },
    {
      tmdbId: 13,
      title: "Forrest Gump",
      year: 1994,
      slug: "Life is like a box of chocolates",
      poster_url: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
      trailer_url: "https://www.youtube.com/watch?v=bLvqoHBptjg"
    },
    {
      tmdbId: 11,
      title: "Star Wars",
      year: 1977,
      slug: "A long time ago in a galaxy far, far away",
      poster_url: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
      trailer_url: "https://www.youtube.com/watch?v=vZ734NWnAHA"
    },
    {
      tmdbId: 122,
      title: "The Lord of the Rings: The Return of the King",
      year: 2003,
      slug: "The eye of the enemy is moving",
      poster_url: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
      trailer_url: "https://www.youtube.com/watch?v=r5X-hFf6Bwo"
    }
  ];

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🎬 Glass Card Components</h1>
          <p style={styles.subtitle}>Testing Apple-style movie cards</p>
        </div>

        {/* Individual Card Sizes */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Individual Cards</h2>
          
          <div style={styles.cardGrid}>
            <div style={styles.cardDemo}>
              <h3 style={styles.cardLabel}>Small</h3>
              <MovieCardGlass 
                {...sampleMovies[0]} 
                size="small"
                showTrailer={true}
              />
            </div>
            
            <div style={styles.cardDemo}>
              <h3 style={styles.cardLabel}>Medium</h3>
              <MovieCardGlass 
                {...sampleMovies[1]} 
                size="medium"
                showTrailer={true}
              />
            </div>
            
            <div style={styles.cardDemo}>
              <h3 style={styles.cardLabel}>Large</h3>
              <MovieCardGlass 
                {...sampleMovies[2]} 
                size="large"
                showTrailer={true}
              />
            </div>
          </div>
        </div>

        {/* Horizontal Scrolling Container */}
        <div style={styles.section}>
          <MovieScrollContainer 
            title="Popular Movies" 
            showNavigation={true}
          >
            {sampleMovies.map(movie => (
              <MovieCardGlass 
                key={movie.tmdbId} 
                {...movie} 
                size="medium"
                showTrailer={true}
                onMovieClick={(movie) => console.log('Movie clicked:', movie.title)}
              />
            ))}
          </MovieScrollContainer>
        </div>

        {/* Discovery Section with API integration */}
        <div style={styles.section}>
          <MovieDiscoverySection 
            title="Top Rated Movies"
            movies={sampleMovies.slice(0, 6)} // Use sample data instead of API for testing
            cardSize="medium"
            showTrailers={true}
            onMovieClick={(movie) => console.log('Discovery clicked:', movie.title)}
          />
        </div>

        {/* Different backgrounds to test translucency */}
        <div style={styles.backgroundTest}>
          <h2 style={styles.sectionTitle}>Background Test</h2>
          <p style={styles.backgroundNote}>
            Testing translucent cards over different backgrounds
          </p>
          <div style={styles.coloredBackground}>
            <MovieCardGlass 
              {...sampleMovies[3]} 
              size="medium"
              showTrailer={true}
            />
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            🔍 Check browser console for click events<br/>
            📱 Test on mobile for touch interactions
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    padding: '0 0 40px 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  
  header: {
    padding: '20px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  
  subtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  
  section: {
    margin: '40px 0',
    padding: '0 20px',
  },
  
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 20px 0',
  },
  
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  
  cardDemo: {
    textAlign: 'center',
  },
  
  cardLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  
  backgroundTest: {
    margin: '40px 0',
    padding: '20px',
  },
  
  backgroundNote: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 20px 0',
    textAlign: 'center',
  },
  
  coloredBackground: {
    background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)',
    padding: '40px',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  
  footer: {
    padding: '20px',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    marginTop: '40px',
  },
  
  footerText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
};