// components/MovieAnalysisWithEntities.js
/**
 * Enhanced movie analysis component with entity linking
 * Displays movie analyses with moderate confidence entity links
 */

import { useState, useEffect } from 'react';
import EntityLinkedText from './EntityLinkedText';
import MediaCard from './MediaCard';
import ExplorePromptCard from './ExplorePromptCard';

export default function MovieAnalysisWithEntities({
  analysis,
  movie,
  linkingIntensity = 'moderate',
  className = '',
}) {
  const [processedAnalysis, setProcessedAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entityStats, setEntityStats] = useState(null);

  useEffect(() => {
    if (!analysis?.claude_response?.raw_content) {
      setIsLoading(false);
      return;
    }

    processAnalysisContent();
  }, [analysis, linkingIntensity]);

  const processAnalysisContent = async () => {
    try {
      setIsLoading(true);

      const content = analysis.claude_response.raw_content;

      // Check if we have pre-processed entity data
      const entityData = analysis.entity_linking_data;

      if (entityData) {
        // Convert entity data to the format expected by MediaCards
        const entities = entityData.entityData || entityData;
        
        // Handle both old entity format and new movieData format
        let featuredMovies = [];
        
        if (entities.featuredMovies) {
          // New movieData format: featuredMovies array with direct properties
          featuredMovies = entities.featuredMovies.map(movie => ({
            title: movie.title,
            year: movie.year,
            slug: movie.slug,
            poster_url: movie.poster_url,
            streaming: movie.streaming,
            tmdb_id: movie.tmdb_id
          })).filter(movie => movie.title && movie.year);
        } else if (entities.movies) {
          // Old entity format: movies array with nested movie objects
          featuredMovies = entities.movies.map(movie => ({
            title: movie.movie?.title || movie.title,
            year: movie.movie?.year || movie.year,
            slug: movie.movie?.slug,
            poster_url: movie.movie?.poster_url,
            streaming: movie.movie?.streaming_data,
            tmdb_id: movie.movie?.tmdb_id
          })).filter(movie => movie.title && movie.year);
        }

        // Use pre-processed entities
        setProcessedAnalysis({
          content: content,
          entities: {
            ...entities,
            featuredMovies: featuredMovies
          },
          processedAt: entityData.processedAt,
        });

        setEntityStats({
          totalEntities: entityData.entityData?.total || 0,
          movies: entityData.entityData?.movies?.length || 0,
          people: entityData.entityData?.people?.length || 0,
        });
      } else {
        // Fallback to real-time processing
        setProcessedAnalysis({
          content: content,
          entities: null,
          realTime: true,
        });
      }
    } catch (error) {
      console.error('Error processing analysis:', error);
      setProcessedAnalysis({
        content: analysis.claude_response.raw_content,
        entities: null,
        error: error.message,
      });
    } finally {
      setIsLoading(false);
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
        // CLEAN BOUNDARY: Flush all pending content before SUBHEAD
        flushPendingContent();
        
        // Add SUBHEAD as separate section
        alternatingContent.push({ 
          type: 'subhead', 
          content: trimmed.replace('SUBHEAD:', '').trim() 
        });
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

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (!processedAnalysis) {
    return (
      <div className={className}>
        <p className="text-gray-500">No analysis content available.</p>
      </div>
    );
  }

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
        // Text content
        content.push(
          <div key={`text-${sectionIndex}`} style={styles.paragraph}>
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
          </div>
        );
      } else if (section.type === 'subhead') {
        // SUBHEAD section with gold all-caps styling
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
            // Remove self-referential movies (case-insensitive comparison)
            const currentTitle = movie?.title?.toLowerCase().trim();
            const movieTitle = movieItem.title?.toLowerCase().trim();
            return currentTitle && movieTitle && currentTitle !== movieTitle;
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
                  <MediaCard
                    key={`featured-${sectionIndex}-${movieIndex}`}
                    title={movieItem.title}
                    year={movieItem.year}
                    initialSlug={movieItem.slug}
                    initialPoster={movieItem.poster_url}
                    initialStreaming={movieItem.streaming}
                    tmdbId={movieItem.tmdb_id}
                  />
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
              <ExplorePromptCard 
                prompt={exploreTopics[exploreIndex]}
                contextPrefix={movie?.title}
              />
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
              <ExplorePromptCard 
                key={`remaining-${index}`}
                prompt={topic}
                contextPrefix={movie?.title}
              />
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
                <MediaCard
                  key={`more-ideas-${movieIndex}`}
                  title={movieItem.title}
                  year={movieItem.year}
                  initialSlug={movieItem.slug}
                  initialPoster={movieItem.poster_url}
                  initialStreaming={movieItem.streaming}
                  tmdbId={movieItem.tmdb_id}
                />
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
    padding: '16px',
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
