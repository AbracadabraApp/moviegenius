// pages/ask.js
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import MediaCard from '../components/MediaCard';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../lib/proper-names';
// Removed static imports - now loading from database
import loadingMessages from '../data/loading-messages.json';

export default function AskPage() {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayQuestions, setDisplayQuestions] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const router = useRouter();

  // Load authoritative lists from database on page load
  useEffect(() => {
    const loadListsFromDatabase = async () => {
      try {
        const response = await fetch('/api/tag-cloud');
        if (response.ok) {
          const data = await response.json();
          const shuffled = data.lists.sort(() => 0.5 - Math.random());
          const selected75 = shuffled.slice(0, 75);
          const itemsWithSizes = selected75.map((item, index) => ({
            text: item.name,
            listId: item.id, // Store the list ID for routing
            fontSize: index % 3 === 0 ? 'large' : index % 3 === 1 ? 'medium' : 'small'
          }));
          
          setDisplayQuestions(itemsWithSizes);
        } else {
          console.error('Failed to load lists from database');
          // Fallback to empty array
          setDisplayQuestions([]);
        }
      } catch (error) {
        console.error('Error loading lists:', error);
        setDisplayQuestions([]);
      }
    };

    loadListsFromDatabase();
  }, []);

  const handleAsk = useCallback(async (query) => {
    // Prevent multiple concurrent requests
    if (isLoading) {
      return;
    }
    
    // Start cycling loading messages and icons
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
    
    const tempMessage = {
      id: Date.now(),
      question: query,
      answer: '',
      isLoading: true,
      isLoadingExplore: true,
      cycleInterval: cycleInterval,
    };
    
    // Start fresh with each query (like recs/you pages)
    setConversation([tempMessage]);
    setIsLoading(true);

    // Start both API calls in parallel
    const mainResponsePromise = fetch('/api/ask-claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: query }),
    });

    const exploreTopicsPromise = fetch('/api/generate-explore-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    try {
      // Handle main response first
      const mainResponse = await mainResponsePromise;
      
      if (!mainResponse.ok) {
        throw new Error('Failed to get main response');
      }

      const mainData = await mainResponse.json();
      
      // Claude returns interleaved sections + moreIdeas
      const sections = mainData.data.sections || [];
      const moreIdeas = mainData.data.moreIdeas || null;

      // Clear interval and update message with main results
      if (tempMessage.cycleInterval) {
        clearInterval(tempMessage.cycleInterval);
      }
      
      const updatedMessage = {
        ...tempMessage,
        sections,
        moreIdeas,
        exploreFurther: [], // Will be updated when explore topics load
        isLoading: false,
        isLoadingExplore: true
      };
      
      setConversation([updatedMessage]);

      // Handle explore topics response
      try {
        const exploreResponse = await exploreTopicsPromise;
        if (exploreResponse.ok) {
          const exploreData = await exploreResponse.json();
          const exploreFurther = exploreData.topics || [];
          
          // Update conversation with explore topics
          setConversation([{
            ...updatedMessage,
            exploreFurther,
            isLoadingExplore: false
          }]);
        } else {
          // Explore topics failed, but main content is fine
          setConversation([{
            ...updatedMessage,
            isLoadingExplore: false
          }]);
        }
      } catch (exploreError) {
        console.error('Error loading explore topics:', exploreError);
        // Explore topics failed, but main content is fine
        setConversation([{
          ...updatedMessage,
          isLoadingExplore: false
        }]);
      }

    } catch (error) {
      console.error('Error:', error);
      if (tempMessage.cycleInterval) {
        clearInterval(tempMessage.cycleInterval);
      }
      setConversation([{
        ...tempMessage,
        answer: 'Sorry, I encountered an error. Please try again.',
        isLoading: false,
        isLoadingExplore: false
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle incoming query from URL
  useEffect(() => {
    if (router.query.q) {
      handleAsk(router.query.q);
      // Clear the query parameter
      router.replace('/ask', undefined, { shallow: true });
    }
  }, [router.query.q, handleAsk]);

  return (
    <PhoneFrame active="ask">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar */}
        <div style={styles.fixedInputArea}>
          <AskInputBar />
        </div>
        
        {/* Scrollable Content */}
        <div style={styles.scrollableContent}>
          <div style={styles.conversationArea}>
          {conversation.length === 0 && (
            <div style={styles.sampleQuestionsArea}>
              {displayQuestions.map((item, index) => (
                <span
                  key={index}
                  style={{
                    ...styles.sampleQuestion,
                    ...styles[`question${item.fontSize.charAt(0).toUpperCase() + item.fontSize.slice(1)}`]
                  }}
                  onClick={() => {
                    // All tag cloud items are lists - go to list page
                    router.push(`/genius/list/${item.listId}`);
                  }}
                >
                  {item.text}
                  {index < displayQuestions.length - 1 && '\u00A0\u00A0'}
                </span>
              ))}
            </div>
          )}
          {conversation.map((message) => (
            <div key={message.id} style={styles.messageGroup}>
              <div style={styles.questionHeader}>{message.question}</div>
              {message.isLoading ? (
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
                <>
                  {/* Render interleaved sections */}
                  {message.sections && message.sections.map((section, sectionIndex) => (
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
                              key={`${message.id}-${sectionIndex}-${movieIndex}`}
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
                  {message.exploreFurther && message.exploreFurther.length > 0 && (
                    <div style={styles.exploreFurtherSection}>
                      <h3 style={styles.exploreFurtherTitle}>Explore Further</h3>
                      <div style={styles.topicList}>
                        {message.exploreFurther.map((topic, index) => (
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
                    </div>
                  )}
                  
                  {/* Render More Ideas section */}
                  {message.moreIdeas && (
                    <div style={styles.moreIdeasSection}>
                      <h3 style={styles.moreIdeasTitle}>More Ideas</h3>
                      <div style={styles.movieList}>
                        {message.moreIdeas.movies.map((movie, index) => (
                          <MediaCard
                            key={`more-${message.id}-${index}`}
                            title={movie.title}
                            year={movie.year}
                            initialSlug={movie.slug}
                            initialPoster={movie.poster}
                            initialStreaming={movie.streaming}
                            tmdbId={movie.tmdb_id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
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
    width: '100%',
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
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  filmIcon: {
    width: '48px',
    height: '48px',
  },
  sampleQuestionsArea: {
    textAlign: 'justify',
    marginTop: '0px', // Moved up 0.75 inches
    padding: '0 16px 20px 16px',
    lineHeight: '1.4',
  },
  sampleQuestion: {
    display: 'inline',
    margin: '0 8px 8px 0',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, color 0.2s ease',
    color: '#6b7280',
  },
  questionLarge: {
    fontSize: '20px',
    fontWeight: '300',
    color: '#374151',
  },
  questionMedium: {
    fontSize: '18px',
    fontWeight: '800',
  },
  questionSmall: {
    fontSize: '14px',
    fontWeight: '600',
  },
  moreIdeasSection: {
    marginTop: '24px',
    paddingTop: '16px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '16px',
  },
  exploreFurtherSection: {
    marginTop: '24px',
    paddingTop: '16px',
  },
  exploreFurtherTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '16px',
  },
  topicList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '16px',
    paddingRight: '16px',
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
};
