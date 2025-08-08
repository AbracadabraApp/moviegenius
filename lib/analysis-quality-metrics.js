/**
 * Analysis Quality Metrics System
 * 
 * Tracks and aggregates quality metrics across all movie analyses
 * to monitor content standards and identify improvement opportunities.
 */

import { createClient } from './railway-adapter.js';
import { generateValidationReport } from './validation/analysis-validator.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Quality metrics aggregation for dashboard monitoring
 */
export class AnalysisQualityMetrics {
  constructor() {
    this.metricsCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Record quality metrics for a single analysis
   * @param {string} movieId - Movie identifier
   * @param {object} validationReport - Report from generateValidationReport
   * @param {object} metadata - Additional context (model, cost, etc.)
   */
  async recordAnalysisMetrics(movieId, validationReport, metadata = {}) {
    const qualityRecord = {
      movie_id: movieId,
      recorded_at: new Date().toISOString(),
      
      // Overall metrics
      overall_score: validationReport.overallScore,
      validation_status: validationReport.validationStatus,
      
      // Detailed scores by category
      structure_score: validationReport.requirements.structure.score,
      content_score: validationReport.requirements.content.score,
      formatting_score: validationReport.requirements.formatting.score,
      voice_score: validationReport.requirements.voice.score,
      
      // Content quality indicators
      word_count: validationReport.requirements.content.details.wordCount,
      film_references: validationReport.requirements.content.details.filmReferences,
      decade_coverage: validationReport.requirements.content.details.decadeSpread.length,
      technical_depth: validationReport.requirements.content.details.technicalDepth,
      cultural_impact: validationReport.requirements.content.details.culturalImpact,
      
      // Structure metrics
      paragraph_count: validationReport.requirements.structure.details.paragraphCount,
      movie_count: validationReport.requirements.structure.details.movieCount,
      explore_topic_count: validationReport.requirements.structure.details.exploreTopicCount,
      subhead_count: validationReport.requirements.structure.details.subheadCount,
      
      // Voice consistency
      generic_phrase_count: validationReport.requirements.voice.details.genericPhraseCount,
      banned_phrases: validationReport.requirements.voice.details.bannedPhrasesFound,
      direct_opening: validationReport.requirements.voice.details.directOpening,
      
      // Warnings and recommendations
      warning_count: validationReport.warnings.length,
      strength_count: validationReport.strengths.length,
      recommendation_count: validationReport.recommendations.length,
      
      // Metadata
      model_used: metadata.model || 'unknown',
      cost_estimate: metadata.cost || 0,
      generation_time: metadata.generationTime || 0,
      context_type: metadata.contextType || 'MOVIE_ANALYSIS',
    };

    try {
      const { error } = await supabase
        .from('analysis_quality_metrics')
        .insert(qualityRecord);

      if (error) {
        console.error('Failed to record quality metrics:', error);
        return false;
      }

      // Clear cache to refresh aggregated metrics
      this.metricsCache.clear();
      
      console.log(`📊 Quality metrics recorded for movie ${movieId}: ${validationReport.overallScore}/100`);
      return true;
    } catch (error) {
      console.error('Error recording quality metrics:', error);
      return false;
    }
  }

  /**
   * Get aggregated quality metrics for monitoring dashboard
   * @param {object} options - Filtering options (dateRange, contextType, etc.)
   */
  async getAggregatedMetrics(options = {}) {
    const cacheKey = JSON.stringify(options);
    
    // Check cache first
    if (this.metricsCache.has(cacheKey)) {
      const cached = this.metricsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    try {
      let query = supabase
        .from('analysis_quality_metrics')
        .select('*');

      // Apply filters
      if (options.dateRange) {
        const { start, end } = options.dateRange;
        query = query
          .gte('recorded_at', start)
          .lte('recorded_at', end);
      }

      if (options.contextType) {
        query = query.eq('context_type', options.contextType);
      }

      if (options.validationStatus) {
        query = query.eq('validation_status', options.validationStatus);
      }

      const { data: metrics, error } = await query;

      if (error) throw error;

      // Calculate aggregated statistics
      const aggregated = this.calculateAggregatedStats(metrics);
      
      // Cache the results
      this.metricsCache.set(cacheKey, {
        data: aggregated,
        timestamp: Date.now()
      });

      return aggregated;
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
      return null;
    }
  }

  /**
   * Calculate aggregated statistics from raw metrics data
   */
  calculateAggregatedStats(metrics) {
    if (!metrics || metrics.length === 0) {
      return {
        totalAnalyses: 0,
        averageScore: 0,
        qualityDistribution: { PASSED: 0, WARNING: 0, FAILED: 0 },
        trends: {},
        insights: []
      };
    }

    const totalAnalyses = metrics.length;
    
    // Overall score statistics
    const scores = metrics.map(m => m.overall_score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalAnalyses;
    const medianScore = scores.sort((a, b) => a - b)[Math.floor(totalAnalyses / 2)];
    
    // Quality distribution
    const qualityDistribution = metrics.reduce((dist, m) => {
      dist[m.validation_status] = (dist[m.validation_status] || 0) + 1;
      return dist;
    }, { PASSED: 0, WARNING: 0, FAILED: 0 });

    // Category averages
    const categoryAverages = {
      structure: metrics.reduce((sum, m) => sum + m.structure_score, 0) / totalAnalyses,
      content: metrics.reduce((sum, m) => sum + m.content_score, 0) / totalAnalyses,
      formatting: metrics.reduce((sum, m) => sum + m.formatting_score, 0) / totalAnalyses,
      voice: metrics.reduce((sum, m) => sum + m.voice_score, 0) / totalAnalyses,
    };

    // Content quality indicators
    const contentMetrics = {
      averageWordCount: metrics.reduce((sum, m) => sum + m.word_count, 0) / totalAnalyses,
      averageFilmReferences: metrics.reduce((sum, m) => sum + m.film_references, 0) / totalAnalyses,
      averageDecadeCoverage: metrics.reduce((sum, m) => sum + m.decade_coverage, 0) / totalAnalyses,
      technicalDepthPercentage: (metrics.filter(m => m.technical_depth).length / totalAnalyses) * 100,
      culturalImpactPercentage: (metrics.filter(m => m.cultural_impact).length / totalAnalyses) * 100,
    };

    // Voice consistency metrics
    const voiceMetrics = {
      averageGenericPhrases: metrics.reduce((sum, m) => sum + m.generic_phrase_count, 0) / totalAnalyses,
      directOpeningPercentage: (metrics.filter(m => m.direct_opening).length / totalAnalyses) * 100,
      cleanVoicePercentage: (metrics.filter(m => m.generic_phrase_count === 0).length / totalAnalyses) * 100,
    };

    // Cost and performance metrics
    const performanceMetrics = {
      averageCost: metrics.reduce((sum, m) => sum + (m.cost_estimate || 0), 0) / totalAnalyses,
      averageGenerationTime: metrics.reduce((sum, m) => sum + (m.generation_time || 0), 0) / totalAnalyses,
      modelDistribution: metrics.reduce((dist, m) => {
        dist[m.model_used] = (dist[m.model_used] || 0) + 1;
        return dist;
      }, {}),
    };

    // Generate insights based on metrics
    const insights = this.generateQualityInsights({
      averageScore,
      qualityDistribution,
      categoryAverages,
      contentMetrics,
      voiceMetrics,
      totalAnalyses
    });

    return {
      totalAnalyses,
      averageScore: Math.round(averageScore * 10) / 10,
      medianScore,
      qualityDistribution,
      categoryAverages,
      contentMetrics,
      voiceMetrics,
      performanceMetrics,
      insights,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate actionable insights from quality metrics
   */
  generateQualityInsights(stats) {
    const insights = [];

    // Overall quality assessment
    if (stats.averageScore >= 85) {
      insights.push({
        type: 'success',
        category: 'overall',
        message: `Excellent overall quality with ${stats.averageScore}/100 average score`,
        priority: 'low'
      });
    } else if (stats.averageScore < 70) {
      insights.push({
        type: 'warning',
        category: 'overall',
        message: `Below-target quality with ${stats.averageScore}/100 average score`,
        priority: 'high',
        recommendation: 'Review prompt engineering and validation thresholds'
      });
    }

    // Category-specific insights
    const weakestCategory = Object.entries(stats.categoryAverages)
      .sort(([,a], [,b]) => a - b)[0];
    
    if (weakestCategory[1] < 20) {
      insights.push({
        type: 'warning',
        category: weakestCategory[0],
        message: `${weakestCategory[0]} category needs attention (${weakestCategory[1]}/25 average)`,
        priority: 'high',
        recommendation: `Focus on ${weakestCategory[0]} requirements in prompt engineering`
      });
    }

    // Content quality insights
    if (stats.contentMetrics.averageWordCount < 750) {
      insights.push({
        type: 'info',
        category: 'content',
        message: `Content length below target (${Math.round(stats.contentMetrics.averageWordCount)} words average)`,
        priority: 'medium',
        recommendation: 'Encourage more detailed analysis in prompts'
      });
    }

    if (stats.contentMetrics.averageFilmReferences < 4) {
      insights.push({
        type: 'warning',
        category: 'content',
        message: `Insufficient film references (${stats.contentMetrics.averageFilmReferences} average)`,
        priority: 'high',
        recommendation: 'Emphasize specific film examples in analysis requirements'
      });
    }

    // Voice consistency insights
    if (stats.voiceMetrics.cleanVoicePercentage < 80) {
      insights.push({
        type: 'warning',
        category: 'voice',
        message: `${Math.round(100 - stats.voiceMetrics.cleanVoicePercentage)}% of analyses contain generic phrases`,
        priority: 'medium',
        recommendation: 'Strengthen voice consistency training in prompts'
      });
    }

    // Quality distribution insights
    const failureRate = (stats.qualityDistribution.FAILED / stats.totalAnalyses) * 100;
    if (failureRate > 10) {
      insights.push({
        type: 'error',
        category: 'quality',
        message: `High failure rate: ${Math.round(failureRate)}% of analyses failing validation`,
        priority: 'high',
        recommendation: 'Review validation criteria and prompt requirements'
      });
    }

    return insights;
  }

  /**
   * Get quality trends over time
   * @param {number} days - Number of days to analyze
   */
  async getQualityTrends(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: metrics, error } = await supabase
        .from('analysis_quality_metrics')
        .select('recorded_at, overall_score, validation_status')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by day and calculate daily averages
      const dailyMetrics = metrics.reduce((acc, metric) => {
        const day = metric.recorded_at.split('T')[0];
        if (!acc[day]) {
          acc[day] = { scores: [], total: 0, passed: 0 };
        }
        acc[day].scores.push(metric.overall_score);
        acc[day].total++;
        if (metric.validation_status === 'PASSED') {
          acc[day].passed++;
        }
        return acc;
      }, {});

      const trends = Object.entries(dailyMetrics).map(([date, data]) => {
        const averageScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        const passRate = (data.passed / data.total) * 100;
        
        return {
          date,
          averageScore: Math.round(averageScore * 10) / 10,
          passRate: Math.round(passRate * 10) / 10,
          totalAnalyses: data.total
        };
      });

      return trends;
    } catch (error) {
      console.error('Error fetching quality trends:', error);
      return [];
    }
  }

  /**
   * Get detailed metrics for a specific movie analysis
   * @param {string} movieId - Movie identifier
   */
  async getMovieQualityMetrics(movieId) {
    try {
      const { data: metrics, error } = await supabase
        .from('analysis_quality_metrics')
        .select('*')
        .eq('movie_id', movieId)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      return metrics[0] || null;
    } catch (error) {
      console.error('Error fetching movie quality metrics:', error);
      return null;
    }
  }
}

// Export singleton instance
export const qualityMetrics = new AnalysisQualityMetrics();
export default qualityMetrics;