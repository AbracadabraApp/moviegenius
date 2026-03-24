import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import CollectionPage from '../../components/CollectionPage';
import SimpleSearch from '../../components/SimpleSearch';

export default function Collection() {
  const router = useRouter();
  const { id } = router.query;

  const [collection, setCollection] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/collection?id=${id}`);

        if (response.ok) {
          const data = await response.json();
          setCollection(data.collection);
          setMovies(data.movies || []);
        } else {
          setError('Collection not found');
        }
      } catch (err) {
        console.error('Failed to fetch collection:', err);
        setError('Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router.isReady, id]);

  const handleBack = () => {
    router.back();
  };

  return (
    <PhoneFrame backgroundImage={null} showDarkOverlay={false}>
      <div style={styles.container}>
        {/* Sticky Search Header */}
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
            <CollectionPage collection={collection} movies={movies} onBack={handleBack} />
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

  stickyHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: 'none',
  },

  searchRow: {
    padding: '12px 16px',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
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
