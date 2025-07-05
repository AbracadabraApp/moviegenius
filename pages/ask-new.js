// pages/ask-new.js - Genius: Educational Discovery & AI Assistant
import PhoneFrame from '../components/PhoneFrame';
import SimpleSearch from '../components/SimpleSearch';
import MediaCard from '../components/MediaCard';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../lib/proper-names';
import loadingMessages from '../data/loading-messages.json';

export default function GeniusPage() {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [educationalLists, setEducationalLists] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const router = useRouter();

  // Load educational lists from database on page load
  useEffect(() => {
    const loadEducationalLists = async () => {
      try {
        const response = await fetch('/api/tag-cloud?content_type=educational');
        if (response.ok) {
          const data = await response.json();
          const shuffled = data.lists.sort(() => 0.5 - Math.random());
          const selected75 = shuffled.slice(0, 75);
          const itemsWithSizes = selected75.map((item, index) => ({
            text: item.name,
            listId: item.id,
            slug: item.slug,
            fontSize: index % 3 === 0 ? 'large' : index % 3 === 1 ? 'medium' : 'small'
          }));
          
          setEducationalLists(itemsWithSizes);
        } else {
          console.error('Failed to load educational lists from database');
          setEducationalLists([]);
        }
      } catch (error) {
        console.error('Error loading educational lists:', error);
        setEducationalLists([]);
      }
    };

    loadEducationalLists();
  }, []);

  // Handle URL query parameter for direct questions
  useEffect(() => {
    const query = router.query.q;
    if (query && conversation.length === 0) {
      handleAsk(query);
    }
  }, [router.query.q]);

  const handleAsk = useCallback(async (query) => {
    // Prevent multiple concurrent requests
    if (isLoading) return;

    setIsLoading(true);
    
    // Random loading message and icon
    const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    setLoadingMessage(randomMessage.message);
    setLoadingIcon(randomMessage.icon);

    try {
      // Add user message to conversation immediately
      const tempMessage = {
        id: Date.now(),
        type: 'user',
        content: query,
        timestamp: new Date()
      };

      // Start fresh with each query (clear previous conversation)
      setConversation([tempMessage]);

      const response = await fetch('/api/ask-claude.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response to conversation
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response || 'Sorry, I couldn\'t generate a response.',
        movies: data.movies || [],
        exploreTopics: data.exploreTopics || [],
        timestamp: new Date()
      };

      setConversation([tempMessage, aiMessage]);

    } catch (error) {
      console.error('Error asking question:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      setLoadingIcon('');
    }
  }, [isLoading, conversation.length]);

  const handleSearchResults = (results) => {
    // For now, just log the search results
    // In the future, could show search results in a modal or navigate to search page
    console.log('Search results on Ask page:', results);
  };

  const handleListClick = (list) => {
    router.push(`/genius/list/${list.slug}`);
  };

  const renderMessage = (message) => {
    if (message.type === 'user') {
      return (
        <div key={message.id} style={styles.userMessage}>
          <div style={styles.userBubble}>
            {message.content}
          </div>
        </div>
      );
    }

    if (message.type === 'error') {
      return (
        <div key={message.id} style={styles.errorMessage}>
          {message.content}
        </div>
      );
    }

    if (message.type === 'ai') {
      return (
        <div key={message.id} style={styles.aiResponse}>
          {/* AI text response */}
          <div style={styles.aiText}>
            {underlineProperNames(message.content)}
          </div>

          {/* Movies section */}
          {message.movies && message.movies.length > 0 && (
            <div style={styles.moviesSection}>
              {message.movies.map((movie, index) => (
                <MediaCard
                  key={`${movie.title}-${movie.year}-${index}`}
                  title={movie.title}
                  year={movie.year}
                  initialSlug={movie.description || movie.slug || `${movie.title} (${movie.year})`}
                  initialPoster={movie.poster_path}
                  tmdbId={movie.tmdb_id}
                  id={movie.tmdb_id}
                />
              ))}
            </div>
          )}

          {/* Explore topics */}
          {message.exploreTopics && message.exploreTopics.length > 0 && (
            <div style={styles.exploreSection}>
              <div style={styles.exploreTitle}>Explore more:</div>
              <div style={styles.exploreTopics}>
                {message.exploreTopics.map((topic, index) => (
                  <button
                    key={index}
                    style={styles.exploreButton}
                    onClick={() => handleAsk(topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <PhoneFrame active="ask">
      <div style={styles.container}>
        {/* Ask Input Bar */}
        <div style={styles.inputArea}>
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Ask about film techniques, directors, hidden connections..."
          />
        </div>

        {/* Content Area */}
        <div style={styles.content}>
          {/* Loading State */}
          {isLoading && (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingIcon}>{loadingIcon}</div>
              <div style={styles.loadingText}>{loadingMessage}</div>
            </div>
          )}

          {/* Conversation */}
          {conversation.length > 0 && (
            <div style={styles.conversation}>
              {conversation.map(renderMessage)}
            </div>
          )}

          {/* Educational Tag Cloud (when no conversation) */}
          {conversation.length === 0 && !isLoading && (
            <div style={styles.tagCloudSection}>
              <h2 style={styles.sectionTitle}>Discover Deep Film Knowledge</h2>
              <p style={styles.sectionSubtitle}>
                Explore educational insights and surprising connections in cinema
              </p>
              <div style={styles.tagCloud}>
                {educationalLists.map((item, index) => (
                  <button
                    key={`${item.listId}-${index}`}
                    style={{
                      ...styles.tagButton,
                      ...styles[`fontSize${item.fontSize.charAt(0).toUpperCase() + item.fontSize.slice(1)}`]
                    }}
                    onClick={() => handleListClick(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e3f2fd';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
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
    borderBottom: '1px solid #e5e7eb',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    animation: 'pulse 2s infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
  },
  conversation: {
    padding: '0 16px 16px',
  },
  userMessage: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '18px',
    maxWidth: '80%',
    fontSize: '16px',
    lineHeight: '1.4',
  },
  aiResponse: {
    marginBottom: '24px',
  },
  aiText: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#374151',
    marginBottom: '16px',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  moviesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  exploreSection: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  exploreTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
  },
  exploreTopics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  exploreButton: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '16px',
    padding: '6px 12px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  tagCloudSection: {
    padding: '24px 16px',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '8px',
  },
  sectionSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    lineHeight: 1.4,
  },
  tagButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderRadius: '6px',
    padding: '4px 8px',
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
    fontFamily: 'inherit',
  },
  fontSizeLarge: {
    fontSize: '20px',
    fontWeight: '700',
  },
  fontSizeMedium: {
    fontSize: '16px',
    fontWeight: '600',
  },
  fontSizeSmall: {
    fontSize: '14px',
    fontWeight: '500',
  },
}