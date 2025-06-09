// pages/movies-variation-3.js - Time-based discovery with focus on eras and movements
import PhoneFrame from '../components/PhoneFrame';
import MediaCard from '../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesVariation3Page() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  useEffect(() => {
    const loadSelectedPlatforms = () => {
      try {
        const saved = localStorage.getItem('selectedPlatforms');
        if (saved) {
          const platforms = JSON.parse(saved);
          setSelectedPlatforms(platforms);
        }
      } catch (error) {
        console.error('Error loading platforms from localStorage:', error);
        setSelectedPlatforms([]);
      }
    };

    loadSelectedPlatforms();
    const handlePlatformUpdate = () => loadSelectedPlatforms();
    window.addEventListener('platformsUpdated', handlePlatformUpdate);
    return () => window.removeEventListener('platformsUpdated', handlePlatformUpdate);
  }, []);

  const handlePlatformSetup = () => {
    router.push('/you#platforms');
  };

  const handleEraExplore = (era) => {
    router.push(`/genius/era/${era}`);
  };

  const handleQuickDiscover = () => {
    router.push('/ask');
  };

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        <div style={styles.scrollableContent}>
          {/* Full-width Genius Header */}
          <div style={styles.heroHeader}>
            <img 
              src="/images/genius-header-noir.jpg" 
              alt="MovieGenius.AI - Classic Cinema" 
              style={styles.heroImage}
            />
          </div>

          {/* Sticky Gradient Header - Starts below hero, becomes sticky */}
          <div style={styles.stickyHeader}>
            <div style={styles.stickyContent}>
              <p style={styles.stickyBrand}>MovieGenius.AI</p>
              <h1 style={styles.stickyTitle}>Cinema Through Time</h1>
            </div>
          </div>
          

          {/* This Week's Focus */}
          <div style={styles.featuredSection}>
            <div style={styles.featuredHeader}>
              <div style={styles.featuredBadge}>This Week</div>
              <h2 style={styles.featuredTitle}>French New Wave Essentials</h2>
              <p style={styles.featuredDescription}>
                Revolutionary cinema that changed filmmaking forever. Explore the movement that broke all the rules.
              </p>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard title="Breathless" year="1960" initialSlug="breathless-1960" tmdbId={756} />
              <MediaCard title="The 400 Blows" year="1959" initialSlug="the-400-blows-1959" tmdbId={12477} />
              <MediaCard title="Jules and Jim" year="1962" initialSlug="jules-and-jim-1962" tmdbId={14337} />
            </div>
            <div style={styles.sectionFooter}>
              <button 
                onClick={() => handleEraExplore('french-new-wave')}
                style={styles.sectionButton}
              >
                Dive Deeper <span style={styles.playTriangle}>▶</span>
              </button>
            </div>
          </div>

          {/* Era Timeline Sections */}
          <div style={styles.timelineSection}>
            <div style={styles.timelineHeader}>
              <span style={styles.timelineYear}>1970s</span>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>The Auteur Renaissance</h3>
                <p style={styles.timelineDescription}>When directors became superstars</p>
              </div>
            </div>
            <div style={styles.movieRow}>
              <MediaCard title="The Godfather" year="1972" initialSlug="the-godfather-1972" tmdbId={238} />
              <MediaCard title="Chinatown" year="1974" initialSlug="chinatown-1974" tmdbId={2091} />
              <MediaCard title="Annie Hall" year="1977" initialSlug="annie-hall-1977" tmdbId={1049} />
            </div>
            <div style={styles.sectionFooter}>
              <button 
                onClick={() => handleEraExplore('70s-auteurs')}
                style={styles.sectionButton}
              >
                Dive Deeper <span style={styles.playTriangle}>▶</span>
              </button>
            </div>
          </div>

          <div style={styles.timelineSection}>
            <div style={styles.timelineHeader}>
              <span style={styles.timelineYear}>1990s</span>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Independent Revolution</h3>
                <p style={styles.timelineDescription}>Bold voices outside the system</p>
              </div>
            </div>
            <div style={styles.movieRow}>
              <MediaCard title="Pulp Fiction" year="1994" initialSlug="pulp-fiction-1994" tmdbId={680} />
              <MediaCard title="Fargo" year="1996" initialSlug="fargo-1996" tmdbId={275} />
              <MediaCard title="The Thin Red Line" year="1998" initialSlug="the-thin-red-line-1998" tmdbId={8741} />
            </div>
            <div style={styles.sectionFooter}>
              <button 
                onClick={() => handleEraExplore('90s-indie')}
                style={styles.sectionButton}
              >
                Dive Deeper <span style={styles.playTriangle}>▶</span>
              </button>
            </div>
          </div>

          <div style={styles.timelineSection}>
            <div style={styles.timelineHeader}>
              <span style={styles.timelineYear}>2010s</span>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Global Cinema Rising</h3>
                <p style={styles.timelineDescription}>World cinema enters the mainstream</p>
              </div>
            </div>
            <div style={styles.movieRow}>
              <MediaCard title="Parasite" year="2019" initialSlug="parasite-2019" tmdbId={496243} />
              <MediaCard title="Roma" year="2018" initialSlug="roma-2018" tmdbId={548473} />
              <MediaCard title="Moonlight" year="2016" initialSlug="moonlight-2016" tmdbId={376867} />
            </div>
            <div style={styles.sectionFooter}>
              <button 
                onClick={() => handleEraExplore('2010s-global')}
                style={styles.sectionButton}
              >
                Dive Deeper <span style={styles.playTriangle}>▶</span>
              </button>
            </div>
          </div>

          {/* Movements Section */}
          <div style={styles.movementsSection}>
            <h2 style={styles.movementsTitle}>Explore Film Movements</h2>
            <div style={styles.movementGrid}>
              <div 
                style={styles.movementCard}
                onClick={() => handleEraExplore('italian-neorealism')}
              >
                <span style={styles.movementEmoji}>🇮🇹</span>
                <h4 style={styles.movementName}>Italian Neorealism</h4>
                <p style={styles.movementPeriod}>1940s-1950s</p>
              </div>
              
              <div 
                style={styles.movementCard}
                onClick={() => handleEraExplore('german-expressionism')}
              >
                <span style={styles.movementEmoji}>🎭</span>
                <h4 style={styles.movementName}>German Expressionism</h4>
                <p style={styles.movementPeriod}>1920s-1930s</p>
              </div>
              
              <div 
                style={styles.movementCard}
                onClick={() => handleEraExplore('hong-kong-new-wave')}
              >
                <span style={styles.movementEmoji}>🏙️</span>
                <h4 style={styles.movementName}>Hong Kong New Wave</h4>
                <p style={styles.movementPeriod}>1980s-1990s</p>
              </div>
              
              <div 
                style={styles.movementCard}
                onClick={() => handleEraExplore('dogme-95')}
              >
                <span style={styles.movementEmoji}>📜</span>
                <h4 style={styles.movementName}>Dogme 95</h4>
                <p style={styles.movementPeriod}>1990s-2000s</p>
              </div>
            </div>
          </div>

        </div>
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
    backgroundColor: '#f9fafb',
  },
  heroHeader: {
    position: 'relative',
    width: '100%',
    height: '320px',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  },
  stickyHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.9) 100%)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  stickyContent: {
    padding: '16px 20px',
    color: 'white',
    textAlign: 'left',
  },
  stickyBrand: {
    fontSize: '14px',
    fontWeight: '400',
    margin: '0 0 4px 0',
    opacity: 0.9,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  stickyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '0',
  },
  quickActions: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f3f4f6',
  },
  quickActionPrimary: {
    flex: 2,
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  quickActionSecondary: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  featuredSection: {
    margin: '16px 0',
    padding: '0 16px',
  },
  featuredHeader: {
    padding: '20px 0',
    marginBottom: '16px',
  },
  featuredBadge: {
    display: 'inline-block',
    backgroundColor: '#007AFF',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  featuredTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  featuredDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px 0',
    lineHeight: '1.4',
  },
  sectionFooter: {
    padding: '16px 0',
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  sectionButton: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  playTriangle: {
    fontSize: '12px',
    opacity: 0.8,
  },
  timelineSection: {
    margin: '24px 0',
    padding: '0 16px',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    marginBottom: '16px',
    gap: '12px',
  },
  timelineYear: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#007AFF',
    minWidth: '50px',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 2px 0',
  },
  timelineDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0',
  },
  movieRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movementsSection: {
    padding: '20px 16px',
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  movementsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  movementGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  movementCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px 12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  movementEmoji: {
    fontSize: '24px',
    display: 'block',
    marginBottom: '8px',
  },
  movementName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
  },
  movementPeriod: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
  },
};