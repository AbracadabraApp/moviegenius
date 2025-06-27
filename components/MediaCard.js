/**
 * MediaCard Component - 🔒 LOCKED COMPONENT 🔒
 * 
 * ⚠️  CRITICAL: This component is used throughout the entire application.
 * ⚠️  Changes to this component can break multiple pages and features.
 * ⚠️  DO NOT MODIFY without approval and thorough testing.
 * ⚠️  See components/MediaCard.LOCK for change protocol.
 * 
 * Self-contained movie card with intelligent data fetching and caching.
 * Handles its own streaming data, slug enhancement, and favorites management.
 * Provides consistent functionality across all pages.
 * 
 * @component
 * @version STABLE-2025-06-06
 * @locked true
 * @example
 * <MediaCard 
 *   title="The Matrix" 
 *   year={1999} 
 *   initialSlug="Reality is a simulation" 
 *   initialPoster="/images/matrix.jpg" 
 * />
 */
import { Heart, Bookmark } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FavoritesManager } from './FavoritesManager';
import { getMediaCardCache } from '../lib/mediacard-cache.js';
import { getPerformanceMonitor } from '../lib/performance-monitor.js';
// import useStreamingData from '../hooks/useStreamingData'; // Stubbed out

// In-memory cache for TMDB poster requests to prevent excessive API calls
const posterCache = new Map();
const pendingRequests = new Map();

// Circuit breaker for streaming API to prevent runaway requests
const streamingCircuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  
  canMakeRequest() {
    if (!this.isOpen) return true;
    
    // Check if enough time has passed to retry
    if (Date.now() - this.lastFailureTime > this.resetTimeout) {
      this.isOpen = false;
      this.failures = 0;
      return true;
    }
    
    return false;
  },
  
  recordSuccess() {
    this.failures = 0;
    this.isOpen = false;
  },
  
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.isOpen = true;
      console.warn(`🚨 Streaming API circuit breaker OPEN - too many failures (${this.failures})`);
    }
  }
};

/**
 * MediaCard - Self-contained interactive movie card component
 * 
 * @param {Object} props
 * @param {string} props.title - Movie title (required)
 * @param {number} props.year - Release year (required)
 * @param {string} props.initialSlug - Initial slug/description (optional)
 * @param {string} props.initialPoster - Initial poster URL (optional)
 * @param {string} props.initialStreaming - Initial streaming text from Claude (optional)
 * @param {boolean} props.isDetailPage - Whether this is on a detail page (optional)
 * @param {number} props.tmdbId - TMDB ID for navigation (optional)
 */
