// pages/recs/series/[seriesId]/[episodeId].js - Clean Series Episode Template
import PhoneFrame from '../../../../components/PhoneFrame';
import AskInputBar from '../../../../components/AskInputBar';
import MediaCard from '../../../../components/MediaCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../../../../lib/proper-names';
import loadingMessages from '../../../../data/loading-messages.json';

export default function SeriesEpisodePage() {
  const router = useRouter();
  const { seriesId, episodeId } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const [content, setContent] = useState(null);
  const [series, setSeries] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [exploreFurther, setExploreFurther] = useState([]);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = (question) => {
    router.push(`/ask?q=${encodeURIComponent(question)}`);
  };

  useEffect(() => {
    if (!seriesId || !episodeId) return;

    const loadEpisodeContent = async () => {
      // Loading animation setup (same as ask page)
      const iconFiles = [
        'film-movie-reel-icon.png',
        'film-movie-icon.png',
        'chair-director-outline-icon.png'
      ];
      
      const setRandomLoadingContent = () => {
        const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        const randomIcon = iconFiles[Math.floor(Math.random() * iconFiles.length)];
        setLoadingMessage(randomMessage);
        setLoadingIcon(randomIcon);
      };
      
      setRandomLoadingContent();
      const cycleInterval = setInterval(setRandomLoadingContent, 5000);

      try {
        // Call API to generate episode content (following ask-claude pattern)
        const response = await fetch('/api/series-episode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ seriesId, episodeId }),
        });

        if (!response.ok) {
          throw new Error('Failed to load episode content');
        }

        const data = await response.json();
        
        // Set content using same structure as ask page
        setContent(data.data);
        setSeries(data.series);
        setEpisode(data.episode);

        // Generate explore further topics
        setIsLoadingExplore(true);
        try {
          const exploreResponse = await fetch('/api/generate-explore-topics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              query: `${data.episode.title}: ${data.episode.subtitle}` 
            }),
          });

          if (exploreResponse.ok) {
            const exploreData = await exploreResponse.json();
            setExploreFurther(exploreData.topics || []);
          }
        } catch (exploreError) {
          console.error('Error generating explore topics:', exploreError);
          // Continue without explore topics
        }
        setIsLoadingExplore(false);

        clearInterval(cycleInterval);
        setIsLoading(false);

      } catch (error) {
        console.error('Error loading episode:', error);
        setError(error.message);
        clearInterval(cycleInterval);
        setIsLoading(false);
      }
    };

    loadEpisodeContent();
  }, [seriesId, episodeId]);

  if (error) {
    return (
      <PhoneFrame active="ask">
        <div style={styles.container}>
          <div style={styles.fixedInputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Error loading episode: {error}</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (!content || isLoading) {
    return (
      <PhoneFrame active="ask">
        <div style={styles.container}>
          <div style={styles.fixedInputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingRow}>
              {loadingIcon && (
                <img 
                  src={`/icons/loading/${loadingIcon}`} 
                  alt="Loading..." 
                  style={styles.filmIcon}
                />
              )}
              <span style={styles.loadingText}>{loadingMessage}</span>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame active="ask">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar */}
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Scrollable Content - Same structure as ask page */}
        <div style={styles.scrollableContent}>
          <div style={styles.conversationArea}>
            <div style={styles.messageGroup}>
              {/* Episode Header */}
              {episode && (
                <>
                  <div style={styles.questionHeader}>{episode.title}</div>
                  <div style={styles.episodeSubtitle}>{episode.subtitle}</div>
                </>
              )}
              
              {/* Opener Sentence */}
              {content.opener && (
                <div style={styles.opener}>{content.opener}</div>
              )}
              
              {/* Render sections - EXACT same pattern as ask page */}
              {content.sections && content.sections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`}>
                  {section.type === 'text' && (
                    <div style={styles.answer}>
                      {underlineProperNames(section.content)}
                    </div>
                  )}
                  {section.type === 'subhead' && (
                    <div style={styles.subhead}>
                      {section.content}
                    </div>
                  )}
                  {section.type === 'movies' && section.movies && (
                    <div style={styles.movieList}>
                      {section.movies.map((movie, movieIndex) => (
                        <MediaCard
                          key={`${seriesId}-${episodeId}-${sectionIndex}-${movieIndex}`}
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster_url}
                          initialStreaming={movie.streaming}
                          tmdbId={movie.tmdb_id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Explore Further Section */}
              {exploreFurther.length > 0 && (
                <div style={styles.exploreFurtherSection}>
                  <h3 style={styles.exploreFurtherTitle}>Explore Further</h3>
                  {isLoadingExplore ? (
                    <div style={styles.topicList}>
                      <div style={styles.topicItemLoading}>Generating related topics...</div>
                    </div>
                  ) : (
                    <div style={styles.topicList}>
                      {exploreFurther.map((topic, index) => (
                        <div 
                          key={`topic-${index}`} 
                          style={styles.topicItem}
                          onClick={() => {
                            router.push(`/ask?q=${encodeURIComponent(topic)}`);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {topic}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Series Navigation */}
              {series && series.episodes && (
                <div style={styles.seriesNavigation}>
                  <h3 style={styles.seriesNavTitle}>{series.title}</h3>
                  <div style={styles.episodesList}>
                    {series.episodes.map((ep) => (
                      <div 
                        key={ep.id}
                        style={{
                          ...styles.episodeNavItem,
                          ...(ep.id.toString() === episodeId ? styles.episodeNavItemActive : {})
                        }}
                        onClick={() => {
                          if (ep.id.toString() !== episodeId) {
                            router.push(`/recs/series/${seriesId}/${ep.id}`);
                          }
                        }}
                      >
                        <div style={styles.episodeNavTitle}>{ep.title}</div>
                        <div style={styles.episodeNavSubtitle}>{ep.subtitle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* More Ideas Section - Moved to bottom */}
              {content.moreIdeas && content.moreIdeas.movies && content.moreIdeas.movies.length > 0 && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>{content.moreIdeas.title}</h3>
                  <div style={styles.movieList}>
                    {content.moreIdeas.movies.map((movie, index) => (
                      <MediaCard
                        key={`more-${seriesId}-${episodeId}-${index}`}
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
          </div>
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
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  conversationArea: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  messageGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  opener: {
    fontSize: '18px',
    color: '#374151',
    fontWeight: '400',
    lineHeight: '1.5',
    marginBottom: '24px',
    fontStyle: 'italic',
  },
  questionHeader: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '4px',
    textAlign: 'left',
    paddingLeft: '0px',
    lineHeight: '1.2',
  },
  episodeSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '400',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  answer: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    marginBottom: '16px',
  },
  subhead: {
    fontSize: '16px',
    color: '#111827',
    fontWeight: '600',
    marginTop: '24px',
    marginBottom: '12px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    width: '100%',
  },
  loadingContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  filmIcon: {
    width: '48px',
    height: '48px',
  },
  errorContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
  },
  moreIdeasSection: {
    marginTop: '40px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '16px',
  },
  seriesNavigation: {
    marginTop: '32px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  seriesNavTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'left',
  },
  episodesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  episodeNavItem: {
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  episodeNavItemActive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: '2px',
  },
  episodeNavTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '2px',
  },
  episodeNavSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.3',
  },
  exploreFurtherSection: {
    marginTop: '32px',
  },
  exploreFurtherTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
  },
  topicList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  topicItem: {
    fontSize: '15px',
    color: '#111827',
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    lineHeight: '1.4',
    fontFamily: 'inherit',
  },
  topicItemLoading: {
    fontSize: '15px',
    color: '#6b7280',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    lineHeight: '1.4',
    fontStyle: 'italic',
  },
};