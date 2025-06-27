// pages/recs/series/[seriesId]/[episodeId].js - Clean Series Episode Template
import PhoneFrame from '../../../../components/PhoneFrame';
import AskInputBar from '../../../../components/AskInputBar';
import MediaCard from '../../../../components/MediaCard';
import EpisodeCard from '../../../../components/EpisodeCard';
import BackButton from '../../../../components/BackButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../../../../lib/proper-names';
import loadingMessages from '../../../../data/loading-messages.json';
import seriesConfig from '../../../../data/series-config.json';

export default function SeriesEpisodePage({ series, episode, otherEpisodes, seriesId, episodeId, episodeContent }) {
  const router = useRouter();
  
  const [exploreFurther, setExploreFurther] = useState([]);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = (question) => {
    router.push(`/ask?q=${encodeURIComponent(question)}`);
  };

  // Only load explore further topics dynamically
  useEffect(() => {
    const loadExploreFurther = async () => {
      setIsLoadingExplore(true);
      try {
        const exploreResponse = await fetch('/api/generate-explore-topics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: `${episode.title}: ${episode.subtitle}` 
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
    };

    loadExploreFurther();
  }, [seriesId, episodeId]);

  // If we're in fallback mode, show loading
  if (router.isFallback) {
    return (
      <PhoneFrame active="recs">
        <div style={styles.container}>
          {/* Back button for navigation */}
          <BackButton variant="icon" context="episode" position="top-left" />
          
          <div style={styles.fixedInputArea}>
            <AskInputBar onSubmit={() => {}} />
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
      <PhoneFrame active="recs">
        <div style={styles.container}>
          {/* Back button for navigation */}
          <BackButton variant="icon" context="episode" position="top-left" />
          
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

  return (
    <PhoneFrame active="recs">
      <div style={styles.container}>
        {/* Back button for navigation */}
        <BackButton variant="icon" context="episode" position="top-left" />
        
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
                <EpisodeCard
                  episode={episode}
                  seriesId={seriesId}
                  onClick={() => {}} // No-op since we're already on this episode
                />
              )}
              
              {/* Opener Sentence */}
              {episodeContent && episodeContent.opener && (
                <div style={styles.opener}>{episodeContent.opener}</div>
              )}
              
              {/* Render sections - EXACT same pattern as ask page */}
              {episodeContent && episodeContent.sections && episodeContent.sections.map((section, sectionIndex) => (
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
                    <div style={styles.movieSection}>
                      <div style={styles.movieSectionHeader}>Movies Mentioned</div>
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
              {otherEpisodes && otherEpisodes.length > 0 && (
                <div style={styles.moreEpisodesSection}>
                  <h3 style={styles.moreEpisodesTitle}>Other Episodes in {series.title.split(' - ')[0]}</h3>
                  <div style={styles.episodeList}>
                    {otherEpisodes.map((ep) => (
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
              {episodeContent && episodeContent.moreIdeas && episodeContent.moreIdeas.movies && episodeContent.moreIdeas.movies.length > 0 && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>{episodeContent.moreIdeas.title}</h3>
                  <div style={styles.movieList}>
                    {episodeContent.moreIdeas.movies.map((movie, index) => (
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
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    marginBottom: '16px',
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
  movieSection: {
    marginTop: '8px',
    width: '100%',
  },
  movieSectionHeader: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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

// Static generation for all episode pages
export async function getStaticPaths() {
  const paths = [];
  
  // Generate paths for all series and episodes
  Object.keys(seriesConfig).forEach(seriesId => {
    const series = seriesConfig[seriesId];
    series.episodes.forEach(episode => {
      paths.push({
        params: {
          seriesId: seriesId.toString(),
          episodeId: episode.id.toString()
        }
      });
    });
  });
  
  return {
    paths,
    fallback: false // All paths are pre-generated
  };
}

export async function getStaticProps({ params }) {
  const { seriesId, episodeId } = params;
  
  // Get series from config
  const series = seriesConfig[seriesId];
  if (!series) {
    return {
      notFound: true
    };
  }
  
  // Find the specific episode
  const episode = series.episodes.find(ep => ep.id.toString() === episodeId);
  if (!episode) {
    return {
      notFound: true
    };
  }
  
  // Get other episodes (excluding current one)
  const otherEpisodes = series.episodes.filter(ep => ep.id.toString() !== episodeId);
  
  // Load episode content from static JSON file
  let episodeContent = null;
  try {
    const fs = require('fs');
    const path = require('path');
    const contentPath = path.join(process.cwd(), 'data', 'episodes', `series-${seriesId}-episode-${episodeId}.json`);
    
    if (fs.existsSync(contentPath)) {
      const contentData = fs.readFileSync(contentPath, 'utf8');
      const parsedContent = JSON.parse(contentData);
      episodeContent = parsedContent.content;
    }
  } catch (error) {
    console.error(`Error loading episode content for series ${seriesId} episode ${episodeId}:`, error);
  }
  
  return {
    props: {
      series,
      episode,
      otherEpisodes,
      seriesId,
      episodeId,
      episodeContent
    }
  };
}