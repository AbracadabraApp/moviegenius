// pages/ask.js
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import TypewriterText from '../components/TypewriterText';
import EntityLinkedText from '../components/EntityLinkedText';
import FilmLoadingMessage from '../components/FilmLoadingMessage';
import BlinkingCursor from '../components/BlinkingCursor';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../lib/proper-names';

export default function AskPage() {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayQuestions, setDisplayQuestions] = useState([]);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false); // Track if user has asked anything
  const [showInputAfterFirstResponse, setShowInputAfterFirstResponse] = useState(false); // Track when to show input after first response
  const router = useRouter();

  // Restore conversation from localStorage on page load
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Check for fresh start parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fresh')) {
      localStorage.removeItem('moviegenius_conversation');
      setConversation([]);
      setHasAskedQuestion(false);
      return;
    }
    
    try {
      const saved = localStorage.getItem('moviegenius_conversation');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate structure and filter out loading states
        const cleanConversation = parsed.filter(msg => 
          msg && msg.id && msg.question && !msg.isLoading
        );
        if (cleanConversation.length > 0) {
          setConversation(cleanConversation);
          setHasAskedQuestion(true); // Show conversational UI
          setShowInputAfterFirstResponse(true); // Show input for restored conversations
        }
      }
    } catch (error) {
      // Clear corrupted data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('moviegenius_conversation');
      }
    }
  }, []);

  // Persist conversation to localStorage
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (conversation.length > 0) {
      // Only save completed messages, skip loading states
      const persistableConversation = conversation.filter(msg => 
        msg && !msg.isLoading && msg.content
      );
      if (persistableConversation.length > 0) {
        localStorage.setItem('moviegenius_conversation', JSON.stringify(persistableConversation));
      }
    }
  }, [conversation]);

  // Load series data for display questions
  useEffect(() => {
    const loadSeriesData = async () => {
      try {
        const response = await fetch('/api/series-episode?action=getAllSeries');
        if (response.ok) {
          const data = await response.json();
          // Convert series data to display format
          const seriesArray = Object.values(data).map(series => ({
            text: series.title,
            seriesId: series.id,
            fontSize: 'medium'
          }));
          
          // Shuffle and limit to 6 for display
          const shuffled = seriesArray.sort(() => 0.5 - Math.random());
          setDisplayQuestions(shuffled.slice(0, 6));
        } else {
          // Fallback to static series list
          const fallbackSeries = [
            { text: 'Classic Film Noir', seriesId: 1 },
            { text: 'Contemporary Auteurs', seriesId: 7 },
            { text: 'International Masters', seriesId: 5 },
            { text: 'Women Directors', seriesId: 4 },
            { text: 'New Waves', seriesId: 8 },
            { text: 'Comedy Through the Ages', seriesId: 3 }
          ];
          setDisplayQuestions(fallbackSeries);
        }
      } catch (error) {
        // Fallback to static series list
        const fallbackSeries = [
          { text: 'Classic Film Noir', seriesId: 1 },
          { text: 'Contemporary Auteurs', seriesId: 7 },
          { text: 'International Masters', seriesId: 5 },
          { text: 'Women Directors', seriesId: 4 },
          { text: 'New Waves', seriesId: 8 },
          { text: 'Comedy Through the Ages', seriesId: 3 }
        ];
        setDisplayQuestions(fallbackSeries);
      }
    };

    loadSeriesData();
  }, []);

  const handleAsk = useCallback(async (query) => {
    // Prevent multiple concurrent requests
    if (isLoading) {
      return;
    }
    
    // Mark that user has asked a question (affects UI layout)
    setHasAskedQuestion(true);
    
    const tempMessage = {
      id: Date.now(),
      question: query,
      content: '',
      followUpQuestions: [],
      isLoading: true,
    };
    
    // Add to conversation (don't replace - build conversation history)
    setConversation(prev => [...prev, tempMessage]);
    setIsLoading(true);

    // Scroll to new question after state update
    setTimeout(() => {
      const newMessageElement = document.querySelector(`[data-message-id="${tempMessage.id}"]`);
      if (newMessageElement) {
        newMessageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);

    try {
      // Build conversation context from previous completed messages  
      let conversationContext = null;
      if (conversation.length > 0) {
        // Find the last completed message (not loading)
        const completedMessages = conversation.filter(msg => msg && !msg.isLoading && msg.content);
        if (completedMessages.length > 0) {
          const lastMessage = completedMessages[completedMessages.length - 1];
          conversationContext = {
            lastQuestion: lastMessage.question,
            lastResponse: lastMessage.content,
            lastFollowUpQuestion: lastMessage.followUpQuestions?.[0] || null
          };
        }
      }

      // Single API call for lightweight Ask responses
      const response = await fetch('/api/ask-claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: query,
          conversationContext 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Extract lightweight response data
      const sections = data.data.sections || [];
      const followUpQuestions = data.data.followUpQuestions || [];
      const geniusSuggestions = data.data.geniusSuggestions || null;
      
      // Get main content from first section
      const mainContent = sections.length > 0 ? sections[0].content : '';

      const updatedMessage = {
        ...tempMessage,
        content: mainContent,
        followUpQuestions,
        geniusSuggestions,
        isLoading: false
      };
      
      // Update the conversation with the completed message
      setConversation(prev => 
        prev.map(msg => msg.id === tempMessage.id ? updatedMessage : msg)
      );

    } catch (error) {
      
      // Update with error message
      const errorMessage = {
        ...tempMessage,
        content: 'Sorry, I encountered an error. Please try again.',
        isLoading: false
      };
      
      setConversation(prev => 
        prev.map(msg => msg.id === tempMessage.id ? errorMessage : msg)
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversation, isLoading]);

  // Handle incoming query from URL
  useEffect(() => {
    if (router.query.q) {
      handleAsk(router.query.q);
      // Clear the query parameter
      router.replace('/ask', undefined, { shallow: true });
    }
  }, [router.query.q, router, handleAsk]);

  // Helper function to clear conversation
  const clearConversation = useCallback(() => {
    setConversation([]);
    setHasAskedQuestion(false);
    setShowInputAfterFirstResponse(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('moviegenius_conversation');
    }
  }, []);

  return (
    <PhoneFrame active="ask">
      <div style={styles.container}>
        {/* Welcome Content - Only shown when no conversation exists */}
        {!hasAskedQuestion && (
          <div style={styles.welcomeArea}>
            <div style={styles.welcomeContent}>
              <h1 style={styles.welcomeTitle}>
                Movie Genius
              </h1>
              <div style={styles.welcomeInput}>
                <AskInputBar 
                  placeholder="Ask me about movies..."
                  style={styles.welcomeInputBar}
                  onSubmit={handleAsk}
                  showNavigation={false}
                  multiline={true}
                />
              </div>
              {displayQuestions.length > 0 && (
                <div style={styles.welcomeSuggestions}>
                  <div style={styles.suggestionsLabel}>Or explore:</div>
                  <div style={styles.suggestionsList}>
                    {displayQuestions.slice(0, 6).map((item, index) => (
                      <span
                        key={index}
                        style={styles.suggestionLink}
                        onClick={() => {
                          router.push(`/recs/series/${item.seriesId}`);
                        }}
                      >
                        {item.text}
                        {index < 5 && ' • '}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Scrollable Conversation */}
        <div style={styles.scrollableContent}>
          <div style={styles.conversationArea}>
            {/* Conversation Messages */}
            {conversation.map((message) => (
              <div key={message.id} data-message-id={message.id} style={styles.messageGroup}>
                {/* Question - left-aligned with prefix */}
                <div style={styles.questionText}>
                  {'> '}{message.question.includes(':') ? 
                    message.question.split(':').slice(1).join(':').trim() : 
                    message.question
                  }
                </div>

                {/* Response - Claude style full width */}
                {message.isLoading ? (
                  <div style={styles.loadingContainer}>
                    <FilmLoadingMessage cycling={true} interval={3000} size="medium" />
                  </div>
                ) : (
                  <>
                    {/* Main response - clean, full width */}
                    <div style={styles.responseText}>
                      <EntityLinkedText 
                        text={message.content} 
                        linkMovies={true}
                        linkingStyle="on"
                      />
                    </div>

                    {/* Follow-up Questions */}
                    {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                      <div style={styles.followUpSection}>
                        <div style={styles.followUpTitle}>Continue exploring:</div>
                        <div style={styles.followUpQuestions}>
                          {message.followUpQuestions.map((question, index) => (
                            <button
                              key={index}
                              style={styles.followUpButton}
                              onClick={() => handleAsk(question)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecorationColor = '#d4af37';
                                e.currentTarget.style.color = '#b8941f';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecorationColor = 'transparent';
                                e.currentTarget.style.color = '#d4af37';
                              }}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </>
                )}

                {/* Genius Suggestions (if any) */}
                {message.geniusSuggestions && (
                  <div style={styles.geniusSuggestionsSection}>
                    <div style={styles.geniusSuggestionsTitle}>
                      💡 Related Genius Content
                    </div>
                    <div 
                      style={styles.geniusSuggestionCard}
                      onClick={() => {
                        router.push(message.geniusSuggestions.url);
                      }}
                    >
                      <div style={styles.geniusTypeLabel}>
                        {message.geniusSuggestions.type === 'theme' ? '📚 Theme' :
                         message.geniusSuggestions.type === 'series' ? '🎬 Series' : '📖 Episode'}
                      </div>
                      <div style={styles.geniusTitleText}>
                        {message.geniusSuggestions.title}
                      </div>
                      {message.geniusSuggestions.subtitle && (
                        <div style={styles.geniusSubtitleText}>
                          {message.geniusSuggestions.subtitle}
                        </div>
                      )}
                      <div style={styles.geniusMatchInfo}>
                        {message.geniusSuggestions.confidence}% match
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Scroll indicator for more content */}
            {hasAskedQuestion && conversation.length > 2 && (
              <div style={styles.scrollHint}>
                <div style={styles.scrollIndicator}>• • •</div>
              </div>
            )}
            
          </div>
        </div>
        
        {/* Fixed Bottom Input Area - Claude style */}
        {hasAskedQuestion && (
          <div style={styles.fixedInputArea}>
            <div style={styles.inputContainer}>
              <div style={styles.claudeInputRow}>
                <div style={styles.leftButtons}>
                  <button style={styles.iconButton}>+</button>
                  <button style={styles.iconButton}>≈</button>
                </div>
                <div style={styles.inputWrapper}>
                  <AskInputBar 
                    placeholder="Reply to MovieGenius..."
                    style={styles.claudeInput}
                    onSubmit={handleAsk}
                    showNavigation={false}
                    multiline={true}
                  />
                </div>
                <div style={styles.rightButtons}>
                  <button 
                    style={styles.clearButton}
                    onClick={clearConversation}
                    title="Start new conversation"
                  >
                    ↻
                  </button>
                  <span style={styles.modelInfo}>MovieGenius</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </PhoneFrame>
  );
}


const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative', // Ensure relative positioning for fixed input area
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#e5e7eb', // More visible light grey background
    color: '#2d3748',
  },
  
  // Welcome area (Claude-style)
  welcomeArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px 24px',
    textAlign: 'center',
  },
  welcomeContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    width: '100%',
    maxWidth: '400px',
  },
  welcomeInput: {
    width: '100%',
  },
  welcomeInputBar: {
    backgroundColor: '#ffffff',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '16px',
    minHeight: '60px',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.1)',
  },
  welcomeSuggestions: {
    textAlign: 'center',
    maxWidth: '350px',
  },
  suggestionsLabel: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '12px',
  },
  suggestionsList: {
    lineHeight: '1.6',
  },
  suggestionLink: {
    fontSize: '14px',
    color: '#d4af37',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '300',
    color: '#2d3748',
    lineHeight: '1.4',
    maxWidth: '400px',
    textAlign: 'center',
  },
  
  // Fixed input area at bottom (Claude style)
  fixedInputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #f0f0f0',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
  },
  inputContainer: {
    padding: '12px 20px',
    width: '100%',
  },
  inputLabel: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '8px',
    textAlign: 'center',
  },
  claudeInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  leftButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  rightButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  iconButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  plusButton: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#d4af37',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
  },
  claudeInput: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#2d3748',
    fontSize: '14px',
    padding: '10px 12px',
    minHeight: '40px',
  },
  modelInfo: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  clearButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  scrollHint: {
    textAlign: 'center',
    padding: '16px 0',
  },
  scrollIndicator: {
    fontSize: '18px',
    color: '#d4af37',
    opacity: 0.6,
    letterSpacing: '4px',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    backgroundColor: '#e5e7eb',
    paddingBottom: '80px', // Space for fixed input area
  },
  conversationArea: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    minHeight: '100%',
  },
  messageGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  questionText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
    textAlign: 'left',
    padding: '0',
    maxWidth: '100%',
  },
  
  // Response styling - Claude style
  responseText: {
    fontSize: '16px',
    color: '#2d3748',
    lineHeight: '1.7',
    padding: '0',
    margin: '0',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    width: '100%',
  },
  
  // Follow-up questions
  followUpSection: {
    marginTop: '20px',
    marginBottom: '16px',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  followUpTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '12px',
    paddingLeft: '16px',
  },
  followUpQuestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  followUpButton: {
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: '#d4af37',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    textDecoration: 'underline',
    textDecorationColor: 'transparent',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    width: '100%',
  },
  loadingContainer: {
    padding: '16px 0',
    width: '100%',
  },
  loadingText: {
    fontSize: '15px',
    color: '#4a5568',
  },
  loadingIcon: {
    flexShrink: 0,
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
  geniusSuggestionsSection: {
    marginTop: '24px',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  geniusSuggestionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#888888',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '16px',
  },
  geniusSuggestionCard: {
    padding: '16px 20px',
    backgroundColor: '#2a2a2a',
    border: '2px solid #ff6b35', // Orange border like Claude
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  geniusTypeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#ff6b35',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  geniusTitleText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '4px',
    lineHeight: '1.3',
  },
  geniusSubtitleText: {
    fontSize: '14px',
    color: '#cccccc',
    marginBottom: '8px',
    lineHeight: '1.4',
    fontStyle: 'italic',
  },
  geniusMatchInfo: {
    fontSize: '12px',
    color: '#888888',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #444444',
  },
};
