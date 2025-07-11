/**
 * Genius Page - 🔒 LOCKED COMPONENT 🔒
 * @locked true
 * 
 * Main entry point with personal brand manifesto and theme navigation.
 * Contains owner's personal statement about product vision.
 * 
 * PROTECTED: Manifesto text, hero messaging, theme navigation
 * See genius.js.LOCK for detailed protection rules
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import Link from 'next/link';

export default function GeniusPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // Check if user has seen the modal before
  useEffect(() => {
    const hasSeenModal = localStorage.getItem('moviegenius-modal-seen');
    if (!hasSeenModal) {
      setShowModal(true);
    }
  }, []);

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



  // Handle search results - unified search redirects to /search page
  const handleSearchResults = () => {
    // With unified search, this won't be called since search redirects to /search page
    // Kept for compatibility if useUnifiedSearch is disabled
  };

  // Handle "Enjoy the Show" button click
  const handleEnjoyTheShow = () => {
    setShowModal(false);
    localStorage.setItem('moviegenius-modal-seen', 'true');
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
            {allEducationThemes.map(theme => {
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
              return (
                <div
                  key={theme}
                  style={{...styles.themeButton, cursor: 'pointer'}}
                  onClick={() => {
                    console.log('Theme div clicked:', themeRoutes[theme]);
                    window.location.href = themeRoutes[theme];
                  }}
                >
                  {theme}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal with Manifesto */}
        {showModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Welcome to MovieGenius</h2>
              {/* 🔒 LOCKED: Personal manifesto text - DO NOT MODIFY */}
              <div style={styles.manifestoText}>
                <p>Streaming platforms put great films at our fingertips, then hid them under time-wasting junk. MovieGenius is your intelligence filter—no more mindless scrolling through endless mediocre "shows". Discover quality cinema and make deliberate choices again.</p>
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
    overflow: 'hidden',
  },
  searchSection: {
    padding: '16px 20px',
    backgroundColor: '#000000',
  },
  heroSection: {
    backgroundColor: '#000000',
    minHeight: '180px',
  },
  heroText: {
    backgroundColor: '#000000',
    padding: '0px 20px 14px 20px',
    textAlign: 'center',
  },
  heroImageContainer: {
    height: '120px',
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
    textDecoration: 'none',
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
    maxWidth: '350px',
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
    lineHeight: '1.6',
    color: '#374151',
    marginBottom: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    textAlign: 'left',
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