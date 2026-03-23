/**
 * Editorial Collection Page
 *
 * Sophisticated, magazine-style presentation of movie collections
 * with subcategories, annotations, and editorial context
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../../components/PhoneFrame';
import EditorialCollection from '../../../components/EditorialCollection';
import SimpleSearch from '../../../components/SimpleSearch';
import { ChevronLeft } from 'lucide-react';

export default function EditorialCollectionPage() {
  const router = useRouter();
  const { id } = router.query;

  const [collection, setCollection] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchEditorialData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/browse-editorial?id=${id}`);

        if (response.ok) {
          const data = await response.json();
          setCollection(data.collection);
          setMovies(data.movies || []);
        } else {
          setError('Collection not found');
        }
      } catch (err) {
        console.error('Failed to fetch editorial collection:', err);
        setError('Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    fetchEditorialData();
  }, [router.isReady, id]);

  const handleBack = () => {
    router.back();
  };

  return (
    <PhoneFrame backgroundImage={null} showDarkOverlay={false}>
      <div style={styles.container}>
        {/* Gold background layer (scrolls with content) */}
        <div style={styles.goldBackground}></div>

        {/* Sticky Search Header (floats above) */}
        <div style={styles.stickyHeader}>
          <div style={styles.searchRow}>
            <SimpleSearch placeholder="Search movies..." />
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading collection...</div>
            </div>
          )}

          {error && (
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>📚</div>
              <div style={styles.errorText}>{error}</div>
            </div>
          )}

          {!loading && !error && collection && (
            <EditorialCollection collection={collection} movies={movies} onBack={handleBack} />
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
    background: '#ffffff',
    position: 'relative',
  },

  goldBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '600px', // Tall enough to cover header + first section
    background: 'linear-gradient(180deg, #d4af37 0%, #f4e4b8 8%, #fef8e7 20%, #fffcf5 45%, #ffffff 75%)',
    zIndex: 0,
    pointerEvents: 'none',
  },

  stickyHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
  },

  searchRow: {
    padding: '12px 16px',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    position: 'relative',
    zIndex: 1,
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },

  loadingText: {
    fontSize: '16px',
    color: '#7A7870',
    opacity: 0.8,
  },

  errorContainer: {
    textAlign: 'center',
    padding: '80px 20px',
  },

  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  errorText: {
    fontSize: '16px',
    color: '#7A7870',
  },
};
