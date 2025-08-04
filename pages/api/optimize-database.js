/**
 * Database Optimization API Endpoint
 *
 * Executes database index creation and performance optimization.
 * Protected endpoint that requires service role key for security.
 *
 * Features:
 * - Creates critical performance indexes
 * - Measures query performance improvements
 * - Provides optimization recommendations
 * - Comprehensive error handling and rollback
 */

import { getDatabaseOptimizer } from '../../lib/database-optimizer.js';
import {
  withErrorHandling,
  ApiErrors,
  successResponse,
  checkRateLimit,
} from '../../lib/api-utils.js';
import { getPerformanceMonitor } from '../../lib/performance-monitor.js';

/**
 * Database optimization handler
 *
 * Executes comprehensive database optimization including:
 * - Critical index creation
 * - Performance measurement
 * - Query optimization recommendations
 *
 * @param {Object} req - API request
 * @param {Object} res - API response
 */
async function optimizeDatabaseHandler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    throw ApiErrors.BAD_REQUEST('Only POST method is allowed');
  }

  // Security check - require service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw ApiErrors.SERVICE_UNAVAILABLE('Database optimization requires service role access');
  }

  // Rate limiting for database operations
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  checkRateLimit(clientIP, 5, 3600000); // 5 requests per hour

  const monitor = getPerformanceMonitor();
  const optimizer = getDatabaseOptimizer();
  const startTime = Date.now();

  try {
    console.log('🚀 Starting database optimization process...');

    // Get current query statistics before optimization
    const preOptimizationStats = optimizer.getQueryStats();

    // Execute database optimization
    const optimizationResult = await optimizer.optimizeDatabase();

    // Test query performance after optimization
    const performanceTests = await runPerformanceTests(optimizer);

    // Generate optimization recommendations
    const recommendations = optimizer.generateOptimizationRecommendations();

    // Get updated query statistics
    const postOptimizationStats = optimizer.getQueryStats();

    const totalDuration = Date.now() - startTime;

    // Track the optimization process
    monitor.trackMetric('database_optimization_complete', totalDuration, {
      indexes_created: optimizationResult.total_indexes_created,
      performance_improvement: calculatePerformanceImprovement(
        preOptimizationStats,
        postOptimizationStats
      ),
      recommendations_count: recommendations.length,
    });

    const response = successResponse(
      {
        optimization_result: optimizationResult,
        performance_tests: performanceTests,
        recommendations: recommendations,
        statistics: {
          pre_optimization: preOptimizationStats,
          post_optimization: postOptimizationStats,
          duration: totalDuration,
        },
        summary: {
          indexes_created: optimizationResult.total_indexes_created,
          duration_ms: totalDuration,
          performance_improvement: calculatePerformanceImprovement(
            preOptimizationStats,
            postOptimizationStats
          ),
          next_steps: generateNextSteps(recommendations),
        },
      },
      'Database optimization completed successfully'
    );

    console.log(`✅ Database optimization completed in ${totalDuration}ms`);
    console.log(`📊 Created ${optimizationResult.total_indexes_created} indexes`);
    console.log(`💡 Generated ${recommendations.length} optimization recommendations`);

    res.status(200).json(response);
  } catch (error) {
    console.error('💥 Database optimization failed:', error);

    // Track the failure
    monitor.trackMetric('database_optimization_error', Date.now() - startTime, {
      error: error.message,
      error_type: error.name,
    });

    // Re-throw if it's already an ApiError
    if (error.name === 'ApiError') {
      throw error;
    }

    // Generic error
    throw ApiErrors.INTERNAL_ERROR(`Database optimization failed: ${error.message}`);
  }
}

/**
 * Run performance tests to measure optimization impact
 */
