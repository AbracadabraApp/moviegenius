// pages/movie/[id].js - TMDB ID based movie detail page
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import PhoneFrame from '../../components/PhoneFrame';
import MediaCard from '../../components/MediaCard';
import MovieHeader from '../../components/MovieHeader';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import AskInputBar from '../../components/AskInputBar';
import BackButton from '../../components/BackButton';
import { ArrowLeft, Heart, Bookmark } from 'lucide-react';
import { FavoritesManager } from '../../components/FavoritesManager';
import { filterCurrentMovie } from '../../lib/filterCurrentMovie';
import ExplorePromptCard from '../../components/ExplorePromptCard';
import FeaturedFilmsSection from '../../components/FeaturedFilmsSection';
import ExploreFurtherSection from '../../components/ExploreFurtherSection';
import dynamic from 'next/dynamic';
import usePredictiveLoading from '../../hooks/usePredictiveLoading';

// Lazy load heavy analysis components
const EntityLinkedText = dynamic(() => import('../../components/EntityLinkedText'), {
  loading: () => <div style={{ padding: '8px', color: '#6b7280', fontSize: '14px' }}>Consulting the film critics...</div>
});

const MovieAnalysisWithEntities = dynamic(() => import('../../components/EntityLinkedText').then(mod => ({ default: mod.MovieAnalysisWithEntities })), {
  loading: () => <div style={{ padding: '8px', color: '#6b7280', fontSize: '14px' }}>Consulting the film critics...</div>
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

  // Demo Mode: Predictive content loading
  const { trackInteraction, prefetchContent, isEnabled: isPredictiveEnabled } = usePredictiveLoading(
    'movie_detail', 
    tmdbId, 
    { title, year, hasAnalysis: sections.length > 0 }
  );

  // Handle ask input
  const handleAsk = useCallback((query) => {
    router.push({
      pathname: '/ask',
      query: { q: query }
    });
  }, [router]);

  // Handle complete movie page loading with new clean API
  useEffect(() => {
    const loadMoviePage = async () => {
      if (!tmdbId) return;
      
      // Prevent excessive API calls during development
      if (isFetchingTMDB) return;
      
      // Only skip API call if we're in a reload loop scenario
      // Always call API to get Claude analysis content
      
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
          
          // If we got updated movie data and it's not a TMDB fetch case, refresh once
          if (data.movie.title !== title && title !== 'TMDB_FETCH_REQUIRED') {
            console.log('🔄 Movie data updated, refreshing page...');
            window.location.reload();
          } else if (title === 'TMDB_FETCH_REQUIRED') {
            // First time loading with TMDB data - update URL without reload
            console.log('🔄 Initial TMDB data loaded, updating URL...');
            window.history.replaceState(null, '', `/movie/${tmdbId}`);
            // Continue to process the data below
          }
          
          // Process the analysis data (for both TMDB_FETCH_REQUIRED and normal cases)
          if (data.analysis) {
            const parsedSections = parseClaudeResponse(data.analysis);
            console.log('🔍 Parsed sections:', parsedSections.sections.length);
            console.log('🔍 Explore Further topics:', parsedSections.exploreFurther);
            console.log('🔍 More Ideas:', parsedSections.moreIdeas);
            setSections(parsedSections.sections);
            setExploreFurther(parsedSections.exploreFurther);
            setMoreIdeas(parsedSections.moreIdeas);
            setEntityData(data.entityData);
          }
          setIsLoadingAnalysis(false);
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
  }, [tmdbId]); // Only depend on tmdbId - title will be updated by API response

  // Reset state when navigating between movies
  useEffect(() => {
    console.log('🎬 Movie page component loaded!', { id, title, year });
    
    // Reset analysis state when navigating between movies
    if (id && tmdbId) {
      console.log('🔄 Resetting state for new movie:', id);
      setIsLoadingAnalysis(true);
      setSections([]);
      setExploreFurther([]);
      setMoreIdeas(null);
      setEntityData(null);
      
      // Initialize loading message and icon for film-themed loading
      const iconFiles = [
        'film-movie-reel-icon.png',
        'film-movie-icon.png',
        'chair-director-outline-icon.png'
      ];
      const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
      const randomIcon = iconFiles[Math.floor(Math.random() * iconFiles.length)];
      setLoadingMessage(randomMessage);
      setLoadingIcon(randomIcon);
      
      window.scrollTo(0, 0);
    }
  }, [id, tmdbId]); // Reset when either ID or tmdbId changes

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
            // Let MediaCard fetch proper database slugs instead of using Claude's descriptions
            const movieObj = {
              title: title?.trim() || 'Unknown Title',
              year: parseInt(year?.trim()) || new Date().getFullYear(),
              slug: null, // Let MediaCard fetch proper tagline from database
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
          // Let MediaCard fetch proper database slugs instead of using Claude's descriptions
          const movieObj = {
            title: title?.trim() || 'Unknown Title',
            year: parseInt(year?.trim()) || new Date().getFullYear(),
            slug: null, // Let MediaCard fetch proper tagline from database
            poster: '/images/placeholder-poster.jpg', // Default poster
            tmdb_id: null // Will be fetched by MediaCard if needed
          };
          
          moreIdeasMovies.push(movieObj);
        }
      } else if (inMoreIdeas && trimmedLine.includes('|')) {
        const parts = trimmedLine.split('|');
        
        const [title, year, description, streaming] = parts;
        // 🔒 CRITICAL: Always preserve TMDB ID for navigation
        // Let MediaCard fetch proper database slugs instead of using Claude's descriptions
        const movieObj = {
          title: title?.trim() || 'Unknown Title',
          year: parseInt(year?.trim()) || new Date().getFullYear(),
          slug: null, // Let MediaCard fetch proper tagline from database
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
                {isFetchingTMDB ? 'Consulting the film archives...' : 'Diving into the vault...'}
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
          {/* Back button for navigation */}
          <BackButton variant="icon" context="movie" position="top-left" />
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
              {/* Render interleaved sections with simple explore further math */}
              {(() => {
                let usedExploreFurtherCount = 0;
                
                return sections && sections.map((section, sectionIndex) => {
                  // Find if this is the first text section
                  const isFirstTextSection = section.type === 'text' && 
                    sections.findIndex(s => s.type === 'text') === sectionIndex;
                  
                  return (
                    <div key={`section-${sectionIndex}`}>
                      {section.type === 'text' && (
                        <>
                          <div style={{
                            ...styles.textSection,
                            marginTop: isFirstTextSection ? '8px' : styles.textSection.marginTop
                          }}>
                            <div>{section.content}</div>
                          </div>
                          
                          {/* Show explore further section if we have unused topics and this is first few paragraphs */}
                          {exploreFurther && exploreFurther[usedExploreFurtherCount] && sectionIndex < 3 && (() => {
                            const topic = exploreFurther[usedExploreFurtherCount];
                            usedExploreFurtherCount++; // Use one topic
                            return (
                              <ExploreFurtherSection
                                prompts={[topic]}
                                contextPrefix={`${title} (${year})`}
                                style={{ marginTop: '16px', marginBottom: '8px' }}
                              />
                            );
                          })()}
                        </>
                      )}
                    {section.type === 'movies' && section.movies && (
                      <FeaturedFilmsSection 
                        movies={filterCurrentMovie(section.movies, title)}
                        style={{ marginBottom: '8px' }}
                      />
                    )}
                    {section.type === 'explore_further' && (() => {
                      // Use remaining topics for content explore further section
                      const remainingTopics = exploreFurther ? exploreFurther.slice(usedExploreFurtherCount) : [];
                      usedExploreFurtherCount = exploreFurther ? exploreFurther.length : 0; // Mark all as used
                      return (
                        <ExploreFurtherSection
                          prompts={remainingTopics}
                          contextPrefix={`${title} (${year})`}
                        />
                      );
                    })()}
                    </div>
                  );
                });
              })()}
              
              {/* Bottom Explore Further section - Show remaining unused topics + Cast & Crew */}
              {(() => {
                // Calculate how many topics were used
                let usedCount = 0;
                const textSections = sections ? sections.filter(s => s.type === 'text') : [];
                const contentHasExploreFurther = sections ? sections.some(s => s.type === 'explore_further') : false;
                
                // Count topics used in interleaved cards (max 3 text sections)
                usedCount = Math.min(textSections.length, 3);
                
                // If content has explore_further section, all remaining topics were used there
                if (contentHasExploreFurther) {
                  usedCount = exploreFurther ? exploreFurther.length : 0;
                }
                
                const remainingTopics = exploreFurther ? exploreFurther.slice(usedCount) : [];
                
                // Show section if we have remaining topics OR cast & crew
                return (remainingTopics.length > 0 || tmdbId) && (
                  <ExploreFurtherSection
                    prompts={remainingTopics}
                    contextPrefix={`${title} (${year})`}
                  >
                    {tmdbId && (
                      <ExplorePromptCard
                        prompt={`Cast and Crew of ${title}`}
                        onClick={() => router.push(`/movie/${tmdbId}/cast`)}
                      />
                    )}
                  </ExploreFurtherSection>
                );
              })()}
              
              {/* Render Related Films section exactly like episodes */}
              {moreIdeas && (
                <FeaturedFilmsSection 
                  movies={filterCurrentMovie(moreIdeas.movies, title)}
                  title="Related Films"
                />
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
};

// Enhanced static generation with demo mode optimizations and monitoring
export async function getStaticProps({ params }) {
  const { id } = params;
  const { getDemoConfig, getDemoSafetyMonitor } = await import('../../lib/demo-config.js');
  const demoConfig = getDemoConfig();
  const safetyMonitor = getDemoSafetyMonitor();
  
  const generationStart = Date.now();
  
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
      const generationTime = Date.now() - generationStart;
      
      // Track generation performance
      safetyMonitor.recordMetric('static_props_generation_time', generationTime);
      
      const response = {
        props: {
          title: movieEntry.title,
          year: movieEntry.year,
          initialSlug: movieEntry.slug,
          initialPoster: movieEntry.poster_url,
          initialStreaming: movieEntry.streaming_data,
          tmdbId: movieEntry.tmdb_id,
          error: null,
          // Add demo mode metadata
          ...(demoConfig.ENABLED && {
            demoMode: true,
            generationTime,
            cached: true
          })
        }
      };
      
      // Demo mode: More aggressive ISR for faster demo updates
      if (demoConfig.ENABLED) {
        response.revalidate = demoConfig.STATIC_GENERATION.revalidationInterval;
        console.log(`🎯 DEMO: Generated ${movieEntry.title} (${movieEntry.year}) in ${generationTime}ms`);
      } else {
        response.revalidate = 86400; // 24 hour revalidation for production
      }
      
      return response;
    } else {
      // Movie not found in database - try to create it via load-movie-page API
      console.log(`Movie ${tmdbId} not found in database, attempting to create...`);
      
      const generationTime = Date.now() - generationStart;
      safetyMonitor.recordMetric('static_props_missing_movie', 1);
      
      // Return a placeholder that will trigger the load-movie-page API
      const response = {
        props: {
          title: 'TMDB_FETCH_REQUIRED',
          year: new Date().getFullYear(),
          initialSlug: 'Loading movie information...',
          initialPoster: '/images/placeholder-poster.jpg',
          initialStreaming: null,
          tmdbId: tmdbId,
          error: null,
          ...(demoConfig.ENABLED && {
            demoMode: true,
            generationTime,
            requiresFetch: true
          })
        }
      };
      
      // Demo mode: Faster revalidation for missing movies
      response.revalidate = demoConfig.ENABLED ? 300 : 60; // 5 minutes in demo, 1 minute in production
      
      return response;
    }
  } catch (error) {
    const generationTime = Date.now() - generationStart;
    console.error('Static generation fetch error:', error);
    
    // Track generation errors
    safetyMonitor.recordMetric('static_props_error', 1);
    
    // Return 404 for errors during static generation
    return {
      notFound: true
    };
  }
}

// Enhanced static generation with demo mode optimizations
export async function getStaticPaths() {
  const { getDemoConfig, getDemoSafetyMonitor } = await import('../../lib/demo-config.js');
  const demoConfig = getDemoConfig();
  const safetyMonitor = getDemoSafetyMonitor();
  
  const buildStartTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let movieQuery = supabase
      .from('movies')
      .select('tmdb_id, title, year, created_at')
      .not('tmdb_id', 'is', null);

    // Demo mode optimizations
    if (demoConfig.ENABLED && demoConfig.STATIC_GENERATION.preGenerateAllMovies) {
      // Pre-generate ALL movies for demo (ultra-aggressive)
      movieQuery = movieQuery.order('created_at', { ascending: false }); // Newest first for demos
      console.log('🎯 DEMO MODE: Pre-generating ALL movies for instant demo performance');
    } else {
      // Production mode: Generate popular movies + recent additions
      movieQuery = movieQuery
        .order('created_at', { ascending: false })
        .limit(500); // Reasonable limit for production builds
      console.log('🚀 Production mode: Pre-generating 500 most recent movies');
    }

    const { data: movies, error } = await movieQuery;

    if (error) {
      console.error('Failed to fetch movie IDs for static generation:', error);
      return {
        paths: [],
        fallback: 'blocking'
      };
    }

    // Demo mode: Prioritize popular demo movies
    let pathMovies = movies;
    if (demoConfig.ENABLED) {
      const popularMovies = movies.filter(m => 
        demoConfig.DEMO_PATHS.popularMovies.includes(m.tmdb_id)
      );
      const otherMovies = movies.filter(m => 
        !demoConfig.DEMO_PATHS.popularMovies.includes(m.tmdb_id)
      );
      
      // Put popular movies first for priority building
      pathMovies = [...popularMovies, ...otherMovies];
      console.log(`🎯 Prioritizing ${popularMovies.length} popular demo movies`);
    }

    // Generate paths with build monitoring
    const paths = pathMovies.map(movie => ({
      params: { id: movie.tmdb_id.toString() }
    }));

    const buildTime = Date.now() - buildStartTime;
    const isSlowBuild = buildTime > demoConfig.STATIC_GENERATION.buildTimeout;
    
    if (isSlowBuild) {
      console.warn(`⚠️ Slow static generation: ${buildTime}ms (limit: ${demoConfig.STATIC_GENERATION.buildTimeout}ms)`);
      safetyMonitor.recordMetric('static_generation_time', buildTime);
    }

    console.log(`🚀 Pre-generating ${paths.length} movie pages in ${buildTime}ms`);
    console.log(`📊 Mode: ${demoConfig.ENABLED ? 'DEMO' : 'PRODUCTION'}`);

    return {
      paths,
      fallback: 'blocking' // Allow dynamic generation for movies not in database
    };

  } catch (error) {
    const buildTime = Date.now() - buildStartTime;
    console.error('Static paths generation error:', error);
    
    // Track build failure
    safetyMonitor.recordMetric('static_generation_error', 1);
    
    // Fallback to on-demand generation if pre-generation fails
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}