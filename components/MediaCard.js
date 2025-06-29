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
import { useState, useEffect, useMemo, memo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FavoritesManager } from './FavoritesManager';
import { getMediaCardCache } from '../lib/mediacard-cache.js';
import { getPerformanceMonitor } from '../lib/performance-monitor.js';
// import useStreamingData from '../hooks/useStreamingData'; // Stubbed out

// Organic slug generation - only for viewed movies
const organicSlugCache = new Map();
const generateOrganicSlug = async (title, year) => {
  const cacheKey = `${title}-${year}`;
  
  // Check if already generating or generated
  if (organicSlugCache.has(cacheKey)) {
    return organicSlugCache.get(cacheKey);
  }
  
  // Set generating flag
  organicSlugCache.set(cacheKey, null);
  
  try {
    const response = await fetch('/api/generate-organic-slug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, year })
    });
    
    if (response.ok) {
      const data = await response.json();
      const slug = data.slug;
      
      // Cache the result
      organicSlugCache.set(cacheKey, slug);
      
      return slug;
    }
  } catch (error) {
    console.warn('Organic slug generation failed:', error);
  }
  
  // Remove from cache if failed
  organicSlugCache.delete(cacheKey);
  return null;
};

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
function MediaCard({ 
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
  
  // Progressive loading states
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Progressive loading: Show content after a brief delay to allow images to load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 200); // Give 200ms for initial image loading
    
    return () => clearTimeout(timer);
  }, []);

  // Update poster when initialPoster prop changes (navigation between movies)
  useEffect(() => {
    if (initialPoster) {
      setPoster(initialPoster);
      setIsImageLoaded(false); // Reset loading state for new poster
      setIsImageError(false);
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
      slug.length <= 50 && // SHORT SLUGS: 50 chars for punchy taglines
      slug.length > 5 && 
      !slug.includes('Plot:') && // FIXED: Reject TMDB plot summaries
      !slug.includes('Overview:') && // FIXED: Reject TMDB overviews
      !slug.includes('Synopsis:'); // FIXED: Reject TMDB synopses
    const hasGoodPoster = poster !== '/images/placeholder-poster.jpg';
    const hasStreamingData = streamingText && streamingText.length > 0;
    
    // Return true if enhancement is needed (poster or streaming only - NOT slug)
    // NEW RULE: No slug enhancement. Show nothing if no good Claude slug.
    // NUCLEAR-OPTIMIZED: Allow poster enhancement even when streaming exists
    return (!hasGoodPoster || !hasStreamingData) && !isEnhancing;
  }, [slug, poster, streamingText, isEnhancing]);

  // Enhanced data fetching for missing slug or poster with comprehensive caching
  useEffect(() => {
    const enhanceMovieData = async () => {
      // Skip if no enhancement needed
      if (!shouldEnhance) {
        return;
      }
      
      // NUCLEAR OPTIMIZATION: Skip enhancement if we have high-quality nuclear data
      if (poster !== '/images/placeholder-poster.jpg' && 
          poster.includes('image.tmdb.org') && 
          streamingText && 
          streamingText.length > 0 &&
          slug && 
          slug.length > 10) {
        // This is likely a nuclear page with complete data - skip enhancement
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
        
        // ORGANIC SLUG STRATEGY: Generate good slugs on-demand for viewed movies
        // If no good slug exists, generate one organically when the MediaCard is viewed
        const needsSlugGeneration = !slug || 
          slug.length > 50 || 
          slug.length < 5 ||
          slug.includes('Plot:') || 
          slug.includes('Overview:') || 
          slug.includes('Synopsis:');
        
        if (needsSlugGeneration && !isEnhancing) {
          // Generate organic slug for this viewed movie
          generateOrganicSlug(title, year).then(newSlug => {
            if (newSlug) {
              setSlug(newSlug);
            }
          }).catch(console.error);
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
            // Used cached poster data
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
              // Fetching TMDB poster
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
        
        // Fetch streaming data if missing using TMDB Bulk API (more reliable)
        if (!streamingText || streamingText.length === 0) {
          // Check cache for streaming data first
          const cachedStreaming = await cache.getStreamingData(title, year);
          if (cachedStreaming && cachedStreaming.streamingText) {
            newStreamingText = cachedStreaming.streamingText;
            setStreamingText(cachedStreaming.streamingText);
            // Used cached streaming data
          } else if (!streamingCircuitBreaker.canMakeRequest()) {
            // Circuit breaker is open, don't set streaming info
            console.warn('🚨 Streaming circuit breaker OPEN - no streaming info for:', title, year);
            newStreamingText = '';
            setStreamingText('');
          } else {
            // Use TMDB Bulk API for more reliable streaming data
            try {
              // Only fetch streaming if we have a TMDB ID
              if (newTmdbId || movieTmdbId) {
                const tmdbId = newTmdbId || movieTmdbId;
                
                const bulkResponse = await fetch('/api/tmdb-bulk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    requests: [{
                      id: 'streaming',
                      type: 'movie_streaming',
                      params: { tmdb_id: tmdbId }
                    }]
                  })
                });
                
                if (bulkResponse.ok) {
                  const bulkData = await bulkResponse.json();
                  const streamingResult = bulkData.results?.[0];
                  
                  if (streamingResult?.success && streamingResult.data?.streamingText) {
                    newStreamingText = streamingResult.data.streamingText;
                    setStreamingText(streamingResult.data.streamingText);
                    
                    // Cache the streaming result
                    await cache.cacheStreamingData(title, year, {
                      streamingText: streamingResult.data.streamingText
                    });
                    
                    streamingCircuitBreaker.recordSuccess();
                  } else {
                    newStreamingText = '';
                    setStreamingText('');
                  }
                } else {
                  newStreamingText = '';
                  setStreamingText('');
                  streamingCircuitBreaker.recordFailure();
                }
              } else {
                // No TMDB ID available, no streaming info
                newStreamingText = '';
                setStreamingText('');
              }
            } catch (streamingError) {
              console.warn('Failed to fetch streaming info via bulk API:', streamingError);
              newStreamingText = '';
              setStreamingText('');
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
            
            // Cached comprehensive movie data
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

  // Debug logging after all hooks
  console.log('🎬 MediaCard rendering:', { title, year, tmdbId, hasSlug: !!initialSlug });
  
  // Warn if no TMDB ID but still render with limited functionality
  if (!tmdbId) {
    console.warn('MediaCard: No TMDB ID provided for movie:', title, year, '- rendering with limited functionality');
  }

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons or if this is a detail page
    if (e.target.closest('button') || isDetailPage) return;
    
    // Prevent event bubbling that might interfere with navigation
    e.stopPropagation();
    
    // Debug logging
    console.log('MediaCard clicked:', title, year, 'TMDB ID:', movieTmdbId);
    
    // Navigate to movie page - prefer TMDB ID, fallback to search
    if (movieTmdbId) {
      const movieUrl = `/movie/${movieTmdbId}`;
      console.log('Navigating to:', movieUrl);
      router.push(movieUrl);
    } else {
      console.warn('MediaCard: Missing TMDB ID, using search fallback:', title, year);
      
      // Fallback: Use search route to discover the movie
      if (title && year) {
        const searchQuery = encodeURIComponent(`${title} ${year}`);
        const searchUrl = `/movie/search?q=${searchQuery}`;
        console.log('Navigating to search:', searchUrl);
        router.push(searchUrl);
      } else {
        console.error('MediaCard: Cannot navigate - missing title or year:', { title, year });
      }
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
        {showContent && (
          <Image
            src={poster}
            alt={`Poster for ${title}`}
            width={100}
            height={150}
            style={{
              ...styles.poster,
              opacity: isImageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8A0XqoC0WAk0eO0ZJZjMN8CvfaQhCEKdlOqmFCKNL5SqbTcLiWJKMpXa0Qk5WkGOyqmJN9V4ZDJ1ioqWk+RJ/BCHZTZV5FqPE="
            sizes="100px"
            onLoad={() => {
              setIsImageLoaded(true);
              setIsImageError(false);
            }}
            onError={() => {
              setIsImageError(true);
              setIsImageLoaded(false);
            }}
            priority={false} // Don't prioritize poster images for better performance
          />
        )}
        
        {/* Loading placeholder that shows until image loads */}
        {showContent && !isImageLoaded && !isImageError && (
          <div style={styles.posterPlaceholder}>
            <div style={styles.posterLoadingText}>Loading...</div>
          </div>
        )}
        
        {/* Error fallback */}
        {isImageError && (
          <div style={styles.posterPlaceholder}>
            <div style={styles.posterErrorText}>📷</div>
          </div>
        )}
        
        {/* Initial loading state (first 200ms) */}
        {!showContent && (
          <div style={styles.posterPlaceholder}>
            <div style={styles.posterLoadingText}>•••</div>
          </div>
        )}
      </div>
      <div style={styles.textContainer}>
        <div style={styles.contentTop}>
          <div style={styles.titleRow}>
            <div style={styles.title}>{title}</div>
            <div style={styles.year}>({year})</div>
          </div>
          <div style={styles.slug}>
            {/* Only show quality slugs - filter out long ones that cause ellipses */}
            {slug && slug.length <= 50 && slug.length > 5 && 
             !slug.includes('Plot:') && !slug.includes('Overview:') && !slug.includes('Synopsis:') 
             ? slug : ''}
          </div>
        </div>
        <div style={styles.contentBottom}>
          <div style={styles.streamingInfo}>
            {/* Only show streaming if we have valid data (not TBD placeholder) */}
            {streamingText && streamingText.length > 0 && streamingText !== 'TBD' && (
              <span style={styles.streamingText}>
                {`Streaming on ${streamingText}`}
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
                size={20}
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
                size={20}
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

// Memoized MediaCard with intelligent prop comparison
const MediaCardMemo = memo(MediaCard, (prevProps, nextProps) => {
  // Compare essential props that affect rendering
  return (
    prevProps.title === nextProps.title &&
    prevProps.year === nextProps.year &&
    prevProps.initialSlug === nextProps.initialSlug &&
    prevProps.initialPoster === nextProps.initialPoster &&
    prevProps.initialStreaming === nextProps.initialStreaming &&
    prevProps.isDetailPage === nextProps.isDetailPage &&
    prevProps.tmdbId === nextProps.tmdbId
  );
});

const styles = {
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.20)',
    padding: '16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb', // Debug border to see card boundaries
    width: '100%',
    minHeight: '160px', // Original working height (flexible)
    boxSizing: 'border-box',
    transition: 'box-shadow 0.15s ease, transform 0.1s ease',
    cursor: 'pointer',
    marginBottom: '12px',
    alignItems: 'flex-start',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  posterContainer: {
    position: 'relative',
    width: '100px', // Original poster width
    height: '150px', // Original poster height
    minWidth: '100px',
    flexShrink: 0,
    borderRadius: '8px',
    marginRight: '12px',
    overflow: 'hidden',
  },
  poster: {
    objectFit: 'cover',
    borderRadius: '8px',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  posterLoadingText: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  posterErrorText: {
    fontSize: '24px',
    opacity: 0.5,
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '150px', // Use minHeight instead of fixed height
    position: 'relative',
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  contentTop: {
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '4px',
  },
  title: {
    fontSize: '18px', // Original size
    fontWeight: '600',
    lineHeight: '1.2',
    fontFamily: 'inherit',
    color: '#000',
  },
  year: {
    fontSize: '14px', // Original size
    color: '#999',
    fontWeight: '400',
    fontFamily: 'inherit',
  },
  slug: {
    fontSize: '14px', // Original size
    color: '#666',
    lineHeight: '1.4',
    fontFamily: 'inherit',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3, // Allow more lines
    WebkitBoxOrient: 'vertical',
    marginTop: '8px',
  },
  contentBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from center to flex-start
    flexWrap: 'wrap', // Allow wrapping
    marginTop: '8px',
    gap: '8px', // Add gap for when items wrap
  },
  streamingInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: '8px',
  },
  streamingText: {
    fontSize: '12px', // Original size
    color: '#888',
    fontWeight: '400',
    fontFamily: 'inherit',
    lineHeight: '1.3',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0, // Don't let icons shrink
    alignSelf: 'flex-end', // Keep icons at the right
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
};

export default MediaCardMemo;
