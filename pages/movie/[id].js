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
import ExplorePromptCard from '../../components/ExplorePromptCard';
import FeaturedFilmsSection from '../../components/FeaturedFilmsSection';
import ExploreFurtherSection from '../../components/ExploreFurtherSection';
import EntityLinkedText from '../../components/EntityLinkedText';
import CategoryBrowse from '../../components/CategoryBrowse';
import usePredictiveLoading from '../../hooks/usePredictiveLoading';

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
  source,
  overview
}) {
  const router = useRouter();
  const { id } = router.query;
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  
  // Use static data from SSG props
  const sections = staticSections || [];
  const exploreFurther = staticExploreFurther || [];
  const moreIdeas = staticMoreIdeas || null;

  // Demo Mode: Predictive content loading
  const { trackInteraction, prefetchContent, isEnabled: isPredictiveEnabled } = usePredictiveLoading(
    'movie_detail', 
    tmdbId, 
    { title, year, hasAnalysis: sections.length > 0 }
  );

  // Handle search results
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchResults = (results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  // Handle movie click - navigate to movie detail page  
  const handleMovieClick = (movie) => {
    if (movie.tmdb_id) {
      router.push(`/movie/${movie.tmdb_id}`);
    }
  };


  // Navigation scroll reset
  useEffect(() => {
    if (id && tmdbId) {
      window.scrollTo(0, 0);
    }
  }, [id, tmdbId]);

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
            <SimpleSearch 
              onResults={handleSearchResults}
              placeholder="Search movies..."
            />
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
          <SimpleSearch 
            onResults={handleSearchResults}
            placeholder="Search movies..."
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {showSearchResults ? (
            /* Search Results */
            <div style={styles.resultsContainer}>
              <div style={styles.resultsHeader}>
                <span>{searchResults.length} movie{searchResults.length !== 1 ? 's' : ''} found</span>
              </div>
              <div style={styles.movieList}>
                {searchResults.map((movie, index) => (
                  <div key={`${movie.tmdb_id || movie.title}-${index}`} onClick={() => handleMovieClick(movie)} style={styles.movieItem}>
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
          ) : (
            /* Movie Detail Content */
            <>
              <MovieHeaderLarge
                title={title}
                year={year}
                initialSlug={initialSlug}
                initialPoster={initialPoster}
                initialStreaming={initialStreaming}
                tmdbId={tmdbId}
              />

              <div style={styles.claudeSection}>
                {hasAnalysis && sections.length > 0 ? (
                  <div style={styles.claudeContent}>              
                    <MovieContent 
                        sections={sections}
                        exploreFurther={exploreFurther}
                        moreIdeas={moreIdeas}
                        title={title}
                        year={year}
                        tmdbId={tmdbId}
                        router={router}
                      />
                    </div>
                ) : (
                  <ContentPlaceholder 
                    source={source}
                    overview={overview}
                    title={title}
                    year={year}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}


// Extracted movie content component  
function MovieContent({ sections, exploreFurther, moreIdeas, title, year, tmdbId, router }) {
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
      firstMovie: s.movies?.[0] ? {
        title: s.movies[0].title,
        year: s.movies[0].year,
        tmdb_id: s.movies[0].tmdb_id,
        slug: s.movies[0].slug
      } : null
    })),
    moreIdeasCount: moreIdeas?.movies?.length,
    currentMovieTitle: title 
  });
  
  return (
    <>
      {sections.map((section, sectionIndex) => {
        const isFirstTextSection = section.type === 'text' && 
          sections.findIndex(s => s.type === 'text') === sectionIndex;
        
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
                {exploreFurther && exploreFurther[usedExploreFurtherCount.current] && sectionIndex < 3 && (() => {
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
            
            {section.type === 'movies' && section.movies && (() => {
              const filteredMovies = filterCurrentMovie(section.movies, title);
              console.log(`🎭 Section ${sectionIndex} movies:`, {
                originalCount: section.movies.length,
                filteredCount: filteredMovies.length,
                originalMovies: section.movies.map(m => ({ title: m.title, tmdb_id: m.tmdb_id })),
                filteredMovies: filteredMovies.map(m => ({ title: m.title, tmdb_id: m.tmdb_id }))
              });
              
              const isFirstMovieSection = sections.findIndex(s => s.type === 'movies') === sectionIndex;
              
              return (
                <>
                  <FeaturedFilmsSection 
                    movies={filteredMovies}
                    style={{ marginBottom: '8px' }}
                  />
                  
                  {/* Show first explore further after first Featured Films section */}
                  {isFirstMovieSection && exploreFurther && exploreFurther[usedExploreFurtherCount.current] && (() => {
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
              );
            })()}
          </div>
        );
      })}
      
      {/* Bottom explore further section - limit to 2 explore prompts + Cast & Crew = 3 total */}
      {(() => {
        const remainingTopics = exploreFurther ? 
          exploreFurther.slice(usedExploreFurtherCount.current, usedExploreFurtherCount.current + 2) : [];
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
      
      {/* Related films */}
      {moreIdeas && (() => {
        const filteredRelatedMovies = filterCurrentMovie(moreIdeas.movies, title);
        console.log('🎭 Related Films section:', {
          originalCount: moreIdeas.movies?.length,
          filteredCount: filteredRelatedMovies.length,
          originalMovies: moreIdeas.movies?.slice(0, 3).map(m => ({ title: m.title, tmdb_id: m.tmdb_id })),
          filteredMovies: filteredRelatedMovies.slice(0, 3).map(m => ({ title: m.title, tmdb_id: m.tmdb_id }))
        });
        
        return (
          <FeaturedFilmsSection 
            movies={filteredRelatedMovies}
            title="Related Films"
          />
        );
      })()}
      
      {/* Browse by Category Section */}
      <CategoryBrowse title="Discover More Movies" />
      
    </>
  );
}

// Content placeholder for movies without analysis
function ContentPlaceholder({ source, overview, title, year }) {
  return (
    <div style={styles.claudeContent}>
    </div>
  );
}

// Simplified styles (kept only essential ones)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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

// Business logic moved to services - import them here
import { AnalysisService } from '../../lib/services/analysis-service';

// Simplified getStaticProps - most logic moved to services
export async function getStaticProps({ params }) {
  const { id } = params;
  const tmdbId = parseInt(id, 10);
  
  if (isNaN(tmdbId) || tmdbId <= 0) {
    return { props: { error: 'Invalid movie ID' } };
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get movie from database
    const { data: movieEntry, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

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
        
        // Create basic movie entry in database for future reference
        const newMovieEntry = await createBasicMovieEntry(tmdbMovie);
        
        // Log discovery for potential analysis generation
        console.log(`📊 TMDB discovery logged for potential analysis: ${tmdbId}`);
        
        console.log(`✅ TMDB movie discovered: "${tmdbMovie.title}" (${tmdbMovie.release_date?.substring(0, 4)})`);
        
        // Return TMDB movie data
        return {
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
            hasAnalysis: false, // TMDB discoveries start without analysis
            source: 'tmdb_discovery',
            overview: tmdbMovie.overview
          },
          revalidate: 60 // ISR for TMDB discoveries
        };
        
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
          revalidate: 60
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
      }
    };

    // Simple content check: Does analysis exist for this movie?
    try {
      const analysisData = await AnalysisService.getOrGenerate(movieEntry);
      if (analysisData && analysisData.sections && analysisData.sections.length > 0) {
        // Analysis exists - show full content
        response.props.sections = analysisData.sections;
        response.props.exploreFurther = analysisData.exploreFurther;
        response.props.moreIdeas = analysisData.moreIdeas;
        response.props.hasAnalysis = true;
      } else {
        // No analysis - show clean empty page
        response.revalidate = 3600; // Revalidate hourly for potential new content
      }
    } catch (error) {
      console.log('Analysis generation failed for movie:', movieEntry.tmdb_id, error.message);
      // Show clean empty page on error
      response.revalidate = 3600;
    }

    return response;

  } catch (error) {
    console.error('Static generation error:', error);
    return { notFound: true };
  }
}

// Simplified getStaticPaths
export async function getStaticPaths() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get top movies for pre-generation
    const { data: movies } = await supabase
      .from('movies')
      .select('tmdb_id')
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000); // Generate paths for popular movies

    const paths = movies?.map(movie => ({
      params: { id: movie.tmdb_id.toString() }
    })) || [];

    return {
      paths,
      fallback: 'blocking'
    };

  } catch (error) {
    console.error('Static paths error:', error);
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
}