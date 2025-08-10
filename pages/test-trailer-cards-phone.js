/**
 * Phone-Size Test Page for MediaCard Trailer Prominence
 * 
 * Shows trailer variants at actual phone viewport widths
 * Simulates real mobile device constraints
 */
import { useState } from 'react';
import MediaCardTrailerTest from '../components/MediaCardTrailerTest';

const sampleMovies = [
  {
    title: "The Matrix",
    year: 1999,
    initialSlug: "Reality is a simulation in this mind-bending cyberpunk thriller",
    initialPoster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    initialStreaming: "Netflix, HBO Max",
    tmdbId: 603
  },
  {
    title: "Inception", 
    year: 2010,
    initialSlug: "Dreams within dreams create layers of reality and deception",
    initialPoster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    initialStreaming: "Amazon Prime",
    tmdbId: 27205
  }
];

export default function TestTrailerCardsPhone() {
  const [selectedVariant, setSelectedVariant] = useState('integrated-action');
  
  const variants = [
    { key: 'default', name: 'Default' },
    { key: 'integrated-action', name: 'Integrated' },
    { key: 'below-content', name: 'Below Content' },
    { key: 'trailer-overlay', name: 'Overlay' }
  ];

  return (
    <div style={styles.page}>
      {/* Phone viewport simulator */}
      <div style={styles.phoneFrame}>
        <div style={styles.phoneScreen}>
          <div style={styles.statusBar}>
            <span style={styles.time}>9:41</span>
            <span style={styles.battery}>🔋 100%</span>
          </div>
          
          <div style={styles.appContent}>
            <h1 style={styles.appTitle}>Movie Cards</h1>
            
            {/* Variant selector */}
            <div style={styles.variantSelector}>
              {variants.map(variant => (
                <button
                  key={variant.key}
                  onClick={() => setSelectedVariant(variant.key)}
                  style={{
                    ...styles.variantButton,
                    ...(selectedVariant === variant.key ? styles.variantButtonActive : {})
                  }}
                >
                  {variant.name}
                </button>
              ))}
            </div>

            {/* Cards in phone viewport */}
            <div style={styles.cardsList}>
              {sampleMovies.map((movie, index) => (
                <div key={`${movie.title}-${index}`} style={styles.cardWrapper}>
                  <MediaCardTrailerTest
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.initialSlug}
                    initialPoster={movie.initialPoster}
                    initialStreaming={movie.initialStreaming}
                    tmdbId={movie.tmdbId}
                    variant={selectedVariant}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info outside phone */}
      <div style={styles.phoneInfo}>
        <h3 style={styles.infoTitle}>Phone Viewport Test</h3>
        <p style={styles.infoText}>
          Simulates iPhone 14/15 dimensions (390px width) with realistic constraints:
        </p>
        <ul style={styles.infoList}>
          <li>Cards: ~370px width (accounting for 16px padding)</li>
          <li>Touch targets optimized for mobile</li>
          <li>Realistic scrolling experience</li>
          <li>Status bar and app chrome simulation</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f0f0',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  phoneFrame: {
    width: '410px',
    height: '890px',
    backgroundColor: '#000',
    borderRadius: '40px',
    padding: '10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },

  phoneScreen: {
    width: '390px', // iPhone 14/15 width
    height: '870px',
    backgroundColor: '#ffffff',
    borderRadius: '30px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  statusBar: {
    height: '44px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderBottom: '1px solid #e9ecef',
  },

  time: {
    color: '#000',
  },

  battery: {
    color: '#000',
  },

  appContent: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },

  appTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
    textAlign: 'center',
  },

  variantSelector: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '20px',
  },

  variantButton: {
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#495057',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  variantButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
    color: '#000',
    fontWeight: '600',
  },

  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  cardWrapper: {
    width: '100%', // Full phone width minus padding
  },

  phoneInfo: {
    maxWidth: '500px',
    marginTop: '32px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  infoTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },

  infoText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5',
  },

  infoList: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    paddingLeft: '20px',
  },
};