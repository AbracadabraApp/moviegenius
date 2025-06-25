// components/MovieAnalysisWithEntities.js
/**
 * Enhanced movie analysis component with entity linking
 * Displays movie analyses with moderate confidence entity links
 */

import { useState, useEffect } from 'react';
import EntityLinkedText from './EntityLinkedText';

export default function MovieAnalysisWithEntities({ 
  analysis, 
  movie,
  linkingIntensity = 'moderate',
  className = ''
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
        // Use pre-processed entities
        setProcessedAnalysis({
          content: content,
          entities: entityData.entityData,
          processedAt: entityData.processedAt
        });
        
        setEntityStats({
          totalEntities: entityData.entityData?.total || 0,
          movies: entityData.entityData?.movies?.length || 0,
          people: entityData.entityData?.people?.length || 0
        });
      } else {
        // Fallback to real-time processing
        setProcessedAnalysis({
          content: content,
          entities: null,
          realTime: true
        });
      }
      
    } catch (error) {
      console.error('Error processing analysis:', error);
      setProcessedAnalysis({
        content: analysis.claude_response.raw_content,
        entities: null,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseAnalysisContent = (content) => {
    // Parse Claude's structured analysis format
    const sections = {
      paragraphs: [],
      movies: [],
      exploreTopics: [],
      moreIdeas: []
    };

    const lines = content.split('\n').filter(line => line.trim());
    const currentSection = 'paragraphs';

    for (const line of lines) {
      if (line.startsWith('PARAGRAPH:')) {
        sections.paragraphs.push(line.replace('PARAGRAPH:', '').trim());
      } else if (line.startsWith('MOVIES:')) {
        const movieData = line.replace('MOVIES:', '').trim();
        if (movieData) {
          sections.movies.push(movieData);
        }
      } else if (line.startsWith('EXPLORE_FURTHER:')) {
        sections.exploreTopics.push(line.replace('EXPLORE_FURTHER:', '').trim());
      } else if (line.startsWith('MORE_IDEAS:')) {
        sections.moreIdeas.push(line.replace('MORE_IDEAS:', '').trim());
      } else if (line.trim() && !line.includes(':')) {
        // Plain paragraph
        sections.paragraphs.push(line.trim());
      }
    }

    return sections;
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

  const sections = parseAnalysisContent(processedAnalysis.content);

  return (
    <div className={`movie-analysis-with-entities ${className}`}>
      {/* Main Analysis Content */}
      <div className="analysis-content space-y-4">
        {sections.paragraphs.map((paragraph, index) => (
          <div key={index} className="analysis-paragraph">
            <EntityLinkedText
              text={paragraph}
              linkingIntensity={linkingIntensity}
              context="movie-analysis"
              currentEntity={{
                type: 'movie',
                slug: movie?.slug,
                title: movie?.title
              }}
              className="text-gray-800 leading-relaxed"
            />
          </div>
        ))}
      </div>

      {/* Movie References */}
      {sections.movies.length > 0 && (
        <div className="movie-references mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Referenced Films</h3>
          <div className="space-y-2">
            {sections.movies.map((movieRef, index) => {
              const [title, year, description] = movieRef.split('|');
              return (
                <div key={index} className="movie-reference p-3 bg-gray-50 rounded-lg">
                  <EntityLinkedText
                    text={`${title} (${year})`}
                    linkingIntensity={linkingIntensity}
                    context="movie-reference"
                    className="font-medium text-gray-900"
                  />
                  {description && (
                    <EntityLinkedText
                      text={description}
                      linkingIntensity="conservative"
                      context="movie-description"
                      className="text-sm text-gray-600 mt-1"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exploration Topics */}
      {sections.exploreTopics.length > 0 && (
        <div className="explore-topics mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Explore Further</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.exploreTopics.map((topic, index) => (
              <div key={index} className="explore-topic p-3 bg-blue-50 rounded-lg">
                <EntityLinkedText
                  text={topic}
                  linkingIntensity="conservative"
                  context="exploration-topic"
                  className="text-sm text-blue-800"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Statistics (Debug/Admin View) */}
      {entityStats && process.env.NODE_ENV === 'development' && (
        <div className="entity-stats mt-6 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800">
          <strong>Entity Stats:</strong> {entityStats.totalEntities} total 
          ({entityStats.movies} movies, {entityStats.people} people)
          {processedAnalysis.processedAt && (
            <span className="ml-2">
              • Processed: {new Date(processedAnalysis.processedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Error Display */}
      {processedAnalysis.error && (
        <div className="error-display mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-red-700 text-sm">
            Entity linking error: {processedAnalysis.error}
          </p>
        </div>
      )}
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
        processedAt: analysis.entity_linking_data.processedAt
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
  stats = null
}) {
  const intensityOptions = [
    { value: 'off', label: 'No Linking' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'conservative', label: 'Conservative' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'aggressive', label: 'Aggressive' }
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
            onChange={(e) => onIntensityChange(e.target.value)}
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
            <div>Movies: {stats.movies} | People: {stats.people}</div>
          </div>
        )}
      </div>
    </div>
  );
}