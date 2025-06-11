// pages/recs.js - Curated movie recommendations and series
import PhoneFrame from '../components/PhoneFrame'
import AskInputBar from '../components/AskInputBar'
import EpisodeCard from '../components/EpisodeCard'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import StreamingPlatformBox from '../components/StreamingPlatformBox'
import seriesConfig from '../data/series-config.json'

export default function RecsPage() {
  const router = useRouter()
  const [currentHeroImage, setCurrentHeroImage] = useState(1)
  const [currentSeries, setCurrentSeries] = useState(null)
  const [currentSeriesId, setCurrentSeriesId] = useState(null)

  // Get today's series based on daily rotation
  const getTodaysSeries = () => {
    const today = new Date().toDateString() // This changes daily
    const seriesKeys = Object.keys(seriesConfig)
    
    // Create a simple hash from today's date to get consistent daily selection
    let hash = 0
    for (let i = 0; i < today.length; i++) {
      const char = today.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get series index
    const seriesIndex = Math.abs(hash) % seriesKeys.length
    const selectedSeriesId = seriesKeys[seriesIndex]
    
    return { series: seriesConfig[selectedSeriesId], seriesId: selectedSeriesId }
  }

  useEffect(() => {
    const { series, seriesId } = getTodaysSeries()
    setCurrentSeries(series)
    setCurrentSeriesId(seriesId)
  }, [])

  // Hero image text color settings - adjust per image
  const heroTextSettings = {
    1: 'light',   // hero-1.jpg - use white text (dark image)
    2: 'light',   // hero-2.jpg - use white text  
    3: 'light',   // hero-3.jpg - use white text
    4: 'dark',    // hero-4.jpg - use dark text (light image)
    5: 'light',   // hero-5.jpg - use white text
    6: 'light',   // hero-6.jpg - use white text
    7: 'light',   // hero-7.jpg - use white text
    8: 'light',   // hero-8.jpg - use white text
    9: 'light',   // hero-9.jpg - use white text
    10: 'light',  // hero-10.jpg - use white text
    11: 'dark',   // hero-11.jpg - use dark text (light image)
  }

  const currentTextStyle = heroTextSettings[currentHeroImage] || 'light'


  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    })
  }



  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar - Always on top */}
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Scrollable Content - Everything scrolls under ask bar */}
        <div style={styles.scrollableContent}>
          {/* Hero Image - Scrolls normally */}
          <div style={styles.heroImageContainer}>
            <img 
              src={`/images/hero-rotation/hero-${currentHeroImage}.jpg`} 
              alt="Cinema Through Time"
              style={styles.heroImage}
            />
          </div>
          
          {/* Sticky Title Section - Only headline sticks */}
          <div style={styles.stickyTitleHeader}>
            <div style={styles.titleHeaderField}>
              <div style={styles.seriesTitle}>
                {currentSeries ? currentSeries.title : 'Loading...'}
              </div>
              <div style={styles.seriesSubhead}>
                {currentSeries ? currentSeries.description : 'Loading educational series content...'}
              </div>
            </div>
          </div>
        
          <div style={styles.content}>
            {/* Dynamic Series Episode Cards */}
            {currentSeries && (
              <div style={styles.episodesSection}>
                {currentSeries.episodes.map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    seriesId={currentSeries.id}
                    onClick={() => router.push(`/recs/series/${currentSeries.id}/${episode.id}`)}
                  />
                ))}
              </div>
            )}

          </div>
          
          {/* Other Series Footer */}
          <div style={styles.otherSeriesFooter}>
            <div style={styles.footerTitle}>Other Series</div>
            <div style={styles.seriesLinks}>
              {Object.entries(seriesConfig)
                .filter(([id]) => id !== currentSeriesId)
                .slice(0, 4)
                .map(([id, series]) => (
                  <div 
                    key={id}
                    style={styles.seriesLink}
                    onClick={() => router.push(`/recs/series/${id}/1`)}
                  >
                    — {series.title.split(':')[0]} {/* Show just the main title before colon */}
                  </div>
                ))}
              <div 
                style={styles.moreLink}
                onClick={() => router.push('/recs/series')}
              >
                More →
              </div>
            </div>
          </div>
          
          {/* Enhanced Streaming Platform Selector */}
          <StreamingPlatformBox />
        </div>
      </div>
    </PhoneFrame>
  )
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
  streamingBoxBottom: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginTop: '24px',
  },
  streamingText: {
    color: '#374151',
    flex: 1,
  },
  editButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline',
    padding: '0',
    marginLeft: '8px',
  },
  content: {
    padding: '16px',
  },
  episodesSection: {
    marginBottom: '32px',
  },
  heroImageContainer: {
    position: 'relative',
    width: '100%',
    height: '200px',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 16px 16px 16px',
  },
  heroOverlayTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    marginBottom: '4px',
  },
  heroOverlaySubtitle: {
    fontSize: '16px',
    margin: 0,
  },
  stickyTitleHeader: {
    position: 'sticky',
    top: '0px', // Stick right to the top of scrollable content
    zIndex: 90, // Below ask bar (100) but above content
    marginTop: '0px', // Remove any default margins
  },
  titleHeaderField: {
    padding: '16px 16px 20px 16px',
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
  },
  seriesTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    marginBottom: '6px',
  },
  seriesSubhead: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#d1d5db',
    margin: 0,
    lineHeight: '1.4',
  },
  otherSeriesFooter: {
    padding: '20px 16px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e5e7eb',
  },
  footerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  seriesLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  seriesLink: {
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '8px 0',
    transition: 'color 0.2s ease',
    textDecoration: 'none',
  },
  moreLink: {
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '8px 0',
    fontWeight: '500',
    transition: 'color 0.2s ease',
    textAlign: 'right',
    textDecoration: 'none',
  },
};