// Dynamic episode page
import { useRouter } from 'next/router';
import { useState } from 'react';
import PhoneFrame from '../../components/PhoneFrame';
import SimpleSearch from '../../components/SimpleSearch';
import MediaCard from '../../components/MediaCard';
import EpisodeFooter from '../../components/EpisodeFooter';
import { underlineProperNames } from '../../lib/proper-names';
import themeMapping from '../../data/theme-episode-mapping.json';

export default function EpisodePage({ theme, episode, episodeData, themeData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearchResults = (results) => {
    // With unified search, this won't be called since search redirects to /search page
    // Kept for compatibility if useUnifiedSearch is disabled
  };

  // If router is still loading, show loading state
  if (router.isFallback) {
    return (
      <PhoneFrame active="genius">
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>Loading episode...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (loading) {
    return (
      <PhoneFrame active="genius">
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
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
      <PhoneFrame active="genius">
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
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
      <PhoneFrame active="genius">
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Episode not found</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // themeData is now passed as a prop from getStaticProps

  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        
        <div style={styles.inputArea}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>

        <div style={styles.contentArea}>

          {/* Hero Section */}
          {(() => {
            // Use correct hero image mapping for film noir
            const heroImageSrc = (theme === 'film-noir' && (() => {
                const heroImageMap = {
                  'german-expressionism': '1-german-expressionism.jpg',
                  'from-novels-to-noir': '2-novel.jpg',
                  'urban-anxiety': '3-mitchum.jpg',
                  'femme-fatales': '4-femme-fateles.jpg',
                  'moral-ambiguity': '5-moral-ambiguity.jpg',
                  'noirs-legacy': '6-noirs-legacy.jpg'
                };
                const imageName = heroImageMap[episode];
                return imageName ? `/images/hero/film-noir/${imageName}` : null;
              })());
              
            return heroImageSrc ? (
              <>
                <div style={styles.heroSection}>
                  <img 
                    src={heroImageSrc}
                    alt="Hero Image" 
                    style={styles.heroImage}
                  />
                </div>
                <button style={styles.heroTitleButton}>
                  <h1 style={styles.heroTitle}>{episodeData.episode?.title || episodeData.title}</h1>
                  <p style={styles.heroSubtitle}>{episodeData.episode?.subtitle || episodeData.subtitle}</p>
                </button>
              </>
            ) : (
              <div style={styles.episodeHeader}>
                <h1 style={styles.episodeTitle}>{episodeData.episode?.title || episodeData.title}</h1>
                <p style={styles.episodeSubtitle}>{episodeData.episode?.subtitle || episodeData.subtitle}</p>
              </div>
            );
          })()}


          {/* Episode Content */}
          {episodeData.content && (
            <div style={styles.episodeContent}>
              {/* Opener */}
              {episodeData.content?.opener && (
                <div style={styles.opener}>
                  {underlineProperNames(episodeData.content.opener)}
                </div>
              )}

              {/* Content Sections */}
              {episodeData.content?.sections?.map((section, index) => (
                <div key={index}>
                  {section.type === 'text' && (
                    <div style={styles.textSection}>
                      {underlineProperNames(section.content)}
                    </div>
                  )}
                  {section.type === 'subhead' && (
                    <button style={styles.subheadButton}>
                      <h3 style={styles.subheadTitle}>{section.content}</h3>
                    </button>
                  )}
                  {section.type === 'movies' && section.movies && (
                    <div style={styles.movieSection}>
                      <div style={styles.movieSectionHeader}>
                        <div style={styles.sectionDivider} />
                        <span style={styles.sectionLabel}>Featured Films</span>
                        <div style={styles.sectionDivider} />
                      </div>
                      <div style={styles.movieList}>
                        {section.movies.map((movie, movieIndex) => (
                          <MediaCard
                            key={`${index}-${movieIndex}`}
                            title={movie.title}
                            year={movie.year}
                            initialSlug={movie.slug}
                            initialPoster={movie.poster_url}
                            initialStreaming={movie.streaming}
                            tmdbId={movie.tmdb_id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* More Ideas */}
              {episodeData.content?.moreIdeas?.movies && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>
                    {episodeData.content.moreIdeas.title || 'Related Films'}
                  </h3>
                  <div style={styles.movieList}>
                    {episodeData.content.moreIdeas.movies.map((movie, index) => (
                      <MediaCard
                        key={`more-${index}`}
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        initialPoster={movie.poster_url}
                        initialStreaming={movie.streaming}
                        tmdbId={movie.tmdb_id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Episode Footer - Navigation for episodes and themes */}
              <EpisodeFooter 
                currentTheme={theme} 
                currentEpisode={episode} 
              />
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
    backgroundColor: '#ffffff',
  },
  inputArea: {
    padding: '16px',
    backgroundColor: '#1a1a1a',
  },
  contentArea: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '0 0 20px 0',
    background: 'linear-gradient(to bottom, #1a1a1a 0%, #374151 100%)',
  },
  episodeHeader: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
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
    padding: '16px',
    backgroundColor: '#ffffff',
    margin: '16px 16px 16px 16px',
    borderRadius: '8px',
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
  subheadButton: {
    marginTop: '4px',
    marginBottom: '4px',
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    width: '100%',
  },
  subheadTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#d4af37',
    margin: '0',
    lineHeight: '1.3',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    wordWrap: 'break-word',
    hyphens: 'auto',
  },
  movieSection: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d4af37',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
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
  
  // Hero Section Styles
  heroSection: {
    position: 'relative',
    width: '100%',
    aspectRatio: '2 / 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '0',
    borderRadius: '0',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 1,
  },
  heroTitleButton: {
    backgroundColor: '#1a1a1a',
    padding: '4px 20px 16px 20px',
    textAlign: 'left',
    paddingLeft: '36px',
    borderLeft: '8px solid #d4af37',
    border: 'none',
    width: '100%',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 2px 0',
    lineHeight: '1.1',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
    wordWrap: 'break-word',
    hyphens: 'auto',
  },
  heroSubtitle: {
    fontSize: '16px',
    color: '#d4af37',
    lineHeight: '1.3',
    margin: 0,
    opacity: 1,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
    wordWrap: 'break-word',
    hyphens: 'auto',
  },

  // Navigation Styles
  navigationSection: {
    marginTop: '40px',
    padding: '0',
  },
  navigationTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: '16px',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  episodeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    justifyItems: 'start',
  },
  episodeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    width: '280px',
  },
  episodeButtonTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  episodeButtonSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    justifyItems: 'start',
  },
  themeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    width: '280px',
  },
  themeButtonTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '6px',
    lineHeight: '1.3',
  },
  themeButtonDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
};

// getStaticPaths - generate all possible theme/episode combinations
export async function getStaticPaths() {
  const paths = [];
  
  // Generate paths for all theme/episode combinations
  Object.keys(themeMapping.themes).forEach(themeId => {
    const theme = themeMapping.themes[themeId];
    theme.episodes.forEach(episode => {
      paths.push({
        params: {
          theme: themeId,
          episode: episode.id
        }
      });
    });
  });

  console.log(`🚀 Generated ${paths.length} static episode paths`);
  
  return {
    paths,
    fallback: false // Return 404 for non-existent paths
  };
}

// getStaticProps - fetch episode data at build time
export async function getStaticProps({ params }) {
  const { theme, episode } = params;
  
  try {
    // Validate theme exists
    const themeData = themeMapping.themes[theme];
    if (!themeData) {
      return { notFound: true };
    }

    // Find the episode in the theme
    const episodeInfo = themeData.episodes.find(ep => ep.id === episode);
    if (!episodeInfo) {
      return { notFound: true };
    }

    // Load episode content from JSON file
    const fs = await import('fs');
    const path = await import('path');
    
    const episodeFilePath = path.default.join(process.cwd(), 'data', 'episodes', episodeInfo.file);
    
    if (!fs.default.existsSync(episodeFilePath)) {
      console.error(`Episode file not found: ${episodeInfo.file}`);
      return { notFound: true };
    }

    const episodeContent = JSON.parse(fs.default.readFileSync(episodeFilePath, 'utf8'));
    
    // Merge episode info with content
    const episodeData = {
      ...episodeInfo,
      ...episodeContent,
      theme: themeData
    };

    return {
      props: {
        theme,
        episode,
        episodeData,
        themeData
      },
      revalidate: 86400 // Revalidate once per day
    };
    
  } catch (error) {
    console.error('Error loading episode data:', error);
    return { notFound: true };
  }
}