export default function MediaCard({ 
  title, 
  year, 
  initialSlug, 
  initialPoster, 
  initialStreaming, 
  isDetailPage = false,
  tmdbId 
}) {
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [slug, setSlug] = useState(initialSlug || '');
  const [poster, setPoster] = useState(initialPoster || '/images/placeholder-poster.jpg');
  const [movieTmdbId, setMovieTmdbId] = useState(tmdbId);
  const [streamingText, setStreamingText] = useState(initialStreaming || '');

  // Update poster when initialPoster prop changes (navigation between movies)
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
    }
  }, [initialPoster]);

  // Update tmdbId when prop changes
  useEffect(() => {
    setMovieTmdbId(tmdbId);
  }, [tmdbId]);

  // Update slug when initialSlug prop changes
  useEffect(() => {
    if (initialSlug) {
      setSlug(initialSlug);
    }
  }, [initialSlug]);

  // Update streaming text when initialStreaming prop changes
  useEffect(() => {
    if (initialStreaming) {
      setStreamingText(initialStreaming);
    }
  }, [initialStreaming]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const router = useRouter();

  // Streaming feature stubbed out - will be replaced with real provider
  // const { 
  //   hasStreaming, 
  //   getDisplayText, 
  //   primaryService,
  //   freeOptions,
  //   isLoading: streamingLoading 
  // } = useStreamingData(title, year, initialStreaming);

  // Generate media ID from title and year
  const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
  
  // Movie data object for FavoritesManager
  const movieData = { title, year, slug, poster, id: mediaId };

  // 🚀 PERFORMANCE OPTIMIZED: Memoize enhancement trigger conditions
  const shouldEnhance = useMemo(() => {
    // 🔒 LOCKED: Check if slug is actually good (not URL-formatted or corrupted)
    // CRITICAL: Do not modify slug length limits or validation logic
    const isGoodSlug = slug && 
      slug.length <= 50 && // UPDATED: 50 chars for punchy taglines
      slug.length > 5 && 
      !slug.includes('-') && 
      slug !== slug.toLowerCase() &&
      !slug.includes('Plot:') && // FIXED: Reject TMDB plot summaries
      !slug.includes('Overview:') && // FIXED: Reject TMDB overviews
      !slug.includes('Synopsis:'); // FIXED: Reject TMDB synopses
    const hasGoodPoster = poster !== '/images/placeholder-poster.jpg';
    const hasStreamingData = streamingText && streamingText.length > 0;
    
    // Return true if enhancement is needed (slug, poster, or streaming)
    return !(isGoodSlug && hasGoodPoster && hasStreamingData) && !isEnhancing;
  }, [slug, poster, streamingText, isEnhancing]);

  // Enhanced data fetching for missing slug or poster with comprehensive caching
  useEffect(() => {
    const enhanceMovieData = async () => {
      // Skip if no enhancement needed
      if (!shouldEnhance) {
        return;
      }
      
      setIsEnhancing(true);
      const cache = getMediaCardCache();
      const monitor = getPerformanceMonitor();
      const startTime = Date.now();
      
      try {
        // First, check if we have complete cached data
        const cachedData = await cache.getMovieData(title, year);
        if (cachedData) {
          // Use all cached data if available
          if (cachedData.slug && (!slug || slug.length < 10)) {
            setSlug(cachedData.slug);
          }
          if (cachedData.poster && poster === '/images/placeholder-poster.jpg') {
            setPoster(cachedData.poster);
          }
          if (cachedData.streamingText && (!streamingText || streamingText.length === 0)) {
            setStreamingText(cachedData.streamingText);
          }
          if (cachedData.tmdb_id && !movieTmdbId) {
            setMovieTmdbId(cachedData.tmdb_id);
          }
          
          monitor.trackMetric('mediacard_cache_complete_hit', Date.now() - startTime, {
            title: title.substring(0, 30),
            year
          });
          
          setIsEnhancing(false);
          return;
        }
        
        let newSlug = slug;
        let newPoster = poster;
        let newStreamingText = streamingText;
        let newTmdbId = movieTmdbId;
        
        // 🔒 LOCKED: Fetch enhanced data if slug is missing or corrupted
        // CRITICAL: Only enhance truly missing slugs, not good ones
        // Note: slug quality check now handled in shouldEnhance memoization
        if (!slug || slug.length < 10) { // FIXED: Only enhance if truly missing
          // Check cache for enhancement data first
          const cachedEnhancement = await cache.getEnhancementData(title, year);
          if (cachedEnhancement && cachedEnhancement.slug) {
            newSlug = cachedEnhancement.slug;
            setSlug(cachedEnhancement.slug);
            console.log('✅ Used cached enhancement for:', title, year);
          } else {
            console.log('Fetching enhanced slug for:', title, year);
            const response = await fetch('/api/enhance-movie-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                title, 
                year, 
                needsSlug: true, 
                needsPoster: false,
                preferConcise: true // FIXED: Request concise slugs, not summaries
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              // FIXED: Only use enhanced slug if it's actually better and concise
              if (data.slug && data.slug.length <= 50 && !data.slug.includes('Plot:')) {
                newSlug = data.slug;
                setSlug(data.slug);
                
                // Cache the enhancement result
                await cache.cacheEnhancementData(title, year, { slug: data.slug });
              }
            }
          }
        }
        
        // Fetch TMDB poster if using placeholder (with comprehensive caching)
        if (poster === '/images/placeholder-poster.jpg') {
          // Check cache for poster data first
          const cachedPoster = await cache.getPosterData(title, year);
          if (cachedPoster) {
            if (cachedPoster.poster) {
              newPoster = cachedPoster.poster;
              setPoster(cachedPoster.poster);
            }
            if (cachedPoster.tmdb_id) {
              newTmdbId = cachedPoster.tmdb_id;
              setMovieTmdbId(cachedPoster.tmdb_id);
            }
            console.log('✅ Used cached poster for:', title, year);
          } else {
            const cacheKey = `${title}-${year}`;
            
            // Check if we already have this poster in memory cache
            if (posterCache.has(cacheKey)) {
              const cachedData = posterCache.get(cacheKey);
              if (cachedData.poster) {
                newPoster = cachedData.poster;
                setPoster(cachedData.poster);
              }
              if (cachedData.tmdb_id) {
                newTmdbId = cachedData.tmdb_id;
                setMovieTmdbId(cachedData.tmdb_id);
              }
            } else if (!pendingRequests.has(cacheKey)) {
              // Only make request if not already pending
              console.log('Fetching TMDB poster for:', title, year);
              const requestPromise = fetch('/api/tmdb-poster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, year })
              });
              
              pendingRequests.set(cacheKey, requestPromise);
              
              try {
                const response = await requestPromise;
                if (response.ok) {
                  const data = await response.json();
                  
                  // Cache the result in both memory and Redis
                  posterCache.set(cacheKey, data);
                  await cache.cachePosterData(title, year, data);
                  
                  if (data.poster) {
                    newPoster = data.poster;
                    setPoster(data.poster);
                  }
                  if (data.tmdb_id) {
                    newTmdbId = data.tmdb_id;
                    setMovieTmdbId(data.tmdb_id);
                  }
                }
              } catch (error) {
                console.error('TMDB poster fetch failed:', error);
              } finally {
                pendingRequests.delete(cacheKey);
              }
            }
          }
        }
        
        // Fetch streaming data if missing (TMDB primary, Claude fallback) with caching
        if (!streamingText || streamingText.length === 0) {
          // Check cache for streaming data first
          const cachedStreaming = await cache.getStreamingData(title, year);
          if (cachedStreaming && cachedStreaming.streamingText) {
            newStreamingText = cachedStreaming.streamingText;
            setStreamingText(cachedStreaming.streamingText);
            console.log('✅ Used cached streaming for:', title, year);
          } else if (!streamingCircuitBreaker.canMakeRequest()) {
            // Circuit breaker is open, fallback to TBD immediately
            console.warn('🚨 Streaming circuit breaker OPEN - using TBD fallback for:', title, year);
            newStreamingText = 'TBD';
            setStreamingText('TBD');
          } else {
            console.log('Fetching streaming info for:', title, year);
            try {
              // Add timeout and abort controller
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
              
              const streamingResponse = await fetch('/api/tmdb-streaming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  title, 
                  year, 
                  tmdb_id: newTmdbId || movieTmdbId // Use updated TMDB ID
                }),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (streamingResponse.ok) {
                const streamingData = await streamingResponse.json();
                if (streamingData.streamingText) {
                  newStreamingText = streamingData.streamingText;
                  setStreamingText(streamingData.streamingText);
                  
                  // Cache the streaming result
                  await cache.cacheStreamingData(title, year, streamingData);
                  
                  // Record success for circuit breaker
                  streamingCircuitBreaker.recordSuccess();
                  
                  console.log(`✅ Streaming data from ${streamingData.source}: ${title} (${year})`);
                } else {
                  // No streaming text received, fallback to TBD
                  newStreamingText = 'TBD';
                  setStreamingText('TBD');
                  streamingCircuitBreaker.recordFailure();
                }
              } else {
                // API call failed, fallback to TBD
                console.warn(`Streaming API failed with status ${streamingResponse.status} for:`, title, year);
                newStreamingText = 'TBD';
                setStreamingText('TBD');
                streamingCircuitBreaker.recordFailure();
              }
            } catch (streamingError) {
              console.warn('Failed to fetch streaming info:', streamingError);
              // Fallback to TBD on any error (timeout, network, etc.)
              newStreamingText = 'TBD';
              setStreamingText('TBD');
              streamingCircuitBreaker.recordFailure();
            }
          }
        }
        
        // Cache the complete movie data if we got new data
        const hasNewData = (newSlug !== slug && newSlug) || 
                          (newPoster !== poster && newPoster !== '/images/placeholder-poster.jpg') || 
                          (newStreamingText !== streamingText && newStreamingText) ||
                          (newTmdbId !== movieTmdbId && newTmdbId);
        
        if (hasNewData) {
          try {
            // Cache to our comprehensive system
            await cache.cacheMovieData(title, year, {
              slug: newSlug || slug,
              poster: newPoster || poster,
              streamingText: newStreamingText || streamingText,
              tmdb_id: newTmdbId || movieTmdbId
            });
            
            // Also cache to legacy JSON system for backward compatibility
            await fetch('/api/cache-movie-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                title, 
                year, 
                slug: newSlug, 
                poster: newPoster,
                streaming: newStreamingText,
                dataSource: 'afi100' // For now, assume AFI100. Could be made dynamic.
              })
            });
            
            // Track performance improvement
            monitor.trackMetric('mediacard_enhancement_complete', Date.now() - startTime, {
              title: title.substring(0, 30),
              year,
              cached_slug: !!newSlug,
              cached_poster: !!newPoster,
              cached_streaming: !!newStreamingText,
              cached_tmdb_id: !!newTmdbId
            });
            
            console.log('✅ Cached comprehensive movie data for:', title, year);
          } catch (cacheError) {
            console.warn('Failed to cache enhanced data:', cacheError);
            // Don't fail the whole operation if caching fails
          }
        }
        
      } catch (error) {
        console.error('Error enhancing movie data:', error);
      } finally {
        setIsEnhancing(false);
      }
    };
    
    enhanceMovieData();
  }, [title, year, shouldEnhance]); // 🚀 OPTIMIZED: Reduced dependency array by 60%

  // Load initial state from localStorage
  useEffect(() => {
    setHearted(FavoritesManager.isMovieHearted(mediaId));
    setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
  }, [mediaId]);

  // Listen for favorites updates from other components
  useEffect(() => {
    const handleMoviesUpdate = () => {
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
    };

    window.addEventListener('moviesUpdated', handleMoviesUpdate);
    return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
  }, [mediaId]);

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons or if this is a detail page
    if (e.target.closest('button') || isDetailPage) return;
    
    // Immediate navigation without preventDefault - let browser handle naturally
    if (movieTmdbId) {
      router.push(`/movie/${movieTmdbId}`);
    } else {
      console.warn('MediaCard: Missing TMDB ID, using fallback navigation for:', title, year);
      // Fallback to media page using title-year format
      const fallbackId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
      router.push(`/media/${fallbackId}`);
    }
  };

  return (
    <article
      style={styles.card}
      role="article"
      onClick={handleCardClick}
      onMouseDown={(e) => {
        // Immediate visual feedback on click
        e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.30)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.20)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={styles.posterContainer}>
        <Image
          src={poster}
          alt={`Poster for ${title}`}
          width={100}
          height={150}
          style={styles.poster}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XqoC0WAk0eO0ZJZjMN8CvfaQhCEKdlOqmFCKNL5SqbTcLiWJKMpXa0Qk5WkGOyqmJN9V4ZDJ1ioqWk+RJ/BCHZTZV5FqPE="
          sizes="100px"
        />
      </div>
      <div style={styles.textContainer}>
        <div style={styles.header}>
          <div style={styles.title}>{title}</div>
        </div>
        <div style={styles.year}>({year})</div>
        <div style={styles.slug}>{slug}</div>
        
        {/* Bottom row: streaming left, icons right */}
        <div style={styles.bottomRow}>
          <div style={styles.streamingInfo}>
            {streamingText && (
              <span style={styles.streamingText}>
                Streaming on {streamingText}
              </span>
            )}
          </div>
          <div style={styles.iconRow}>
          <button
            onClick={() => {
              const newState = FavoritesManager.toggleHeart(movieData);
              setHearted(newState);
            }}
            style={styles.iconButton}
            aria-label={hearted ? 'Remove from favorites' : 'Add to favorites'}
            role="button"
          >
            <Heart
              size={18}
              color={hearted ? '#ef4444' : '#374151'}
              fill={hearted ? '#ef4444' : 'none'}
            />
          </button>
          <button
            onClick={() => {
              const newState = FavoritesManager.toggleBookmark(movieData);
              setBookmarked(newState);
            }}
            style={styles.iconButton}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark movie'}
            role="button"
          >
            <Bookmark
              size={18}
              color={bookmarked ? '#6b7280' : '#374151'}
              fill={bookmarked ? '#6b7280' : 'none'}
            />
          </button>
          </div>
        </div>
      </div>
    </article>
  );
}

