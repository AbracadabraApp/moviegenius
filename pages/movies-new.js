// pages/movies-new.js - New movies page with genius header and curated lists
import PhoneFrame from '../components/PhoneFrame';
import MediaCard from '../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MoviesNewPage() {
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

    // Listen for platform updates
    const handlePlatformUpdate = () => {
      loadSelectedPlatforms();
    };

    window.addEventListener('platformsUpdated', handlePlatformUpdate);
    return () => window.removeEventListener('platformsUpdated', handlePlatformUpdate);
  }, []);

  const handlePlatformSetup = () => {
    router.push('/you#platforms');
  };

  const handleViewAll = category => {
    // Navigate to full list page
    router.push(`/genius/category/${category}`);
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
              <h1 style={styles.heroTitle}>Discover Your Next Great Film</h1>
              <p style={styles.heroSubtitle}>Curated by cinema experts, powered by your taste</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={styles.scrollableContent}>
          {/* Platform Picker Teaser */}
          <div style={styles.platformTeaser}>
            <div style={styles.platformTeaserContent}>
              <div style={styles.platformTeaserText}>
                <h3 style={styles.platformTeaserTitle}>
                  {selectedPlatforms.length > 0
                    ? `Streaming on ${selectedPlatforms.slice(0, 2).join(', ')}${selectedPlatforms.length > 2 ? ` +${selectedPlatforms.length - 2} more` : ''}`
                    : 'What streaming services do you have?'}
                </h3>
                <p style={styles.platformTeaserSubtext}>
                  {selectedPlatforms.length > 0
                    ? 'Get personalized recommendations for your services'
                    : 'Tell us your platforms for personalized recommendations'}
                </p>
              </div>
              <button onClick={handlePlatformSetup} style={styles.platformTeaserButton}>
                {selectedPlatforms.length > 0 ? 'Edit' : 'Set Up'}
              </button>
            </div>
          </div>

          {/* In Theaters Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>In Theaters Now</h2>
              <button onClick={() => handleViewAll('in-theaters')} style={styles.viewAllButton}>
                View All
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard
                title="Dune: Part Two"
                year="2024"
                initialSlug="dune-part-two-2024"
                tmdbId={693134}
              />
              <MediaCard
                title="Poor Things"
                year="2023"
                initialSlug="poor-things-2023"
                tmdbId={792307}
              />
              <MediaCard
                title="The Zone of Interest"
                year="2023"
                initialSlug="the-zone-of-interest-2023"
                tmdbId={1003579}
              />
            </div>
          </div>

          {/* New on Netflix Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>New on Netflix</h2>
              <button onClick={() => handleViewAll('new-netflix')} style={styles.viewAllButton}>
                View All
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard
                title="The Gentlemen"
                year="2024"
                initialSlug="the-gentlemen-2024"
                tmdbId={1003581}
              />
              <MediaCard
                title="All Quiet on the Western Front"
                year="2022"
                initialSlug="all-quiet-on-the-western-front-2022"
                tmdbId={49046}
              />
              <MediaCard
                title="Glass Onion"
                year="2022"
                initialSlug="glass-onion-2022"
                tmdbId={316029}
              />
            </div>
          </div>

          {/* Classics on Prime Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Classics on Prime</h2>
              <button onClick={() => handleViewAll('classics-prime')} style={styles.viewAllButton}>
                View All
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard
                title="The Godfather"
                year="1972"
                initialSlug="the-godfather-1972"
                tmdbId={238}
              />
              <MediaCard
                title="Apocalypse Now"
                year="1979"
                initialSlug="apocalypse-now-1979"
                tmdbId={28}
              />
              <MediaCard
                title="Taxi Driver"
                year="1976"
                initialSlug="taxi-driver-1976"
                tmdbId={103}
              />
            </div>
          </div>

          {/* Director Spotlights Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Kubrick Essentials</h2>
              <button
                onClick={() => handleViewAll('kubrick-essentials')}
                style={styles.viewAllButton}
              >
                View All
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard
                title="2001: A Space Odyssey"
                year="1968"
                initialSlug="2001-a-space-odyssey-1968"
                tmdbId={62}
              />
              <MediaCard
                title="A Clockwork Orange"
                year="1971"
                initialSlug="a-clockwork-orange-1971"
                tmdbId={185}
              />
              <MediaCard
                title="The Shining"
                year="1980"
                initialSlug="the-shining-1980"
                tmdbId={694}
              />
            </div>
          </div>

          {/* Hidden Gems Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Hidden Gems</h2>
              <button onClick={() => handleViewAll('hidden-gems')} style={styles.viewAllButton}>
                View All
              </button>
            </div>
            <div style={styles.movieGrid}>
              <MediaCard
                title="The Handmaiden"
                year="2016"
                initialSlug="the-handmaiden-2016"
                tmdbId={290859}
              />
              <MediaCard title="Burning" year="2018" initialSlug="burning-2018" tmdbId={492188} />
              <MediaCard
                title="Portrait of a Lady on Fire"
                year="2019"
                initialSlug="portrait-of-a-lady-on-fire-2019"
                tmdbId={631842}
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
    height: '280px',
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
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '20px',
  },
  heroContent: {
    color: 'white',
    textAlign: 'left',
  },
  heroTitle: {
    fontSize: '24px',
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
  platformTeaser: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px',
  },
  platformTeaserContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  platformTeaserText: {
    flex: 1,
  },
  platformTeaserTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 4px 0',
  },
  platformTeaserSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  platformTeaserButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  section: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f3f4f6',
    padding: '20px 16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    margin: '0',
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    color: '#007AFF',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};
