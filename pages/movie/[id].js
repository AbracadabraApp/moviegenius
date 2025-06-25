// pages/movie/[id].js - TMDB ID based movie detail page
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import PhoneFrame from '../../components/PhoneFrame';
import MediaCard from '../../components/MediaCard';
import MovieHeader from '../../components/MovieHeader';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import AskInputBar from '../../components/AskInputBar';
import { ArrowLeft, Heart, Bookmark } from 'lucide-react';
import { FavoritesManager } from '../../components/FavoritesManager';
import dynamic from 'next/dynamic';

// Lazy load heavy analysis components
const EntityLinkedText = dynamic(() => import('../../components/EntityLinkedText'), {
  loading: () => <div style={{ padding: '8px', color: '#6b7280', fontSize: '14px' }}>Loading analysis...</div>
});

const MovieAnalysisWithEntities = dynamic(() => import('../../components/EntityLinkedText').then(mod => ({ default: mod.MovieAnalysisWithEntities })), {
  loading: () => <div style={{ padding: '8px', color: '#6b7280', fontSize: '14px' }}>Loading analysis...</div>
});
// import useStreamingData from '../../hooks/useStreamingData'; // Stubbed out
import loadingMessages from '../../data/loading-messages.json';

export default function MovieDetailPage({ title, year, initialSlug, initialPoster, initialStreaming, tmdbId, error }) {
  const router = useRouter();
  const { id } = router.query;
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingIcon, setLoadingIcon] = useState('');
  const [sections, setSections] = useState([]);
  const [exploreFurther, setExploreFurther] = useState([]);
  const [moreIdeas, setMoreIdeas] = useState(null);
  const [entityData, setEntityData] = useState(null);
  const [isFetchingTMDB, setIsFetchingTMDB] = useState(false);

  // Handle ask input
  const handleAsk = (query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  };

  // Handle complete movie page loading with new clean API
  useEffect(() => {
    const loadMoviePage = async () => {
      if (!tmdbId) return;
      
      console.log('📄 Loading movie page for TMDB ID:', tmdbId);
      setIsFetchingTMDB(true);
      
      try {
        const response = await fetch('/api/load-movie-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: tmdbId })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Movie page loaded:', data.movie.title, data.cached ? '(cached)' : '(fresh)');
          
          // If we got updated movie data, refresh the page
          if (data.movie.title !== title || title === 'TMDB_FETCH_REQUIRED') {
            console.log('🔄 Movie data updated, refreshing page...');
            window.location.reload();
          } else {
            // Use the analysis data directly without additional fetch
            if (data.analysis) {
              const parsedSections = parseClaudeResponse(data.analysis);
              setSections(parsedSections.sections);
              setExploreFurther(parsedSections.exploreFurther);
              setMoreIdeas(parsedSections.moreIdeas);
              setEntityData(data.entityData);
            }
            setIsLoadingAnalysis(false);
          }
        } else {
          console.error('❌ Movie page loading failed:', response.status);
          setIsLoadingAnalysis(false);
        }
        
        setIsFetchingTMDB(false);
      } catch (error) {
        console.error('❌ Error loading movie page:', error);
        setIsFetchingTMDB(false);
        setIsLoadingAnalysis(false);
      }
    };
    
    loadMoviePage();
  }, [tmdbId]); // Only depend on tmdbId

  // Legacy analysis handling - now handled by load-movie-page API
  useEffect(() => {
    console.log('🎬 Movie page component loaded!', { id, title, year });
    
    // Reset analysis state when navigating between movies
    if (id) {
      setIsLoadingAnalysis(true);
      setSections([]);
      setExploreFurther([]);
      setMoreIdeas(null);
      setEntityData(null);
      window.scrollTo(0, 0);
    }
  }, [id]); // Only reset on ID change

  // Load favorites state when movie props are available
  useEffect(() => {
    if (title && year) {
      const mediaId = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}`;
      setHearted(FavoritesManager.isMovieHearted(mediaId));
      setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));

      // Listen for favorites updates
      const handleMoviesUpdate = () => {
        setHearted(FavoritesManager.isMovieHearted(mediaId));
        setBookmarked(FavoritesManager.isMovieBookmarked(mediaId));
      };

      window.addEventListener('moviesUpdated', handleMoviesUpdate);
      return () => window.removeEventListener('moviesUpdated', handleMoviesUpdate);
    }
  }, [title, year]);


  // Parse Claude's structured response (copied from ask-claude.js)
  function parseClaudeResponse(responseText) {
    const sections = [];
    const moreIdeasMovies = [];
    const exploreFurtherTopics = [];
    
    const lines = responseText.split('\n');
    let currentSection = null;
    let currentMovies = [];
    let inMoreIdeas = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue; // Skip empty lines
      
      if (trimmedLine.startsWith('PARAGRAPH:')) {
        // Push previous text section first
        if (currentSection) {
          sections.push(currentSection);
        }
        // Then push any pending movies from previous paragraph
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: [...currentMovies]
          });
          currentMovies = [];
        }
        // Start new text section
        currentSection = {
          type: 'text',
          content: trimmedLine.replace('PARAGRAPH:', '').trim()
        };
      } else if (trimmedLine.startsWith('MOVIES:')) {
        const movieLine = trimmedLine.replace('MOVIES:', '').trim();
        
        if (movieLine) {
          const parts = movieLine.split('|');
          
          if (parts.length >= 2) { // At least title and year
            const [title, year, description, streaming] = parts;
            // 🔒 CRITICAL: Always preserve TMDB ID for navigation
            const movieObj = {
              title: title?.trim() || 'Unknown Title',
              year: parseInt(year?.trim()) || new Date().getFullYear(),
              slug: description?.trim() || 'No description available',
              poster: '/images/placeholder-poster.jpg', // Default poster
              tmdb_id: null // Will be fetched by MediaCard if needed
            };
            
            currentMovies.push(movieObj);
          }
        }
      } else if (trimmedLine.startsWith('EXPLORE_FURTHER:')) {
        const topic = trimmedLine.replace('EXPLORE_FURTHER:', '').trim();
        if (topic) {
          exploreFurtherTopics.push(topic);
        }
      } else if (trimmedLine.startsWith('MORE_IDEAS:')) {
        inMoreIdeas = true;
        const movieLine = trimmedLine.replace('MORE_IDEAS:', '').trim();
        if (movieLine) {
          const parts = movieLine.split('|');
          
          const [title, year, description, streaming] = parts;
          // 🔒 CRITICAL: Always preserve TMDB ID for navigation
          const movieObj = {
            title: title?.trim() || 'Unknown Title',
            year: parseInt(year?.trim()) || new Date().getFullYear(),
            slug: description?.trim() || 'No description available',
            poster: '/images/placeholder-poster.jpg', // Default poster
            tmdb_id: null // Will be fetched by MediaCard if needed
          };
          
          moreIdeasMovies.push(movieObj);
        }
      } else if (inMoreIdeas && trimmedLine.includes('|')) {
        const parts = trimmedLine.split('|');
        
        const [title, year, description, streaming] = parts;
        // 🔒 CRITICAL: Always preserve TMDB ID for navigation
        const movieObj = {
          title: title?.trim() || 'Unknown Title',
          year: parseInt(year?.trim()) || new Date().getFullYear(),
          slug: description?.trim() || 'No description available',
          poster: '/images/placeholder-poster.jpg', // Default poster
          tmdb_id: null // Will be fetched by MediaCard if needed
        };
        
        moreIdeasMovies.push(movieObj);
      } else if (currentSection && trimmedLine) {
        currentSection.content += ' ' + trimmedLine;
      }
    }
    
    // Handle final sections - text first, then movies
    if (currentSection) {
      sections.push(currentSection);
    }
    
    if (currentMovies.length > 0) {
      sections.push({
        type: 'movies',
        movies: [...currentMovies]
      });
    }
    
    return {
      sections,
      exploreFurther: exploreFurtherTopics,
      moreIdeas: {
        title: 'More Great Films',
        movies: moreIdeasMovies
      }
    };
  }




  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Error: {error}</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Show TMDB loading state if fetching movie data
  if (isFetchingTMDB || title === 'TMDB_FETCH_REQUIRED') {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.inputArea}>
            <AskInputBar onSubmit={handleAsk} />
          </div>
          
          <div style={styles.loadingContainer}>
            <div style={styles.loadingRow}>
              <img 
                src="/icons/loading/film-movie-reel-icon.png" 
                alt="Loading..." 
                style={styles.filmIcon}
              />
              <span style={styles.loadingText}>
                {isFetchingTMDB ? 'Fetching movie data from TMDB...' : 'Loading movie information...'}
              </span>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.inputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Movie header - using large format */}
        <MovieHeaderLarge
          title={title}
          year={year}
          initialSlug={initialSlug}
          initialPoster={initialPoster}
          initialStreaming={initialStreaming}
          tmdbId={tmdbId}
        />

        <div style={styles.claudeSection}>
          {isLoadingAnalysis ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingRow}>
                {loadingIcon && (
                  <img 
                    src={`/icons/loading/${loadingIcon}`} 
                    alt="Loading..." 
                    style={styles.filmIcon}
                  />
                )}
                <span style={styles.loadingText}>{loadingMessage}</span>
              </div>
            </div>
          ) : (
            <div style={styles.claudeContent}>              
              {/* Render interleaved sections exactly like ask page */}
              {sections && sections.map((section, sectionIndex) => {
                // Find if this is the first text section
                const isFirstTextSection = section.type === 'text' && 
                  sections.findIndex(s => s.type === 'text') === sectionIndex;
                
                return (
                  <div key={`section-${sectionIndex}`}>
                    {section.type === 'text' && (
                      <div style={{
                        ...styles.textSection,
                        marginTop: isFirstTextSection ? '8px' : styles.textSection.marginTop
                      }}>
                        <div>{section.content}</div>
                      </div>
                    )}
                  {section.type === 'movies' && section.movies && (
                    <div style={styles.movieList}>
                      {section.movies.map((movie, movieIndex) => (
                        <MediaCard
                          key={`${movie.title}-${movie.year}-${sectionIndex}-${movieIndex}`}
                          title={movie.title}
                          year={movie.year}
                          initialSlug={movie.slug}
                          initialPoster={movie.poster}
                          initialStreaming={movie.streaming}
                          tmdbId={movie.tmdb_id}
                        />
                      ))}
                    </div>
                  )}
                  </div>
                );
              })}
              
              {/* Render Explore Further section */}
              {exploreFurther && exploreFurther.length > 0 && (
                <div style={styles.exploreFurtherSection}>
                  <h3 style={styles.exploreFurtherTitle}>Explore Further</h3>
                  <div style={styles.topicList}>
                    {/* Cast and Crew button */}
                    <div 
                      style={styles.topicItem}
                      onClick={() => {
                        if (tmdbId) {
                          router.push(`/movie/${tmdbId}/cast`);
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Cast and Crew of {title}
                    </div>
                    {exploreFurther.map((topic, index) => (
                      <div 
                        key={`topic-${index}`} 
                        style={styles.topicItem}
                        onClick={() => {
                          const contextualQuery = `${title} (${year}): ${topic}`;
                          router.push(`/ask?q=${encodeURIComponent(contextualQuery)}`);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Render More Ideas section exactly like ask page */}
              {moreIdeas && (
                <div style={styles.moreIdeasSection}>
                  <h3 style={styles.moreIdeasTitle}>More Ideas</h3>
                  <div style={styles.movieList}>
                    {moreIdeas.movies.map((movie, index) => (
                      <MediaCard
                        key={`${movie.title}-${movie.year}-more-${index}`}
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        initialPoster={movie.poster}
                        initialStreaming={movie.streaming}
                        tmdbId={movie.tmdb_id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  inputArea: {
    padding: '5px',
    backgroundColor: '#ffffff',
  },
  claudeSection: {
    flex: 1,
    padding: '0 36px 24px',
    marginTop: '0px',
  },
  claudeContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
  },
  textSection: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
    marginBottom: '16px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
    width: '100%',
  },
  filmIcon: {
    width: '48px',
    height: '48px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  loadingContainer: {
    padding: '10px 16px',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: '16px',
    color: '#6b7280',
  },
  errorContainer: {
    padding: '40px 16px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
  },
  moreIdeasSection: {
    marginTop: '4px',
    paddingTop: '16px',
  },
  moreIdeasTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  exploreFurtherSection: {
    marginTop: '2px',
    paddingTop: '16px',
  },
  aboutTheFilmTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginTop: '0px',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  exploreFurtherTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'left',
    paddingLeft: '0px',
  },
  topicList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '0px',
    paddingRight: '0px',
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
};

// Environment-aware static generation: ISR for web, regular static for mobile
export async function getStaticProps({ params }) {
  const { id } = params;
  
  try {
    const tmdbId = parseInt(id, 10);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      return {
        props: {
          error: 'Invalid movie ID'
        }
      };
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Query movie from Supabase by TMDB ID
    const { data: movieEntry, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (movieEntry && !error) {
      // Movie found in Supabase - return as props
      const response = {
        props: {
          title: movieEntry.title,
          year: movieEntry.year,
          initialSlug: movieEntry.slug,
          initialPoster: movieEntry.poster_url,
          initialStreaming: movieEntry.streaming_data,
          tmdbId: movieEntry.tmdb_id,
          error: null
        }
      };
      
      // Add ISR for web builds (mobile builds deprecated)
      response.revalidate = 86400; // 24 hour revalidation
      
      return response;
    } else {
      // Movie not found in database - try to create it via load-movie-page API
      console.log(`Movie ${tmdbId} not found in database, attempting to create...`);
      
      // Return a placeholder that will trigger the load-movie-page API
      return {
        props: {
          title: 'TMDB_FETCH_REQUIRED',
          year: new Date().getFullYear(),
          initialSlug: 'Loading movie information...',
          initialPoster: '/images/placeholder-poster.jpg',
          initialStreaming: null,
          tmdbId: tmdbId,
          error: null
        },
        revalidate: 60 // Revalidate quickly for new movies
      };
    }
  } catch (error) {
    console.error('Static generation fetch error:', error);
    
    // Return 404 for errors during static generation
    return {
      notFound: true
    };
  }
}

// Aggressive pre-generation for all 8k movies - instant loading!
export async function getStaticPaths() {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all movie TMDB IDs from database (8k movies)
    const { data: movies, error } = await supabase
      .from('movies')
      .select('tmdb_id')
      .order('tmdb_id');

    if (error) {
      console.error('Failed to fetch movie IDs for static generation:', error);
      return {
        paths: [],
        fallback: 'blocking'
      };
    }

    // Generate paths for all 8k movies
    const paths = movies.map(movie => ({
      params: { id: movie.tmdb_id.toString() }
    }));

    console.log(`🚀 Pre-generating ${paths.length} movie pages for instant loading`);

    return {
      paths,
      fallback: 'blocking' // Allow dynamic generation for movies not in database
    };

  } catch (error) {
    console.error('Static paths generation error:', error);
    
    // Fallback to on-demand generation if pre-generation fails
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}