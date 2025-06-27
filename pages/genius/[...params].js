// pages/genius/[...params].js - Unified Genius Education System Router
import { useRouter } from 'next/router';
import PhoneFrame from '../../components/PhoneFrame';
import AskInputBar from '../../components/AskInputBar';
import BackButton from '../../components/BackButton';
import MediaCard from '../../components/MediaCard';
import EpisodeCard from '../../components/EpisodeCard';
import GeniusEpisodePage from '../../components/GeniusEpisodePage';
import { useState, useEffect } from 'react';
import geniusConfig from '../../data/genius-config.json';

export default function GeniusPage({ pageType, data, themeId, seriesId, episodeId }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  // Show loading state during hydration or if data is missing
  if (!isClient || !pageType) {
    return (
      <PhoneFrame active="genius">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Loading...
        </div>
      </PhoneFrame>
    );
  }

  // Route to appropriate page component
  switch (pageType) {
    case 'theme':
      return <ThemePage data={data} handleAsk={handleAsk} />;
    case 'series':
      return <SeriesPage data={data} themeId={themeId} handleAsk={handleAsk} />;
    case 'episode':
      return <GeniusEpisodePage 
        episodeData={data} 
        themeId={themeId} 
        seriesId={seriesId} 
        episodeId={episodeId} 
        handleAsk={handleAsk} 
      />;
    default:
      return <GeniusHomePage handleAsk={handleAsk} />;
  }
}

