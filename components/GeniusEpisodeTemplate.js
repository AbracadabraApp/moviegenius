// components/GeniusEpisodeTemplate.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, Clock, Film } from 'lucide-react';
import MediaCard from './MediaCard';

export default function GeniusEpisodeTemplate({ 
  episodeData, 
  heroImage, 
  estimatedReadTime = "8 min read" 
}) {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const { theme, series, episode, episodeContent } = episodeData;
  const content = episodeContent;

  // Track scroll progress for reading indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = Math.min(scrolled / maxScroll, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    router.push(`/genius/${theme.id}/${series.id}`);
  };

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
        
        {/* Navigation */}
        <button onClick={handleBack} style={styles.backButton}>
          <ChevronLeft size={20} />
          <span>{series.title}</span>
        </button>

        {/* Episode Header */}
        <div style={styles.headerContent}>
          <div style={styles.episodeLabel}>
            Episode {episode.id}
          </div>
          <h1 style={styles.episodeTitle}>
            {episode.title}
          </h1>
          <p style={styles.episodeSubtitle}>
            {episode.subtitle}
          </p>
          
          {/* Metadata */}
          <div style={styles.metadata}>
            <span style={styles.metadataItem}>
              <Clock size={16} />
              {estimatedReadTime}
            </span>
            <span style={styles.metadataItem}>
              <Film size={16} />
              {theme.title}
            </span>
          </div>
        </div>
      </header>

      {/* Content Sections */}
      <main style={styles.content}>
        {content?.sections?.map((section, index) => {
          // Extract explore_further prompts to interleave
          const exploreFurtherSection = content?.sections?.find(s => s.type === 'explore_further');
          const prompts = exploreFurtherSection?.prompts || [];
          
          // Map subheads to prompts
          const subheadPromptMap = {
            'Directors and Style': prompts[0],
            'Technical Innovation': prompts[1], 
            'Genre Impact': prompts[2]
          };
          
          return (
            <section key={index} style={styles.section}>
              {section.type === 'text' && (
                <div style={styles.textSection}>
                  <p style={styles.paragraph}>
                    {section.content}
                  </p>
                </div>
              )}
              
              {section.type === 'subhead' && (
                <>
                  <div style={styles.subheadSection}>
                    <div style={styles.subheadDivider} />
                    <h3 style={styles.subheadTitle}>{section.content}</h3>
                    <div style={styles.subheadUnderline} />
                  </div>
                </>
              )}
              
              {section.type === 'movies' && (
                <>
                  <div style={styles.movieSection}>
                    <div style={styles.movieSectionHeader}>
                      <div style={styles.sectionDivider} />
                      <span style={styles.sectionLabel}>Featured Films</span>
                      <div style={styles.sectionDivider} />
                    </div>
                    <div style={styles.movieGrid}>
                      {section.movies.map((movie, movieIndex) => (
                        <div key={movieIndex} style={styles.movieCardWrapper}>
                          <MediaCard
                            title={movie.title}
                            year={movie.year}
                            initialSlug={movie.slug}
                            tmdbId={movie.tmdb_id}
                            initialStreaming={movie.streaming}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Add explore prompt after each movie section (which follows subheads) */}
                  {(() => {
                    // Find the previous subhead to match with prompt
                    for (let i = index - 1; i >= 0; i--) {
                      if (content.sections[i].type === 'subhead') {
                        const prompt = subheadPromptMap[content.sections[i].content];
                        if (prompt) {
                          return (
                            <div style={styles.exploreFurtherSection}>
                              <div style={styles.exploreFurtherHeader}>
                                <div style={styles.sectionDivider} />
                                <span style={styles.sectionLabel}>Explore Further</span>
                                <div style={styles.sectionDivider} />
                              </div>
                              <div style={styles.exploreFurtherGrid}>
                                <div style={styles.explorePromptCard}>
                                  <p style={styles.explorePromptText}>{prompt}</p>
                                  <button 
                                    style={styles.explorePromptButton}
                                    onClick={() => {
                                      router.push(`/ask?q=${encodeURIComponent(prompt)}`);
                                    }}
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        break;
                      }
                    }
                    return null;
                  })()}
                </>
              )}
              
              {/* Skip the original grouped explore_further section */}
              {section.type === 'explore_further' && null}
            </section>
          );
        }) || (
          <div style={styles.noContentMessage}>
            <p>Content is being generated for this episode. Please check back soon!</p>
          </div>
        )}

        {/* Open-ended Ask Section */}
        <section style={styles.openEndedAskSection}>
          <div style={styles.openEndedAskCard}>
            <p style={styles.openEndedAskText}>Any questions about Double Indemnity?</p>
            <button 
              style={styles.explorePromptButton}
              onClick={() => {
                router.push(`/ask?q=${encodeURIComponent('Any questions about Double Indemnity?')}`);
              }}
            >
              →
            </button>
          </div>
        </section>

        {/* Series Navigation - More in this Series */}
        <section style={styles.movieSection}>
          <div style={styles.movieSectionHeader}>
            <div style={styles.sectionDivider} />
            <span style={styles.sectionLabel}>More in {series.title}</span>
            <div style={styles.sectionDivider} />
          </div>
          <div style={styles.seriesGrid}>
            {/* Show other episodes in this series (excluding current) */}
            {[
              { id: 2, title: "The Maltese Falcon", subtitle: "Hard-boiled detective stories" },
              { id: 3, title: "Sunset Boulevard", subtitle: "Hollywood's dark mirror" },
              { id: 4, title: "Touch of Evil", subtitle: "Welles's baroque masterpiece" },
              { id: 5, title: "The Big Sleep", subtitle: "Hawks and Bogart's chemistry" },
              { id: 6, title: "Out of the Past", subtitle: "Fatalism and femme fatales" }
            ].map((ep) => (
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
          <section style={styles.movieSection}>
            <div style={styles.movieSectionHeader}>
              <div style={styles.sectionDivider} />
              <span style={styles.sectionLabel}>Related Films</span>
              <div style={styles.sectionDivider} />
            </div>
            <div style={styles.movieGrid}>
              {content.moreIdeas.movies?.map((movie, index) => (
                <div key={index} style={styles.movieCardWrapper}>
                  <MediaCard
                    title={movie.title}
                    year={movie.year}
                    initialSlug={movie.slug}
                    tmdbId={movie.tmdb_id}
                    initialStreaming={movie.streaming}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next Episode Navigation */}
        <nav style={styles.nextEpisodeSection}>
          <div style={styles.nextEpisodePrompt}>
            <h4 style={styles.nextEpisodeTitle}>What's Next</h4>
            <p style={styles.nextEpisodeDescription}>
              More episodes
            </p>
            <button 
              onClick={() => router.push(`/genius/${theme.id}/${series.id}`)}
              style={styles.nextEpisodeButton}
            >
              Explore More
            </button>
          </div>
        </nav>

        {/* Other Series Footer */}
        <footer style={styles.otherSeriesSection}>
          <div style={styles.otherSeriesHeader}>
            <h4 style={styles.otherSeriesTitle}>Explore Other Series</h4>
          </div>
          <div style={styles.otherSeriesGrid}>
            {[
              { id: 2, themeId: 1, title: "Neo-Noir Renaissance", description: "Modern noir interpretations" },
              { id: 1, themeId: 2, title: "Science Fiction Classics", description: "Exploring the impossible" },
              { id: 1, themeId: 3, title: "European New Waves", description: "Revolutionary cinema movements" },
              { id: 3, themeId: 1, title: "Crime Epics & Gangster Films", description: "Criminal empires rise and fall" }
            ].map((seriesData, index) => (
              <div 
                key={index} 
                style={styles.otherSeriesCard}
                onClick={() => router.push(`/genius/${seriesData.themeId}/${seriesData.id}`)}
              >
                <h5 style={styles.otherSeriesCardTitle}>{seriesData.title}</h5>
                <p style={styles.otherSeriesCardDescription}>{seriesData.description}</p>
              </div>
            ))}
          </div>
          <div style={styles.viewAllSeriesLink}>
            <button 
              onClick={() => router.push('/genius')}
              style={styles.viewAllButton}
            >
              View All Series
            </button>
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
    minHeight: '30vh', // Aggressively reduced to 30vh to test spacing
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '12px', // Further reduced padding
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
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
    zIndex: 2, // Above the image
  },

  // Navigation
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '20px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
    position: 'relative',
    zIndex: 3, // Above image and overlay
  },

  // Header Content
  headerContent: {
    marginTop: 'auto',
    paddingTop: '8px', // Minimal padding to test spacing
    position: 'relative',
    zIndex: 3, // Above image and overlay
  },
  episodeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
    marginBottom: '8px',
  },
  episodeTitle: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1.1',
    marginBottom: '12px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  episodeSubtitle: {
    fontSize: '18px',
    fontWeight: '400',
    lineHeight: '1.4',
    opacity: 0.9,
    marginBottom: '24px',
  },
  metadata: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    opacity: 0.8,
  },

  // Content
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    marginTop: '-24px',
    position: 'relative',
    zIndex: 1,
    paddingTop: '24px', // Reduced from 32px to bring content higher
  },

  // Sections - 24px module system
  section: {
    marginBottom: '24px', // Standardized to 24px
  },
  textSection: {
    padding: '0 24px', // Already using 24px
  },
  paragraph: {
    fontSize: '16px', // Optimized for 900-word content
    lineHeight: '1.6',
    color: '#2c3e50',
    marginBottom: '28px', // Slightly more space for longer content
    textAlign: 'left', // Left-aligned for better readability
    fontWeight: '400',
  },

  // Movie Sections - 24px module system
  movieSection: {
    padding: '24px', // Already using 24px
    backgroundColor: '#ffffff', // Changed from grey to white
    marginBottom: '24px', // Already using 24px
  },
  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px', // Standardized from 20px to 24px
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
    gap: '16px', // Standardized from 12px to 16px
  },
  movieCardWrapper: {
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },

  // Open-ended Ask Section
  openEndedAskSection: {
    padding: '24px',
    marginBottom: '24px',
  },
  openEndedAskCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.1)',
  },
  openEndedAskText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#2c3e50',
    margin: 0,
    flex: 1,
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
    padding: '24px', // Already using 24px
    backgroundColor: '#ffffff', // Changed from grey to white
    marginBottom: '24px', // Already using 24px
  },
  exploreFurtherHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px', // Standardized from 20px to 24px
    gap: '16px', // Standardized from 12px to 16px
  },
  exploreFurtherGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px', // Already using 16px
  },
  explorePromptCard: {
    padding: '24px', // Standardized from 20px to 24px
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  explorePromptText: {
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#374151',
    fontStyle: 'italic',
    margin: 0,
    flex: 1,
  },
  explorePromptButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#d4af37',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginLeft: '16px',
  },
  
  // Subhead Styles - Enhanced for 900-word content
  subheadSection: {
    padding: '0 24px',
    marginBottom: '24px', // Increased for better separation
    marginTop: '40px', // Increased for better visual breaks
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
    padding: '32px 24px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    margin: '32px 0',
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
  nextEpisodeSection: {
    padding: '32px 24px 48px',
    textAlign: 'center',
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