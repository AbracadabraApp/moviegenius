// pages/movies-variation-2.js - Mood-based discovery with fewer, richer sections
import PhoneFrame from '../components/PhoneFrame';
import MediaCard from '../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesVariation2Page() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Load selected platforms from localStorage
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

  const handleMoodExplore = mood => {
    router.push(`/genius/mood/${mood}`);
  };

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Full-width Genius Header */}
        <div style={styles.heroHeader}>
          <img
            src="/images/genius-header-noir.jpg"
            alt="MovieGenius.AI - Classic Cinema"
            style={styles.heroImage}
          />
          <div style={styles.heroOverlay}>
            <div style={styles.heroContent}>
              <h1 style={styles.heroTitle}>What's Your Mood Tonight?</h1>
              <p style={styles.heroSubtitle}>Great films for every feeling</p>
            </div>
          </div>
        </div>

        <div style={styles.scrollableContent}>
          {/* Platform Status Card */}
          <div style={styles.platformCard}>
            <div style={styles.platformCardContent}>
              <div style={styles.platformIcon}>📺</div>
              <div style={styles.platformText}>
                <h3 style={styles.platformTitle}>
                  {selectedPlatforms.length > 0
                    ? `${selectedPlatforms.length} Services Connected`
                    : 'Connect Your Streaming Services'}
                </h3>
                <p style={styles.platformSubtext}>
                  {selectedPlatforms.length > 0
                    ? selectedPlatforms.slice(0, 3).join(' • ') +
                      (selectedPlatforms.length > 3 ? '...' : '')
                    : 'Get personalized recommendations instantly'}
                </p>
              </div>
              <button onClick={handlePlatformSetup} style={styles.platformButton}>
                {selectedPlatforms.length > 0 ? 'Edit' : 'Setup'}
              </button>
            </div>
          </div>

          {/* Mood-Based Sections */}
          <div style={styles.moodSection}>
            <div style={styles.moodHeader}>
              <span style={styles.moodEmoji}>🔥</span>
              <div style={styles.moodHeaderText}>
                <h2 style={styles.moodTitle}>Need Something Intense</h2>
                <p style={styles.moodDescription}>
                  Edge-of-your-seat thrillers and powerful dramas
                </p>
              </div>
              <button onClick={() => handleMoodExplore('intense')} style={styles.moodExploreButton}>
                Explore
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard title="Parasite" year="2019" initialSlug="parasite-2019" tmdbId={496243} />
              <MediaCard
                title="Uncut Gems"
                year="2019"
                initialSlug="uncut-gems-2019"
                tmdbId={473033}
              />
              <MediaCard title="Whiplash" year="2014" initialSlug="whiplash-2014" tmdbId={244786} />
            </div>
          </div>

          <div style={styles.moodSection}>
            <div style={styles.moodHeader}>
              <span style={styles.moodEmoji}>✨</span>
              <div style={styles.moodHeaderText}>
                <h2 style={styles.moodTitle}>Looking for Beauty</h2>
                <p style={styles.moodDescription}>Visually stunning films that inspire wonder</p>
              </div>
              <button
                onClick={() => handleMoodExplore('beautiful')}
                style={styles.moodExploreButton}
              >
                Explore
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard title="Her" year="2013" initialSlug="her-2013" tmdbId={152601} />
              <MediaCard
                title="Blade Runner 2049"
                year="2017"
                initialSlug="blade-runner-2049-2017"
                tmdbId={335984}
              />
              <MediaCard
                title="The Grand Budapest Hotel"
                year="2014"
                initialSlug="the-grand-budapest-hotel-2014"
                tmdbId={120467}
              />
            </div>
          </div>

          <div style={styles.moodSection}>
            <div style={styles.moodHeader}>
              <span style={styles.moodEmoji}>🧠</span>
              <div style={styles.moodHeaderText}>
                <h2 style={styles.moodTitle}>Want to Think</h2>
                <p style={styles.moodDescription}>
                  Mind-bending puzzles and philosophical journeys
                </p>
              </div>
              <button
                onClick={() => handleMoodExplore('cerebral')}
                style={styles.moodExploreButton}
              >
                Explore
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard title="Arrival" year="2016" initialSlug="arrival-2016" tmdbId={329865} />
              <MediaCard title="Primer" year="2004" initialSlug="primer-2004" tmdbId={14337} />
              <MediaCard
                title="Mulholland Drive"
                year="2001"
                initialSlug="mulholland-drive-2001"
                tmdbId={1018}
              />
            </div>
          </div>

          <div style={styles.moodSection}>
            <div style={styles.moodHeader}>
              <span style={styles.moodEmoji}>🌙</span>
              <div style={styles.moodHeaderText}>
                <h2 style={styles.moodTitle}>Something Cozy</h2>
                <p style={styles.moodDescription}>Comfort films for quiet nights</p>
              </div>
              <button onClick={() => handleMoodExplore('cozy')} style={styles.moodExploreButton}>
                Explore
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard
                title="Little Women"
                year="2019"
                initialSlug="little-women-2019"
                tmdbId={331482}
              />
              <MediaCard title="Chef" year="2014" initialSlug="chef-2014" tmdbId={228150} />
              <MediaCard
                title="Paddington"
                year="2014"
                initialSlug="paddington-2014"
                tmdbId={109428}
              />
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  heroHeader: {
    position: 'relative',
    width: '100%',
    height: '260px',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '20px',
  },
  heroContent: {
    color: 'white',
    textAlign: 'left',
  },
  heroTitle: {
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
  heroSubtitle: {
    fontSize: '16px',
    fontWeight: '400',
    margin: '0',
    opacity: 0.9,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '0',
  },
  platformCard: {
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  platformCardContent: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    gap: '12px',
  },
  platformIcon: {
    fontSize: '24px',
  },
  platformText: {
    flex: 1,
  },
  platformTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 4px 0',
  },
  platformSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  platformButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  moodSection: {
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  moodHeader: {
    padding: '20px 16px 16px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#fafbfc',
    borderBottom: '1px solid #f3f4f6',
  },
  moodEmoji: {
    fontSize: '24px',
    marginTop: '2px',
  },
  moodHeaderText: {
    flex: 1,
  },
  moodTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 4px 0',
  },
  moodDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
    lineHeight: '1.4',
  },
  moodExploreButton: {
    backgroundColor: 'transparent',
    color: '#007AFF',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'inherit',
    marginTop: '2px',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
    padding: '0',
  },
};
