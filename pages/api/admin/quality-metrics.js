/**
 * Quality Metrics Dashboard API
 * 
 * Provides aggregated quality metrics for monitoring analysis standards
 * and identifying improvement opportunities.
 */

import { qualityMetrics } from '../../../lib/analysis-quality-metrics.js';
import { withErrorHandling, successResponse } from '../../../lib/api-utils.js';

async function qualityMetricsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      period = '7d',
      contextType,
      status,
      movieId 
    } = req.query;

    // Handle specific movie metrics request
    if (movieId) {
      const movieMetrics = await qualityMetrics.getMovieQualityMetrics(movieId);
      return successResponse(res, {
        movieId,
        metrics: movieMetrics
      });
    }

    // Parse period into date range
    const dateRange = parsePeriod(period);
    
    // Build filter options
    const options = {
      dateRange,
      ...(contextType && { contextType }),
      ...(status && { validationStatus: status })
    };

    // Get aggregated metrics
    const [aggregated, trends] = await Promise.all([
      qualityMetrics.getAggregatedMetrics(options),
      qualityMetrics.getQualityTrends(getDaysFromPeriod(period))
    ]);

    if (!aggregated) {
      return res.status(500).json({ error: 'Failed to fetch quality metrics' });
    }

    // Add period info to response
    const response = {
      period,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      filters: {
        contextType: contextType || 'all',
        status: status || 'all'
      },
      aggregated,
      trends,
      summary: {
        totalAnalyses: aggregated.totalAnalyses,
        averageScore: aggregated.averageScore,
        passRate: aggregated.totalAnalyses > 0 
          ? Math.round((aggregated.qualityDistribution.PASSED / aggregated.totalAnalyses) * 100)
          : 0,
        topConcerns: aggregated.insights
          .filter(insight => insight.priority === 'high')
          .slice(0, 3),
        recentTrend: calculateTrend(trends)
      }
    };

    return successResponse(res, response);
  } catch (error) {
    console.error('Quality metrics API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch quality metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Parse period string into date range
 */
function parsePeriod(period) {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '1d':
      start.setDate(start.getDate() - 1);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

/**
 * Get number of days from period string
 */
function getDaysFromPeriod(period) {
  switch (period) {
    case '1d': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
}

/**
 * Calculate trend direction from recent data
 */
function calculateTrend(trends) {
  if (trends.length < 2) {
    return { direction: 'stable', change: 0 };
  }

  const recent = trends.slice(-7); // Last 7 days
  const older = trends.slice(-14, -7); // Previous 7 days
  
  if (recent.length === 0 || older.length === 0) {
    return { direction: 'stable', change: 0 };
  }

  const recentAvg = recent.reduce((sum, day) => sum + day.averageScore, 0) / recent.length;
  const olderAvg = older.reduce((sum, day) => sum + day.averageScore, 0) / older.length;
  
  const change = recentAvg - olderAvg;
  
  let direction = 'stable';
  if (change > 2) direction = 'improving';
  else if (change < -2) direction = 'declining';
  
  return {
    direction,
    change: Math.round(change * 10) / 10,
    recentAverage: Math.round(recentAvg * 10) / 10,
    previousAverage: Math.round(olderAvg * 10) / 10
  };
}

export default withErrorHandling(qualityMetricsHandler);