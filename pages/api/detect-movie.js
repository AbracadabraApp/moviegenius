/**
 * Movie Detection API for Ask Queries
 *
 * Analyzes queries to detect if they're simple movie queries that should redirect
 * Returns redirect information if movie detected, otherwise allows normal Ask flow
 *
 * Performance optimized with 1-hour search caching and 7-day result caching
 */

import { getQueryDetector } from '../../lib/query-detector.js';
import { getPerformanceMonitor } from '../../lib/performance-monitor.js';
import { withErrorHandling, successResponse, validateRequiredFields } from '../../lib/api-utils.js';

async function detectMovieHandler(req, res) {
  const performanceMonitor = getPerformanceMonitor();
  const detector = getQueryDetector();
  const startTime = performance.now();

  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate required fields
  const validation = validateRequiredFields(req.body, ['query']);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: validation.missingFields,
    });
  }

  const { query } = req.body;

  try {
    // Use performance-monitored detection
    const result = await performanceMonitor.timeFunction(
      'movie_detection',
      async () => {
        return await detector.detectAndRedirect(query);
      },
      { query: query.substring(0, 50), cacheEnabled: true }
    );

    // Track response metrics
    const responseTime = performance.now() - startTime;
    performanceMonitor.trackMetric('movie_detection_response_time', responseTime, {
      query: query.substring(0, 30),
      should_redirect: result.shouldRedirect,
      detection_type: result.type || 'none',
      success: true,
    });

    // Set cache headers based on result
    if (result.shouldRedirect) {
      // Cache successful detections for 7 days
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=1209600');
    } else {
      // Cache non-matches for 1 hour to prevent repeated failed searches
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
    }

    res.setHeader('X-Detection-Time', Math.round(responseTime) + 'ms');

    return successResponse(res, {
      shouldRedirect: result.shouldRedirect,
      redirectUrl: result.url || null,
      detectionType: result.type || null,
      movieTitle: result.title || null,
      movieYear: result.year || null,
      confidence: result.confidence || null,
      reason: result.reason || null,
      responseTime: Math.round(responseTime),
      query: query,
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    // Track error metrics
    performanceMonitor.trackMetric('movie_detection_response_time', responseTime, {
      query: query.substring(0, 30),
      success: false,
      error: error.message,
    });

    console.error('Error in movie detection API:', error);

    return res.status(500).json({
      error: 'Failed to detect movie',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      shouldRedirect: false,
      responseTime: Math.round(responseTime),
    });
  }
}

// Apply error handling middleware
export default withErrorHandling(detectMovieHandler);
