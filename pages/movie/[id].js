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
import usePredictiveLoading from '../../hooks/usePredictiveLoading';
import { NUCLEAR_CONFIG } from '../../lib/nuclear-config';

// Simplified component - business logic moved to services
export default function MovieDetailPage({ 
  title, 
  year, 
  initialSlug, 
  initialPoster, 
  initialStreaming, 
  tmdbId, 
  error,
  isNuclear,
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

  // Handle clear search
  const handleClearSearch = () => {
    setSearchResults([]);
    setShowSearchResults(false);
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
                <button onClick={handleClearSearch} style={styles.clearButton}>
                  Clear
                </button>
              </div>
              <div style={styles.movieList}>
                {searchResults.map((movie, index) => (
                  <div key={`${movie.tmdb_id || movie.title}-${index}`} onClick={() => handleMovieClick(movie)}>
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
                {isNuclear && sections.length > 0 ? (
                  <>
                    {/* Nuclear test banner - only in development */}
                    {NUCLEAR_CONFIG.SHOW_TEST_BANNERS && (
                      <NuclearTestBanner />
                    )}
                    
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
                  </>
                ) : (
                  <ISRPlaceholder 
                    isNuclear={isNuclear} 
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

// Extracted test banner component
function NuclearTestBanner() {
  return (
    <div style={styles.nuclearTestBanner}>
      <div style={styles.nuclearIndicator}>
        ⚡ NUCLEAR PAGE - Instant Static Content
      </div>
      <div style={styles.testLinks}>
        <strong>Test Links:</strong>
        <div style={styles.linkGrid}>
          <div style={styles.linkSection}>
            <span style={styles.linkLabel}>Nuclear Pages (instant):</span>
            {NUCLEAR_CONFIG.TEST_MOVIES.slice(0, 3).map(id => (
              <Link key={id} href={`/movie/${id}`} style={styles.testLink}>
                Movie {id}
              </Link>
            ))}
          </div>
          <div style={styles.linkSection}>
            <span style={styles.linkLabel}>ISR Pages (cached):</span>
            <Link href="/movie/12345" style={styles.testLink}>Random 1</Link>
            <Link href="/movie/99999" style={styles.testLink}>Random 2</Link>
          </div>
        </div>
        <div style={styles.removeNote}>
          💡 <strong>Note:</strong> This banner is controlled by NUCLEAR_CONFIG.SHOW_TEST_BANNERS
        </div>
      </div>
    </div>
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
      
    </>
  );
}

// Extracted ISR placeholder
function ISRPlaceholder({ isNuclear, source, overview, title, year }) {
  // Handle TMDB discoveries differently
  if (source === 'tmdb_discovery') {
    return (
      <div style={styles.claudeContent}>
        {/* Show TMDB overview if available */}
        {overview && (
          <div style={styles.tmdbOverview}>
            <h3 style={styles.overviewTitle}>About {title}</h3>
            <p style={styles.overviewText}>{overview}</p>
          </div>
        )}
        
        <div style={styles.discoveryNotice}>
          <div style={styles.discoveryIcon}>🎬</div>
          <div style={styles.discoveryTitle}>Newly Discovered Movie</div>
          <div style={styles.discoveryText}>
            This movie was just discovered from TMDB and added to our collection. 
            Comprehensive analysis and recommendations are being generated automatically.
          </div>
          <div style={styles.discoveryNote}>
            ⚡ Popular movies become instant-loading static pages through our nuclear system.
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={() => window.location.href = '/nuclear-dashboard'}
            style={styles.dashboardButton}
          >
            View Nuclear Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Original ISR placeholder for database movies
  return (
    <div style={styles.claudeContent}>
      <div style={styles.isrMessage}>
        {isNuclear === false 
          ? '⚡ This movie will be converted to instant-loading static content by our autonomous system.' 
          : 'Analysis will be generated automatically.'
        }
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={() => window.location.href = '/nuclear-dashboard'}
          style={styles.dashboardButton}
        >
          View Nuclear Dashboard
        </button>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
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
  clearButton: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    backgroundColor: '#f3f4f6',
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
  // Nuclear test styles
  nuclearTestBanner: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  nuclearIndicator: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: '12px',
    textAlign: 'center'
  },
  testLinks: {
    color: '#374151'
  },
  linkGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    margin: '12px 0',
    fontSize: '13px'
  },
  linkSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  linkLabel: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },
  testLink: {
    color: '#2563eb',
    textDecoration: 'underline',
    cursor: 'pointer',
    transition: 'color 0.2s ease'
  },
  removeNote: {
    backgroundColor: '#fef3c7',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#92400e',
    marginTop: '8px'
  },
  // TMDB Discovery styles
  tmdbOverview: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  overviewTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  overviewText: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
    margin: '0',
  },
  discoveryNotice: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  discoveryIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  discoveryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: '12px',
  },
  discoveryText: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
    marginBottom: '12px',
  },
  discoveryNote: {
    fontSize: '14px',
    color: '#0c4a6e',
    fontWeight: '500',
  },
  isrMessage: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
    fontStyle: 'italic'
  },
  dashboardButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
};

// Business logic moved to services - import them here
import { NuclearService } from '../../lib/services/nuclear-service';
import { AnalysisService } from '../../lib/services/analysis-service';
import { validateNuclearConfig } from '../../lib/nuclear-config';

// Simplified getStaticProps - most logic moved to services
export async function getStaticProps({ params }) {
  // Validate config on startup
  validateNuclearConfig();
  
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

    // Use service to check nuclear status
    const isNuclearCandidate = await NuclearService.isNuclearCandidate(tmdbId);

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
        // Import TMDB and nuclear promotion services
        const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
        const { createBasicMovieEntry } = await import('../../lib/services/database-search');
        const { flagForNuclearPromotion } = await import('../../lib/services/nuclear-promotion');
        
        // Fetch movie details from TMDB
        const tmdbMovie = await getTMDBMovieDetails(tmdbId);
        
        if (!tmdbMovie) {
          return { notFound: true };
        }
        
        // Create basic movie entry in database for future reference
        const newMovieEntry = await createBasicMovieEntry(tmdbMovie);
        
        // Flag for nuclear promotion (pre-launch: immediate)
        await flagForNuclearPromotion(tmdbId, 'tmdb_discovery', {
          route: 'movie_page_direct'
        });
        
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
            isNuclear: false, // TMDB discoveries start as ISR, can become nuclear
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
            isNuclear: false,
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
        isNuclear: isNuclearCandidate,
      }
    };

    // Get analysis for nuclear movies
    if (isNuclearCandidate) {
      const analysisData = await AnalysisService.getOrGenerate(movieEntry);
      if (analysisData) {
        response.props.sections = analysisData.sections;
        response.props.exploreFurther = analysisData.exploreFurther;
        response.props.moreIdeas = analysisData.moreIdeas;
      }
      // Nuclear: no revalidation (permanent static)
    } else {
      // ISR: revalidation
      response.revalidate = NUCLEAR_CONFIG.ISR_REVALIDATE_SECONDS;
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
      .limit(NUCLEAR_CONFIG.TOP_MOVIE_COUNT + 500); // Nuclear + some ISR

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