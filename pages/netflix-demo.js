/**
 * Netflix-Style Carousel Demo Page
 *
 * Demonstrates the enhanced Netflix-style carousels with real MovieGenius data
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import NetflixCarousel from '../components/NetflixCarousel';

export default function NetflixDemoPage() {
  const router = useRouter();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Background images from /public/images/backgrounds/
  const backgroundImages = [
    '/images/backgrounds/1.jpg',
    '/images/backgrounds/2.jpg',
    '/images/backgrounds/3.jpg',
    '/images/backgrounds/4.jpg',
    '/images/backgrounds/5.jpg',
    '/images/backgrounds/6.jpg',
    '/images/backgrounds/7.jpg',
    '/images/backgrounds/8.jpg',
    '/images/backgrounds/9.jpg',
    '/images/backgrounds/10.jpg',
    '/images/backgrounds/11.jpg',
    '/images/backgrounds/12.jpg',
    '/images/backgrounds/13.jpg',
    '/images/backgrounds/14.jpg',
    '/images/backgrounds/15.jpg',
    '/images/backgrounds/16.jpg',
    '/images/backgrounds/17.jpg',
    '/images/backgrounds/18.jpg',
    '/images/backgrounds/19.jpg',
    '/images/backgrounds/20.jpg',
    '/images/backgrounds/21.jpg',
    '/images/backgrounds/22.jpg',
    '/images/backgrounds/23.jpg',
    '/images/backgrounds/24.jpg',
    '/images/backgrounds/25.jpg',
    '/images/backgrounds/26.jpg',
    '/images/backgrounds/27.jpg',
    '/images/backgrounds/28.jpg',
    '/images/backgrounds/29.jpg',
  ];

  // Pick random image on each page load
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    setCurrentImageIndex(randomIndex);
  }, [router.asPath]);

  // Fetch featured collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/featured-collections?limit=8&moviesPerCollection=12');

        if (response.ok) {
          const data = await response.json();
          setCollections(data.collections || []);
        }
      } catch (error) {
        console.error('Failed to fetch featured collections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // Category labels for variety
  const categoryLabels = [
    'Trending Now',
    'Popular on MovieGenius',
    'New Releases',
    'Award Winners',
    'Classic Cinema',
    'Hidden Gems',
    'Critics\' Choice',
    'Fan Favorites'
  ];

  return (
    <PhoneFrame
      backgroundImage={backgroundImages[currentImageIndex]}
      showDarkOverlay={true}
    >
      <div style={styles.container}>
        {/* Sticky Search Header */}
        <div style={styles.header}>
          <h1 style={styles.logo}>MovieGenius</h1>
          <SimpleSearch placeholder="Search movies..." />
        </div>

        {/* Browse Content */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading collections...</div>
            </div>
          )}

          {!loading && collections.length === 0 && (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyIcon}>🎬</div>
              <div style={styles.emptyText}>No collections available</div>
            </div>
          )}

          {!loading && collections.length > 0 && (
            <>
              {/* Hero Section */}
              <div style={styles.heroSection}>
                <h1 style={styles.heroTitle}>Discover Cinema</h1>
                <p style={styles.heroText}>
                  Curated collections of the best films ever made
                </p>
              </div>

              {/* Netflix-Style Carousels */}
              {collections.map((collection, index) => (
                <NetflixCarousel
                  key={collection.id}
                  title={collection.title}
                  movies={collection.movies}
                  collectionId={collection.id}
                  showViewAll={true}
                  categoryLabel={categoryLabels[index % categoryLabels.length]}
                />
              ))}

              {/* Browse All Link */}
              <div style={styles.browseAllSection}>
                <button
                  onClick={() => router.push('/browse')}
                  style={styles.browseAllButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.25)';
                    e.currentTarget.style.borderColor = '#d4af37';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
                    e.currentTarget.style.borderColor = '#d4af37';
                  }}
                >
                  Browse All Collections →
                </button>
              </div>
            </>
          )}
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
    backgroundColor: 'transparent',
    position: 'relative',
  },

  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.8))',
    padding: '16px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  logo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#d4af37',
    margin: '0 0 12px 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'relative',
    paddingBottom: '40px',
  },

  // Loading state
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#ffffff',
    opacity: 0.7,
  },

  // Empty state
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  emptyText: {
    fontSize: '16px',
    color: '#ffffff',
    opacity: 0.7,
  },

  // Hero section
  heroSection: {
    padding: '40px 16px 32px 16px',
  },

  heroTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
  },

  heroText: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    lineHeight: '1.5',
  },

  // Browse all section
  browseAllSection: {
    padding: '32px 16px',
    textAlign: 'center',
  },

  browseAllButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    border: '1px solid #d4af37',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#d4af37',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};
