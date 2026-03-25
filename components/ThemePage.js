// Reusable theme page component
import PhoneFrame from './PhoneFrame';
import SimpleSearch from './SimpleSearch';
import MediaCard from './MediaCard';
import EssentialMovies from './EssentialMovies';
import ThemeFooter from './ThemeFooter';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { themeNavigation } from '../lib/routes';

export default function ThemePage({ themeId, customStyles = {} }) {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState(themeId);

  // Extract theme from URL when route changes
  useEffect(() => {
    if (router.isReady) {
      // Extract theme slug from URL path /themes/[slug]
      const pathSegments = router.asPath.split('/');
      const slugFromUrl = pathSegments[2]; // /themes/[slug]

      if (slugFromUrl && slugFromUrl !== currentThemeId) {
        setCurrentThemeId(slugFromUrl);
      }
    }
  }, [router.isReady, router.asPath, currentThemeId]);

  // Get theme data from centralized system
  const themeData = themeNavigation.getThemeBySlug(currentThemeId);

  // If not found by slug, try by label conversion
  const getThemeDataByLabel = themeId => {
    const labelMap = {
      'film-noir': 'Film Noir',
      'horror-suspense': 'Horror & Suspense',
      'comedy-through-time': 'Comedy',
      'women-directors': 'Women Directors',
      'world-cinema': 'International Masters',
      'acclaimed-directors': 'Acclaimed Directors',
      'avant-garde-film': 'Movements in Film',
      'magic-of-moviemaking': 'The Magic of Moviemaking',
      'cinema-through-decades': 'Cinema Through the Decades',
      'cinema-cultural-impact': 'Hollywood Transformed',
    };

    return {
      title: labelMap[themeId] || 'Theme',
      description: `Explore the world of ${labelMap[themeId] || 'cinema'}`,
    };
  };

  const finalThemeData = themeData || getThemeDataByLabel(currentThemeId);

  const handleSearchResults = results => {
    // With unified search, this won't be called since search redirects to /search page
    // Kept for compatibility if useUnifiedSearch is disabled
    const movies = results.movies || results || [];
    setSearchResults(movies);
    setShowSearchResults(movies.length > 0);
  };

  const handleMovieClick = movie => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  // Episode navigation now uses direct HTML links


  if (!finalThemeData) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.errorText}>Theme not found</div>
        </div>
      </PhoneFrame>
    );
  }

  const mergedStyles = {
    ...styles,
    ...customStyles,
  };

  return (
    <PhoneFrame>
      <div style={mergedStyles.container || styles.container}>
        {/* Search Area */}
        <div style={mergedStyles.inputArea || styles.inputArea}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>

        {/* Video Hero with Title Overlay */}
        {customStyles.heroVideo ? (
          <div style={styles.heroSection}>
            <video
              src={customStyles.heroVideo}
              autoPlay
              muted
              loop
              playsInline
              style={styles.heroVideo}
            />
            <div style={styles.heroTitleOverlay}>
              <h1 style={styles.heroTitle}>{finalThemeData.title}</h1>
              <p style={styles.heroSubtitle}>{finalThemeData.description}</p>
            </div>
          </div>
        ) : customStyles.heroImage ? (
          <div style={styles.heroSection}>
            <div
              style={{
                ...styles.heroImageContainer,
                backgroundImage: `url(${customStyles.heroImage})`,
              }}
            >
              <div style={styles.heroTitleOverlay}>
                <h1 style={styles.heroTitle}>{finalThemeData.title}</h1>
                <p style={styles.heroSubtitle}>{finalThemeData.description}</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.heroSection}>
            <div
              style={{
                ...styles.heroImageContainer,
                background: '#000000',
              }}
            >
              <div style={styles.heroTitleOverlay}>
                <h1 style={styles.heroTitle}>{finalThemeData.title}</h1>
                <p style={styles.heroSubtitle}>{finalThemeData.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div style={mergedStyles.contentArea || styles.contentArea}>
          {/* Essential Movies */}
          <EssentialMovies theme={currentThemeId} />

          {/* Search results removed - now handled by unified search page */}

          {/* Theme Footer - Navigation for other themes */}
          <ThemeFooter />
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
    backgroundColor: '#ffffff',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#1a1a1a',
  },
  contentArea: {
    flex: 1,
    padding: '0',
    background: '#000000',
  },

  // Hero Section Styles
  heroSection: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2.22 / 1',
    overflow: 'hidden',
    marginBottom: '0',
  },
  heroVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroImageContainer: {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
  },
  heroTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
    padding: '20px',
    color: 'white',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
  },
  heroSubtitle: {
    fontSize: '16px',
    color: '#d4af37',
    lineHeight: '1.3',
    margin: 0,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '500',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  themeIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  description: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  searchResults: {
    padding: '16px',
    backgroundColor: '#ffffff',
    margin: '16px',
    borderRadius: '8px',
  },
  resultsHeader: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  movieItem: {
    cursor: 'pointer',
  },
  episodesSection: {
    marginTop: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  episodeCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
  },
  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: 0,
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
    textAlign: 'center',
    padding: '40px',
  },
};
