// components/AskInputBar.js
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import CircleChevronLeft from 'lucide-react/dist/esm/icons/circle-chevron-left';
import CircleChevronRight from 'lucide-react/dist/esm/icons/circle-chevron-right';

export default function AskInputBar({
  placeholder = 'Ask me about movies...',
  isLoading = false,
  episodePrefix = null,
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

  // Check if there's a page to go back to
  const canGoBack = () => {
    return isClient && window.history.length > 1;
  };

  // Check if there's a page to go forward to or if there's text to submit
  const canGoForward = () => {
    return question.trim() || (isClient && window.history.state && window.history.state.forward);
  };

  // Standard browser back navigation
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  // Standard browser forward navigation or submit question
  const handleForward = () => {
    const trimmed = question.trim();
    if (trimmed) {
      // If there's text, submit the question with optional episode prefix
      const finalQuestion = episodePrefix ? `${episodePrefix}: ${trimmed}` : trimmed;
      router.push(`/ask?q=${encodeURIComponent(finalQuestion)}`);
      setQuestion('');
    } else {
      // Standard browser forward navigation
      if (typeof window !== 'undefined') {
        window.history.forward();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleForward(); // Use the same logic as forward arrow
  };

  // Allow clicking anywhere in the bar to focus input
  useEffect(() => {
    const bar = document.getElementById(barId);
    if (bar && inputRef.current) {
      bar.onclick = () => inputRef.current.focus();
    }
  }, [barId]);

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
        <div id={barId} style={styles.bar}>
          {!episodePrefix && (
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

          {episodePrefix ? (
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
          )}
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
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '32px',
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
