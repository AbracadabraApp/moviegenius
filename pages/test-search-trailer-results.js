/**
 * Search Results Test Page with Trailer Prominence
 * 
 * This page tests how different trailer prominence approaches work 
 * specifically in search result contexts, where discovery is key.
 */
import { useState } from 'react';
import MediaCardTrailerTest from '../components/MediaCardTrailerTest';

const searchResultsData = [
  {
    title: "Dune",
    year: 2021,
    initialSlug: "Epic sci-fi saga on a desert planet with political intrigue and mystical powers",
    initialPoster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    initialStreaming: "HBO Max, Amazon Prime",
    tmdbId: 438631
  },
  {
    title: "The Batman",
    year: 2022,
    initialSlug: "Dark detective story as Batman investigates corruption in Gotham City",
    initialPoster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    initialStreaming: "HBO Max",
    tmdbId: 414906
  },
  {
    title: "Top Gun: Maverick",
    year: 2022,
    initialSlug: "Veteran pilot returns to train a new generation for a dangerous mission",
    initialPoster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    initialStreaming: "Paramount+, Amazon Prime",
    tmdbId: 361743
  },
  {
    title: "Spider-Man: No Way Home",
    year: 2021,
    initialSlug: "Multiverse chaos as previous Spider-Man villains return to threaten reality",
    initialPoster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    initialStreaming: "Starz, Amazon Prime",
    tmdbId: 634649
  },
  {
    title: "Everything Everywhere All at Once",
    year: 2022,
    initialSlug: "Multiverse adventure through infinite realities to save family and existence",
    initialPoster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    initialStreaming: "Showtime, Amazon Prime",
    tmdbId: 545611
  },
  {
    title: "The Power of the Dog",
    year: 2021,
    initialSlug: "Psychological drama in 1920s Montana reveals hidden tensions and desires",
    initialPoster: "https://image.tmdb.org/t/p/w500/kEVH8l6mt2bNF8mSS1OBcynHQ49.jpg",
    initialStreaming: "Netflix",
    tmdbId: 602734
  }
];

