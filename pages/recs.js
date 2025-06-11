// pages/recs.js - Curated movie recommendations and series
import PhoneFrame from '../components/PhoneFrame'
import AskInputBar from '../components/AskInputBar'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import StreamingPlatformBox from '../components/StreamingPlatformBox'

export default function RecsPage() {
  const router = useRouter()
  const [currentHeroImage, setCurrentHeroImage] = useState(1)

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
              <div style={styles.seriesTitle}>Cinema Through Time</div>
              <div style={styles.seriesSubhead}>Discover how film evolved through the decades</div>
            </div>
          </div>
        
          <div style={styles.content}>
            {/* Cinema Through Time Episode Cards */}
            <div style={styles.episodesSection}>
              {/* Episode 1 */}
              <div 
                style={styles.episodeCard}
                onClick={() => router.push('/recs/series/2/1')}
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
                  <h3 style={styles.episodeTitle}>1970s: The Auteur Renaissance</h3>
                  <p style={styles.episodeSubtitle}>When directors became superstars and changed cinema forever</p>
                </div>
                <div style={styles.episodeImageRow}>
                  <img src="/images/posters/the-godfather.jpg" alt="The Godfather" style={styles.episodeMovieImage} />
                  <img src="/images/posters/taxi-driver.jpg" alt="Taxi Driver" style={styles.episodeMovieImage} />
                  <img src="/images/posters/apocalypse-now.jpg" alt="Apocalypse Now" style={styles.episodeMovieImage} />
                  <img src="/images/posters/annie-hall.jpg" alt="Annie Hall" style={styles.episodeMovieImage} />
                </div>
              </div>

              {/* Episode 2 */}
              <div 
                style={styles.episodeCard}
                onClick={() => router.push('/recs/series/2/2')}
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
                  <h3 style={styles.episodeTitle}>1980s: Blockbuster Revolution</h3>
                  <p style={styles.episodeSubtitle}>High-concept cinema and spectacle filmmaking</p>
                </div>
                <div style={styles.episodeImageRow}>
                  <img src="/images/posters/star-wars.jpg" alt="Star Wars" style={styles.episodeMovieImage} />
                  <img src="/images/posters/raiders-of-the-lost-ark.jpg" alt="Raiders of the Lost Ark" style={styles.episodeMovieImage} />
                  <img src="/images/posters/e-t-the-extra-terrestrial.jpg" alt="E.T." style={styles.episodeMovieImage} />
                  <img src="/images/posters/blade-runner.jpg" alt="Blade Runner" style={styles.episodeMovieImage} />
                </div>
              </div>

              {/* Episode 3 */}
              <div 
                style={styles.episodeCard}
                onClick={() => router.push('/recs/series/2/3')}
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
                  <h3 style={styles.episodeTitle}>1990s: Independent Renaissance</h3>
                  <p style={styles.episodeSubtitle}>Bold creative voices emerge from outside the studio system</p>
                </div>
                <div style={styles.episodeImageRow}>
                  <img src="/images/posters/pulp-fiction.jpg" alt="Pulp Fiction" style={styles.episodeMovieImage} />
                  <img src="/images/posters/goodfellas.jpg" alt="Goodfellas" style={styles.episodeMovieImage} />
                  <img src="/images/posters/forrest-gump.jpg" alt="Forrest Gump" style={styles.episodeMovieImage} />
                  <img src="/images/posters/the-silence-of-the-lambs.jpg" alt="The Silence of the Lambs" style={styles.episodeMovieImage} />
                </div>
              </div>

              {/* Episode 4 */}
              <div 
                style={styles.episodeCard}
                onClick={() => router.push('/recs/series/2/4')}
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
                  <h3 style={styles.episodeTitle}>2000s: The Streaming Wars</h3>
                  <p style={styles.episodeSubtitle}>Digital revolution and franchise filmmaking</p>
                </div>
                <div style={styles.episodeImageRow}>
                  <img src="/images/posters/the-lord-of-the-rings-the-fellowship-of-the-ring.jpg" alt="Lord of the Rings" style={styles.episodeMovieImage} />
                  <img src="/images/posters/the-sixth-sense.jpg" alt="The Sixth Sense" style={styles.episodeMovieImage} />
                  <img src="/images/posters/saving-private-ryan.jpg" alt="Saving Private Ryan" style={styles.episodeMovieImage} />
                  <img src="/images/posters/titanic.jpg" alt="Titanic" style={styles.episodeMovieImage} />
                </div>
              </div>

              {/* Episode 5 */}
              <div 
                style={styles.episodeCard}
                onClick={() => router.push('/recs/series/2/5')}
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
                  <h3 style={styles.episodeTitle}>2010s: Global Cinema Rising</h3>
                  <p style={styles.episodeSubtitle}>International voices reshape Hollywood and streaming</p>
                </div>
                <div style={styles.episodeImageRow}>
                  <img src="/images/posters/the-lord-of-the-rings-the-fellowship-of-the-ring.jpg" alt="Lord of the Rings" style={styles.episodeMovieImage} />
                  <img src="/images/posters/the-sixth-sense.jpg" alt="The Sixth Sense" style={styles.episodeMovieImage} />
                  <img src="/images/posters/saving-private-ryan.jpg" alt="Saving Private Ryan" style={styles.episodeMovieImage} />
                  <img src="/images/posters/titanic.jpg" alt="Titanic" style={styles.episodeMovieImage} />
                </div>
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
  episodeCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
    marginBottom: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
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
  episodeContent: {
    padding: '24px',
    backgroundColor: '#ffffff',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.3',
    margin: 0,
    marginBottom: '6px',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.3',
    margin: 0,
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
};