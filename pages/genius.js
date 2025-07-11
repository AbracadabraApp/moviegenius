/**
 * Genius Page - Clean theme selection with hero image
 * 
 * Restored original layout: Hero image + theme selection buttons
 * All functionality preserved: search, navigation, theme routing
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';

export default function GeniusPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);

  // All 10 education themes with direct navigation
  const allEducationThemes = [
    'Film Noir',
    'Horror & Suspense', 
    'Comedy',
    'Women Directors',
    'International Masters',
    'Acclaimed Directors',
    'Movements in Film',
    'The Magic of Moviemaking',
    'Cinema Through the Decades',
    'Hollywood Transformed'
  ];


  // Navigate directly to theme page
  const navigateToTheme = (theme) => {
    const themeRoutes = {
      'Film Noir': '/film-noir',
      'Horror & Suspense': '/horror-suspense', 
      'Comedy': '/comedy-through-time',
      'Women Directors': '/women-directors',
      'International Masters': '/world-cinema',
      'Acclaimed Directors': '/acclaimed-directors',
      'Movements in Film': '/avant-garde-film',
      'The Magic of Moviemaking': '/magic-of-moviemaking',
      'Cinema Through the Decades': '/cinema-through-decades',
      'Hollywood Transformed': '/cinema-cultural-impact'
    };
    
    const targetRoute = themeRoutes[theme];
    if (targetRoute) {
      router.push(targetRoute);
    }
  };

  // Handle search results - unified search redirects to /search page
  const handleSearchResults = () => {
    // With unified search, this won't be called since search redirects to /search page
    // Kept for compatibility if useUnifiedSearch is disabled
  };

  // Handle "Enjoy the Show" button click
  const handleEnjoyTheShow = () => {
    setShowModal(false);
  };

  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Search Section at Top */}
        <div style={styles.searchSection}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search movies..."
          />
        </div>

        {/* Hero Section with Black Background */}
        <div style={styles.heroSection}>
          {/* Hero Text */}
          <div style={styles.heroText}>
            <div style={styles.heroMainText}>DON'T BINGE WATCH TV</div>
            <div style={styles.heroSubText}>FEAST ON GREAT FILMS INSTEAD</div>
          </div>
          
          {/* Hero Image */}
          <div style={styles.heroImageContainer}>
            <img 
              src="/images/hero-rotation/hero-8.jpg" 
              alt="Film Education Hero" 
              style={styles.heroImage} 
            />
          </div>
        </div>

        {/* Theme Selection */}
        <div style={styles.contentSection}>
          <div style={styles.questionSection}>
            <h2 style={styles.sectionQuestion}>Which film topics interest you most?</h2>
          </div>
          
          <div style={styles.themeGrid}>
            {allEducationThemes.map(theme => (
              <button
                key={theme}
                onClick={() => navigateToTheme(theme)}
                style={styles.themeButton}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Modal with Manifesto */}
        {showModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Welcome to MovieGenius</h2>
              <div style={styles.manifestoText}>
                <p>Break free from the endless scroll of mindless content.</p>
                <p>Instead of binge-watching forgettable series, feast on cinematic masterpieces that have shaped our culture and inspired generations.</p>
                <p>MovieGenius curates the greatest films ever made, organized by themes, movements, and the visionary directors who created them.</p>
                <p>Every recommendation is a doorway to deeper understanding of the art of cinema.</p>
              </div>
              <button 
                onClick={handleEnjoyTheShow}
                style={styles.enjoyButton}
              >
                Enjoy the Show
              </button>
            </div>
          </div>
        )}
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
  searchSection: {
    padding: '16px 20px',
    backgroundColor: '#000000',
  },
  heroSection: {
    backgroundColor: '#000000',
  },
  heroText: {
    backgroundColor: '#000000',
    padding: '0px 20px 14px 20px',
    textAlign: 'center',
  },
  heroImageContainer: {
    height: '160px',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroMainText: {
    fontSize: '22px',
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: '1px',
    lineHeight: '1.1',
    marginBottom: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    whiteSpace: 'nowrap',
  },
  heroSubText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#d4af37',
    letterSpacing: '0.5px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    whiteSpace: 'nowrap',
  },
  contentSection: {
    flex: 1,
    padding: '20px 20px',
    backgroundColor: '#000000',
    overflowY: 'auto',
  },
  questionSection: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  sectionQuestion: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
    lineHeight: '1.3',
    whiteSpace: 'nowrap',
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  themeButton: {
    padding: '12px 8px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    lineHeight: '1.2',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    wordBreak: 'normal',
    hyphens: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px 24px',
    margin: '20px',
    maxWidth: '320px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#000000',
    marginBottom: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  manifestoText: {
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#374151',
    marginBottom: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  enjoyButton: {
    backgroundColor: '#d4af37',
    color: '#000000',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
};