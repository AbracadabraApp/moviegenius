// components/AskInputBar.js
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import { CircleChevronLeft, CircleChevronRight } from 'lucide-react';

function AskInputBar({
  placeholder = 'Ask me about movies...',
  isLoading = false,
  episodePrefix = null,
  style = {},
  onSubmit = null,
  showNavigation = true, // New prop to control navigation buttons
  multiline = false, // New prop for textarea vs input
}) {
  const [question, setQuestion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();
  
  // Generate unique ID for this instance
  const barId = `ask-bar-${episodePrefix ? 'episode' : 'main'}`;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Allow clicking anywhere in the bar to focus input
  useEffect(() => {
    if (isClient) {
      const bar = document.getElementById(barId);
      if (bar && inputRef.current) {
        bar.onclick = () => inputRef.current.focus();
      }
    }
  }, [barId, isClient]);

  // Check if there's a page to go back to
  const canGoBack = useCallback(() => {
    return isClient && window.history.length > 1;
  }, [isClient]);

  // Check if there's a page to go forward to or if there's text to submit
  const canGoForward = useCallback(() => {
    return question.trim() || (isClient && window.history.state && window.history.state.forward);
  }, [question, isClient]);

  // Standard browser back navigation
  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  // Smart routing with movie detection or submit question
  const handleForward = useCallback(async () => {
    const trimmed = question.trim();
    if (trimmed) {
      // For episode context, always go to ask (no movie detection)
      if (episodePrefix) {
        const finalQuestion = `${episodePrefix}: ${trimmed}`;
        router.push(`/ask?q=${encodeURIComponent(finalQuestion)}`);
        setQuestion('');
        return;
      }

      try {
        // Try movie detection for non-episode queries
        const detectionResponse = await fetch('/api/detect-movie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed })
        });

        if (detectionResponse.ok) {
          const detection = await detectionResponse.json();
          
          if (detection.shouldRedirect && detection.redirectUrl) {
            // Direct redirect to movie or genius page
            if (detection.detectionType && detection.detectionType.startsWith('genius_')) {
              console.log(`🎓 Genius ${detection.detectionType} detected: "${detection.movieTitle}" - redirecting to ${detection.redirectUrl}`);
            } else {
              console.log(`🎬 Movie detected: "${detection.movieTitle}" (${detection.movieYear}) - redirecting to ${detection.redirectUrl}`);
            }
            setQuestion('');
            router.push(detection.redirectUrl);
            return;
          }
        }
      } catch (error) {
        console.warn('Movie detection failed, falling back to Ask:', error);
        // Fall through to normal Ask routing
      }

      // No movie detected or detection failed - normal Ask flow
      router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
      setQuestion('');
    } else {
      // Standard browser forward navigation
      if (typeof window !== 'undefined') {
        window.history.forward();
      }
    }
  }, [question, episodePrefix, router]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed) {
      if (onSubmit) {
        // Use provided onSubmit callback
        onSubmit(episodePrefix ? `${episodePrefix}: ${trimmed}` : trimmed);
        setQuestion('');
      } else {
        // Fallback to original handleForward logic
        handleForward();
      }
    }
  }, [question, episodePrefix, onSubmit, handleForward]);

  // Prevent hydration mismatch by only showing interactive elements after mount
  if (!isClient) {
    return (
      <form style={styles.form}>
        <div style={styles.bar}>
          {!episodePrefix && (
            <div style={styles.navButton}>
              <div style={{...styles.navIcon, opacity: 0.3, width: 30, height: 30}} />
            </div>
          )}
          <input
            type="text"
            placeholder={placeholder}
            disabled
            style={{...styles.input, opacity: 0.6}}
          />
          <div style={styles.navButton}>
            <div style={{...styles.navIcon, opacity: 0.3, width: 30, height: 30}} />
          </div>
        </div>
      </form>
    );
  }

  return (
    <>
      <style jsx>{`
        .ask-input::placeholder {
          color: #6b7280;
          opacity: 1;
        }
        .ask-input::-webkit-input-placeholder {
          color: #6b7280;
          opacity: 1;
        }
        .ask-input::-moz-placeholder {
          color: #6b7280;
          opacity: 1;
        }
        .ask-input:-ms-input-placeholder {
          color: #6b7280;
          opacity: 1;
        }
      `}</style>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div id={barId} style={{...styles.bar, ...style}}>
          {showNavigation && !episodePrefix && (
            <button 
              type="button"
              onClick={handleBack}
              style={styles.navButton}
              aria-label="Go back"
              disabled={isLoading}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <CircleChevronLeft 
                size={30} 
                style={{
                  ...styles.navIcon,
                  opacity: isLoading ? 0.3 : 1,
                  color: isLoading ? '#d1d5db' : '#d1d5db' // Always disabled color during SSR
                }}
              />
            </button>
          )}

          {multiline ? (
            <textarea
              ref={inputRef}
              placeholder={isLoading ? 'Please wait...' : placeholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
              className="ask-input"
              rows={2}
              style={{
                ...styles.input,
                ...styles.textarea,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'text',
                resize: 'none'
              }}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder={isLoading ? 'Please wait...' : placeholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              className="ask-input"
              style={{
                ...styles.input,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'text'
              }}
            />
          )}

          {showNavigation && (episodePrefix ? (
            // Episode context: only show submit button when there's text
            question.trim() && (
              <button 
                type="button"
                onClick={handleForward}
                style={styles.navButton}
                aria-label="Submit question"
                disabled={isLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <CircleChevronRight 
                  size={30} 
                  style={{
                    ...styles.navIcon,
                    opacity: isLoading ? 0.3 : 1,
                    color: isLoading ? '#d1d5db' : '#374151'
                  }}
                />
              </button>
            )
          ) : (
            // Regular context: show navigation button
            <button 
              type="button"
              onClick={handleForward}
              style={styles.navButton}
              aria-label={question.trim() ? "Submit question" : "Go forward"}
              disabled={isLoading}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <CircleChevronRight 
                size={30} 
                style={{
                  ...styles.navIcon,
                  opacity: isLoading ? 0.3 : 1,
                  color: isLoading ? '#d1d5db' : (question.trim() || (isClient && canGoForward()) ? '#374151' : '#d1d5db')
                }}
              />
            </button>
          ))}
        </div>
      </form>
    </>
  );
}

const styles = {
  form: {
    width: '100%',
    paddingTop: '4px',
  },
  bar: {
    height: '54px',
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '27px',
    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'text',
    gap: '4px',
  },
  input: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '500',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    margin: '0 4px',
  },
  textarea: {
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  navButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px',
    transition: 'transform 0.2s ease',
    borderRadius: '50%',
    flexShrink: 0,
    width: '36px',
    height: '36px',
  },
  navIcon: {
    transition: 'all 0.2s ease',
  },
};

// Memoized AskInputBar with intelligent prop comparison
const AskInputBarMemo = memo(AskInputBar, (prevProps, nextProps) => {
  return (
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.episodePrefix === nextProps.episodePrefix &&
    prevProps.showNavigation === nextProps.showNavigation &&
    prevProps.multiline === nextProps.multiline &&
    prevProps.onSubmit === nextProps.onSubmit
  );
});

export default AskInputBarMemo;