const styles = {
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.20)',
    padding: '12px',
    backgroundColor: 'white',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '100%', // Prevent expansion beyond container
    boxSizing: 'border-box', // Include padding in width calculation
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
    cursor: 'pointer',
    marginBottom: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  posterContainer: {
    position: 'relative',
    width: '100px',
    height: '150px',
    borderRadius: '8px',
    marginRight: '12px',
    overflow: 'hidden',
  },
  poster: {
    objectFit: 'cover',
    borderRadius: '8px',
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '150px', // Restored original working height
    position: 'relative',
    minWidth: 0, // Allow flex child to shrink below content size
    overflow: 'hidden', // Prevent text overflow
  },
  header: {
    fontSize: '18px',
    lineHeight: '1.2',
    fontFamily: 'inherit',
  },
  title: {
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
  },
  year: {
    fontSize: '14px',
    color: '#999',
    fontWeight: '300',
    fontFamily: 'inherit',
    marginTop: '2px',
    marginBottom: '4px',
  },
  slug: {
    fontSize: '14px',
    color: '#333',
    marginTop: '2px', // 🔒 FIXED: Reduced from 4px to 2px for tighter spacing
    fontFamily: 'inherit',
    lineHeight: '1.3', // 🔒 FIXED: Added consistent line height
    marginBottom: '2px', // 🔒 FIXED: Added bottom margin for consistent spacing
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto', // Pushes to bottom of flex container
    paddingTop: '8px',
  },
  streamingInfo: {
    flex: 1,
    minWidth: 0, // Allow shrinking
    marginRight: '8px', // Space before icons
  },
  streamingText: {
    fontSize: '14px',
    color: '#6b7280', // Mid grey
    fontWeight: '300', // 100 lighter than slug's normal (400)
    fontFamily: 'inherit',
    wordWrap: 'break-word', // Wrap long service names
    lineHeight: '1.3',
    // Enhanced text wrapping for prettier line breaks
    textWrap: 'pretty', // CSS feature for prettier text wrapping
    overflowWrap: 'break-word', // Break long words when necessary
    hyphens: 'auto', // Enables hyphenation for better breaks
    WebkitHyphens: 'auto', // Safari support
    MozHyphens: 'auto', // Firefox support
    wordBreak: 'keep-all', // Prevents awkward mid-word breaks
  },
  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'center',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
};
