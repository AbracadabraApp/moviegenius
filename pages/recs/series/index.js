// pages/recs/series/index.js - Series Overview Page
import PhoneFrame from '../../../components/PhoneFrame';
import AskInputBar from '../../../components/AskInputBar';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import fs from 'fs';
import path from 'path';

export default function SeriesOverviewPage({ seriesData, error }) {
  const router = useRouter();
  
  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  if (error) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.fixedInputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          <div style={styles.error}>
            Error loading series: {error}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar */}
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Scrollable Content */}
        <div style={styles.scrollableContent}>
          {/* Hero Section */}
          <div style={styles.heroSection}>
            <div style={styles.heroContent}>
              <div style={styles.seriesLabelPill}>Educational Series</div>
              <h1 style={styles.heroTitle}>Film Education Series</h1>
              <p style={styles.heroSubtitle}>Comprehensive film studies broken into focused series</p>
            </div>
          </div>
          
          {/* Series Grid */}
          <div style={styles.content}>
            <div style={styles.seriesSection}>
              {Object.values(seriesData).map((series) => (
                <div 
                  key={series.id}
                  style={styles.seriesCard}
                  onClick={() => router.push(`/recs/series/${series.id}/1`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={styles.seriesContent}>
                    <h3 style={styles.seriesTitle}>{series.title}</h3>
                    <p style={styles.seriesDescription}>{series.description}</p>
                    <div style={styles.episodeCount}>
                      {series.episodes.length} Episodes
                    </div>
                  </div>
                  
                  {/* Episode Preview Grid - First 4 episodes */}
                  <div style={styles.episodePreviewGrid}>
                    {series.episodes.slice(0, 4).map((episode, index) => (
                      <div key={episode.id} style={styles.episodePreview}>
                        <div style={styles.episodePreviewText}>
                          <div style={styles.episodeNumber}>Ep {episode.id}</div>
                          <div style={styles.episodeTitle}>{episode.title}</div>
                        </div>
                        {episode.posters && episode.posters.length > 0 && (
                          <div style={styles.episodeImageRow}>
                            {episode.posters.slice(0, 2).map((poster, posterIndex) => (
                              <img
                                key={posterIndex}
                                src={poster}
                                alt={`${episode.title} movie ${posterIndex + 1}`}
                                style={styles.episodeMovieImage}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Series Footer */}
                  <div style={styles.seriesFooter}>
                    <span style={styles.startWatchingText}>Start with Episode 1</span>
                    <span style={styles.arrow}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Server-Side Rendering: Load series data from static config
export async function getServerSideProps({ res }) {
  try {
    // Set cache headers
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
    );
    
    // Load series data from static configuration file
    const filePath = path.join(process.cwd(), 'data', 'series-config.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const seriesData = JSON.parse(fileContent);

    return {
      props: {
        seriesData,
        error: null
      }
    };
  } catch (error) {
    console.error('Error loading series data:', error);
    
    return {
      props: {
        seriesData: {},
        error: error.message
      }
    };
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  heroSection: {
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
    padding: '24px 16px 32px 16px',
  },
  heroContent: {
    textAlign: 'center',
  },
  seriesLabelPill: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
  },
  heroTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    marginBottom: '8px',
  },
  heroSubtitle: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#d1d5db',
    margin: 0,
    lineHeight: '1.4',
  },
  content: {
    padding: '24px 16px',
  },
  seriesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  seriesCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #d1d5db',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.25)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  },
  seriesContent: {
    padding: '24px',
  },
  seriesTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
    marginBottom: '8px',
    lineHeight: '1.3',
  },
  seriesDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: 0,
    marginBottom: '12px',
  },
  episodeCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  episodePreviewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1px',
    backgroundColor: '#e5e7eb',
  },
  episodePreview: {
    backgroundColor: '#ffffff',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  episodePreviewText: {
    flex: 1,
  },
  episodeNumber: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  episodeTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    lineHeight: '1.2',
  },
  episodeImageRow: {
    display: 'flex',
    gap: '4px',
    height: '24px',
  },
  episodeMovieImage: {
    width: '18px',
    height: '24px',
    objectFit: 'cover',
    borderRadius: '2px',
    filter: 'brightness(0.9) contrast(0.95)',
  },
  seriesFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  startWatchingText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  arrow: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '600',
  },
  error: {
    padding: '20px',
    textAlign: 'center',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    margin: '16px',
  },
};