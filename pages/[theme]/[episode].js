// Dynamic episode page
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import BackButton from '../../components/BackButton';
import MediaCard from '../../components/MediaCard';
import { underlineProperNames } from '../../lib/proper-names';
import themeMapping from '../../data/theme-episode-mapping.json';

export default function EpisodePage() {
  const router = useRouter();
  const { theme, episode } = router.query;
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleSearchResults = (results) => {
    // Auto-navigate to single results
    if (results.length === 1) {
      const movie = results[0];
      if (movie.tmdb_id) {
        router.push(`/movie/${movie.tmdb_id}`);
        return;
      }
    }
    // For multiple results, redirect to search page
    if (results.length > 1) {
      router.push('/search');
    }
  };

  useEffect(() => {
    if (!theme || !episode) return;

    const loadEpisode = async () => {
      try {
        setLoading(true);
        setError(null);

        // Find the episode data from mapping
        const themeData = themeMapping.themes[theme];
        if (!themeData) {
          throw new Error('Theme not found');
        }

        const episodeInfo = themeData.episodes.find(ep => ep.id === episode);
        if (!episodeInfo) {
          throw new Error('Episode not found');
        }

        // Load the episode content from JSON file
        const response = await fetch(`/data/episodes/${episodeInfo.file}`);
        if (!response.ok) {
          throw new Error('Episode content not found');
        }

        const episodeContent = await response.json();
        
        setEpisodeData({
          ...episodeInfo,
          content: episodeContent
        });

      } catch (err) {
        console.error('Error loading episode:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadEpisode();
  }, [theme, episode]);

  if (loading) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <BackButton variant="icon" context="episode" position="top-left" />
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading episode...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <BackButton variant="icon" context="episode" position="top-left" />
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Error: {error}</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (!episodeData) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <BackButton variant="icon" context="episode" position="top-left" />
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Episode not found</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const themeData = themeMapping.themes[theme];

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <BackButton variant="icon" context="episode" position="top-left" />
        
        <div style={styles.inputArea}>
          <SimpleSearch onResults={handleSearchResults} />
        </div>

        <div style={styles.contentArea}>
          {/* Breadcrumb */}
          <div style={styles.breadcrumb}>
            <span 
              style={styles.breadcrumbLink}
              onClick={() => router.push(`/${theme}`)}
            >
              {themeData.title}
            </span>
            <span style={styles.breadcrumbSeparator}> › </span>
            <span style={styles.breadcrumbCurrent}>{episodeData.title}</span>
          </div>

          {/* Episode Header */}
          <div style={styles.episodeHeader}>
            <h1 style={styles.episodeTitle}>{episodeData.title}</h1>
            <p style={styles.episodeSubtitle}>{episodeData.subtitle}</p>
          </div>

          {/* Episode Content */}
          {episodeData.content && (
            <div style={styles.episodeContent}>
              {/* Opener */}
              {episodeData.content.content?.opener && (
                <div style={styles.opener}>
                  {underlineProperNames(episodeData.content.content.opener)}
                </div>
              )}

              {/* Content Sections */}
              {episodeData.content.content?.sections?.map((section, index) => (
                <div key={index}>
                  {section.type === 'text' && (
                    <div style={styles.textSection}>
                      {underlineProperNames(section.content)}
                    </div>
                  )}
                  {section.type === 'movies' && section.movies && (
                    <div style={styles.movieSection}>
                      <div style={styles.movieSectionHeader}>Featured Films</div>
                      <div style={styles.movieList}>
                        {section.movies.map((movie, movieIndex) => (
                          <MediaCard
                            key={`${index}-${movieIndex}`}
                            title={movie.title}
                            year={movie.year}
                            initialSlug={movie.slug}
                            tmdbId={movie.tmdb_id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* More Ideas */}
              {episodeData.content.content?.moreIdeas?.movies && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>
                    {episodeData.content.content.moreIdeas.title || 'Related Films'}
                  </h3>
                  <div style={styles.movieList}>
                    {episodeData.content.content.moreIdeas.movies.map((movie, index) => (
                      <MediaCard
                        key={`more-${index}`}
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        tmdbId={movie.tmdb_id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  contentArea: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '16px',
  },
  breadcrumb: {
    marginBottom: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  breadcrumbLink: {
    color: '#3b82f6',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
  },
  breadcrumbCurrent: {
    color: '#374151',
  },
  episodeHeader: {
    marginBottom: '24px',
  },
  episodeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
    lineHeight: '1.2',
  },
  episodeSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: 0,
  },
  episodeContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
  },
  opener: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
    lineHeight: '1.6',
    marginBottom: '24px',
    fontStyle: 'italic',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  textSection: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  movieSection: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  movieSectionHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  moreIdeasSection: {
    marginTop: '32px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
  },
  loadingContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  errorContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
  },
};