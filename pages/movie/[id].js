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
import EntityLinkedText from '../../components/EntityLinkedText';
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

  // Debug render flow
  // Movie page render

  return (
    <PhoneFrame>
      <style jsx global>{`
        .movie-title {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .movie-title:hover {
          color: #1d4ed8;
          text-decoration: none;
        }
      `}</style>
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

              {/* Streaming info section - 4px below poster */}
              <div style={styles.streamingSection}>
                {initialStreaming && initialStreaming.length > 0 && initialStreaming !== 'TBD' ? (
                  <div style={styles.streamingText}>Streaming on {initialStreaming}</div>
                ) : (
                  <div style={styles.streamingText}>Not aware if available for streaming</div>
                )}
              </div>

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
                    <div style={styles.claudeContent}>
                      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>
                          Analysis not yet available for this movie.
                        </div>
                      </div>
                    </div>
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


  return (
    <>
      {sections.map((section, sectionIndex) => {
        const isFirstTextSection =
          section.type === 'text' && sections.findIndex(s => s.type === 'text') === sectionIndex;

        return (
          <div key={`section-${sectionIndex}`}>
            {section.type === 'text' && (
              <div style={styles.textSection}>
                <EntityLinkedText
                  text={section.content}
                  linkMovies={true}
                  currentEntity={{ type: 'movie', slug: title }}
                />
              </div>
            )}

            {section.type === 'movies' &&
              section.movies &&
              (() => {
                const filteredMovies = filterCurrentMovie(section.movies, title);

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

                    {/* Put one explore further after each Featured Films section */}
                    {exploreFurther &&
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

      {/* Bottom explore further section - stack remaining topics */}
      {(() => {
        const remainingTopics = exploreFurther
          ? exploreFurther.slice(usedExploreFurtherCount.current)
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
          // Related Films section processing

          return <div style={{ marginTop: '36px' }}><FeaturedFilmsSection movies={filteredRelatedMovies} title="Related Films" /></div>;
        })()}

      {/* Browse by Category Section */}
      <CategoryBrowse title="Discover More Movies" />
    </>
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
    padding: '16px 16px',
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

  streamingSection: {
    padding: '0 16px',
    marginTop: '4px',
    marginBottom: '4px',
  },
  streamingText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '300',
    fontFamily: 'inherit',
    paddingLeft: '0px',
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
    paddingLeft: '0px',
    paddingRight: '0px',
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
  const startTime = Date.now();
  console.log(`🚀 getStaticProps START for movie ${params.id} at ${new Date().toISOString()}`);
  
  const { id } = params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return { props: { error: 'Invalid movie ID' } };
  }

  // 🚀 NUCLEAR STRATEGY: Check for pre-built static data first
  const fs = await import('fs');
  const path = await import('path');
  const nuclearData = await checkNuclearStatic(tmdbId, fs.default, path.default);
  if (nuclearData) {
    console.log(`⚡ Serving nuclear static data for movie ${tmdbId} in ${Date.now() - startTime}ms`);
    return nuclearData;
  }

  try {
    // Server-side imports
    console.log(`📦 Starting imports...`);
    const importStart = Date.now();
    
    const { AnalysisService } = await import('../../lib/services/analysis-service');
    const { processAnalysisContent, splitContentAtSubheads } = await import('../../lib/movie-analysis-linker');
    const fs = await import('fs');
    const path = await import('path');
    const { createClient } = await import('@supabase/supabase-js');
    const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
    const { createBasicMovieEntry } = await import('../../lib/services/database-search');
    
    console.log(`📦 Imports took ${Date.now() - importStart}ms`);

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return { notFound: true };
    }

    // Create supabase client using the working pattern from 3 weeks ago
    console.log(`🔌 Creating Supabase client...`);
    const supabaseStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log(`🔌 Supabase client created in ${Date.now() - supabaseStart}ms`);

    // Get movie from database
    console.log(`🗄️ Querying database for movie ${tmdbId}...`);
    const dbQueryStart = Date.now();
    const { data: movieEntry, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();
    console.log(`🗄️ Database query took ${Date.now() - dbQueryStart}ms`);

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
      console.log(`🧠 Getting analysis for ${movieEntry.title} (${movieEntry.year})...`);
      const analysisStart = Date.now();
      const analysisData = supabase ? await AnalysisService.getOrGenerate(movieEntry) : null;
      console.log(`🧠 Analysis service took ${Date.now() - analysisStart}ms`);
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

    console.log(`✅ Dynamic generation completed for ${tmdbId} (total time: ${Date.now() - startTime}ms)`);
    return response;
  } catch (error) {
    console.error('Static generation error:', error);
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
