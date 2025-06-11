// pages/recs/series/[seriesId]/[episodeId].js - Clean Series Episode Template
import PhoneFrame from '../../../../components/PhoneFrame';
import AskInputBar from '../../../../components/AskInputBar';
import MediaCard from '../../../../components/MediaCard';
import EpisodeCard from '../../../../components/EpisodeCard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../../../../lib/proper-names';
import loadingMessages from '../../../../data/loading-messages.json';
import seriesConfig from '../../../../data/series-config.json';

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
              {/* Back Navigation */}
              {series && (
                <div style={styles.backNavigation}>
                  <button 
                    style={styles.backButton}
                    onClick={() => router.push('/recs')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    ← Back to {series.title}
                  </button>
                </div>
              )}

              {/* Episode Header */}
              {episode && (
                <EpisodeCard
                  episode={episode}
                  seriesId={seriesId}
                  onClick={() => {}} // No-op since we're already on this episode
                />
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

              
              {/* Other Episodes in Series */}
              {series && series.episodes && (
                <div style={styles.moreEpisodesSection}>
                  <h3 style={styles.moreEpisodesTitle}>Other Episodes in {series.title}</h3>
                  <div style={styles.episodeList}>
                    {series.episodes
                      .filter(ep => ep.id.toString() !== episodeId)
                      .map((ep) => (
                        <EpisodeCard
                          key={ep.id}
                          episode={ep}
                          seriesId={seriesId}
                          onClick={() => router.push(`/recs/series/${seriesId}/${ep.id}`)}
                        />
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

              {/* Other Series Footer */}
              <div style={styles.otherSeriesFooter}>
                <div style={styles.footerTitle}>Other Series</div>
                <div style={styles.seriesLinks}>
                  {Object.entries(seriesConfig)
                    .filter(([id]) => id !== seriesId)
                    .slice(0, 4)
                    .map(([id, series]) => (
                      <div 
                        key={id}
                        style={styles.seriesLink}
                        onClick={() => router.push(`/recs/series/${id}/1`)}
                      >
                        — {series.title.split(':')[0]}
                      </div>
                    ))}
                  <div 
                    style={styles.moreLink}
                    onClick={() => router.push('/recs/series')}
                  >
                    More →
                  </div>
                </div>
              </div>
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
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  conversationArea: {
    padding: '4px 16px 16px 16px',
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
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500',
    lineHeight: '1.6',
    marginBottom: '20px',
    fontStyle: 'italic',
    paddingLeft: '16px',
    borderLeft: '3px solid #007AFF',
    paddingTop: '4px',
    paddingBottom: '4px',
  },
  backNavigation: {
    marginBottom: '16px',
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
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
    paddingLeft: '0px',
  },
  moreEpisodesSection: {
    marginTop: '40px',
  },
  moreEpisodesTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'left',
  },
  episodeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    paddingLeft: '0px',
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
  episodeCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
    marginBottom: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  },
  episodeContent: {
    padding: '24px',
    backgroundColor: '#ffffff',
  },
  episodeCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.3',
    margin: 0,
    marginBottom: '6px',
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
  },
  episodeCardSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.3',
    margin: 0,
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
  },
  episodeImageRow: {
    display: 'flex',
    width: '100%',
    height: '80px',
    overflow: 'hidden',
  },
  episodeMovieImage: {
    flex: 1,
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
    filter: 'brightness(0.8) contrast(0.9) saturate(0.7)',
    opacity: 0.85,
  },
  otherSeriesFooter: {
    padding: '20px 16px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e5e7eb',
    marginTop: '24px',
  },
  footerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  seriesLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  seriesLink: {
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '8px 0',
    transition: 'color 0.2s ease',
    textDecoration: 'none',
  },
  moreLink: {
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '8px 0',
    fontWeight: '500',
    transition: 'color 0.2s ease',
    textAlign: 'right',
    textDecoration: 'none',
  },
};