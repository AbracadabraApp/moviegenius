// pages/genius/list/[id].js
/**
 * Unified List Page
 * 
 * Uses the same template as ask results for consistent UX.
 * Displays: Header + Claude Description + Movie Cards + Explore Further + More Ideas
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../../../components/PhoneFrame';
import AskInputBar from '../../../components/AskInputBar';
import MediaCard from '../../../components/MediaCard';
import { underlineProperNames } from '../../../lib/proper-names';
import loadingMessages from '../../../data/loading-messages.json';

export default function ListPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [listContent, setListContent] = useState(null);
  const [listTitle, setListTitle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const [error, setError] = useState(null);

  // Handle ask input - redirect to main ask page
  const handleAsk = useCallback((query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  }, [router]);

  useEffect(() => {
    if (!id) return;

    const fetchListContent = async () => {
      try {
        setError(null);

        console.log(`🔍 Fetching list content for ID: ${id}`);

        // First, get just the list metadata quickly
        const metadataResponse = await fetch(`/api/genius-list?id=${id}&metadata=true`);
        
        if (!metadataResponse.ok) {
          const errorData = await metadataResponse.json();
          throw new Error(errorData.error || 'Failed to fetch list');
        }

        const metadataData = await metadataResponse.json();
        
        // Show the title immediately
        setListTitle(metadataData.list.name);
        setIsLoading(true);

        // Start cycling loading messages and icons for the description
        const iconFiles = [
          'film-movie-reel-icon.png',
          'film-movie-icon.png', 
          'chair-director-outline-icon.png'
        ];
        
        // Set initial message and icon
        const setRandomLoadingContent = () => {
          const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
          const randomIcon = iconFiles[Math.floor(Math.random() * iconFiles.length)];
          setLoadingMessage(randomMessage);
          setLoadingIcon(randomIcon);
        };
        
        // Set initial content
        setRandomLoadingContent();
        
        // Cycle every 5 seconds
        const cycleInterval = setInterval(setRandomLoadingContent, 5000);

        // Now fetch the full content including Claude description
        const response = await fetch(`/api/genius-list?id=${id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch list');
        }

        const data = await response.json();
        
        // Structure the data like an ask result for unified template
        const unifiedContent = {
          id: `list-${id}`,
          question: data.list.name, // List title as "question"
          sections: [
            // Only include text section if we have Claude description
            ...(data.claudeDescription ? [{
              type: 'text',
              content: data.claudeDescription
            }] : [])
            // Movies will be added here when available
          ],
          exploreFurther: [
            'Similar Collections',
            'Time Period Focus', 
            'Genre Variants',
            'Thematic Connections'
          ],
          moreIdeas: {
            movies: [] // Related lists will go here eventually
          },
          isLoading: false,
          isLoadingExplore: false
        };

        // Add movies if available
        if (data.movies && data.movies.length > 0) {
          unifiedContent.sections.push({
            type: 'movies',
            movies: data.movies
          });
        }

        setListContent(unifiedContent);
        clearInterval(cycleInterval);
        console.log(`✅ List content loaded: ${data.list.name}`);

      } catch (err) {
        console.error('Error fetching list content:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListContent();
  }, [id]);

  if (error) {
    return (
      <PhoneFrame active="ask">
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          <div style={styles.conversationArea}>
            <div style={styles.errorContainer}>
              <div style={styles.errorTitle}>List Not Found</div>
              <div style={styles.errorText}>{error}</div>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame active="ask">
      <div style={styles.container}>
        <div style={styles.inputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        <div style={styles.conversationArea}>
          {listTitle && (
            <div style={styles.messageGroup}>
              {/* Header - List title (shown immediately) */}
              <div style={styles.questionHeader}>{listTitle}</div>
              
              {isLoading ? (
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
              ) : (
                listContent && (
                  <>
                    {/* Render sections - same as ask page */}
                    {listContent.sections && listContent.sections.map((section, sectionIndex) => (
                      <div key={`section-${sectionIndex}`}>
                        {section.type === 'text' && (
                          <div style={styles.answer}>
                            {underlineProperNames(section.content)}
                          </div>
                        )}
                        {section.type === 'movies' && section.movies && (
                          <div style={styles.movieList}>
                            {section.movies.map((movie, movieIndex) => (
                              <MediaCard
                                key={`${listContent.id}-${sectionIndex}-${movieIndex}`}
                                title={movie.title}
                                year={movie.year}
                                initialSlug={movie.slug}
                                initialPoster={movie.poster}
                                initialStreaming={movie.streaming}
                                tmdbId={movie.tmdb_id}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Render Explore Further section */}
                    {listContent.exploreFurther && listContent.exploreFurther.length > 0 && (
                      <div style={styles.exploreFurtherSection}>
                        <h3 style={styles.exploreFurtherTitle}>Explore Further</h3>
                        <div style={styles.topicList}>
                          {listContent.exploreFurther.map((topic, index) => (
                            <div 
                              key={`topic-${index}`} 
                              style={styles.topicItem}
                              onClick={() => {
                                // For now, redirect to ask - later could generate related lists
                                const contextualQuery = `${listContent.question}: ${topic}`;
                                router.push(`/ask?q=${encodeURIComponent(contextualQuery)}`);
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
                      </div>
                    )}
                    
                    {/* Render More Ideas section */}
                    {listContent.moreIdeas && listContent.moreIdeas.movies && listContent.moreIdeas.movies.length > 0 && (
                      <div style={styles.moreIdeasSection}>
                        <h3 style={styles.moreIdeasTitle}>Related Lists</h3>
                        <div style={styles.movieList}>
                          {listContent.moreIdeas.movies.map((item, index) => (
                            <MediaCard
                              key={`more-${listContent.id}-${index}`}
                              title={item.title}
                              year={item.year}
                              initialSlug={item.slug}
                              initialPoster={item.poster}
                              initialStreaming={item.streaming}
                              tmdbId={item.tmdb_id}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          )}
          
          {!listTitle && isLoading && (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingText}>Loading list...</div>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Reuse styles from ask page for unified experience
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
  conversationArea: {
    flex: 1,
    overflowY: 'scroll', scrollbarWidth: 'none', msOverflowStyle: 'none',
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
  questionHeader: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  answer: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
  },
  exploreFurtherSection: {
    marginTop: '2px',
    paddingTop: '16px',
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
    paddingLeft: '0px',
    paddingRight: '0px',
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
  moreIdeasSection: {
    marginTop: '4px',
    paddingTop: '16px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  loadingContainer: {
    padding: '10px 16px',
    textAlign: 'center',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  filmIcon: {
    width: '48px',
    height: '48px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  errorContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '8px',
  },
  errorText: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
};