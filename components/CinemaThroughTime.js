import React, { useState, useEffect } from 'react';

const cinemaEras = [
  {
    era: 'Silent Era',
    years: '1890s-1920s',
    image: '/images/hero-rotation/hero-1.jpg',
    description: 'Birth of Cinema',
    films: ['Metropolis', 'The Cabinet of Dr. Caligari', 'Nosferatu'],
  },
  {
    era: 'Golden Age',
    years: '1930s-1950s',
    image: '/images/hero-rotation/hero-2.jpg',
    description: "Hollywood's Classic Period",
    films: ['Casablanca', 'Citizen Kane', 'Sunset Boulevard'],
  },
  {
    era: 'New Hollywood',
    years: '1960s-1970s',
    image: '/images/hero-rotation/hero-3.jpg',
    description: 'Auteur Revolution',
    films: ['The Godfather', 'Taxi Driver', 'Apocalypse Now'],
  },
  {
    era: 'Blockbuster Era',
    years: '1980s-1990s',
    image: '/images/hero-rotation/hero-4.jpg',
    description: 'Big Budget Spectacles',
    films: ['Star Wars', 'Jurassic Park', 'Terminator 2'],
  },
  {
    era: 'Digital Age',
    years: '2000s-Present',
    image: '/images/hero-rotation/hero-5.jpg',
    description: 'CGI and Streaming',
    films: ['Avatar', 'The Matrix', 'Parasite'],
  },
];

export default function CinemaThroughTime() {
  const [currentEra, setCurrentEra] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      const containerHeight =
        document.getElementById('cinema-container')?.offsetHeight || window.innerHeight;
      const scrollPercent = currentScrollY / (containerHeight * 0.8);
      const newEra = Math.min(
        Math.max(Math.floor(scrollPercent * cinemaEras.length), 0),
        cinemaEras.length - 1
      );
      setCurrentEra(newEra);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cinemaEras.length]);

  const currentData = cinemaEras[currentEra];

  return (
    <div id="cinema-container" style={styles.container}>
      <div
        style={{
          ...styles.background,
          backgroundImage: `url(${currentData.image})`,
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      />

      <div style={styles.overlay} />

      <div style={styles.content}>
        <div style={styles.eraInfo}>
          <h1 style={styles.eraTitle}>{currentData.era}</h1>
          <p style={styles.eraYears}>{currentData.years}</p>
          <p style={styles.eraDescription}>{currentData.description}</p>
        </div>

        <div style={styles.filmList}>
          <h3 style={styles.filmListTitle}>Iconic Films</h3>
          {currentData.films.map((film, index) => (
            <div key={index} style={styles.filmItem}>
              {film}
            </div>
          ))}
        </div>

        <div style={styles.progressIndicator}>
          {cinemaEras.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.progressDot,
                backgroundColor: index === currentEra ? '#fff' : 'rgba(255, 255, 255, 0.4)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '120%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'background-image 0.8s ease-in-out',
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7))',
    zIndex: 2,
  },
  content: {
    position: 'relative',
    zIndex: 3,
    textAlign: 'center',
    color: 'white',
    padding: '0 20px',
    maxWidth: '600px',
  },
  eraInfo: {
    marginBottom: '40px',
  },
  eraTitle: {
    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
    fontWeight: '900',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    letterSpacing: '2px',
  },
  eraYears: {
    fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
    margin: '0 0 15px 0',
    opacity: 0.9,
    fontWeight: '300',
    letterSpacing: '1px',
  },
  eraDescription: {
    fontSize: 'clamp(1rem, 3vw, 1.4rem)',
    margin: '0',
    opacity: 0.8,
    fontWeight: '400',
  },
  filmList: {
    marginBottom: '40px',
  },
  filmListTitle: {
    fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
    margin: '0 0 20px 0',
    fontWeight: '600',
    letterSpacing: '1px',
  },
  filmItem: {
    fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
    margin: '8px 0',
    opacity: 0.9,
    fontStyle: 'italic',
  },
  progressIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  progressDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'background-color 0.3s ease',
  },
};
