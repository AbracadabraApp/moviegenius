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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FavoritesManager } from './FavoritesManager';
// import useStreamingData from '../hooks/useStreamingData'; // Stubbed out

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

  // Enhanced data fetching for missing slug or poster
  useEffect(() => {
    const enhanceMovieData = async () => {
      // Check if slug is actually good (not URL-formatted or corrupted)
      const isGoodSlug = slug && slug.length <= 35 && slug.length > 5 && !slug.includes('-') && slug !== slug.toLowerCase();
      const hasGoodPoster = poster !== '/images/placeholder-poster.jpg';
      
      // Skip if we have both good slug and poster, or if already enhancing
      if (isGoodSlug && hasGoodPoster) {
        return;
      }
      
      if (isEnhancing) return;
      setIsEnhancing(true);
      
      try {
        let newSlug = slug;
        let newPoster = poster;
        
        // Fetch enhanced data if slug is missing or corrupted
        if (!isGoodSlug) {
          console.log('Fetching enhanced slug for:', title, year);
          const response = await fetch('/api/enhance-movie-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, year, needsSlug: true, needsPoster: false })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.slug) {
              newSlug = data.slug;
              setSlug(data.slug);
            }
          }
        }
        
        // Fetch TMDB poster if using placeholder
        if (poster === '/images/placeholder-poster.jpg') {
          console.log('Fetching TMDB poster for:', title, year);
          const response = await fetch('/api/tmdb-poster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, year })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.poster) {
              newPoster = data.poster;
              setPoster(data.poster);
            }
            if (data.tmdb_id) {
              setMovieTmdbId(data.tmdb_id);
            }
          }
        }
        
        // Cache the enhanced data back to JSON files if we got new data
        if ((newSlug !== slug && newSlug) || (newPoster !== poster && newPoster !== '/images/placeholder-poster.jpg')) {
          try {
            await fetch('/api/cache-movie-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                title, 
                year, 
                slug: newSlug, 
                poster: newPoster,
                dataSource: 'afi100' // For now, assume AFI100. Could be made dynamic.
              })
            });
            console.log('Cached enhanced data for:', title, year);
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
  }, [title, year, slug, poster, isEnhancing]);

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
          <div style={styles.year}>({year})</div>
        </div>
        <div style={styles.slug}>{slug}</div>
        
        {/* Bottom row: streaming left, icons right */}
        <div style={styles.bottomRow}>
          <div style={styles.streamingInfo}>
            <span style={styles.streamingText}>
              Streaming on TBD
            </span>
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
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
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
    color: '#666',
    fontWeight: 'normal',
    fontFamily: 'inherit',
  },
  slug: {
    fontSize: '14px',
    color: '#333',
    marginTop: '4px',
    fontFamily: 'inherit',
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