export default function TestSearchTrailerResults() {
  const [selectedVariant, setSelectedVariant] = useState('trailer-overlay');
  const [searchQuery, setSearchQuery] = useState('action movies 2022');
  
  const variants = [
    { key: 'default', name: 'Default', description: 'Standard MediaCard without trailer features', color: '#6b7280' },
    { key: 'trailer-button', name: 'Button', description: 'Large PlayCircle with prominent gold styling', color: '#D4AF37' },
    { key: 'trailer-overlay', name: 'Overlay', description: 'Enhanced 56px PlayCircle on poster', color: '#D4AF37' },
    { key: 'trailer-badge', name: 'Badge', description: 'Enhanced PlayCircle badge with stronger shadows', color: '#D4AF37' },
    { key: 'integrated-action', name: 'Integrated', description: 'PlayCircle (20px) in action buttons', color: '#D4AF37' },
    { key: 'below-content', name: 'Below Content', description: 'Enhanced PlayCircle after year', color: '#D4AF37' }
  ];

  return (
    <div style={styles.page}>
      {/* Search Header */}
      <div style={styles.searchHeader}>
        <div style={styles.searchContainer}>
          <h1 style={styles.searchTitle}>Movie Search</h1>
          <div style={styles.searchInputWrapper}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies..."
              style={styles.searchInput}
            />
            <button style={styles.searchButton}>Search</button>
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div style={styles.controlsContainer}>
        <div style={styles.controls}>
          <h3 style={styles.controlsTitle}>Trailer Prominence Test</h3>
          <div style={styles.variantTabs}>
            {variants.map(variant => (
              <button
                key={variant.key}
                onClick={() => setSelectedVariant(variant.key)}
                style={{
                  ...styles.variantTab,
                  ...(selectedVariant === variant.key ? {
                    ...styles.variantTabActive,
                    borderBottomColor: variant.color,
                    color: variant.color
                  } : {})
                }}
              >
                {variant.name}
              </button>
            ))}
          </div>
          <p style={styles.variantDescription}>
            {variants.find(v => v.key === selectedVariant)?.description}
          </p>
        </div>
      </div>

      {/* Search Results */}
      <div style={styles.resultsContainer}>
        <div style={styles.resultsHeader}>
          <div style={styles.resultsInfo}>
            <span style={styles.resultsCount}>{searchResultsData.length} movies</span>
            <span style={styles.resultsQuery}>for "{searchQuery}"</span>
          </div>
          <div style={styles.currentVariant}>
            Testing: <strong>{variants.find(v => v.key === selectedVariant)?.name}</strong>
          </div>
        </div>

        {/* Results Grid */}
        <div style={styles.resultsGrid}>
          {searchResultsData.map((movie, index) => (
            <div key={`${movie.title}-${index}`} style={styles.resultItem}>
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

      {/* Analysis Panel */}
      <div style={styles.analysisPanel}>
        <h2 style={styles.analysisTitle}>Search Result Analysis</h2>
        
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <h4 style={styles.metricTitle}>Discoverability</h4>
            <div style={styles.metricContent}>
              <div style={styles.variantScore}>
                <span style={styles.scoreLabel}>Button:</span>
                <div style={styles.scoreBar}>
                  <div style={{...styles.scoreBarFill, width: '90%', backgroundColor: '#D4AF37'}}></div>
                </div>
              </div>
              <div style={styles.variantScore}>
                <span style={styles.scoreLabel}>Overlay:</span>
                <div style={styles.scoreBar}>
                  <div style={{...styles.scoreBarFill, width: '75%', backgroundColor: '#D4AF37'}}></div>
                </div>
              </div>
              <div style={styles.variantScore}>
                <span style={styles.scoreLabel}>Integrated:</span>
                <div style={styles.scoreBar}>
                  <div style={{...styles.scoreBarFill, width: '85%', backgroundColor: '#D4AF37'}}></div>
                </div>
              </div>
              <div style={styles.variantScore}>
                <span style={styles.scoreLabel}>Below:</span>
                <div style={styles.scoreBar}>
                  <div style={{...styles.scoreBarFill, width: '65%', backgroundColor: '#D4AF37'}}></div>
                </div>
              </div>
              <div style={styles.variantScore}>
                <span style={styles.scoreLabel}>Badge:</span>
                <div style={styles.scoreBar}>
                  <div style={{...styles.scoreBarFill, width: '45%', backgroundColor: '#D4AF37'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.metricCard}>
            <h4 style={styles.metricTitle}>Visual Impact</h4>
            <div style={styles.metricContent}>
              <p style={styles.metricDescription}>
                How much does each variant change the card's visual hierarchy and user focus?
              </p>
              <ul style={styles.impactList}>
                <li><strong>Button:</strong> High - adds new UI element</li>
                <li><strong>Overlay:</strong> Medium - modifies poster area</li>
                <li><strong>Integrated:</strong> Medium - extends existing actions</li>
                <li><strong>Below:</strong> Low-medium - small text flow addition</li>
                <li><strong>Badge:</strong> Low - minimal footprint</li>
              </ul>
            </div>
          </div>

          <div style={styles.metricCard}>
            <h4 style={styles.metricTitle}>Search Context</h4>
            <div style={styles.metricContent}>
              <p style={styles.metricDescription}>
                In search results, users are scanning quickly for relevant content.
              </p>
              <div style={styles.contextInsights}>
                <div style={styles.insight}>
                  <span style={styles.insightLabel}>✅ Best for quick scanning:</span>
                  <span>Integrated actions, overlay button</span>
                </div>
                <div style={styles.insight}>
                  <span style={styles.insightLabel}>🎯 Natural workflow:</span>
                  <span>Integrated actions variant</span>
                </div>
                <div style={styles.insight}>
                  <span style={styles.insightLabel}>📖 Reading flow:</span>
                  <span>Below content placement</span>
                </div>
                <div style={styles.insight}>
                  <span style={styles.insightLabel}>⚠️ May distract from core content:</span>
                  <span>Prominent trailer button</span>
                </div>
                <div style={styles.insight}>
                  <span style={styles.insightLabel}>❓ Easily missed:</span>
                  <span>Small corner badge</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.recommendations}>
          <h3 style={styles.recommendationsTitle}>Recommendations for Search Results</h3>
          <div style={styles.recommendationCards}>
            <div style={styles.recommendationCard}>
              <h4 style={styles.recommendationTitle}>Top Recommendation: Integrated Actions</h4>
              <p style={styles.recommendationText}>
                The integrated actions variant places the gold trailer button alongside Seen/Add buttons, creating a natural workflow. High discoverability (85%) with familiar interaction patterns.
              </p>
            </div>
            <div style={styles.recommendationCard}>
              <h4 style={styles.recommendationTitle}>Alternative: Below Content</h4>
              <p style={styles.recommendationText}>
                Compact trailer button positioned after the year creates a natural reading flow. 
                Light gold background with darker border provides subtle prominence without disrupting the text hierarchy.
              </p>
            </div>
            <div style={styles.recommendationCard}>
              <h4 style={styles.recommendationTitle}>Classic Option: Gold Overlay</h4>
              <p style={styles.recommendationText}>
                Gold overlay button maintains the familiar video platform pattern while using brand colors.
                Provides good discoverability (75%) without increasing card dimensions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Search Header
  searchHeader: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 0',
  },

  searchContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },

  searchTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'center',
  },

  searchInputWrapper: {
    display: 'flex',
    gap: '12px',
    maxWidth: '600px',
    margin: '0 auto',
  },

  searchInput: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },

  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },

  // Controls
  controlsContainer: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 0',
  },

  controls: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },

  controlsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },

  variantTabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '12px',
  },

  variantTab: {
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  variantTabActive: {
    color: '#374151',
    fontWeight: '600',
  },

  variantDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },

  // Results
  resultsContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
  },

  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },

  resultsInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  resultsCount: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
  },

  resultsQuery: {
    fontSize: '16px',
    color: '#6b7280',
  },

  currentVariant: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '6px 12px',
    borderRadius: '6px',
  },

  resultsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
    maxWidth: '320px', // More realistic mobile viewport width
    margin: '0 auto', // Center the results
  },

  resultItem: {
    backgroundColor: 'transparent',
  },

  // Analysis Panel
  analysisPanel: {
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    padding: '32px 0',
  },

  analysisTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: '32px',
    maxWidth: '1200px',
    margin: '0 auto 32px',
    padding: '0 20px',
  },

  metricsGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },

  metricCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
  },

  metricTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
  },

  metricContent: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
  },

  metricDescription: {
    marginBottom: '16px',
  },

  variantScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },

  scoreLabel: {
    minWidth: '60px',
    fontSize: '12px',
    fontWeight: '500',
  },

  scoreBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  },

  scoreBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },

  impactList: {
    margin: 0,
    paddingLeft: '16px',
  },

  contextInsights: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  insight: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
  },

  insightLabel: {
    fontWeight: '500',
    minWidth: '140px',
  },

  // Recommendations
  recommendations: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },

  recommendationsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '20px',
  },

  recommendationCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },

  recommendationCard: {
    backgroundColor: '#fefce8',
    border: '1px solid #fde047',
    borderRadius: '8px',
    padding: '20px',
  },

  recommendationTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '8px',
  },

  recommendationText: {
    fontSize: '14px',
    color: '#a16207',
    lineHeight: '1.5',
    margin: 0,
  },
};