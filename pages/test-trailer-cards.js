/**
 * Test Page for MediaCard Trailer Prominence Experiments
 * 
 * This page showcases different approaches to making trailers more prominent
 * in media cards. It's for testing and development purposes only.
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
  },
  {
    title: "Interstellar",
    year: 2014,
    initialSlug: "A father's journey through space and time to save humanity",
    initialPoster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    initialStreaming: "Paramount+",
    tmdbId: 157336
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    initialSlug: "A young blade runner's discovery threatens to plunge society into chaos",
    initialPoster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    initialStreaming: "Amazon Prime, Apple TV",
    tmdbId: 335984
  }
];

export default function TestTrailerCards() {
  const [selectedVariant, setSelectedVariant] = useState('default');
  
  const variants = [
    { key: 'default', name: 'Default (Original)', description: 'Original MediaCard without trailer features' },
    { key: 'trailer-button', name: 'Trailer Button', description: 'Prominent gold trailer button with PlayCircle icon and larger text' },
    { key: 'trailer-overlay', name: 'Overlay Play Button', description: 'Large gold PlayCircle overlay on the movie poster' },
    { key: 'trailer-badge', name: 'Trailer Badge', description: 'Enhanced gold PlayCircle badge with stronger shadow' },
    { key: 'integrated-action', name: 'Integrated Actions', description: 'Gold PlayCircle trailer button with prominent text alongside actions' },
    { key: 'below-content', name: 'Below Content', description: 'Enhanced compact PlayCircle button with stronger borders and larger text' }
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>MediaCard Trailer Prominence Test</h1>
        <p style={styles.subtitle}>
          Exploring different approaches to make movie trailers more prominent in media cards and search results.
        </p>
        
        {/* Variant Selector */}
        <div style={styles.controls}>
          <h3 style={styles.controlsTitle}>Test Variants:</h3>
          <div style={styles.variantGrid}>
            {variants.map(variant => (
              <button
                key={variant.key}
                onClick={() => setSelectedVariant(variant.key)}
                style={{
                  ...styles.variantButton,
                  ...(selectedVariant === variant.key ? styles.variantButtonActive : {})
                }}
              >
                <div style={styles.variantName}>{variant.name}</div>
                <div style={styles.variantDescription}>{variant.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Current Selection Info */}
        <div style={styles.currentSelection}>
          <h4 style={styles.currentTitle}>
            Currently Testing: {variants.find(v => v.key === selectedVariant)?.name}
          </h4>
          <p style={styles.currentDescription}>
            {variants.find(v => v.key === selectedVariant)?.description}
          </p>
        </div>
      </div>

      {/* Movie Cards Grid */}
      <div style={styles.cardsSection}>
        <h3 style={styles.cardsTitle}>Sample Movie Cards</h3>
        <div style={styles.cardsGrid}>
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

      {/* Analysis Notes */}
      <div style={styles.notes}>
        <h3 style={styles.notesTitle}>Design Analysis & Observations</h3>
        
        <div style={styles.analysisGrid}>
          <div style={styles.analysisCard}>
            <h4 style={styles.analysisTitle}>Default (Baseline)</h4>
            <ul style={styles.analysisList}>
              <li>Clean, focused design</li>
              <li>No trailer discovery mechanism</li>
              <li>Users must navigate to detail page</li>
              <li>Maintains current aesthetic</li>
            </ul>
          </div>

          <div style={styles.analysisCard}>
            <h4 style={styles.analysisTitle}>Trailer Button</h4>
            <ul style={styles.analysisList}>
              <li>Most prominent trailer access</li>
              <li>Large PlayCircle icon (20px) with bold text</li>
              <li>Enhanced gold button with stronger shadows</li>
              <li>Increases card height but very discoverable</li>
            </ul>
          </div>

          <div style={styles.analysisCard}>
            <h4 style={styles.analysisTitle}>Overlay Play Button</h4>
            <ul style={styles.analysisList}>
              <li>Large PlayCircle (32px) for visibility</li>
              <li>Enhanced 56px button with gold opacity</li>
              <li>Stronger shadow for better contrast</li>
              <li>Familiar from video platforms, now more prominent</li>
            </ul>
          </div>

          <div style={styles.analysisCard}>
            <h4 style={styles.analysisTitle}>Trailer Badge</h4>
            <ul style={styles.analysisList}>
              <li>Enhanced PlayCircle badge (16px)</li>
              <li>Larger padding and stronger shadows</li>
              <li>More rounded corners for modern look</li>
              <li>Still subtle but more noticeable</li>
            </ul>
          </div>

          <div style={styles.analysisCard}>
            <h4 style={styles.analysisTitle}>Integrated Actions</h4>
            <ul style={styles.analysisList}>
              <li>PlayCircle icon (20px) matches MovieHeaderLarge</li>
              <li>Larger, bolder "Trailer" text (14px)</li>
              <li>Natural workflow integration</li>
              <li>Enhanced visibility while maintaining balance</li>
            </ul>
          </div>

          <div style={styles.analysisCard}>
            <h4 style={styles.analysisTitle}>Below Content</h4>
            <ul style={styles.analysisList}>
              <li>Larger PlayCircle (16px) and text (13px)</li>
              <li>Enhanced borders and gold shadow</li>
              <li>Positioned for natural reading flow</li>
              <li>More prominent while staying compact</li>
            </ul>
          </div>
        </div>

        <div style={styles.recommendations}>
          <h4 style={styles.recommendationsTitle}>Next Steps for Testing</h4>
          <ol style={styles.recommendationsList}>
            <li>Test each variant with real user interactions</li>
            <li>Measure trailer engagement rates per variant</li>
            <li>Evaluate impact on search result usability</li>
            <li>Consider mobile responsiveness for each approach</li>
            <li>Assess accessibility implications</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  header: {
    maxWidth: '1200px',
    margin: '0 auto',
    marginBottom: '40px',
  },

  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '32px',
    lineHeight: '1.6',
  },

  controls: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
  },

  controlsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
  },

  variantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px',
  },

  variantButton: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },

  variantButtonActive: {
    background: '#eff6ff',
    borderColor: '#3b82f6',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
  },

  variantName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px',
  },

  variantDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },

  currentSelection: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '16px',
  },

  currentTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: '4px',
  },

  currentDescription: {
    fontSize: '14px',
    color: '#0369a1',
    margin: 0,
  },

  cardsSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    marginBottom: '40px',
  },

  cardsTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '20px',
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 320px))', // More realistic mobile sizing
    gap: '16px',
    justifyContent: 'center',
  },

  cardWrapper: {
    backgroundColor: 'transparent',
  },

  notes: {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  notesTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '24px',
  },

  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },

  analysisCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e2e8f0',
  },

  analysisTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },

  analysisList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
  },

  recommendations: {
    backgroundColor: '#fefce8',
    border: '1px solid #fde047',
    borderRadius: '8px',
    padding: '20px',
  },

  recommendationsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '12px',
  },

  recommendationsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#a16207',
    lineHeight: '1.6',
  },
};