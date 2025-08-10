/**
 * Mobile-Size Test Page for MediaCard Trailer Prominence
 * 
 * Shows trailer variants at actual MediaCard dimensions
 * Optimized for mobile viewing and real-world card sizes
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

export default function TestTrailerCardsMobile() {
  const [selectedVariant, setSelectedVariant] = useState('integrated-action');
  
  const variants = [
    { key: 'default', name: 'Default' },
    { key: 'trailer-button', name: 'Button' },
    { key: 'trailer-overlay', name: 'Overlay' },
    { key: 'trailer-badge', name: 'Badge' },
    { key: 'integrated-action', name: 'Integrated' },
    { key: 'below-content', name: 'Below Content' }
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>MediaCard Size Test</h1>
        <p style={styles.subtitle}>Trailer variants at actual MediaCard dimensions</p>
        
        {/* Variant Selector */}
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
      </div>

      {/* Cards at MediaCard Size */}
      <div style={styles.cardsContainer}>
        <h3 style={styles.sectionTitle}>
          Current: <strong>{variants.find(v => v.key === selectedVariant)?.name}</strong>
        </h3>
        
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

      {/* Quick Comparison */}
      <div style={styles.comparisonSection}>
        <h3 style={styles.sectionTitle}>Quick Comparison</h3>
        <p style={styles.sectionDescription}>
          Top 3 recommended variants at MediaCard size:
        </p>
        
        <div style={styles.comparisonGrid}>
          {['integrated-action', 'below-content', 'trailer-overlay'].map(variantKey => (
            <div key={variantKey} style={styles.comparisonCard}>
              <h4 style={styles.comparisonTitle}>
                {variants.find(v => v.key === variantKey)?.name}
              </h4>
              <div style={styles.comparisonCardWrapper}>
                <MediaCardTrailerTest
                  title="Blade Runner 2049"
                  year={2017}
                  initialSlug="A young blade runner's discovery threatens to plunge society into chaos"
                  initialPoster="https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"
                  initialStreaming="Amazon Prime"
                  tmdbId={335984}
                  variant={variantKey}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Info */}
      <div style={styles.mobileInfo}>
        <h4 style={styles.infoTitle}>Mobile Optimization Notes</h4>
        <ul style={styles.infoList}>
          <li>Cards sized for typical mobile MediaCard width (~400px max)</li>
          <li>Touch targets optimized for mobile interaction</li>
          <li>Font sizes and icons scaled for mobile readability</li>
          <li>Hover states work on mobile tap</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  header: {
    maxWidth: '800px',
    margin: '0 auto',
    marginBottom: '32px',
    textAlign: 'center',
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },

  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
  },

  variantSelector: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },

  variantButton: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  variantButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
    color: '#000000',
    fontWeight: '600',
  },

  cardsContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    marginBottom: '40px',
  },

  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'center',
  },

  sectionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '24px',
  },

  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },

  cardWrapper: {
    width: '100%',
    maxWidth: '320px', // More realistic mobile width
  },

  comparisonSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    marginBottom: '32px',
  },

  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },

  comparisonCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  comparisonTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'center',
  },

  comparisonCardWrapper: {
    width: '100%',
    maxWidth: '300px', // Even more constrained for comparison
    margin: '0 auto',
  },

  mobileInfo: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  infoTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },

  infoList: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    paddingLeft: '20px',
  },
};