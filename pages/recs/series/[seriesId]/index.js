// pages/recs/series/[seriesId]/index.js - Series Episode List Page
import PhoneFrame from '../../../../components/PhoneFrame';
import SimpleSearch from '../../../../components/SimpleSearch';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import fs from 'fs';
import path from 'path';

export default function SeriesPage({ series, error }) {
  const router = useRouter();
  const { seriesId } = router.query;
  
  const handleSearchResults = (results) => {
    // For now, just log the search results
    console.log('Search results on Series Detail page:', results);
  };

  if (error) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.fixedInputArea}>
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.error}>
            Error loading series: {error}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (!series) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.fixedInputArea}>
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.error}>
            Series not found
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
          <SimpleSearch onResults={handleSearchResults} />
        </div>
        
        {/* Scrollable Content */}
        <div style={styles.scrollableContent}>
          {/* Series Header */}
          <div style={styles.seriesHeader}>
            <div style={styles.backButton} onClick={() => router.push('/recs/series')}>
              ← All Series
            </div>
            <div style={styles.seriesLabelPill}>Series {seriesId}</div>
            <h1 style={styles.seriesTitle}>{series.title}</h1>
            <p style={styles.seriesDescription}>{series.description}</p>
            <div style={styles.episodeCount}>
              {series.episodes.length} Episodes
            </div>
          </div>
          
          {/* Episodes List */}
          <div style={styles.content}>
            <div style={styles.episodesSection}>
              <h2 style={styles.episodesSectionTitle}>Episodes</h2>
              {series.episodes.map((episode) => (
                <div 
                  key={episode.id}
                  style={styles.episodeCard}
                  onClick={() => router.push(`/recs/series/${seriesId}/${episode.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={styles.episodeContent}>
                    <div style={styles.episodeHeader}>
                      <div style={styles.episodeNumber}>Episode {episode.id}</div>
                      <div style={styles.watchEpisodeText}>Watch →</div>
                    </div>
                    <h3 style={styles.episodeTitle}>{episode.title}</h3>
                    <p style={styles.episodeSubtitle}>{episode.subtitle}</p>
                  </div>
                  {episode.posters && (
                    <div style={styles.episodeImageRow}>
                      {episode.posters.map((poster, index) => (
                        <img
                          key={index}
                          src={poster}
                          alt={`${episode.title} movie ${index + 1}`}
                          style={styles.episodeMovieImage}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Navigation Section */}
            <div style={styles.navigationSection}>
              <button 
                style={styles.allSeriesButton}
                onClick={() => router.push('/recs/series')}
              >
                ← Browse All Series
              </button>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Server-Side Rendering: Load specific series data
export async function getServerSideProps({ params, res }) {
  try {
    // Set cache headers
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
    );
    
    const { seriesId } = params;
    
    // Load series data from static configuration file
    const filePath = path.join(process.cwd(), 'data', 'series-config.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const seriesData = JSON.parse(fileContent);
    
    // Get the specific series
    const series = seriesData[seriesId];
    
    if (!series) {
      return {
        props: {
          series: null,
          error: `Series ${seriesId} not found`
        }
      };
    }

    return {
      props: {
        series,
        error: null
      }
    };
  } catch (error) {
    console.error('Error loading series data:', error);
    
    return {
      props: {
        series: null,
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
  seriesHeader: {
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
    padding: '16px 16px 32px 16px',
  },
  backButton: {
    fontSize: '14px',
    color: '#d1d5db',
    cursor: 'pointer',
    marginBottom: '16px',
    display: 'inline-block',
    padding: '4px 0',
    transition: 'color 0.2s ease',
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
  seriesTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    marginBottom: '8px',
    lineHeight: '1.2',
  },
  seriesDescription: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#d1d5db',
    margin: 0,
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  episodeCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  content: {
    padding: '24px 16px',
  },
  episodesSection: {
    marginBottom: '32px',
  },
  episodesSectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    margin: 0,
    marginBottom: '20px',
  },
  episodeCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
    marginBottom: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  },
  episodeContent: {
    padding: '20px',
  },
  episodeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  episodeNumber: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  watchEpisodeText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#059669',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.3',
    margin: 0,
  },
  episodeImageRow: {
    display: 'flex',
    width: '100%',
    height: '80px',
    overflow: 'hidden',
  },
  episodeMovieImage: {
    flex: 1,
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
    filter: 'brightness(0.8) contrast(0.9) saturate(0.7)',
    opacity: 0.85,
  },
  navigationSection: {
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  allSeriesButton: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    color: '#374151',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
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