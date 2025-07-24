// pages/movie/[id].js - Simplified TMDB ID based movie detail page
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PhoneFrame from '../../components/PhoneFrame';
import MovieHeaderLarge from '../../components/MovieHeaderLarge';
import SimpleSearch from '../../components/SimpleSearch';
import MediaCard from '../../components/MediaCard';
import { FavoritesManager } from '../../components/FavoritesManager';
import { filterCurrentMovie } from '../../lib/filterCurrentMovie';
// Dynamic imports for code splitting
import dynamic from 'next/dynamic';

// Lazy load analysis components to reduce initial bundle size
const ExplorePromptCard = dynamic(() => import('../../components/ExplorePromptCard'), {
  loading: () => <div style={{ padding: '16px' }}>Loading...</div>
});
const FeaturedFilmsSection = dynamic(() => import('../../components/FeaturedFilmsSection'), {
  loading: () => <div style={{ padding: '16px' }}>Loading movies...</div>
});
const EnhancedFeaturedFilmsSection = dynamic(() => import('../../components/EnhancedFeaturedFilmsSection'), {
  loading: () => <div style={{ padding: '16px' }}>Loading movies...</div>
});
const ExploreFurtherSection = dynamic(() => import('../../components/ExploreFurtherSection'), {
  loading: () => <div style={{ padding: '16px' }}>Loading...</div>
});
const EntityLinkedText = dynamic(() => import('../../components/EntityLinkedText'), {
  loading: () => <div>Loading text...</div>
});
const CategoryBrowse = dynamic(() => import('../../components/CategoryBrowse'), {
  loading: () => <div style={{ padding: '16px' }}>Loading categories...</div>
});
import usePredictiveLoading from '../../hooks/usePredictiveLoading';
import FilmLoadingMessage from '../../components/FilmLoadingMessage';
import ErrorBoundary from '../../components/ErrorBoundary';

