// pages/ask.js
import PhoneFrame from '../components/PhoneFrame';
import AskInputBar from '../components/AskInputBar';
import TypewriterText from '../components/TypewriterText';
import StarAnimation from '../components/StarAnimation';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { underlineProperNames } from '../lib/proper-names';
import loadingMessages from '../data/loading-messages.json';

export default function AskPage() {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayQuestions, setDisplayQuestions] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false); // Track if user has asked anything
  const router = useRouter();

  // Restore conversation from localStorage on page load
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
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
        }
      }
    } catch (error) {
      console.warn('Failed to restore conversation:', error);
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
    
    // Mark that user has asked a question (affects UI layout)
    setHasAskedQuestion(true);
    
    // Start cycling loading messages and icons
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
    
    const tempMessage = {
      id: Date.now(),
      question: query,
      content: '',
      followUpQuestions: [],
      isLoading: true,
      cycleInterval: cycleInterval,
    };
    
    // Add to conversation (don't replace - build conversation history)
    setConversation(prev => [...prev, tempMessage]);
    setIsLoading(true);

    try {
      // Single API call for lightweight Ask responses
      const response = await fetch('/api/ask-claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: query }),
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

      // Clear interval and update message
      if (tempMessage.cycleInterval) {
        clearInterval(tempMessage.cycleInterval);
      }
      
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
      console.error('Error:', error);
      if (tempMessage.cycleInterval) {
        clearInterval(tempMessage.cycleInterval);
      }
      
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
  }, []);

  // Handle incoming query from URL
  useEffect(() => {
    if (router.query.q) {
      handleAsk(router.query.q);
      // Clear the query parameter
      router.replace('/ask', undefined, { shallow: true });
    }
  }, [router.query.q, handleAsk]);

  // Helper function to clear conversation
  const clearConversation = useCallback(() => {
    setConversation([]);
    setHasAskedQuestion(false);
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
              <StarAnimation size={48} style={styles.welcomeIcon} />
              <h1 style={styles.welcomeTitle}>
                What movie magic can I help you discover today?
              </h1>
            </div>
          </div>
        )}
        
        {/* Scrollable Conversation */}
        <div style={styles.scrollableContent}>
          <div style={styles.conversationArea}>
            {/* Sample questions only shown on initial load */}
            {conversation.length === 0 && !hasAskedQuestion && (
              <div style={styles.sampleQuestionsArea}>
                {displayQuestions.map((item, index) => (
                  <span
                    key={index}
                    style={{
                      ...styles.sampleQuestion,
                      ...styles[`question${item.fontSize.charAt(0).toUpperCase() + item.fontSize.slice(1)}`]
                    }}
                    onClick={() => {
                      router.push(`/genius/list/${item.listId}`);
                    }}
                  >
                    {item.text}
                    {index < displayQuestions.length - 1 && '\u00A0\u00A0'}
                  </span>
                ))}
              </div>
            )}
            {/* Conversation Messages */}
            {conversation.map((message) => (
              <div key={message.id} style={styles.messageGroup}>
                {/* Question */}
                <div style={styles.questionHeader}>
                  {message.question.includes(':') ? 
                    message.question.split(':').slice(1).join(':').trim() : 
                    message.question
                  }
                </div>

                {/* Response */}
                {message.isLoading ? (
                  <div style={styles.loadingContainer}>
                    <div style={styles.loadingRow}>
                      <StarAnimation size={32} style={styles.loadingIcon} />
                      <span style={styles.loadingText}>{loadingMessage}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Main response with typewriter effect */}
                    <div style={styles.responseContainer}>
                      <TypewriterText
                        text={message.content}
                        speed={30} // Fast for responsiveness
                        style={styles.responseText}
                        onComplete={() => {
                          // Could trigger follow-up questions animation
                        }}
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
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#2563eb';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#d1d5db';
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
          </div>
        </div>
        
        {/* Bottom Input Area - Always present */}
        <div style={styles.bottomInputArea}>
          <div style={styles.inputLabel}>
            {hasAskedQuestion ? 'Reply to MovieGenius' : 'Ask MovieGenius'}
          </div>
          <div style={styles.inputRow}>
            <button style={styles.plusButton}>+</button>
            <div style={styles.inputWrapper}>
              <AskInputBar 
                placeholder={hasAskedQuestion ? "Ask a follow-up..." : "What movie magic interests you?"}
                style={styles.bottomInput}
                onSubmit={handleAsk}
                showNavigation={false}
              />
            </div>
            <button style={styles.micButton}>🎤</button>
            {hasAskedQuestion && (
              <button 
                style={styles.clearButton}
                onClick={clearConversation}
                title="Start new conversation"
              >
                ↻
              </button>
            )}
          </div>
        </div>
        
        {/* Claude-style Footer Disclaimer */}
        <div style={styles.disclaimer}>
          <StarAnimation size={16} style={styles.disclaimerIcon} />
          <span>MovieGenius can make mistakes. Please double check responses.</span>
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
    backgroundColor: '#1a1a1a', // Dark background like Claude
    color: '#ffffff',
  },
  
  // Welcome area (Claude-style)
  welcomeArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '60px 24px',
    textAlign: 'center',
  },
  welcomeContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  welcomeIcon: {
    marginBottom: '8px',
  },
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: '400',
    color: '#ffffff',
    lineHeight: '1.3',
    maxWidth: '500px',
  },
  
  // Bottom input area (Claude-style)
  bottomInputArea: {
    padding: '16px 20px 8px',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333333',
  },
  inputLabel: {
    fontSize: '14px',
    color: '#888888',
    marginBottom: '8px',
    textAlign: 'center',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '20px',
    padding: '4px',
  },
  plusButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#404040',
    border: 'none',
    color: '#ffffff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
  },
  bottomInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    padding: '8px 12px',
  },
  micButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#404040',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollableContent: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    backgroundColor: '#1a1a1a',
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
    gap: '16px',
    marginBottom: '32px',
  },
  questionHeader: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '12px',
    textAlign: 'right',
    backgroundColor: '#2a2a2a',
    padding: '12px 16px',
    borderRadius: '16px',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  
  // Response styling
  responseContainer: {
    marginBottom: '16px',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  responseText: {
    fontSize: '15px',
    color: '#ffffff',
    lineHeight: '1.6',
    backgroundColor: '#2a2a2a',
    padding: '16px',
    borderRadius: '16px',
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
    color: '#888888',
    marginBottom: '12px',
    paddingLeft: '16px',
  },
  followUpQuestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  followUpButton: {
    padding: '12px 16px',
    backgroundColor: '#333333',
    border: '1px solid #444444',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#ffffff',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    width: '100%',
  },
  loadingContainer: {
    padding: '16px',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#2a2a2a',
    padding: '16px',
    borderRadius: '16px',
  },
  loadingText: {
    fontSize: '15px',
    color: '#ffffff',
  },
  loadingIcon: {
    flexShrink: 0,
  },
  
  // Disclaimer footer
  disclaimer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333333',
    fontSize: '12px',
    color: '#888888',
  },
  disclaimerIcon: {
    flexShrink: 0,
  },
  sampleQuestionsArea: {
    textAlign: 'justify',
    padding: '20px 16px',
    lineHeight: '1.4',
  },
  sampleQuestion: {
    display: 'inline',
    margin: '0 8px 8px 0',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, color 0.2s ease',
    color: '#888888',
  },
  questionLarge: {
    fontSize: '20px',
    fontWeight: '300',
    color: '#ffffff',
  },
  questionMedium: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#cccccc',
  },
  questionSmall: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#888888',
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
