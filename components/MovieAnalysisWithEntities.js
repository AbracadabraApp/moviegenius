// components/MovieAnalysisWithEntities.js
/**
 * Enhanced movie analysis component with entity linking
 * Displays movie analyses with moderate confidence entity links
 */

import { useState, useEffect } from 'react';
import EntityLinkedText from './EntityLinkedText';
import MediaCard from './MediaCard';
import ExplorePromptCard from './ExplorePromptCard';
import ErrorBoundary from './ErrorBoundary';
import MediaCardErrorFallback from './MediaCardErrorFallback';
import ExplorePromptErrorFallback from './ExplorePromptErrorFallback';
import { getPerformanceMonitor } from '../lib/performance-monitor';

export default function MovieAnalysisWithEntities({
  analysis,
  movie,
  linkingIntensity = 'moderate',
  className = '',
  animationDelay = 0,
}) {
  console.log('🔄 UPDATED MovieAnalysisWithEntities component loaded - no loading states!');
  const [processedAnalysis, setProcessedAnalysis] = useState(null);
  const [entityStats, setEntityStats] = useState(null);
  const performanceMonitor = getPerformanceMonitor();
  
  // Animation state for smooth entrance
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!analysis?.claude_response?.raw_content) {
      return;
    }

    processAnalysisContent();
  }, [analysis, linkingIntensity]);

  // Trigger smooth entrance animation when content is ready
  useEffect(() => {
    if (analysis?.claude_response?.raw_content) {
      setIsVisible(true);
    }
  }, [analysis]);

  const processAnalysisContent = async () => {
    const processingStart = performance.now();
    
    try {

      const rawContent = analysis.claude_response.raw_content;

      // Check if content is JSON format (new structure)
      let analysisData;
      try {
        analysisData = JSON.parse(rawContent);
        console.log('✅ Detected JSON format analysis');
      } catch (e) {
        console.log('📝 Using legacy text format analysis');
        analysisData = null;
      }

      if (analysisData) {
        // New JSON format processing
        console.log('🔍 JSON Analysis Debug:', {
          hasContent: !!analysisData.content,
          contentLength: analysisData.content?.length || 0,
          hasFeaturedMovies: !!analysisData.featuredMovies,
          featuredMoviesLength: analysisData.featuredMovies?.length || 0,
          hasExploreTopics: !!analysisData.exploreTopics,
          exploreTopicsLength: analysisData.exploreTopics?.length || 0,
          hasMoreIdeas: !!analysisData.moreIdeas,
          moreIdeasLength: analysisData.moreIdeas?.length || 0
        });
        
        setProcessedAnalysis({
          jsonData: analysisData,
          isJsonFormat: true,
          processedAt: new Date().toISOString(),
        });

        setEntityStats({
          totalEntities: (analysisData.featuredMovies?.length || 0) + (analysisData.moreIdeas?.length || 0),
          movies: (analysisData.featuredMovies?.length || 0) + (analysisData.moreIdeas?.length || 0),
          people: 0, // No people data in new format yet
        });
      } else {
        // Legacy text format processing
        const entityData = analysis.entity_linking_data;
        let featuredMovies = [];

        if (entityData) {
          const entities = entityData.entityData || entityData;
          
          if (entities.featuredMovies) {
            featuredMovies = entities.featuredMovies.map(movie => ({
              title: movie.title,
              year: movie.year,
              slug: movie.slug,
              poster_url: movie.poster_url,
              streaming: movie.streaming,
              tmdb_id: movie.tmdb_id
            })).filter(movie => movie.title && movie.year);
          } else if (entities.movies) {
            featuredMovies = entities.movies.map(movie => ({
              title: movie.movie?.title || movie.title,
              year: movie.movie?.year || movie.year,
              slug: movie.movie?.slug,
              poster_url: movie.movie?.poster_url,
              streaming: movie.movie?.streaming_data,
              tmdb_id: movie.movie?.tmdb_id
            })).filter(movie => movie.title && movie.year);
          }
        }

        setProcessedAnalysis({
          content: rawContent,
          entities: entityData ? {
            ...(entityData.entityData || entityData),
            featuredMovies: featuredMovies
          } : null,
          isJsonFormat: false,
          processedAt: entityData?.processedAt,
        });

        setEntityStats({
          totalEntities: entityData?.entityData?.total || 0,
          movies: entityData?.entityData?.movies?.length || 0,
          people: entityData?.entityData?.people?.length || 0,
        });
      }
      
    } catch (error) {
      console.error('Error processing analysis:', error);
      setProcessedAnalysis({
        content: analysis.claude_response.raw_content,
        entities: null,
        isJsonFormat: false,
        error: error.message,
      });
    } finally {
      // Removed loading state
    }
  };

  const parseModernAnalysisContent = content => {
    // Parse modern analysis format into strict alternating sections
    // FIXED: Proper boundary detection to prevent content mixing
    const lines = content.split('\n').filter(line => line.trim());
    const alternatingContent = [];
    const exploreTopics = [];
    const moreIdeasMovies = [];
    
    let currentTextSection = '';
    let currentMovieGroup = [];
    let collectingMoreIdeas = false;
    
    // Helper function to flush pending content with clean boundaries
    const flushPendingContent = () => {
      if (currentTextSection.trim()) {
        alternatingContent.push({ type: 'text', content: currentTextSection.trim() });
        currentTextSection = '';
      }
      if (currentMovieGroup.length > 0) {
        alternatingContent.push({ type: 'movies', movies: [...currentMovieGroup] });
        currentMovieGroup = [];
      }
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith('MOVIES:') && !collectingMoreIdeas) {
        // FLUSH TEXT FIRST: Respect natural alternating order
        if (currentTextSection.trim()) {
          alternatingContent.push({ type: 'text', content: currentTextSection.trim() });
          currentTextSection = '';
        }
        
        // Parse movie data - CLEAN BOUNDARY: only extract pipe-separated data
        const movieData = trimmed.replace('MOVIES:', '').trim();
        const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());
        
        if (title && year) {
          currentMovieGroup.push({
            title,
            year: parseInt(year),
            slug: description || null, // ONLY the pipe-separated description
            streaming: streaming || null, // ONLY the pipe-separated streaming
            tmdb_id: null // Will be enhanced if entityData exists
          });
        }
      } else if (trimmed.startsWith('SUBHEAD:')) {
        // SUBHEAD validation: Only process if next non-empty line is paragraph text
        const currentIndex = lines.indexOf(line);
        let nextLine = '';
        for (let i = currentIndex + 1; i < lines.length; i++) {
          const nextTrimmed = lines[i].trim();
          if (nextTrimmed) {
            nextLine = nextTrimmed;
            break;
          }
        }
        
        // Only process SUBHEAD if followed by paragraph text (not MOVIES:, EXPLORE_FURTHER:, etc.)
        if (nextLine && !nextLine.includes(':')) {
          // SUBHEAD should start a new section with the subhead as header
          flushPendingContent(); // Flush current section first
          
          // Start new section with subhead
          const subheadText = trimmed.replace('SUBHEAD:', '').trim();
          currentTextSection = `**${subheadText}**\n\n`; // Make subhead bold and add spacing
        }
        // If SUBHEAD is not followed by paragraph, ignore it (treat as invalid)
      } else if (trimmed.startsWith('EXPLORE_FURTHER:')) {
        exploreTopics.push(trimmed.replace('EXPLORE_FURTHER:', '').trim());
      } else if (trimmed.startsWith('MORE_IDEAS:')) {
        collectingMoreIdeas = true;
        // CLEAN BOUNDARY: Flush all pending content before MORE_IDEAS
        flushPendingContent();
        
        // Parse MORE_IDEAS movie - handle both formats
        const movieData = trimmed.replace('MORE_IDEAS:', '').trim();
        if (movieData) {
          const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());
          
          if (title && year) {
            moreIdeasMovies.push({
              title,
              year: parseInt(year),
              slug: description || null,
              streaming: streaming || null,
              tmdb_id: null
            });
          }
        }
      } else if (collectingMoreIdeas && !trimmed.includes(':')) {
        // Parse MORE_IDEAS continuation lines
        const [title, year, description, streaming] = trimmed.split('|').map(s => s?.trim());
        
        if (title && year) {
          moreIdeasMovies.push({
            title,
            year: parseInt(year),
            slug: description || null,
            streaming: streaming || null,
            tmdb_id: null
          });
        }
      } else if (!collectingMoreIdeas && !trimmed.includes(':')) {
        // CLEAN BOUNDARY: Flush movies before adding text, keep text separate
        if (currentMovieGroup.length > 0) {
          alternatingContent.push({ type: 'movies', movies: [...currentMovieGroup] });
          currentMovieGroup = [];
        }
        
        // Regular text content - STRICT BOUNDARY: only paragraph text here
        currentTextSection += (currentTextSection ? '\n' : '') + trimmed;
      }
    }
    
    // CLEAN BOUNDARY: Final flush with proper separation
    flushPendingContent();
    
    return {
      alternatingContent,
      exploreTopics,
      moreIdeasMovies
    };
  };

  // Process analysis immediately if we have data but processedAnalysis isn't ready yet
  if (!processedAnalysis && analysis?.claude_response?.raw_content) {
    // Render with raw content while processing happens in background
    const rawContent = analysis.claude_response.raw_content;
    let analysisData;
    try {
      analysisData = JSON.parse(rawContent);
      if (analysisData) {
        return renderJsonAnalysis(analysisData, movie, linkingIntensity, className);
      }
    } catch (e) {
      // JSON parsing failed - log for debugging and fall back to text processing
      console.warn('Failed to parse analysis JSON, using raw content:', e.message);
    }
    
    return (
      <div className={className}>
        <div style={styles.paragraph}>
          <p>{rawContent || 'Analysis content loading...'}</p>
        </div>
      </div>
    );
  }

  if (!processedAnalysis) {
    return (
      <div className={className}>
        <p className="text-gray-500">***</p>
      </div>
    );
  }

  // Handle JSON format vs legacy text format
  if (processedAnalysis.isJsonFormat) {
    return renderJsonAnalysis(processedAnalysis.jsonData, movie, linkingIntensity, className, isVisible);
  }

  // Legacy text format processing
  const { alternatingContent, exploreTopics, moreIdeasMovies } = parseModernAnalysisContent(processedAnalysis.content);

  // Enhance parsed movies with entityData if available
  const enhanceMovieData = (parsedMovie) => {
    if (processedAnalysis.entities?.featuredMovies) {
      // Find matching enhanced movie data
      const enhanced = processedAnalysis.entities.featuredMovies.find(
        enhanced => enhanced.title.toLowerCase() === parsedMovie.title.toLowerCase() && 
        enhanced.year === parsedMovie.year
      );
      if (enhanced) {
        return {
          ...parsedMovie,
          poster_url: enhanced.poster_url,
          tmdb_id: enhanced.tmdb_id,
          streaming: enhanced.streaming || parsedMovie.streaming
        };
      }
    }
    return {
      ...parsedMovie,
      poster_url: '/images/placeholder-poster.jpg'
    };
  };

  // Render the complete alternating layout
  const renderAlternatingContent = () => {
    const content = [];
    let exploreIndex = 0;
    
    alternatingContent.forEach((section, sectionIndex) => {
      if (section.type === 'text') {
        // Check if content starts with a SUBHEAD (now part of text)
        const lines = section.content.split('\n');
        const firstLine = lines[0]?.trim();
        const restOfContent = lines.slice(1).join('\n').trim();
        
        // If first line looks like a subhead, render it as such
        if (firstLine && firstLine.toUpperCase() === firstLine && firstLine.length < 100) {
          content.push(
            <div key={`text-${sectionIndex}`}>
              {/* Subhead styling */}
              <div style={styles.subheadSection}>
                <h3 style={styles.subheadText}>{firstLine}</h3>
              </div>
              {/* Regular text content */}
              {restOfContent && (
                <div style={styles.paragraph}>
                  <ErrorBoundary level="section">
                    <EntityLinkedText
                      text={restOfContent}
                      linkingIntensity={linkingIntensity}
                      context="movie-analysis"
                      currentEntity={{
                        type: 'movie',
                        slug: movie?.slug,
                        title: movie?.title,
                      }}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          );
        } else {
          // Regular text content without subhead
          content.push(
            <div key={`text-${sectionIndex}`} style={styles.paragraph}>
              <ErrorBoundary level="section">
                <EntityLinkedText
                  text={section.content}
                  linkingIntensity={linkingIntensity}
                  context="movie-analysis"
                  currentEntity={{
                    type: 'movie',
                    slug: movie?.slug,
                    title: movie?.title,
                  }}
                />
              </ErrorBoundary>
            </div>
          );
        }
      } else if (section.type === 'subhead') {
        // Legacy standalone subhead handling (should not occur with new parsing)
        content.push(
          <div key={`subhead-${sectionIndex}`} style={styles.subheadSection}>
            <h3 style={styles.subheadText}>{section.content}</h3>
          </div>
        );
      } else if (section.type === 'movies') {
        // FEATURED FILMS section - filter out self-referential movies
        const enhancedMovies = section.movies
          .map(enhanceMovieData)
          .filter(movieItem => {
            // Remove self-referential movies by TMDB ID (most reliable)
            const currentTmdbId = movie?.id;
            const movieTmdbId = movieItem.tmdb_id;
            
            if (currentTmdbId && movieTmdbId && currentTmdbId == movieTmdbId) {
              return false;
            }
            
            // Fallback: Remove by title comparison (case-insensitive)
            const currentTitle = movie?.title?.toLowerCase().trim();
            const movieTitle = movieItem.title?.toLowerCase().trim();
            if (currentTitle && movieTitle && currentTitle === movieTitle) {
              return false;
            }
            
            return true;
          });
        
        // Only render section if there are movies to show after filtering
        if (enhancedMovies.length > 0) {
          content.push(
            <div key={`movies-${sectionIndex}`} style={styles.movieSection}>
              <div style={styles.movieSectionHeader}>
                <div style={styles.sectionDivider} />
                <span style={styles.sectionLabel}>FEATURED FILMS</span>
                <div style={styles.sectionDivider} />
              </div>
              <div style={styles.movieList}>
                {enhancedMovies.map((movieItem, movieIndex) => (
                  <ErrorBoundary 
                    key={`featured-error-${sectionIndex}-${movieIndex}`} 
                    level="section"
                    fallback={MediaCardErrorFallback}
                  >
                    <MediaCard
                      key={`featured-${sectionIndex}-${movieIndex}`}
                      title={movieItem.title}
                      year={movieItem.year}
                      initialSlug={movieItem.slug}
                      initialPoster={movieItem.poster_url}
                      initialStreaming={movieItem.streaming}
                      tmdbId={movieItem.tmdb_id}
                    />
                  </ErrorBoundary>
                ))}
              </div>
            </div>
          );
        }
        
        // Add single EXPLORE FURTHER card after FEATURED FILMS
        if (exploreIndex < exploreTopics.length) {
          content.push(
            <div key={`explore-${sectionIndex}`} style={styles.exploreSection}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionDivider} />
                <span style={styles.sectionLabel}>EXPLORE FURTHER</span>
                <div style={styles.sectionDivider} />
              </div>
              <ErrorBoundary level="section" fallback={ExplorePromptErrorFallback}>
                <ExplorePromptCard 
                  prompt={exploreTopics[exploreIndex]}
                  contextPrefix={movie?.title}
                />
              </ErrorBoundary>
            </div>
          );
          exploreIndex++;
        }
      }
    });
    
    // Add remaining EXPLORE FURTHER cards if any
    if (exploreIndex < exploreTopics.length) {
      content.push(
        <div key="remaining-explore" style={styles.exploreSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionDivider} />
            <span style={styles.sectionLabel}>EXPLORE FURTHER</span>
            <div style={styles.sectionDivider} />
          </div>
          <div style={styles.exploreGrid}>
            {exploreTopics.slice(exploreIndex).map((topic, index) => (
              <ErrorBoundary 
                key={`remaining-error-${index}`} 
                level="section"
                fallback={ExplorePromptErrorFallback}
              >
                <ExplorePromptCard 
                  key={`remaining-${index}`}
                  prompt={topic}
                  contextPrefix={movie?.title}
                />
              </ErrorBoundary>
            ))}
          </div>
        </div>
      );
    }
    
    // Add MORE IDEAS section - filter out self-referential movies
    if (moreIdeasMovies.length > 0) {
      const enhancedMoreIdeas = moreIdeasMovies
        .map(enhanceMovieData)
        .filter(movieItem => {
          // Remove self-referential movies (case-insensitive comparison)
          const currentTitle = movie?.title?.toLowerCase().trim();
          const movieTitle = movieItem.title?.toLowerCase().trim();
          return currentTitle && movieTitle && currentTitle !== movieTitle;
        });
      
      // Only render section if there are movies to show after filtering
      if (enhancedMoreIdeas.length > 0) {
        content.push(
          <div key="more-ideas" style={styles.movieSection}>
            <div style={styles.movieSectionHeader}>
              <div style={styles.sectionDivider} />
              <span style={styles.sectionLabel}>MORE IDEAS</span>
              <div style={styles.sectionDivider} />
            </div>
            <div style={styles.movieList}>
              {enhancedMoreIdeas.map((movieItem, movieIndex) => (
                <ErrorBoundary 
                  key={`more-ideas-error-${movieIndex}`} 
                  level="section"
                  fallback={MediaCardErrorFallback}
                >
                  <MediaCard
                    key={`more-ideas-${movieIndex}`}
                    title={movieItem.title}
                    year={movieItem.year}
                    initialSlug={movieItem.slug}
                    initialPoster={movieItem.poster_url}
                    initialStreaming={movieItem.streaming}
                    tmdbId={movieItem.tmdb_id}
                  />
                </ErrorBoundary>
              ))}
            </div>
          </div>
        );
      }
    }
    
    return content;
  };

  return (
    <div style={styles.container}>
      {/* Modern Alternating Layout: Text -> Featured Films -> Explore Further -> Repeat */}
      <div style={styles.analysisContent}>
        {renderAlternatingContent()}
      </div>

      {/* Entity Statistics (Debug/Admin View) */}
      {entityStats && process.env.NODE_ENV === 'development' && (
        <div style={styles.debugStats}>
          <strong>Entity Stats:</strong> {entityStats.totalEntities} total ({entityStats.movies}{' '}
          movies, {entityStats.people} people)
          {processedAnalysis.processedAt && (
            <span style={{ marginLeft: '8px' }}>
              • Processed: {new Date(processedAnalysis.processedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Error Display */}
      {processedAnalysis.error && (
        <div style={styles.errorDisplay}>
          <p style={styles.errorText}>Entity linking error: {processedAnalysis.error}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  analysisContent: {
    marginBottom: '24px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#374151',
    marginBottom: '16px',
  },
  movieReferencesSection: {
    marginTop: '32px',
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px',
  },
  sectionDivider: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
  },
  movieReferences: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  movieReference: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  movieTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  movieDescription: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#6b7280',
  },
  movieSection: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  movieSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  exploreSection: {
    marginTop: '32px',
  },
  subheadSection: {
    marginTop: '24px',
    marginBottom: '16px',
  },
  subheadText: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#d4af37',
    margin: 0,
    textAlign: 'left',
  },
  exploreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '12px',
  },
  exploreTopic: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd',
  },
  exploreText: {
    fontSize: '14px',
    color: '#0c4a6e',
    fontWeight: '500',
  },
  debugStats: {
    marginTop: '24px',
    padding: '12px',
    backgroundColor: '#fefce8',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#92400e',
  },
  errorDisplay: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
  },
  errorText: {
    fontSize: '14px',
    color: '#dc2626',
  },
};

// Render JSON format analysis with proper alternating layout
function renderJsonAnalysis(jsonData, movie, linkingIntensity, className, isVisible) {
  const enhanceMovieWithTmdb = (movieItem) => {
    // Enhanced movie data should come from the linking process
    // For now, use the data as provided by the JSON structure
    return {
      ...movieItem,
      poster_url: movieItem.poster_url || '/images/placeholder-poster.jpg',
      slug: movieItem.description || null,
      streaming: movieItem.streaming || null,
      tmdb_id: movieItem.tmdb_id || null
    };
  };

  const filterSelfReferential = (moviesList) => {
    return moviesList.filter(movieItem => {
      const currentTitle = movie?.title?.toLowerCase().trim();
      const movieTitle = movieItem.title?.toLowerCase().trim();
      const currentTmdbId = movie?.id;
      const movieTmdbId = movieItem.tmdb_id;
      
      // Filter by TMDB ID first (most reliable)
      if (currentTmdbId && movieTmdbId && currentTmdbId == movieTmdbId) {
        return false;
      }
      
      // Fallback: filter by title
      if (currentTitle && movieTitle && currentTitle === movieTitle) {
        return false;
      }
      
      return true;
    });
  };

  // Build alternating content pattern
  const content = [];
  
  // Get data arrays with filtering
  const textSections = jsonData.content || [];
  const featuredMovies = filterSelfReferential(
    (jsonData.featuredMovies || []).map(enhanceMovieWithTmdb)
  );
  const exploreTopics = jsonData.exploreTopics || [];
  const moreIdeas = filterSelfReferential(
    (jsonData.moreIdeas || []).map(enhanceMovieWithTmdb)
  );


  let exploreIndex = 0;
  let movieGroupIndex = 0;
  const moviesPerGroup = 2; // Split featured movies into groups

  // Create alternating pattern: Text → Featured Films → Text → Explore Further → Repeat
  textSections.forEach((section, textIndex) => {
    // Add text section
    content.push(
      <div key={`json-text-${textIndex}`} style={styles.paragraph} data-testid={`section-${section.type}`}>
        <ErrorBoundary level="section">
          <EntityLinkedText
            text={section.text}
            linkingIntensity={linkingIntensity}
            context="movie-analysis"
            currentEntity={{
              type: 'movie',
              slug: movie?.slug,
              title: movie?.title,
            }}
          />
        </ErrorBoundary>
      </div>
    );

    // Add SUBHEAD support based on content section type
    if (section.type === 'technicalAnalysis' || section.type === 'legacyAndImpact') {
      const subheadText = section.type === 'technicalAnalysis' 
        ? 'Technical Excellence'
        : 'Legacy and Modern Impact';
      
      content.push(
        <div key={`subhead-${textIndex}`} style={styles.subheadSection}>
          <h3 style={styles.subheadText}>{subheadText}</h3>
        </div>
      );
    }

    // Add featured movies at strategic points (after intro and technical analysis)
    if ((textIndex === 1 || textIndex === 3) && featuredMovies.length > 0) {
      const startIndex = movieGroupIndex * moviesPerGroup;
      const endIndex = Math.min(startIndex + moviesPerGroup, featuredMovies.length);
      const movieGroup = featuredMovies.slice(startIndex, endIndex);

      if (movieGroup.length > 0) {
        content.push(
          <div key={`json-featured-${movieGroupIndex}`} style={styles.movieSection}>
            <div style={styles.movieSectionHeader}>
              <div style={styles.sectionDivider} />
              <span style={styles.sectionLabel}>FEATURED FILMS</span>
              <div style={styles.sectionDivider} />
            </div>
            <div style={styles.movieList}>
              {movieGroup.map((movieItem, movieIndex) => (
                <ErrorBoundary 
                  key={`json-featured-error-${movieGroupIndex}-${movieIndex}`} 
                  level="section"
                  fallback={MediaCardErrorFallback}
                >
                  <div data-testid="featured-movie-card">
                    <MediaCard
                      key={`json-featured-${movieGroupIndex}-${movieIndex}`}
                      title={movieItem.title}
                      year={movieItem.year}
                      initialSlug={movieItem.slug}
                      initialPoster={movieItem.poster_url}
                      initialStreaming={movieItem.streaming}
                      tmdbId={movieItem.tmdb_id}
                    />
                  </div>
                </ErrorBoundary>
              ))}
            </div>
          </div>
        );
        movieGroupIndex++;
      }
    }

    // Add single explore topic after featured movies (alternating pattern)
    if ((textIndex === 2 || textIndex === 4) && exploreIndex < exploreTopics.length) {
      const topic = exploreTopics[exploreIndex];
      content.push(
        <div key={`json-explore-single-${exploreIndex}`} style={styles.exploreSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionDivider} />
            <span style={styles.sectionLabel}>EXPLORE FURTHER</span>
            <div style={styles.sectionDivider} />
          </div>
          <ErrorBoundary 
            level="section"
            fallback={ExplorePromptErrorFallback}
          >
            <div data-testid="explore-topic-card">
              <ExplorePromptCard 
                prompt={`${topic.topic} (${topic.category})`}
                contextPrefix={movie?.title}
              />
            </div>
          </ErrorBoundary>
        </div>
      );
      exploreIndex++;
    }
  });

  // Add remaining featured movies if any
  if (movieGroupIndex * moviesPerGroup < featuredMovies.length) {
    const remainingMovies = featuredMovies.slice(movieGroupIndex * moviesPerGroup);
    content.push(
      <div key="json-featured-remaining" style={styles.movieSection}>
        <div style={styles.movieSectionHeader}>
          <div style={styles.sectionDivider} />
          <span style={styles.sectionLabel}>FEATURED FILMS</span>
          <div style={styles.sectionDivider} />
        </div>
        <div style={styles.movieList}>
          {remainingMovies.map((movieItem, movieIndex) => (
            <ErrorBoundary 
              key={`json-featured-remaining-error-${movieIndex}`} 
              level="section"
              fallback={MediaCardErrorFallback}
            >
              <div data-testid="featured-movie-card">
                <MediaCard
                  key={`json-featured-remaining-${movieIndex}`}
                  title={movieItem.title}
                  year={movieItem.year}
                  initialSlug={movieItem.slug}
                  initialPoster={movieItem.poster_url}
                  initialStreaming={movieItem.streaming}
                  tmdbId={movieItem.tmdb_id}
                />
              </div>
            </ErrorBoundary>
          ))}
        </div>
      </div>
    );
  }

  // Add remaining explore topics
  if (exploreIndex < exploreTopics.length) {
    const remainingTopics = exploreTopics.slice(exploreIndex);
    content.push(
      <div key="json-explore-remaining" style={styles.exploreSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionDivider} />
          <span style={styles.sectionLabel}>EXPLORE FURTHER</span>
          <div style={styles.sectionDivider} />
        </div>
        <div style={styles.exploreGrid}>
          {remainingTopics.map((topic, index) => (
            <ErrorBoundary 
              key={`json-explore-remaining-error-${index}`} 
              level="section"
              fallback={ExplorePromptErrorFallback}
            >
              <div data-testid="explore-topic-card">
                <ExplorePromptCard 
                  key={`json-explore-remaining-${index}`}
                  prompt={`${topic.topic} (${topic.category})`}
                  contextPrefix={movie?.title}
                />
              </div>
            </ErrorBoundary>
          ))}
        </div>
      </div>
    );
  }

  // Add MORE IDEAS section at the end
  if (moreIdeas.length > 0) {
    content.push(
      <div key="json-more-ideas" style={styles.movieSection}>
        <div style={styles.movieSectionHeader}>
          <div style={styles.sectionDivider} />
          <span style={styles.sectionLabel}>MORE IDEAS</span>
          <div style={styles.sectionDivider} />
        </div>
        <div style={styles.movieList}>
          {moreIdeas.map((movieItem, movieIndex) => (
            <ErrorBoundary 
              key={`json-more-error-${movieIndex}`} 
              level="section"
              fallback={MediaCardErrorFallback}
            >
              <div data-testid="more-ideas-movie-card">
                <MediaCard
                  key={`json-more-${movieIndex}`}
                  title={movieItem.title}
                  year={movieItem.year}
                  initialSlug={movieItem.connection}
                  initialPoster={movieItem.poster_url}
                  initialStreaming={movieItem.streaming}
                  tmdbId={movieItem.tmdb_id}
                />
              </div>
            </ErrorBoundary>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className={className}>
      <div style={styles.analysisContent} data-testid="analysis-content">
        {content}
      </div>
    </div>
  );
}

// Hook for getting entity statistics
export function useEntityStats(analysis) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (analysis?.entity_linking_data?.entityData) {
      const entityData = analysis.entity_linking_data.entityData;
      setStats({
        totalEntities: entityData.total || 0,
        movies: entityData.movies?.length || 0,
        people: entityData.people?.length || 0,
        processedAt: analysis.entity_linking_data.processedAt,
      });
    }
  }, [analysis]);

  return stats;
}

// Component for displaying entity linking controls (admin/testing)
export function EntityLinkingControls({
  currentIntensity,
  onIntensityChange,
  showStats = false,
  stats = null,
}) {
  const intensityOptions = [
    { value: 'off', label: 'No Linking' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'conservative', label: 'Conservative' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'aggressive', label: 'Aggressive' },
  ];

  return (
    <div className="entity-linking-controls p-4 bg-gray-100 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Entity Linking Intensity
          </label>
          <select
            value={currentIntensity}
            onChange={e => onIntensityChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            {intensityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showStats && stats && (
          <div className="text-sm text-gray-600">
            <div>Entities: {stats.totalEntities}</div>
            <div>
              Movies: {stats.movies} | People: {stats.people}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
