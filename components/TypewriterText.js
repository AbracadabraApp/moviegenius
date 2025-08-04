// components/TypewriterText.js
import { useState, useEffect, useMemo, memo } from 'react';

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
function TypewriterText({
  text,
  speed = 50, // milliseconds per word
  onComplete = null,
  className = '',
  style = {},
  autoStart = true,
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Memoize words splitting for performance
  const words = useMemo(() => text.split(' '), [text]);

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

  // Memoize parseText function for performance
  const parseText = useMemo(
    () => text => {
      // Replace *Movie Title* with gold-highlighted movie titles (clickable)
      let parsed = text.replace(/\*([^*]+)\*/g, '<span class="movie-title-italic">$1</span>');

      // Replace "Movie Title" with gold-highlighted quoted titles (clickable)
      parsed = parsed.replace(
        /"([^"]+)"(?=\s*\(\d{4}\)|\s|[.,!?]|$)/g,
        '<span class="movie-title-quoted">$1</span>'
      );

      // Replace Movie Title (1987) pattern with gold-highlighted titles (clickable)
      // Matches: Capital Case Title (4-digit year) - common in movie page content
      parsed = parsed.replace(
        /\b([A-Z][A-Za-z\s&:'-]+?)(\s\(\d{4}\))/g,
        '<span class="movie-title-with-year">$1$2</span>'
      );

      // Conservative pattern for standalone movie titles (common movie naming patterns)
      // Only matches very specific patterns to avoid false positives
      parsed = parsed.replace(
        /\b(The [A-Z][A-Za-z\s]{3,25}|[A-Z][A-Za-z\s]{2,25}(?:\s(?:Club|Matrix|Wars|Story|Movie|Film)))(?=\s|[.,!?]|$)/g,
        '<span class="movie-title-with-year">$1</span>'
      );

      // Convert newlines to HTML line breaks for scannable formatting
      parsed = parsed.replace(/\n/g, '<br />');
      return parsed;
    },
    []
  );

  return (
    <div
      className={className}
      style={{
        ...style,
        position: 'relative',
      }}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: parseText(displayedText),
        }}
        style={{
          minHeight: '1.5em', // Prevent layout shift
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
            transition: 'opacity 0.1s ease',
          }}
        />
      )}
    </div>
  );
}

// Memoized TypewriterText with custom comparison
const TypewriterTextMemo = memo(TypewriterText, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.speed === nextProps.speed &&
    prevProps.autoStart === nextProps.autoStart &&
    prevProps.className === nextProps.className &&
    prevProps.onComplete === nextProps.onComplete
  );
});

export default TypewriterTextMemo;

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
    totalChunks: chunks.length,
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
  style = {},
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

  // Memoize parseText function for performance
  const parseText = useMemo(
    () => text => {
      // Replace *Movie Title* with gold-highlighted movie titles (clickable)
      let parsed = text.replace(/\*([^*]+)\*/g, '<span class="movie-title-italic">$1</span>');

      // Replace "Movie Title" with gold-highlighted quoted titles (clickable)
      parsed = parsed.replace(
        /"([^"]+)"(?=\s*\(\d{4}\)|\s|[.,!?]|$)/g,
        '<span class="movie-title-quoted">$1</span>'
      );

      // Replace Movie Title (1987) pattern with gold-highlighted titles (clickable)
      // Matches: Capital Case Title (4-digit year) - common in movie page content
      parsed = parsed.replace(
        /\b([A-Z][A-Za-z\s&:'-]+?)(\s\(\d{4}\))/g,
        '<span class="movie-title-with-year">$1$2</span>'
      );

      // Conservative pattern for standalone movie titles (common movie naming patterns)
      // Only matches very specific patterns to avoid false positives
      parsed = parsed.replace(
        /\b(The [A-Z][A-Za-z\s]{3,25}|[A-Z][A-Za-z\s]{2,25}(?:\s(?:Club|Matrix|Wars|Story|Movie|Film)))(?=\s|[.,!?]|$)/g,
        '<span class="movie-title-with-year">$1</span>'
      );

      // Convert newlines to HTML line breaks for scannable formatting
      parsed = parsed.replace(/\n/g, '<br />');
      return parsed;
    },
    []
  );

  return (
    <div
      className={className}
      style={{
        ...style,
        position: 'relative',
      }}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: parseText(streamingText),
        }}
        style={{
          minHeight: '1.5em', // Prevent layout shift
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
            transition: 'opacity 0.1s ease',
          }}
        />
      )}
    </div>
  );
}

// Memoized StreamingTypewriter
export const StreamingTypewriterMemo = memo(StreamingTypewriter, (prevProps, nextProps) => {
  return (
    prevProps.streamingText === nextProps.streamingText &&
    prevProps.isComplete === nextProps.isComplete &&
    prevProps.className === nextProps.className
  );
});