// Theme Overview Page
function ThemePage({ data, handleAsk }) {
  const router = useRouter();
  
  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="episode" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        <div style={styles.scrollableContent}>
          {/* Theme Header */}
          <div style={styles.themeHeader}>
            <h1 style={styles.themeTitle}>{data.theme.title}</h1>
            <p style={styles.themeDescription}>{data.theme.description}</p>
          </div>
          
          {/* Series Grid */}
          <div style={styles.seriesGrid}>
            <h2 style={styles.sectionTitle}>Series in this Theme</h2>
            {data.theme.series.map((series, index) => (
              <div 
                key={series.id}
                style={styles.seriesCard}
                onClick={() => router.push(`/genius/${data.theme.id}/${series.id}`)}
              >
                <div style={styles.seriesNumber}>Series {series.id}</div>
                <h3 style={styles.seriesTitle}>{series.title}</h3>
                <p style={styles.seriesDescription}>{series.description}</p>
                <div style={styles.episodeCount}>{series.episodes.length} Episodes</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Series Overview Page
function SeriesPage({ data, themeId, handleAsk }) {
  const router = useRouter();
  
  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="episode" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        <div style={styles.scrollableContent}>
          {/* Breadcrumb Navigation */}
          <div style={styles.breadcrumb}>
            <span 
              style={styles.breadcrumbLink}
              onClick={() => router.push(`/genius/${themeId}`)}
            >
              {data.theme.title}
            </span>
            <span style={styles.breadcrumbSeparator}> › </span>
            <span style={styles.breadcrumbCurrent}>{data.series.title}</span>
          </div>
          
          {/* Series Header */}
          <div style={styles.seriesHeader}>
            <h1 style={styles.seriesTitle}>{data.series.title}</h1>
            <p style={styles.seriesDescription}>{data.series.description}</p>
          </div>
          
          {/* Episodes List */}
          <div style={styles.episodesList}>
            <h2 style={styles.sectionTitle}>Episodes</h2>
            {data.series.episodes.map((episode, index) => (
              <div 
                key={episode.id}
                style={styles.episodeCard}
                onClick={() => router.push(`/genius/${themeId}/${data.series.id}/${episode.id}`)}
              >
                <div style={styles.episodeNumber}>Episode {episode.id}</div>
                <h3 style={styles.episodeTitle}>{episode.title}</h3>
                <p style={styles.episodeSubtitle}>{episode.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Episode Detail Page (Reusing existing episode page logic)
function EpisodePage({ data, themeId, seriesId, episodeId, handleAsk }) {
  const router = useRouter();
  
  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="episode" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        <div style={styles.scrollableContent}>
          {/* Breadcrumb Navigation */}
          <div style={styles.breadcrumb}>
            <span 
              style={styles.breadcrumbLink}
              onClick={() => router.push(`/genius/${themeId}`)}
            >
              {data.theme.title}
            </span>
            <span style={styles.breadcrumbSeparator}> › </span>
            <span 
              style={styles.breadcrumbLink}
              onClick={() => router.push(`/genius/${themeId}/${seriesId}`)}
            >
              {data.series.title}
            </span>
            <span style={styles.breadcrumbSeparator}> › </span>
            <span style={styles.breadcrumbCurrent}>{data.episode.title}</span>
          </div>
          
          {/* Episode Header */}
          <div style={styles.episodeHeader}>
            <h1 style={styles.episodeTitle}>{data.episode.title}</h1>
            <p style={styles.episodeSubtitle}>{data.episode.subtitle}</p>
          </div>
          
          {/* Episode Content (if available) */}
          {data.episodeContent && (
            <div style={styles.episodeContent}>
              {/* Opener */}
              {data.episodeContent.opener && (
                <div style={styles.opener}>{data.episodeContent.opener}</div>
              )}
              
              {/* Content Sections */}
              {data.episodeContent.sections && data.episodeContent.sections.map((section, index) => (
                <div key={index}>
                  {section.type === 'text' && (
                    <div style={styles.textSection}>{section.content}</div>
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
              {data.episodeContent.moreIdeas && data.episodeContent.moreIdeas.movies && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>{data.episodeContent.moreIdeas.title}</h3>
                  <div style={styles.movieList}>
                    {data.episodeContent.moreIdeas.movies.map((movie, index) => (
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
          
          {/* Navigation to Other Episodes */}
          <div style={styles.navigationSection}>
            <h3 style={styles.sectionTitle}>Other Episodes in This Series</h3>
            <div style={styles.episodeNavigation}>
              {data.series.episodes
                .filter(ep => ep.id !== parseInt(episodeId))
                .map((episode) => (
                  <div 
                    key={episode.id}
                    style={styles.navEpisodeCard}
                    onClick={() => router.push(`/genius/${themeId}/${seriesId}/${episode.id}`)}
                  >
                    <div style={styles.navEpisodeNumber}>Episode {episode.id}</div>
                    <div style={styles.navEpisodeTitle}>{episode.title}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Genius Home Page (Overview of all themes)
function GeniusHomePage({ handleAsk }) {
  const router = useRouter();
  
  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="episode" position="top-left" />
        
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        <div style={styles.scrollableContent}>
          <div style={styles.homeHeader}>
            <h1 style={styles.homeTitle}>MovieGenius Film Education</h1>
            <p style={styles.homeDescription}>
              Comprehensive film education through curated themes, series, and episodes
            </p>
          </div>
          
          <div style={styles.themesGrid}>
            {Object.values(geniusConfig.themes).map((theme) => (
              <div 
                key={theme.id}
                style={styles.themeCard}
                onClick={() => router.push(`/genius/${theme.id}`)}
              >
                <h3 style={styles.themeCardTitle}>{theme.title}</h3>
                <p style={styles.themeCardDescription}>{theme.description}</p>
                <div style={styles.themeStats}>
                  {theme.series.length} Series • {theme.series.reduce((acc, s) => acc + s.episodes.length, 0)} Episodes
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Enhanced static generation with demo mode optimizations
export async function getStaticPaths() {
  const { getDemoConfig, getDemoSafetyMonitor } = await import('../../lib/demo-config.js');
  const demoConfig = getDemoConfig();
  const safetyMonitor = getDemoSafetyMonitor();
  
  const buildStartTime = Date.now();
  const paths = [];
  
  // Generate paths for all themes, series, and episodes
  Object.values(geniusConfig.themes).forEach(theme => {
    // Theme page
    paths.push({ params: { params: [theme.id.toString()] } });
    
    theme.series.forEach(series => {
      // Series page
      paths.push({ params: { params: [theme.id.toString(), series.id.toString()] } });
      
      series.episodes.forEach(episode => {
        // Episode page
        paths.push({ 
          params: { 
            params: [theme.id.toString(), series.id.toString(), episode.id.toString()] 
          } 
        });
      });
    });
  });
  
  // Demo mode: Prioritize popular demo content
  if (demoConfig.ENABLED) {
    const popularPaths = [];
    const otherPaths = [];
    
    paths.forEach(path => {
      const pathString = path.params.params.join('/');
      const isPopular = demoConfig.DEMO_PATHS.geniusPages.some(popular => 
        pathString.includes(popular.replace('/', '-'))
      );
      
      if (isPopular) {
        popularPaths.push(path);
      } else {
        otherPaths.push(path);
      }
    });
    
    // Prioritize popular content for faster demo builds
    const sortedPaths = [...popularPaths, ...otherPaths];
    console.log(`🎯 DEMO MODE: Prioritizing ${popularPaths.length} popular genius pages`);
    
    const buildTime = Date.now() - buildStartTime;
    safetyMonitor.recordMetric('genius_static_generation_time', buildTime);
    
    return {
      paths: sortedPaths,
      fallback: false // All pages pre-generated for instant demo performance
    };
  }
  
  // Production mode
  const buildTime = Date.now() - buildStartTime;
  console.log(`🚀 Generated ${paths.length} genius paths in ${buildTime}ms`);
  
  return {
    paths,
    fallback: false // All pages pre-generated
  };
}

export async function getStaticProps({ params }) {
  const { getDemoConfig, getDemoSafetyMonitor } = await import('../../lib/demo-config.js');
  const demoConfig = getDemoConfig();
  const safetyMonitor = getDemoSafetyMonitor();
  
  const generationStart = Date.now();
  const routeParams = params?.params || [];
  const [themeId, seriesId, episodeId] = routeParams;
  
  // Home page
  if (routeParams.length === 0) {
    const generationTime = Date.now() - generationStart;
    safetyMonitor.recordMetric('genius_home_generation_time', generationTime);
    
    return {
      props: {
        pageType: 'home',
        data: null,
        ...(demoConfig.ENABLED && {
          demoMode: true,
          generationTime
        })
      },
      revalidate: demoConfig.ENABLED ? demoConfig.STATIC_GENERATION.revalidationInterval : 86400
    };
  }
  
  // Find theme
  const theme = geniusConfig.themes[themeId];
  if (!theme) {
    return { notFound: true };
  }
  
  // Theme page
  if (!seriesId) {
    const generationTime = Date.now() - generationStart;
    safetyMonitor.recordMetric('genius_theme_generation_time', generationTime);
    
    return {
      props: {
        pageType: 'theme',
        data: { theme },
        themeId,
        ...(demoConfig.ENABLED && {
          demoMode: true,
          generationTime,
          cached: true
        })
      },
      revalidate: demoConfig.ENABLED ? demoConfig.STATIC_GENERATION.revalidationInterval : 86400
    };
  }
  
  // Find series
  const series = theme.series.find(s => s.id === parseInt(seriesId));
  if (!series) {
    return { notFound: true };
  }
  
  // Series page
  if (!episodeId) {
    const generationTime = Date.now() - generationStart;
    safetyMonitor.recordMetric('genius_series_generation_time', generationTime);
    
    return {
      props: {
        pageType: 'series',
        data: { theme, series },
        themeId,
        seriesId,
        ...(demoConfig.ENABLED && {
          demoMode: true,
          generationTime,
          cached: true
        })
      },
      revalidate: demoConfig.ENABLED ? demoConfig.STATIC_GENERATION.revalidationInterval : 86400
    };
  }
  
  // Find episode
  const episode = series.episodes.find(e => e.id === parseInt(episodeId));
  if (!episode) {
    return { notFound: true };
  }
  
  // Load episode content from JSON files (temporary fix while troubleshooting production database)
  let episodeContent = null;
  try {
    const fs = require('fs');
    const path = require('path');
    const contentPath = path.join(process.cwd(), 'data', 'episodes', `genius-${themeId}-${seriesId}-${episodeId}.json`);
    
    if (fs.existsSync(contentPath)) {
      const contentData = fs.readFileSync(contentPath, 'utf8');
      const parsedContent = JSON.parse(contentData);
      episodeContent = parsedContent.content;
      console.log(`Loaded episode ${themeId}-${seriesId}-${episodeId} from JSON file`);
    } else {
      console.log(`Episode file not found: ${contentPath}`);
    }
  } catch (error) {
    console.error(`Error loading episode content for genius ${themeId}-${seriesId}-${episodeId}:`, error);
  }
  
  // Episode page
  return {
    props: {
      pageType: 'episode',
      data: { theme, series, episode, episodeContent },
      themeId,
      seriesId,
      episodeId
    },
    revalidate: 86400
  };
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: '#ffffff',
  },
  scrollableContent: {
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
  homeHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  homeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  homeDescription: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  themesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  themeCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  themeCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  themeCardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '8px',
  },
  themeStats: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  themeHeader: {
    marginBottom: '32px',
  },
  themeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  themeDescription: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  seriesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  seriesCard: {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  seriesNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '4px',
  },
  seriesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  seriesDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '8px',
  },
  episodeCount: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  episodesList: {
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
  },
  episodeNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '4px',
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
  },
  episodeHeader: {
    marginBottom: '24px',
  },
  episodeContent: {
    marginBottom: '32px',
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
  navigationSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  episodeNavigation: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navEpisodeCard: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  navEpisodeNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  navEpisodeTitle: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
  },
};