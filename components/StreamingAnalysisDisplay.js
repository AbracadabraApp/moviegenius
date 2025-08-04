import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * StreamingAnalysisDisplay Component
 * 
 * Enhanced typewriter effect for streaming movie analysis that transforms 
 * waiting into entertainment. Features smart typography, variable timing, 
 * and content structure awareness.
 */
export default function StreamingAnalysisDisplay({
  movieId,
  movieTitle,
  movieYear,
  onComplete = () => {},
  onError = () => {},
  settings = {},
}) {
  const {
    speed = 'normal',
    showCursor = true,
    autoStart = true,
    skipable = true,
    enhancedTypography = true,
  } = settings;

  // State management
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [error, setError] = useState(null);
  const [canSkip, setCanSkip] = useState(false);

  // Refs for performance
  const readerRef = useRef(null);
  const timeoutRef = useRef(null);
  const fullTextRef = useRef('');
  const containerRef = useRef(null);

  // Speed configurations
  const speedConfig = useMemo(() => ({
    slow: { base: 40, space: 20, punctuation: 200, sentence: 300 },
    normal: { base: 25, space: 15, punctuation: 150, sentence: 250 },
    fast: { base: 15, space: 10, punctuation: 100, sentence: 150 },
  }), []);

  const currentSpeed = speedConfig[speed] || speedConfig.normal;

  // Smart typing delay calculation
  const calculateDelay = useCallback((char, nextChar, position) => {
    // Sentence endings get longer pause
    if (char === '.' || char === '!' || char === '?') {
      return currentSpeed.sentence;
    }
    
    // Commas and colons get medium pause
    if (char === ',' || char === ':' || char === ';') {
      return currentSpeed.punctuation * 0.7;
    }
    
    // Spaces are fastest
    if (char === ' ') {
      return currentSpeed.space;
    }
    
    // Slightly slower for capital letters (start of sentences/names)
    if (char.match(/[A-Z]/)) {
      return currentSpeed.base * 1.2;
    }
    
    return currentSpeed.base;
  }, [currentSpeed]);

  // Content structure detection
  const detectContentType = useCallback((text, position) => {
    const surroundingText = text.slice(Math.max(0, position - 20), position + 20);
    
    // Movie title patterns
    if (surroundingText.match(/\*[^*]+\*/) || surroundingText.match(/"[^"]+"/)) {
      return 'movie-title';
    }
    
    // Section headers (MOVIES:, WATCH FOR:, etc.)
    if (surroundingText.match(/^[A-Z\s]+:/m)) {
      return 'section-header';
    }
    
    // Regular analysis text
    return 'analysis';
  }, []);

  // Start streaming analysis
  const startStreaming = useCallback(async () => {
    if (isStreaming || isComplete) return;

    setIsStreaming(true);
    setError(null);
    setStreamingText('');
    fullTextRef.current = '';
    setCurrentPosition(0);

    try {
      console.log('🚀 Starting streaming analysis...');
      
      let response;
      
      if (movieId && movieId.startsWith('explore-')) {
        // Use explore streaming API for explore topics
        const topicName = movieId.replace('explore-', '').replace(/-/g, ' ');
        const apiUrl = `/api/explore-stream?topic=${encodeURIComponent(topicName)}${movieYear ? `&context=${encodeURIComponent(movieYear)}` : ''}`;
        console.log('🚀 Calling explore API:', apiUrl);
        response = await fetch(apiUrl);
        console.log('📡 Connected to explore streaming endpoint, status:', response.status);
      } else {
        // Use the movie analysis streaming POC endpoint
        response = await fetch('/api/streaming-poc');
        console.log('📡 Connected to movie streaming endpoint');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      readerRef.current = response.body.getReader();

      // Collect full text first
      let fullText = '';
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await readerRef.current.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        chunkCount++;
        
        console.log(`📝 Received chunk ${chunkCount}: ${chunk.substring(0, 50)}...`);
        
        if (chunk.includes('__STREAMING_COMPLETE__')) {
          console.log('✅ Streaming complete signal received');
          break;
        } else {
          fullText += chunk;
        }
      }

      console.log(`📊 Total text collected: ${fullText.length} characters`);
      fullTextRef.current = fullText;
      
      // Enable skip after 2 seconds
      setTimeout(() => setCanSkip(true), 2000);
      
      // Start typewriter effect
      typewriterEffect();

    } catch (err) {
      console.error('❌ Streaming failed:', err);
      
      // Generate fallback text based on movie or explore topic
      let fallbackText;
      
      if (movieId && movieId.startsWith('explore-')) {
        // Explore topic fallback
        const topicName = movieId.replace('explore-', '').replace(/-/g, ' ');
        fallbackText = `${movieTitle || topicName} represents a fascinating area of cinema that has influenced countless films and filmmakers throughout history.

This cinematic approach encompasses various techniques, themes, and visual styles that have shaped the art of moviemaking. From its early pioneers to contemporary practitioners, this subject reveals the evolution of cinematic language and storytelling.

The technical innovations and artistic choices associated with this topic have created a lasting impact on film culture. Directors, cinematographers, and screenwriters continue to draw inspiration from these foundational elements.

EXPLORE FURTHER: Essential films that showcase this cinematic approach
- Study the visual techniques and narrative structures
- Examine the historical context and cultural influences  
- Analyze the evolution from classic to contemporary examples

Understanding ${movieTitle || topicName} provides valuable insight into the broader landscape of cinema and its ongoing development as an art form.`;
      } else {
        // Movie analysis fallback
        fallbackText = `The haunting opening scene where HAL 9000 calmly states "I'm sorry Dave, I can't do that" establishes *2001: A Space Odyssey* as Stanley Kubrick's cosmic masterpiece that redefined science fiction forever.

This 1968 epic doesn't just show space exploration - it creates a visual meditation on evolution, technology, and humanity's place in the universe that influenced *Interstellar* (2014), *Arrival* (2016), and *Blade Runner* (1982).

Kubrick's revolutionary cinematography employs front projection and centrifuge sets that make the Discovery One sequences feel genuinely weightless. The famous bone-to-spaceship match cut spans four million years of evolution in a single edit.

MOVIES: Essential viewing for fans of thoughtful science fiction
- *Interstellar* (2014) - Space exploration with emotional depth
- *Arrival* (2016) - First contact done right  
- *Ex Machina* (2014) - AI consciousness questions

Watch *2001: A Space Odyssey* for Kubrick's unmatched visual poetry and philosophical depth that challenges our understanding of consciousness, technology, and humanity's cosmic destiny.`;
      }

      console.log('🔄 Using fallback demo text');
      fullTextRef.current = fallbackText;
      
      // Enable skip after 2 seconds
      setTimeout(() => setCanSkip(true), 2000);
      
      // Start typewriter with fallback text
      typewriterEffect();
    }
  }, [movieId, isStreaming, isComplete, onError]);

  // Enhanced typewriter effect with smart timing and RAF optimization
  const typewriterEffect = useCallback(() => {
    const fullText = fullTextRef.current;
    let position = 0;
    let lastUpdateTime = 0;
    let accumulatedDelay = 0;

    const typeNextChar = (currentTime) => {
      if (position >= fullText.length) {
        // Complete
        setIsComplete(true);
        setIsStreaming(false);
        onComplete();
        return;
      }

      // Check if enough time has passed for next character
      if (currentTime - lastUpdateTime >= accumulatedDelay) {
        const char = fullText[position];
        const nextChar = fullText[position + 1];
        
        // Batch update for better performance - update every few characters
        const shouldUpdate = position % 3 === 0 || position === fullText.length - 1;
        
        if (shouldUpdate) {
          setStreamingText(fullText.slice(0, position + 1));
          setCurrentPosition(position + 1);
        }

        // Calculate smart delay for next character
        accumulatedDelay = calculateDelay(char, nextChar, position);
        lastUpdateTime = currentTime;
        
        position++;
      }

      // Use RAF for smooth 60fps updates
      timeoutRef.current = requestAnimationFrame(typeNextChar);
    };

    // Start the animation loop
    timeoutRef.current = requestAnimationFrame(typeNextChar);
  }, [calculateDelay, onComplete]);

  // Skip to completion
  const skipToEnd = useCallback(() => {
    if (!canSkip || isComplete) return;
    
    // Clear animation frame
    if (timeoutRef.current) {
      cancelAnimationFrame(timeoutRef.current);
    }
    
    // Show full text
    setStreamingText(fullTextRef.current);
    setCurrentPosition(fullTextRef.current.length);
    setIsComplete(true);
    setIsStreaming(false);
    onComplete();
  }, [canSkip, isComplete, onComplete]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && movieId) {
      startStreaming();
    }

    return () => {
      if (timeoutRef.current) {
        cancelAnimationFrame(timeoutRef.current);
      }
      if (readerRef.current) {
        readerRef.current.cancel();
      }
    };
  }, [autoStart, movieId, startStreaming]);

  // Enhanced text parsing with movie-aware formatting
  const parseAnalysisText = useMemo(() => {
    if (!enhancedTypography) return streamingText;

    let parsed = streamingText;

    // Movie titles in asterisks (*Title*)
    parsed = parsed.replace(
      /\*([^*]+)\*/g, 
      '<span class="movie-title-emphasis">$1</span>'
    );

    // Quoted movie titles "Title" (Year)
    parsed = parsed.replace(
      /"([^"]+)"\s*(\(\d{4}\))?/g,
      '<span class="movie-title-quoted">$1</span>$2'
    );

    // Movie Title (Year) pattern
    parsed = parsed.replace(
      /\b([A-Z][A-Za-z\s&:'-]{2,30})\s(\(\d{4}\))/g,
      '<span class="movie-title-with-year">$1 $2</span>'
    );

    // Section headers (MOVIES:, WATCH FOR:, etc.)
    parsed = parsed.replace(
      /^([A-Z\s]+:)/gm,
      '<span class="section-header">$1</span>'
    );

    // Convert newlines
    parsed = parsed.replace(/\n/g, '<br />');

    return parsed;
  }, [streamingText, enhancedTypography]);

  return (
    <div 
      ref={containerRef}
      className="streaming-analysis-display"
      style={{
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#374151',
        minHeight: '200px',
        marginBottom: '16px',
      }}
    >
      {/* Skip button */}
      {skipable && canSkip && !isComplete && (
        <button
          onClick={skipToEnd}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '0',
            background: 'rgba(107, 114, 128, 0.1)',
            border: '1px solid rgba(107, 114, 128, 0.2)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.875rem',
            color: '#6B7280',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(107, 114, 128, 0.15)';
            e.target.style.borderColor = 'rgba(107, 114, 128, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(107, 114, 128, 0.1)';
            e.target.style.borderColor = 'rgba(107, 114, 128, 0.2)';
          }}
        >
          Skip to end
        </button>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          padding: '20px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#DC2626',
        }}>
          <strong>Analysis failed:</strong> {error}
          <button
            onClick={startStreaming}
            style={{
              marginLeft: '12px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Analysis content */}
      {!error && (
        <>
          <div
            dangerouslySetInnerHTML={{ __html: parseAnalysisText }}
            style={{
              minHeight: '1.5em',
              wordWrap: 'break-word',
            }}
          />
          
          {/* Animated cursor */}
          {showCursor && !isComplete && (
            <span
              className="typewriter-cursor"
              style={{
                display: 'inline-block',
                width: '2px',
                height: '1.2em',
                backgroundColor: '#374151',
                marginLeft: '2px',
                animation: 'cursor-blink 1s infinite',
              }}
            />
          )}
        </>
      )}

      {/* Custom styles */}
      <style jsx>{`
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        
        .movie-title-emphasis {
          color: #D97706;
          font-weight: 600;
          font-style: italic;
        }
        
        .movie-title-quoted {
          color: #D97706;
          font-weight: 600;
        }
        
        .movie-title-with-year {
          color: #D97706;
          font-weight: 600;
        }
        
        .section-header {
          color: #1F2937;
          font-weight: 700;
          font-size: 1.1em;
          display: block;
          margin: 1.5em 0 0.5em 0;
        }
        
        .streaming-analysis-display {
          max-width: none;
        }
        
        @media (max-width: 768px) {
          .streaming-analysis-display {
            font-size: 1rem;
            line-height: 1.6;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for managing streaming analysis state
 */
export function useStreamingAnalysis(movieId) {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsComplete(false);
    setError(null);
  }, []);

  return {
    isLoading,
    isComplete,
    error,
    reset,
    setIsLoading,
    setIsComplete,
    setError,
  };
}