// pages/recs-new.js - Movies as Home: Movie Enthusiasm Gateway
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AnonymousUserManager from '../lib/anonymous-user';

export default function MoviesHomePage() {
  const router = useRouter();
  const [declarativeLists, setDeclarativeLists] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize anonymous user and load data
  useEffect(() => {
    const initializePage = async () => {
      try {
        // Initialize anonymous user system
        await AnonymousUserManager.initialize();

        // Load declarative lists for tag cloud
        const response = await fetch('/api/tag-cloud?content_type=declarative');
        if (response.ok) {
          const data = await response.json();
          // Randomize and assign font sizes
          const shuffled = data.lists.sort(() => 0.5 - Math.random());
          const listsWithSizes = shuffled.slice(0, 75).map((item, index) => ({
            ...item,
            fontSize: index % 3 === 0 ? 'large' : index % 3 === 1 ? 'medium' : 'small',
          }));
          setDeclarativeLists(listsWithSizes);
        }

        // Load user platforms
        const platforms = JSON.parse(localStorage.getItem('selectedPlatforms') || '[]');
        setSelectedPlatforms(platforms);
      } catch (error) {
        console.error('Error initializing Movies home page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();

    // Listen for platform updates
    const handlePlatformUpdate = () => {
      const platforms = JSON.parse(localStorage.getItem('selectedPlatforms') || '[]');
      setSelectedPlatforms(platforms);
    };

    window.addEventListener('platformsUpdated', handlePlatformUpdate);
    return () => window.removeEventListener('platformsUpdated', handlePlatformUpdate);
  }, []);

  const handleSearchResults = results => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on Recs page:', results);
  };

  const handleListClick = list => {
    // Navigate to list detail page
    router.push(`/genius/list/${list.slug}`);
  };

  const handleEditPlatforms = () => {
    router.push('/you#platforms');
  };

  if (isLoading) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading movie discovery...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Hero Section with Large Ask Bar */}
        <div style={styles.heroSection}>
          <h1 style={styles.heroTitle}>Ask me anything about movies</h1>
          <div style={styles.heroAskBar}>
            <SimpleSearch
              onResults={handleSearchResults}
              placeholder="Best sci-fi like Blade Runner..."
            />
          </div>
        </div>

        {/* Platform Status (if selected) */}
        {selectedPlatforms.length > 0 && (
          <div style={styles.platformStatus}>
            <span style={styles.platformText}>
              Your platforms: {selectedPlatforms.slice(0, 3).join(', ')}
              {selectedPlatforms.length > 3 && ` +${selectedPlatforms.length - 3} more`}
            </span>
            <button style={styles.editButton} onClick={handleEditPlatforms}>
              edit
            </button>
          </div>
        )}

        {/* Declarative Tag Cloud */}
        <div style={styles.content}>
          <div style={styles.tagCloudSection}>
            <h2 style={styles.sectionTitle}>Browse Movie Collections</h2>
            <div style={styles.tagCloud}>
              {declarativeLists.map((list, index) => (
                <button
                  key={list.id}
                  style={{
                    ...styles.tagButton,
                    ...styles[
                      `fontSize${list.fontSize.charAt(0).toUpperCase() + list.fontSize.slice(1)}`
                    ],
                  }}
                  onClick={() => handleListClick(list)}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#e3f2fd';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {list.name}
                </button>
              ))}
            </div>
          </div>

          {/* Call to Action for Platform Selection */}
          {selectedPlatforms.length === 0 && (
            <div style={styles.platformCTA}>
              <h3 style={styles.ctaTitle}>Want to see where movies stream?</h3>
              <p style={styles.ctaSubtitle}>Select your platforms to see availability</p>
              <button style={styles.ctaButton} onClick={handleEditPlatforms}>
                Choose Streaming Platforms
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Cache for performance
export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');

  return { props: {} };
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
  },
  heroSection: {
    padding: '32px 24px 24px',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 24px 0',
    lineHeight: '1.2',
  },
  heroAskBar: {
    marginBottom: '8px',
  },
  largeInput: {
    fontSize: '18px',
    padding: '16px 20px',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  },
  platformStatus: {
    padding: '12px 24px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  platformText: {
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
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '0 24px 24px',
  },
  tagCloudSection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'left',
  },
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    lineHeight: 1.4,
  },
  tagButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderRadius: '6px',
    padding: '4px 8px',
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
    fontFamily: 'inherit',
  },
  fontSizeLarge: {
    fontSize: '20px',
    fontWeight: '700',
  },
  fontSizeMedium: {
    fontSize: '16px',
    fontWeight: '600',
  },
  fontSizeSmall: {
    fontSize: '14px',
    fontWeight: '500',
  },
  platformCTA: {
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginTop: '24px',
  },
  ctaTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  ctaSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0',
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
