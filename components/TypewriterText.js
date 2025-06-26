// components/TypewriterText.js
import { useState, useEffect } from 'react';

/**
 * TypewriterText Component
 * 
 * Simulates typewriter effect by progressively revealing text.
 * Designed for Ask responses to create immediate engagement while content loads.
 * 
 * Features:
 * - Word-based chunking for natural reading flow
 * - Configurable speed for different content types
 * - Pause/resume capability
 * - Respects markdown-style formatting (*text* for emphasis)
 */
export default function TypewriterText({ 
  text, 
  speed = 50, // milliseconds per word
  onComplete = null,
  className = '',
  style = {},
  autoStart = true
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Split text into words for natural chunking
  const words = text.split(' ');

  useEffect(() => {
    if (isPaused || isComplete || currentIndex >= words.length) {
      return;
    }

    const timer = setTimeout(() => {
      const nextWord = words[currentIndex];
      setDisplayedText(prev => prev + (currentIndex === 0 ? nextWord : ' ' + nextWord));
      setCurrentIndex(prev => prev + 1);

      // Check if complete
      if (currentIndex + 1 >= words.length) {
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, isPaused, words, speed, onComplete, isComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
    setIsPaused(!autoStart);
  }, [text, autoStart]);

  // Cursor blinking effect
  useEffect(() => {
    if (isComplete) return;
    
    const blinkInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    
    return () => clearInterval(blinkInterval);
  }, [isComplete]);

  // Parse simple markdown for movie titles (*text*)
  const parseText = (text) => {
    // Replace *text* with styled spans for movie titles
    return text.replace(/\*([^*]+)\*/g, '<em style="font-style: italic; color: #374151;">$1</em>');
  };

  return (
    <div 
      className={className}
      style={{
        ...style,
        position: 'relative'
      }}
    >
      <div 
        dangerouslySetInnerHTML={{ 
          __html: parseText(displayedText) 
        }}
        style={{
          minHeight: '1.5em' // Prevent layout shift
        }}
      />
      {!isComplete && (
        <span 
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1.2em',
            backgroundColor: '#374151',
            marginLeft: '2px',
            opacity: cursorVisible ? 1 : 0,
            transition: 'opacity 0.1s ease'
          }}
        />
      )}
    </div>
  );
}

/**
 * Utility function to create chunks of text for progressive loading
 * Useful for longer responses that need to be streamed in sections
 */
export function createTextChunks(text, wordsPerChunk = 20) {
  const words = text.split(' ');
  const chunks = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  
  return chunks;
}

/**
 * Hook for managing typewriter effect with multiple chunks
 * Useful for streaming longer responses progressively
 */
export function useTypewriterChunks(chunks, chunkDelay = 1000) {
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleChunkComplete = () => {
    if (currentChunk + 1 < chunks.length) {
      setTimeout(() => {
        setCurrentChunk(prev => prev + 1);
      }, chunkDelay);
    } else {
      setIsComplete(true);
    }
  };

  const reset = () => {
    setCurrentChunk(0);
    setIsComplete(false);
  };

  return {
    currentChunk,
    currentText: chunks[currentChunk] || '',
    isComplete,
    handleChunkComplete,
    reset,
    totalChunks: chunks.length
  };
}

/**
 * StreamingTypewriter Component
 * 
 * Real-time typewriter that displays text as it streams from API
 * Much faster perceived performance than waiting for complete response
 */
export function StreamingTypewriter({ 
  streamingText = '',
  isComplete = false,
  className = '',
  style = {}
}) {
  const [cursorVisible, setCursorVisible] = useState(true);

  // Cursor blinking effect
  useEffect(() => {
    if (isComplete) return;
    
    const blinkInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    
    return () => clearInterval(blinkInterval);
  }, [isComplete]);

  // Parse simple markdown for movie titles (*text*)
  const parseText = (text) => {
    return text.replace(/\*([^*]+)\*/g, '<em style="font-style: italic; color: #374151;">$1</em>');
  };

  return (
    <div 
      className={className}
      style={{
        ...style,
        position: 'relative'
      }}
    >
      <div 
        dangerouslySetInnerHTML={{ 
          __html: parseText(streamingText) 
        }}
        style={{
          minHeight: '1.5em' // Prevent layout shift
        }}
      />
      {!isComplete && (
        <span 
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1.2em',
            backgroundColor: '#374151',
            marginLeft: '2px',
            opacity: cursorVisible ? 1 : 0,
            transition: 'opacity 0.1s ease'
          }}
        />
      )}
    </div>
  );
}