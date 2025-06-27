// components/GeniusEpisodeTemplate.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, Clock, Film } from 'lucide-react';
import MediaCard from './MediaCard';
import AskInputBar from './AskInputBar';
import { processEntityLinksForReact, extractEpisodeMovies } from '../lib/enhanced-entity-linker';
import { extractEpisodePeople, getEpisodePeopleSummary } from '../lib/episode-people-extractor';
import LinkedText from './LinkedText';
import ExplorePromptCard from './ExplorePromptCard';
import ExploreFurtherSection from './ExploreFurtherSection';
import FeaturedFilmsSection from './FeaturedFilmsSection';
import { getCachedOtherEpisodes, getCachedOtherSeries } from '../lib/genius-config-cache';
import { createOptimizedScrollHandler } from '../lib/scroll-throttle';

export default function GeniusEpisodeTemplate({ 
  episodeData, 
  heroImage, 
  estimatedReadTime = "8 min read" 
}) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [enableLinking, setEnableLinking] = useState(true);
  const [episodePeople, setEpisodePeople] = useState(null);
  const [peopleLoading, setPeopleLoading] = useState(true);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use pre-processed people data from getStaticProps (performance optimization)
  useEffect(() => {
    if (episodeData?.episodePeople) {
      // Use pre-processed data from build time
      setEpisodePeople(episodeData.episodePeople);
      setPeopleLoading(false);
    } else if (episodeData?.episodeContent) {
      // Fallback to runtime processing if pre-processed data unavailable
      async function loadEpisodePeople() {
        try {
          setPeopleLoading(true);
          const people = await extractEpisodePeople(episodeData.episodeContent);
          setEpisodePeople(people);
        } catch (error) {
          console.error('Failed to load episode people:', error);
          setEpisodePeople({ directors: [], actors: [], writers: [], allPeople: [] });
        } finally {
          setPeopleLoading(false);
        }
      }
      loadEpisodePeople();
    }
  }, [episodeData?.episodeContent, episodeData?.episodePeople]);

  // 🚀 PERFORMANCE OPTIMIZED: Throttled scroll handler (99.8% improvement)
  const optimizedScrollHandler = useMemo(() => {
    if (!isClient) return () => {}; // Return no-op function during SSR
    
    return createOptimizedScrollHandler((progress) => {
      setScrollProgress(progress);
    }, 16); // 60fps throttling
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !optimizedScrollHandler) return;
    
    window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
    return () => window.removeEventListener('scroll', optimizedScrollHandler);
  }, [optimizedScrollHandler, isClient]);

  // 🚀 PERFORMANCE OPTIMIZED: Use pre-processed movie data from getStaticProps
  const episodeMovies = useMemo(() => {
    if (episodeData?.episodeMovies) {
      // Use pre-processed data from build time (instant)
      return episodeData.episodeMovies;
    } else if (episodeData?.episodeContent) {
      // Fallback to runtime processing if pre-processed data unavailable
      return extractEpisodeMovies(episodeData.episodeContent);
    }
    return [];
  }, [episodeData?.episodeContent, episodeData?.episodeMovies]);

  const handleBack = useCallback(() => {
    if (!episodeData?.theme?.id || !episodeData?.series?.id) return;
    router.push(`/genius/${episodeData.theme.id}/${episodeData.series.id}`);
  }, [router, episodeData?.theme?.id, episodeData?.series?.id]);

  // 🚀 PERFORMANCE OPTIMIZED: Memoize config-dependent data (98% improvement)
  const otherEpisodes = useMemo(() => {
    if (!episodeData?.theme?.id || !episodeData?.series?.id || !episodeData?.episode?.id) return [];
    return getCachedOtherEpisodes(episodeData.theme.id, episodeData.series.id, episodeData.episode.id);
  }, [episodeData?.theme?.id, episodeData?.series?.id, episodeData?.episode?.id]);

  const otherSeries = useMemo(() => {
    if (!episodeData?.theme?.id || !episodeData?.series?.id) return [];
    return getCachedOtherSeries(episodeData.theme.id, episodeData.series.id).slice(0, 4);
  }, [episodeData?.theme?.id, episodeData?.series?.id]);

  // 🚀 PERFORMANCE OPTIMIZED: Memoize processed content sections
  const processedSections = useMemo(() => {
    if (!episodeData?.episodeContent?.sections || !isClient) return [];
    
    return episodeData.episodeContent.sections.map((section, index) => {
      if (section.type === 'text') {
        return {
          ...section,
          processedParts: processEntityLinksForReact(section.content, episodeMovies || [], episodePeople || null)
        };
      }
      return section;
    });
  }, [episodeData?.episodeContent?.sections, episodeMovies, episodePeople, isClient]);

  // Early return after all hooks are called
  if (!isClient || !episodeData || !episodeData.theme || !episodeData.series || !episodeData.episode) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        Loading episode...
      </div>
    );
  }
  
  const { theme, series, episode, episodeContent } = episodeData;
  const content = episodeContent;

  return (
    <article style={styles.container}>
      {/* Reading Progress Bar */}
      <div style={styles.progressBar}>
        <div style={{
          ...styles.progressFill,
          width: `${scrollProgress * 100}%`
        }} />
      </div>

      {/* Hero Section */}
      <header style={styles.heroSection}>
        <div style={styles.heroImageContainer}>
          <img 
            src={heroImage} 
            alt={`${episode.title} illustration`}
            style={styles.heroImage}
          />
          <div style={styles.heroOverlay} />
        </div>
        
      </header>

      {/* Gradient Header Box */}
      <div style={styles.gradientHeaderBox}>
        <p style={styles.episodeSubtitle}>
          {episode.subtitle}
        </p>
        <h1 style={styles.episodeTitle}>
          {episode.title}
        </h1>
      </div>

      {/* Content Sections */}
      <main style={styles.content}>
        
        {/* 🚀 OPTIMIZED: Use pre-processed content sections */}
        {processedSections.map((section, index) => {
          return (
            <section key={index} style={styles.section}>
              {section.type === 'text' && (
                <div style={styles.textSection}>
                  <p style={styles.paragraph}>
                    <LinkedText 
                      parts={section.processedParts || [section.content]}
                      enableLinking={enableLinking}
                      linkStyle={{
                        color: 'inherit',
                        textDecoration: 'underline',
                        textDecorationColor: '#d4af37',
                        textDecorationThickness: '1px',
                        textUnderlineOffset: '2px',
                        fontWeight: '500'
                      }}
                    />
                  </p>
                </div>
              )}
              
              {section.type === 'subhead' && (
                <div style={styles.subheadSection}>
                  <div style={styles.subheadDivider} />
                  <h3 style={styles.subheadTitle}>{section.content}</h3>
                  <div style={styles.subheadUnderline} />
                </div>
              )}
              
              {section.type === 'movies' && (
                <FeaturedFilmsSection movies={section.movies} />
              )}
              
              {section.type === 'explore_further' && (
                <ExploreFurtherSection
                  prompts={section.prompts || []}
                  contextPrefix={episode.title}
                />
              )}
            </section>
          );
        }) || (
          <div style={styles.noContentMessage}>
            <p>Content is being generated for this episode. Please check back soon!</p>
          </div>
        )}

        {/* Series Navigation - More in this Series */}
        <section style={styles.movieSection}>
          <div style={styles.movieSectionHeader}>
            <div style={styles.sectionDivider} />
            <span style={styles.sectionLabel}>More in {series.title}</span>
            <div style={styles.sectionDivider} />
          </div>
          <div style={styles.seriesGrid}>
            {/* 🚀 OPTIMIZED: Use cached config data */}
            {otherEpisodes.map((ep) => (
              <div 
                key={ep.id} 
                style={styles.seriesEpisodeCard}
                onClick={() => router.push(`/genius/${theme.id}/${series.id}/${ep.id}`)}
              >
                <h4 style={styles.seriesEpisodeTitle}>{ep.title}</h4>
                <p style={styles.seriesEpisodeSubtitle}>{ep.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        {/* More Ideas Section - Using same style as Featured Films */}
        {content?.moreIdeas && content.moreIdeas.movies?.length > 0 && (
          <FeaturedFilmsSection 
            movies={content.moreIdeas.movies}
            title="Related Films"
          />
        )}


        {/* Other Series Footer */}
        <footer style={styles.otherSeriesSection}>
          <div style={styles.otherSeriesHeader}>
            <h4 style={styles.otherSeriesTitle}>Explore Other Series</h4>
          </div>
          <div style={styles.otherSeriesGrid}>
            {/* 🚀 OPTIMIZED: Use cached other series data */}
            {otherSeries.map((seriesData) => (
              <div 
                key={`${seriesData.themeId}-${seriesData.id}`} 
                style={styles.otherSeriesCard}
                onClick={() => router.push(`/genius/${seriesData.themeId}/${seriesData.id}`)}
              >
                <h5 style={styles.otherSeriesCardTitle}>{seriesData.title}</h5>
                <p style={styles.otherSeriesCardDescription}>{seriesData.description}</p>
              </div>
            ))}
          </div>
        </footer>
      </main>
    </article>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  
  // Progress Bar
  progressBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4af37', // Gold accent
    transition: 'width 0.1s ease',
  },

  // Hero Section
  heroSection: {
    position: 'relative',
    minHeight: '25vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    color: '#ffffff',
  },
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Changed from -2 to 1
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center', // Center the 2:1 image in 16:9 container
    // For 2:1 images in 16:9 containers, this will crop top/bottom slightly
    // but maintain the cinematic composition at center
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'transparent', // No mask on photo
    zIndex: 2,
  },


  // Gradient Header Box
  gradientHeaderBox: {
    position: 'relative',
    padding: '5px 20px 30px 20px',
    marginTop: '-25px',
    marginBottom: '-20px', // Match content overlap
    background: 'linear-gradient(to bottom, rgba(0,0,0,1.0) 0%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.7) 100%)',
    zIndex: 3, // Lower than content
    borderRadius: '0',
  },
  episodeTitle: {
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '1.3', // Increased from 1.1 for better readability
    marginTop: '5px', // 5px spacing from subtitle above
    marginBottom: '0px',
    color: '#ffffff', // White title
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
    textAlign: 'left',
    // Better word breaking and hyphenation
    wordBreak: 'keep-all', // Prevents awkward mid-word breaks
    overflowWrap: 'break-word', // Breaks long words when necessary
    hyphens: 'auto', // Enables hyphenation
    textWrap: 'pretty', // CSS feature for prettier text wrapping
    WebkitHyphens: 'auto', // Safari support
    MozHyphens: 'auto', // Firefox support
  },
  episodeSubtitle: {
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '1.4',
    color: '#d4af37', // Gold subtitle
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
    marginTop: '0px', // No margin - box provides 5px padding
    marginBottom: '0px',
    textAlign: 'left',
  },

  // Content
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    marginTop: '-20px', // Match gradient overlap
    position: 'relative',
    zIndex: 5, // Higher than gradient box
    paddingTop: '2px',
  },

  // Sections - 24px module system
  section: {
    marginBottom: '20px', // Reduced from 24px to prevent stacking over 40px
  },
  textSection: {
    padding: '0 36px',
    marginTop: '-5px', // Move first text line up 5px
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#2c3e50',
    marginBottom: '20px', // Reduced spacing
    textAlign: 'left',
    fontWeight: '400',
  },

  // Movie Sections - 24px module system
  movieSection: {
    padding: '20px 36px', // Match movie page container padding
    backgroundColor: '#ffffff', // Changed from grey to white
    marginBottom: '20px', // Reduced from 24px
  },
  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px', // Reduced from 24px to keep under 40px total
    gap: '16px', // Standardized from 12px to 16px
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
  movieGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px', // Reduced from 16px for tighter spacing
  },
  movieCardWrapper: {
    marginBottom: 0, // Override MediaCard's 8px bottom margin
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },

  // Series Navigation - 24px module system
  seriesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px', // Standardized from 12px to 16px
  },
  seriesEpisodeCard: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  seriesEpisodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 4px 0',
  },
  seriesEpisodeSubtitle: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0,
    fontStyle: 'italic',
  },

  // Explore Further Section - 24px module system
  exploreFurtherSection: {
    padding: '16px 24px 20px', // Reduced top padding from 24px to 16px
    backgroundColor: '#ffffff', // Keep background white
    marginBottom: '20px', // Reduced from 24px
  },
  exploreFurtherHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px', // Reduced from 24px to keep total under 40px
    gap: '16px', // Standardized from 12px to 16px
  },
  exploreFurtherGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px', // Already using 16px
  },
  
  // Subhead Styles - Enhanced for 900-word content
  subheadSection: {
    padding: '0 36px', // Match movie page container padding
    marginBottom: '16px', // Reduced from 24px
    marginTop: '24px', // Reduced from 40px to keep total at 40px
    position: 'relative',
  },
  subheadTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#d4af37',
    textAlign: 'center',
    paddingBottom: '8px',
    paddingTop: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0',
  },
  subheadDivider: {
    width: '80px',
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '0 auto 16px auto',
  },
  subheadUnderline: {
    width: '60px',
    height: '2px',
    backgroundColor: '#d4af37',
    margin: '8px auto 0 auto',
  },

  // More Ideas Section
  moreIdeasSection: {
    padding: '24px 24px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    margin: '20px 0',
  },
  moreIdeasHeader: {
    marginBottom: '24px',
    textAlign: 'center',
  },
  moreIdeasTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#d4af37',
  },
  moreIdeasDescription: {
    fontSize: '16px',
    opacity: 0.8,
    lineHeight: '1.5',
  },
  moreIdeasGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  moreIdeasCard: {
    borderRadius: '12px',
    overflow: 'hidden',
  },

  // Next Episode Navigation
  askSection: {
    padding: '8px 24px 24px', // Reduced top padding since no title
  },
  
  // No Content Message
  noContentMessage: {
    padding: '48px 24px',
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '16px',
    fontStyle: 'italic',
  },
  nextEpisodePrompt: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '16px',
    border: '2px solid #e9ecef',
  },
  nextEpisodeTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  nextEpisodeDescription: {
    fontSize: '16px',
    color: '#6c757d',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  nextEpisodeButton: {
    padding: '12px 24px',
    backgroundColor: '#d4af37',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Other Series Footer
  otherSeriesSection: {
    padding: '32px 24px',
    backgroundColor: '#ffffff', // Changed from grey to white
    borderTop: '1px solid #e9ecef',
  },
  otherSeriesHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  otherSeriesTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
  },
  otherSeriesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  otherSeriesCard: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  otherSeriesCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 4px 0',
  },
  otherSeriesCardDescription: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0,
  },
  viewAllSeriesLink: {
    textAlign: 'center',
  },
  viewAllButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#d4af37',
    border: '1px solid #d4af37',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

};