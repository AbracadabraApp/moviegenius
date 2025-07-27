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
        // Use pre-processed entities
        setProcessedAnalysis({
          content: content,
          entities: entityData.entityData,
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

  const parseAnalysisContent = content => {
    // Parse Claude's structured analysis format
    const sections = {
      paragraphs: [],
      movies: [],
      exploreTopics: [],
      moreIdeas: [],
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
    <div style={styles.container}>
      {/* Main Analysis Content */}
      <div style={styles.analysisContent}>
        {sections.paragraphs.map((paragraph, index) => (
          <div key={index} style={styles.paragraph}>
            <EntityLinkedText
              text={paragraph}
              linkingIntensity={linkingIntensity}
              context="movie-analysis"
              currentEntity={{
                type: 'movie',
                slug: movie?.slug,
                title: movie?.title,
              }}
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
                  />
                  {description && (
                    <EntityLinkedText
                      text={description}
                      linkingIntensity="conservative"
                      context="movie-description"
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
        <div style={styles.exploreSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionDivider} />
            <span style={styles.sectionLabel}>EXPLORE FURTHER</span>
            <div style={styles.sectionDivider} />
          </div>
          <div style={styles.exploreGrid}>
            {sections.exploreTopics.map((topic, index) => (
              <div key={index} style={styles.exploreTopic}>
                <div style={styles.exploreText}>
                  <EntityLinkedText
                    text={topic}
                    linkingIntensity="conservative"
                    context="exploration-topic"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
  exploreSection: {
    marginTop: '32px',
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