async function runPerformanceTests(optimizer) {
  console.log('🧪 Running performance tests...');

  const tests = [];

  try {
    // Test 1: Movie lookup by title and year
    const movieLookupStart = Date.now();
    await optimizer.lookupMovie('The Godfather', 1972);
    tests.push({
      test: 'movie_title_year_lookup',
      duration: Date.now() - movieLookupStart,
      status: 'success',
    });
  } catch (error) {
    tests.push({
      test: 'movie_title_year_lookup',
      duration: -1,
      status: 'error',
      error: error.message,
    });
  }

  try {
    // Test 2: TMDB ID lookup
    const tmdbLookupStart = Date.now();
    await optimizer.lookupMovieByTmdbId(238); // The Godfather
    tests.push({
      test: 'movie_tmdb_lookup',
      duration: Date.now() - tmdbLookupStart,
      status: 'success',
    });
  } catch (error) {
    tests.push({
      test: 'movie_tmdb_lookup',
      duration: -1,
      status: 'error',
      error: error.message,
    });
  }

  try {
    // Test 3: Fuzzy search
    const searchStart = Date.now();
    await optimizer.searchMovies('godfather', 10);
    tests.push({
      test: 'movie_fuzzy_search',
      duration: Date.now() - searchStart,
      status: 'success',
    });
  } catch (error) {
    tests.push({
      test: 'movie_fuzzy_search',
      duration: -1,
      status: 'error',
      error: error.message,
    });
  }

  try {
    // Test 4: Cache cleanup
    const cleanupStart = Date.now();
    await optimizer.cleanupExpiredCache();
    tests.push({
      test: 'cache_cleanup',
      duration: Date.now() - cleanupStart,
      status: 'success',
    });
  } catch (error) {
    tests.push({
      test: 'cache_cleanup',
      duration: -1,
      status: 'error',
      error: error.message,
    });
  }

  const averagePerformance =
    tests
      .filter(t => t.status === 'success' && t.duration > 0)
      .reduce((sum, t) => sum + t.duration, 0) / tests.filter(t => t.status === 'success').length;

  console.log(
    `🧪 Performance tests completed - average query time: ${averagePerformance?.toFixed(1) || 'N/A'}ms`
  );

  return {
    tests,
    average_query_time: averagePerformance || null,
    successful_tests: tests.filter(t => t.status === 'success').length,
    total_tests: tests.length,
  };
}

/**
 * Calculate performance improvement percentage
 */
function calculatePerformanceImprovement(preStats, postStats) {
  if (Object.keys(preStats).length === 0 || Object.keys(postStats).length === 0) {
    return null;
  }

  const improvements = [];

  for (const queryName of Object.keys(preStats)) {
    if (postStats[queryName]) {
      const preAvg = preStats[queryName].averageTime;
      const postAvg = postStats[queryName].averageTime;

      if (preAvg > 0 && postAvg > 0) {
        const improvement = ((preAvg - postAvg) / preAvg) * 100;
        improvements.push(improvement);
      }
    }
  }

  if (improvements.length === 0) {
    return null;
  }

  return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
}

/**
 * Generate next steps based on optimization results
 */
function generateNextSteps(recommendations) {
  const steps = [];

  if (recommendations.length === 0) {
    steps.push('✅ No immediate optimizations needed - monitor query performance');
  } else {
    steps.push(`📊 Review ${recommendations.length} optimization recommendations`);

    const slowQueries = recommendations.filter(r => r.type === 'slow_query');
    if (slowQueries.length > 0) {
      steps.push(`🐌 Address ${slowQueries.length} slow queries identified`);
    }

    const frequentSlow = recommendations.filter(r => r.type === 'frequent_slow_queries');
    if (frequentSlow.length > 0) {
      steps.push(`⚠️ Investigate ${frequentSlow.length} frequently slow query patterns`);
    }
  }

  steps.push('📈 Continue monitoring query performance with automated alerts');
  steps.push('🔄 Schedule regular optimization reviews');

  return steps;
}

// Export the wrapped handler
export default withErrorHandling(optimizeDatabaseHandler);
