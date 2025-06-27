/**
 * TMDB Streaming Data API with Claude Fallback
 * 
 * Primary source: TMDB Watch Providers API (US region)
 * Fallback: Claude API for missing or incomplete data
 * Caching: 30-day TTL for TMDB data, 12-hour for Claude fallback
 * 
 * Performance Features:
 * - Redis caching with smart TTL based on data source
 * - Request deduplication for concurrent requests
 * - Graceful degradation when TMDB fails
 * - Cost optimization through intelligent fallback
 */

import { getCache } from '../../lib/cache.js';
import { getPerformanceMonitor } from '../../lib/performance-monitor.js';
import { 
  withErrorHandling, 
  successResponse, 
  validateRequiredFields 
} from '../../lib/api-utils.js';

async function tmdbStreamingHandler(req, res) {
  const performanceMonitor = getPerformanceMonitor();
  const cache = getCache();
  const startTime = performance.now();

  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate required fields
  const validation = validateRequiredFields(req.body, ['title', 'year']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      details: validation.missingFields 
    });
  }

  const { title, year, tmdb_id } = req.body;

  try {
    // Use performance-monitored cache for streaming data
    const result = await performanceMonitor.timeFunction(
      'tmdb_streaming_with_cache',
      async () => {
        return await cache.cacheStreamingData(
          `tmdb_${tmdb_id || `${title}_${year}`}`, // Prefer TMDB ID for cache key
          async () => {
            // Try TMDB first, then Claude fallback
            return await fetchStreamingDataWithFallback(title, year, tmdb_id, performanceMonitor);
          },
          30 * 24 * 60 * 60 // 30-day cache for TMDB data
        );
      },
      { title, year, tmdb_id, cacheEnabled: true }
    );

    // Track successful response
    const responseTime = performance.now() - startTime;
    performanceMonitor.trackMetric('tmdb_streaming_response_time', responseTime, {
      title,
      year,
      cached: result.cached || false,
      dataSource: result.source || 'unknown',
      success: true
    });

    // Set cache headers based on data source
    const cacheMaxAge = result.source === 'tmdb' ? 86400 * 30 : 3600; // 30 days for TMDB, 1 hour for Claude
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`);
    res.setHeader('X-Cache-Status', result.cached ? 'HIT' : 'MISS');
    res.setHeader('X-Data-Source', result.source || 'unknown');

    return successResponse(res, {
      streamingText: result.streamingText,
      title: result.title || title,
      year: result.year || year,
      cached: result.cached || false,
      source: result.source || 'unknown',
      lastUpdated: result.lastUpdated || new Date().toISOString(),
      responseTime: Math.round(responseTime)
    });

  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    // Track error metrics
    performanceMonitor.trackMetric('tmdb_streaming_response_time', responseTime, {
      title,
      year,
      success: false,
      error: error.message
    });

    console.error('Error in TMDB streaming API:', error);

    return res.status(500).json({
      error: 'Failed to fetch streaming info',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      responseTime: Math.round(responseTime)
    });
  }
}

/**
 * Fetch streaming data with TMDB primary and Claude fallback
 */
async function fetchStreamingDataWithFallback(title, year, tmdb_id, performanceMonitor) {
  const requestStartTime = performance.now();
  
  try {
    // Step 1: Try TMDB Watch Providers API
    if (tmdb_id) {
      console.log(`🎬 Fetching TMDB streaming data for: ${title} (${year}) - ID: ${tmdb_id}`);
      
      const tmdbResult = await fetchTMDBWatchProviders(tmdb_id, performanceMonitor);
      if (tmdbResult) {
        const requestTime = performance.now() - requestStartTime;
        console.log(`✅ TMDB streaming data found for ${title} (${year}) in ${requestTime.toFixed(0)}ms`);
        
        return {
          streamingText: tmdbResult.streamingText,
          title,
          year,
          source: 'tmdb',
          cached: false,
          lastUpdated: new Date().toISOString(),
          requestTime: Math.round(requestTime),
          providersFound: tmdbResult.providersCount
        };
      }
    }

    // Step 2: Fallback to Claude API (existing implementation)
    console.log(`🤖 TMDB data not available, falling back to Claude for: ${title} (${year})`);
    
    const claudeResult = await fetchClaudeStreamingFallback(title, year, performanceMonitor);
    const requestTime = performance.now() - requestStartTime;
    
    return {
      streamingText: claudeResult.streamingText,
      title,
      year,
      source: 'claude_fallback',
      cached: false,
      lastUpdated: new Date().toISOString(),
      requestTime: Math.round(requestTime),
      fallbackReason: tmdb_id ? 'tmdb_no_data' : 'no_tmdb_id'
    };

  } catch (error) {
    console.error('Error in streaming data fetch with fallback:', error);
    
    // Final fallback to TBD
    return {
      streamingText: 'TBD',
      title,
      year,
      source: 'static_fallback',
      cached: false,
      lastUpdated: new Date().toISOString(),
      requestTime: Math.round(performance.now() - requestStartTime),
      error: error.message
    };
  }
}

/**
 * Fetch streaming data from TMDB Watch Providers API
 */
async function fetchTMDBWatchProviders(tmdb_id, performanceMonitor) {
  if (!process.env.TMDB_API_KEY) {
    console.warn('TMDB API key not configured');
    return null;
  }

  try {
    // Add timeout to TMDB API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for TMDB
    
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdb_id}/watch/providers?api_key=${process.env.TMDB_API_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!tmdbResponse.ok) {
      throw new Error(`TMDB API failed: ${tmdbResponse.status}`);
    }

    const tmdbData = await tmdbResponse.json();
    const usProviders = tmdbData.results?.US;
    
    if (!usProviders) {
      console.log(`No US streaming data found in TMDB for ID: ${tmdb_id}`);
      return null;
    }

    // Parse TMDB providers into readable text
    const streamingText = parseTMDBProviders(usProviders);
    
    if (!streamingText) {
      console.log(`No streaming providers found in TMDB data for ID: ${tmdb_id}`);
      return null;
    }

    // Track TMDB API success
    performanceMonitor.trackMetric('tmdb_api_calls', 1, {
      endpoint: 'watch_providers',
      success: true,
      providersFound: Object.keys(usProviders).length
    });

    return {
      streamingText,
      providersCount: Object.keys(usProviders).length
    };

  } catch (error) {
    console.error('TMDB Watch Providers API error:', error);
    
    // Track TMDB API failure
    performanceMonitor.trackMetric('tmdb_api_calls', 1, {
      endpoint: 'watch_providers',
      success: false,
      error: error.message
    });

    return null;
  }
}

/**
 * Parse TMDB providers data into readable streaming text
 */
function parseTMDBProviders(usProviders) {
  const providers = [];
  
  // Subscription services (free with subscription)
  if (usProviders.flatrate && usProviders.flatrate.length > 0) {
    const subscriptionServices = usProviders.flatrate.map(p => p.provider_name);
    providers.push(...subscriptionServices);
  }
  
  // Free with ads
  if (usProviders.ads && usProviders.ads.length > 0) {
    const adServices = usProviders.ads.map(p => `${p.provider_name} (with ads)`);
    providers.push(...adServices);
  }
  
  // Rental/purchase options
  const rentalOptions = [];
  if (usProviders.rent && usProviders.rent.length > 0) {
    const rentServices = usProviders.rent.map(p => p.provider_name);
    rentalOptions.push(`rent on ${rentServices.join(', ')}`);
  }
  
  if (usProviders.buy && usProviders.buy.length > 0) {
    const buyServices = usProviders.buy.map(p => p.provider_name);
    rentalOptions.push(`buy on ${buyServices.join(', ')}`);
  }
  
  // Combine subscription and rental options
  let text = '';
  if (providers.length > 0) {
    text = providers.join(', ');
  }
  
  if (rentalOptions.length > 0) {
    if (text) {
      text += ' • ' + rentalOptions.join(' or ');
    } else {
      text = rentalOptions.join(' or ');
    }
  }
  
  return text || null;
}

/**
 * Fallback to Claude API (uses existing get-streaming-info logic)
 */
async function fetchClaudeStreamingFallback(title, year, performanceMonitor) {
  const Anthropic = require('@anthropic-ai/sdk').default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `Where can someone stream the movie "${title}" (${year}) right now in the US? List current streaming services where it's available. Be specific about platform names like Netflix, Hulu, Amazon Prime Video, Disney+, etc. If it's available for rent/purchase, mention that too. Keep response under 50 words and factual.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  const streamingText = message.content[0].text.trim();
  
  // Track Claude API costs
  const inputTokens = message.usage?.input_tokens || prompt.length / 4;
  const outputTokens = message.usage?.output_tokens || streamingText.length / 4;
  
  performanceMonitor.trackAPICost(
    'claude_sonnet', 
    'streaming_fallback', 
    inputTokens, 
    outputTokens, 
    false
  );

  return { streamingText };
}

// Apply error handling middleware
export default withErrorHandling(tmdbStreamingHandler);