// Simplified component - business logic moved to services
export default function MovieDetailPage({
  title,
  year,
  initialSlug,
  initialPoster,
  initialStreaming,
  tmdbId,
  error,
  hasAnalysis,
  sections: staticSections,
  exploreFurther: staticExploreFurther,
  moreIdeas: staticMoreIdeas,
  movieData: staticMovieData,
  source,
}) {
  const router = useRouter();
  const { id } = router.query;
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Use static data from SSG props
  const sections = staticSections || [];
  const exploreFurther = staticExploreFurther || [];
  const moreIdeas = staticMoreIdeas || null;
  const movieData = staticMovieData || null;

  // Demo Mode: Predictive content loading
  const {
    trackInteraction,
    prefetchContent,
    isEnabled: isPredictiveEnabled,
  } = usePredictiveLoading('movie_detail', tmdbId, {
    title,
    year,
    hasAnalysis: sections.length > 0,
  });

  // Handle search results
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchResults = results => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  // Handle movie click - navigate to movie detail page
  const handleMovieClick = movie => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };

  // Navigation scroll reset - always scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]); // Reset whenever the movie ID changes

  // Nuclear capture disabled on client-side - happens during build time instead

  // Load favorites state
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

  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.header}>
            <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
          </div>
          <div style={styles.errorContainer}>
            <div style={styles.errorText}>Error: {error}</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Search header */}
        <div style={styles.header}>
          <SimpleSearch onResults={handleSearchResults} placeholder="Search movies..." />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {showSearchResults ? (
            /* Search Results */
            <ErrorBoundary level="section">
              <div style={styles.resultsContainer}>
                <div style={styles.resultsHeader}>
                  <span>
                    {searchResults.length} movie{searchResults.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div style={styles.movieList}>
                  {searchResults.map((movie, index) => (
                    <div
                      key={`${movie.tmdb_id || movie.title}-${index}`}
                      onClick={() => handleMovieClick(movie)}
                      style={styles.movieItem}
                    >
                      <MediaCard
                        title={movie.title}
                        year={movie.year}
                        initialSlug={movie.slug}
                        initialPoster={movie.poster_url}
                        initialStreaming={movie.streaming_data}
                        tmdbId={movie.tmdb_id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </ErrorBoundary>
          ) : (
            /* Movie Detail Content */
            <>
              <ErrorBoundary level="section">
                <MovieHeaderLarge
                  title={title}
                  year={year}
                  initialSlug={initialSlug}
                  initialPoster={initialPoster}
                  initialStreaming={initialStreaming}
                  tmdbId={tmdbId}
                />
              </ErrorBoundary>

              <div style={styles.claudeSection}>
                <ErrorBoundary level="section">
                  {hasAnalysis && sections.length > 0 ? (
                    <div style={styles.claudeContent}>
                      <MovieContent
                        sections={sections}
                        exploreFurther={exploreFurther}
                        moreIdeas={moreIdeas}
                        movieData={movieData}
                        title={title}
                        year={year}
                        tmdbId={tmdbId}
                        router={router}
                      />
                    </div>
                  ) : (
                    <ContentPlaceholder source={source} title={title} year={year} tmdbId={tmdbId} />
                  )}
                </ErrorBoundary>
              </div>
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Extracted movie content component
function MovieContent({ sections, exploreFurther, moreIdeas, movieData, title, year, tmdbId, router }) {
  const usedExploreFurtherCount = useRef(0);

  // Debug logging for Featured Films troubleshooting
  console.log('🎬 MovieContent DEBUG:', {
    sectionsCount: sections?.length,
    exploreFurtherCount: exploreFurther?.length,
    usedExploreFurtherCount: usedExploreFurtherCount.current,
    sectionsDetails: sections?.map((s, i) => ({
      index: i,
      type: s.type,
      moviesCount: s.movies?.length,
      firstMovie: s.movies?.[0]
        ? {
            title: s.movies[0].title,
            year: s.movies[0].year,
            tmdb_id: s.movies[0].tmdb_id,
            slug: s.movies[0].slug,
          }
        : null,
    })),
    moreIdeasCount: moreIdeas?.movies?.length,
    currentMovieTitle: title,
  });

  return (
    <>
      {sections.map((section, sectionIndex) => {
        const isFirstTextSection =
          section.type === 'text' && sections.findIndex(s => s.type === 'text') === sectionIndex;

        return (
          <div key={`section-${sectionIndex}`}>
            {section.type === 'text' && (
              <>
                <div style={styles.textSection}>
                  <EntityLinkedText
                    text={section.content}
                    linkMovies={true}
                    currentEntity={{ type: 'movie', slug: title }}
                  />
                </div>

                {/* Show explore further if available and early in content */}
                {exploreFurther &&
                  exploreFurther[usedExploreFurtherCount.current] &&
                  sectionIndex < 3 &&
                  (() => {
                    const topic = exploreFurther[usedExploreFurtherCount.current];
                    usedExploreFurtherCount.current++;
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

            {section.type === 'movies' &&
              section.movies &&
              (() => {
                const filteredMovies = filterCurrentMovie(section.movies, title);
                console.log(`🎭 Section ${sectionIndex} movies:`, {
                  originalCount: section.movies.length,
                  filteredCount: filteredMovies.length,
                  originalMovies: section.movies.map(m => ({ title: m.title, tmdb_id: m.tmdb_id })),
                  filteredMovies: filteredMovies.map(m => ({ title: m.title, tmdb_id: m.tmdb_id })),
                });

                const isFirstMovieSection =
                  sections.findIndex(s => s.type === 'movies') === sectionIndex;

                return (
                  <div key={sectionIndex}>
                    {movieData ? (
                      <EnhancedFeaturedFilmsSection 
                        movieData={movieData} 
                        currentMovieTmdbId={tmdbId}
                        style={{ marginBottom: '8px' }} 
                      />
                    ) : (
                      <FeaturedFilmsSection movies={filteredMovies} style={{ marginBottom: '8px' }} />
                    )}

                    {/* Show first explore further after first Featured Films section */}
                    {isFirstMovieSection &&
                      exploreFurther &&
                      exploreFurther[usedExploreFurtherCount.current] &&
                      (() => {
                        const topic = exploreFurther[usedExploreFurtherCount.current];
                        usedExploreFurtherCount.current++;
                        return (
                          <ExploreFurtherSection
                            prompts={[topic]}
                            contextPrefix={`${title} (${year})`}
                            style={{ marginTop: '16px', marginBottom: '8px' }}
                          />
                        );
                      })()}
                  </div>
                );
              })()}
          </div>
        );
      })}

      {/* Bottom explore further section - limit to 2 explore prompts + Cast & Crew = 3 total */}
      {(() => {
        const remainingTopics = exploreFurther
          ? exploreFurther.slice(
              usedExploreFurtherCount.current,
              usedExploreFurtherCount.current + 2
            )
          : [];
        return (
          (remainingTopics.length > 0 || tmdbId) && (
            <ExploreFurtherSection prompts={remainingTopics} contextPrefix={`${title} (${year})`}>
              {tmdbId && (
                <ExplorePromptCard
                  prompt={`Cast and Crew of ${title}`}
                  onClick={() => router.push(`/movie/${tmdbId}/cast`)}
                />
              )}
            </ExploreFurtherSection>
          )
        );
      })()}

      {/* Related films */}
      {moreIdeas &&
        (() => {
          const filteredRelatedMovies = filterCurrentMovie(moreIdeas.movies, title);
          console.log('🎭 Related Films section:', {
            originalCount: moreIdeas.movies?.length,
            filteredCount: filteredRelatedMovies.length,
            originalMovies: moreIdeas.movies
              ?.slice(0, 3)
              .map(m => ({ title: m.title, tmdb_id: m.tmdb_id })),
            filteredMovies: filteredRelatedMovies
              .slice(0, 3)
              .map(m => ({ title: m.title, tmdb_id: m.tmdb_id })),
          });

          return <FeaturedFilmsSection movies={filteredRelatedMovies} title="Related Films" />;
        })()}

      {/* Browse by Category Section */}
      <CategoryBrowse title="Discover More Movies" />
    </>
  );
}

// Content section for movies without analysis - polls for analysis availability
function ContentPlaceholder({ source, title, year, tmdbId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 8; // 24 seconds for TMDB discovery scenarios
    let cancelled = false;

    const checkForAnalysis = async () => {
      if (cancelled) return true;
      
      try {
        console.log(`🔍 Checking analysis for ${title} (${year}) - poll ${pollCount + 1}/${maxPolls}`);
        const response = await fetch(`/api/movie-analysis?tmdbId=${tmdbId}`);
        
        if (response.status === 404 || response.status === 405) {
          // For TMDB discoveries, this might be temporary - wait a bit before failing
          if (source === 'tmdb_discovery' && pollCount < 3) {
            console.log(`TMDB discovery: Movie ${tmdbId} not yet in database, continuing...`);
            return false; // Continue polling for TMDB discoveries
          }
          
          console.log(`Movie ${tmdbId} not found after ${pollCount} attempts`);
          setError('Movie not found');
          setIsLoading(false);
          return true; // Stop polling
        }
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📊 Analysis response for ${tmdbId}:`, {
            hasAnalysis: data.hasAnalysis,
            sectionsCount: data.sections?.length,
            error: data.error
          });
          
          // Check if analysis exists and is properly structured
          if (data.analysis || (data.sections && data.sections.length > 0)) {
            console.log(`✅ Analysis found for ${title} (${year})`);
            setAnalysisData(data);
            setHasAnalysis(true);
            setIsLoading(false);
            return true; // Stop polling
          }
          
          // If no error but no analysis, continue polling
          if (data.error && data.error.includes('not found')) {
            // API says movie not found in database, but we know it exists
            if (source === 'tmdb_discovery' && pollCount < 4) {
              console.log(`TMDB discovery: Database sync pending for ${tmdbId}`);
              return false; // Continue polling
            }
          }
        } else if (response.status >= 500) {
          console.log(`Server error (${response.status}) checking analysis for ${tmdbId}`);
        }
      } catch (error) {
        console.log('Analysis check failed:', error);
      }
      return false; // Continue polling
    };

    const pollForAnalysis = async () => {
      if (cancelled) return;
      
      const found = await checkForAnalysis();
      if (found) return;

      pollCount++;
      if (pollCount >= maxPolls) {
        console.log(`Analysis polling timeout for ${title} (${year}) after ${maxPolls * 3} seconds`);
        setIsLoading(false);
        return;
      }

      // Poll every 3 seconds
      setTimeout(pollForAnalysis, 3000);
    };

    // Start polling immediately for TMDB discoveries, after 2s delay for others
    const initialDelay = source === 'tmdb_discovery' ? 1000 : 2000;
    setTimeout(pollForAnalysis, initialDelay);

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [tmdbId, source, title, year]);

  if (isLoading) {
    return (
      <div style={styles.claudeContent}>
        <div style={styles.loadingContainer}>
          <FilmLoadingMessage message="Loading movie analysis..." size="large" />
        </div>
      </div>
    );
  }

  if (hasAnalysis && analysisData) {
    // Analysis found! Return analysis data instead of redirecting
    return (
      <div style={styles.claudeContent}>
        <div style={styles.basicInfoContainer}>
          <div style={styles.basicInfoIcon}>✅</div>
          <div style={styles.basicInfoText}>
            Analysis found! Please refresh the page to view the complete analysis.
          </div>
          <div style={styles.basicInfoNote}>
            {title} ({year}) now has detailed analysis available.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Movie not found - show error message
    return (
      <div style={styles.claudeContent}>
        <div style={styles.basicInfoContainer}>
          <div style={styles.basicInfoIcon}>🎬</div>
          <div style={styles.basicInfoText}>
            This movie could not be found in our database or TMDB.
          </div>
          <div style={styles.basicInfoNote}>
            Please check the movie ID or try searching for another film.
          </div>
        </div>
      </div>
    );
  }

  // Timeout reached - show generation message for movies that exist
  return (
    <div style={styles.claudeContent}>
      <div style={styles.basicInfoContainer}>
        <div style={styles.basicInfoIcon}>🎬</div>
        <div style={styles.basicInfoText}>
          {source === 'tmdb_discovery' 
            ? `Analysis is being generated for ${title} (${year}).`
            : 'Movie analysis is currently being prepared.'
          }
        </div>
        <div style={styles.basicInfoNote}>
          This can take a few minutes for newly discovered films. Please check back shortly.
        </div>
      </div>
    </div>
  );
}

// Simplified styles (kept only essential ones)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '16px 32px',
    gap: '16px',
  },
  content: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  // Search Results
  resultsContainer: {
    padding: '16px',
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
  },
  movieItem: {
    cursor: 'pointer',
  },

  claudeSection: {
    flex: 1,
    padding: '0 16px 24px',
    marginTop: '3px',
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
    paddingLeft: '16px',
    paddingRight: '12px',
  },
  loadingContainer: {
    padding: '40px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  loadingSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
    lineHeight: '1.4',
  },
  basicInfoContainer: {
    padding: '40px 20px',
    textAlign: 'center',
    maxWidth: '400px',
    margin: '0 auto',
  },
  basicInfoIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  basicInfoText: {
    fontSize: '16px',
    color: '#666666',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },
  basicInfoNote: {
    fontSize: '12px',
    color: '#888888',
    fontStyle: 'italic',
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

// Business logic moved to services - server-side imports moved to getStaticProps

// Nuclear capture disabled - happens during build time only

// Nuclear Static Check - check for pre-built static data first
async function checkNuclearStatic(tmdbId, fs, path) {
  try {
    const nuclearPath = path.join(process.cwd(), 'public', 'nuclear-static', `${tmdbId}.json`);

    if (fs.existsSync(nuclearPath)) {
      console.log(`🚀 Nuclear cache HIT for movie ${tmdbId}`);
      const staticData = fs.readFileSync(nuclearPath, 'utf8');
      const data = JSON.parse(staticData);

      // Validate nuclear data structure
      if (!data.props || typeof data.props !== 'object') {
        console.log(`⚠️ Invalid nuclear data structure for ${tmdbId}`);
        return null;
      }

      // Add nuclear identifier and clean up Next.js internal properties
      data.props.nuclear = true;
      data.props.source = 'nuclear_static';

      // Remove Next.js internal properties that can't be returned from getStaticProps
      delete data.__N_SSG;

      return data;
    }
  } catch (error) {
    console.log(`Nuclear check failed for ${tmdbId}:`, error.message);
  }

  return null;
}

// Simplified getStaticProps - most logic moved to services
export async function getStaticProps({ params }) {
  const { id } = params;
  const tmdbId = parseInt(id, 10);

  console.log('🚀 getStaticProps started:', {
    tmdbId,
    rawId: id,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  if (isNaN(tmdbId) || tmdbId <= 0) {
    console.error('🚨 Invalid movie ID:', { id, tmdbId });
    return { props: { error: 'Invalid movie ID' } };
  }

  // 🚀 NUCLEAR STRATEGY: Temporarily disabled to fix hydration issues
  // const nuclearData = await checkNuclearStatic(tmdbId, fs.default, path.default);
  // if (nuclearData) {
  //   console.log(`⚡ Serving nuclear static data for movie ${tmdbId}`);
  //   return nuclearData;
  // }

  try {
    console.log('🔧 Starting server-side imports...');
    
    // Server-side imports
    const { AnalysisService } = await import('../../lib/services/analysis-service');
    const { processAnalysisContent, splitContentAtSubheads } = await import('../../lib/movie-analysis-linker');
    const fs = await import('fs');
    const path = await import('path');
    const { createClient } = await import('@supabase/supabase-js');
    const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
    const { createBasicMovieEntry } = await import('../../lib/services/database-search');

    console.log('✅ Server-side imports completed');
    
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_TMDB_API_KEY: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      tmdbId
    };
    
    console.log('🔍 Environment check:', envCheck);
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('🚨 Missing Supabase environment variables - RETURNING 404');
      return { notFound: true };
    }

    // Create supabase client using the working pattern from 3 weeks ago
    console.log('🔗 Creating Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase client created');

    // Get movie from database
    console.log('🎬 Querying database for movie:', tmdbId);
    const { data: movieEntry, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();
      
    console.log('📊 Database query result:', {
      found: !!movieEntry,
      error: error?.message || null,
      title: movieEntry?.title || null
    });

    if (!movieEntry || error) {
      // Movie not in database - try TMDB discovery
      console.log(`🎬 Movie not in database, attempting TMDB discovery for ID: ${tmdbId}`);

      try {
        // Import TMDB services
        const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
        const { createBasicMovieEntry } = await import('../../lib/services/database-search');

        // Fetch movie details from TMDB
        const tmdbMovie = await getTMDBMovieDetails(tmdbId);

        if (!tmdbMovie) {
          console.error(`🚨 TMDB movie not found for ID: ${tmdbId}`);
          return { notFound: true };
        }

        // Create basic movie entry in database for future reference (skip if no database)
        let newMovieEntry = null;
        if (supabase) {
          try {
            newMovieEntry = await createBasicMovieEntry(tmdbMovie);
            console.log(
              `💾 Created database entry: "${tmdbMovie.title}" (${tmdbMovie.release_date?.substring(0, 4)}) -> TMDB ${tmdbMovie.id}`
            );
          } catch (dbError) {
            console.log('⚠️ Could not save to database, continuing with TMDB data only');
          }
        }

        // Generate analysis for newly discovered movies
        let analysisData = null;
        if (newMovieEntry && supabase) {
          console.log(
            `🚀 Attempting analysis generation for newly discovered movie: ${newMovieEntry.title}`
          );
          try {
            analysisData = await AnalysisService.getOrGenerate(newMovieEntry);
            if (analysisData && analysisData.sections && analysisData.sections.length > 0) {
              console.log(`✅ Analysis generated successfully for ${newMovieEntry.title}`);
            } else {
              console.log(
                `⚠️ Analysis generation returned empty result for ${newMovieEntry.title}`
              );
            }
          } catch (analysisError) {
            console.log(
              `⚠️ Analysis generation failed for ${newMovieEntry.title}:`,
              analysisError.message
            );
          }
        }

        console.log(
          `✅ TMDB movie discovered: "${tmdbMovie.title}" (${tmdbMovie.release_date?.substring(0, 4)})`
        );

        // Build response with analysis if available
        const response = {
          props: {
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null,
            initialSlug: null, // Will be generated organically if needed
            initialPoster: tmdbMovie.poster_path
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
              : '/images/placeholder-poster.jpg',
            initialStreaming: null, // Will be fetched organically
            tmdbId: tmdbMovie.id,
            error: null,
            hasAnalysis: false, // Will be updated if analysis exists
            source: 'tmdb_discovery',
            // Note: overview intentionally omitted to prevent TMDB summary contamination
          },
          revalidate: 3600, // ISR for TMDB discoveries - 1 hour (was 60s)
        };

        // Add analysis data if generated
        if (analysisData && analysisData.sections && analysisData.sections.length > 0) {
          // Process movie links in analysis content server-side
          console.log(`🔗 Processing movie links for TMDB discovery: ${tmdbMovie.title}`);

          const processedSections = [];
          for (const section of analysisData.sections) {
            if (section.type === 'text' && section.content) {
              // Split text content at SUBHEAD boundaries first
              const splitSections = splitContentAtSubheads(section.content);

              for (const splitSection of splitSections) {
                if (splitSection.type === 'text' && splitSection.content) {
                  // Process movie links in text content (SUBHEADs are now embedded in text)
                  const processedContent = await processAnalysisContent(
                    splitSection.content,
                    tmdbMovie.title,
                    `${tmdbMovie.title} TMDB discovery section`
                  );
                  processedSections.push({
                    type: 'text',
                    content: processedContent,
                  });
                }
              }
            } else {
              processedSections.push(section);
            }
          }

          response.props.sections = processedSections;
          response.props.exploreFurther = analysisData.exploreFurther;
          response.props.moreIdeas = analysisData.moreIdeas;
          response.props.hasAnalysis = true;
          response.props.source = 'tmdb_discovery_with_analysis';
          console.log(`📊 Including generated analysis in page props for ${tmdbMovie.title}`);
        }

        return response;
      } catch (tmdbError) {
        console.error('TMDB discovery failed:', tmdbError);

        // Fallback to placeholder data
        return {
          props: {
            title: 'Movie Not Found',
            year: new Date().getFullYear(),
            initialSlug: 'Movie information unavailable',
            initialPoster: '/images/placeholder-poster.jpg',
            initialStreaming: null,
            tmdbId: tmdbId,
            error: 'Movie not found in database or TMDB',
            hasAnalysis: false,
          },
          revalidate: 3600, // 1 hour for TMDB discovery (was 60s)
        };
      }
    }

    // Base response
    const response = {
      props: {
        title: movieEntry.title,
        year: movieEntry.year,
        initialSlug: movieEntry.slug,
        initialPoster: movieEntry.poster_url,
        initialStreaming: movieEntry.streaming_data,
        tmdbId: movieEntry.tmdb_id,
        error: null,
        hasAnalysis: false, // Will be set to true if analysis exists
      },
    };

    // Simple content check: Does analysis exist for this movie?
    try {
      const analysisData = supabase ? await AnalysisService.getOrGenerate(movieEntry) : null;
      if (analysisData && analysisData.sections && analysisData.sections.length > 0) {
        // Process movie links in analysis content server-side
        console.log(`🔗 Processing movie links for: ${movieEntry.title} (${movieEntry.year})`);

        const processedSections = [];
        for (const section of analysisData.sections) {
          if (section.type === 'text' && section.content) {
            // Split text content at SUBHEAD boundaries first
            const splitSections = splitContentAtSubheads(section.content);

            for (const splitSection of splitSections) {
              if (splitSection.type === 'text' && splitSection.content) {
                // Process movie links in text content (SUBHEADs are now embedded in text)
                const processedContent = await processAnalysisContent(
                  splitSection.content,
                  movieEntry.title,
                  `${movieEntry.title} (${movieEntry.year}) section`
                );
                processedSections.push({
                  type: 'text',
                  content: processedContent,
                });
              }
            }
          } else {
            processedSections.push(section);
          }
        }

        // Analysis exists - show full content with processed links
        response.props.sections = processedSections;
        response.props.exploreFurther = analysisData.exploreFurther;
        response.props.moreIdeas = analysisData.moreIdeas;
        response.props.hasAnalysis = true;
      } else {
        // No analysis - show clean empty page
        response.revalidate = 86400; // Revalidate daily for potential new content (was 1h)
      }
    } catch (error) {
      console.log('Analysis generation failed for movie:', movieEntry.tmdb_id, error.message);
      // Show clean empty page on error
      response.revalidate = 86400; // Revalidate daily (was 1h)
    }

    // 🚀 NUCLEAR STRATEGY: Long revalidation for pre-built nuclear pages - aggressive caching
    response.revalidate = response.props.hasAnalysis ? 604800 : 86400; // 7 days for nuclear movies, 24h for others

    return response;
  } catch (error) {
    console.error('🚨 Static generation error:', error);
    console.error('🚨 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      tmdbId
    });
    return { notFound: true };
  }
}

// Simplified getStaticPaths
export async function getStaticPaths() {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables in getStaticPaths');
      return {
        paths: [],
        fallback: 'blocking',
      };
    }

    // Skip database paths for now due to Supabase client issues in getStaticPaths
    // Use fallback: 'blocking' to generate paths on demand
    console.log('Using fallback blocking for all movie paths');
    return {
      paths: [],
      fallback: 'blocking',
    };
  } catch (error) {
    console.error('Static paths error:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
}
