# Database Connectivity Issue - Code Review

## Problem Summary
Production database connections fail with "TypeError: fetch failed" for most endpoints, but mysteriously work for the movie-analysis endpoint. Development works fine for all endpoints.

## Key Questions for Review
- Why does movie-analysis work while all other endpoints fail?
- What's different about the movie-analysis setup?
- Are there any imports, middleware, or configuration differences?
- Could my recent changes have broken database connectivity for most endpoints?

---

## 1. WORKING ENDPOINT: pages/api/movie-analysis.js

```javascript
// pages/api/movie-analysis.js
/**
 * Movie Analysis API Route
 *
 * Provides Claude-generated encyclopedia-style analysis for specific movies.
 * Takes movie title and year, returns comprehensive analysis with caching.
 * Uses modular prompt system for consistency and cost optimization.
 */

import { getCache, withCache } from '../../lib/cache.js';

async function movieAnalysisHandler(req, res) {
  let title, year;

  // Basic environment validation for Supabase
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('🔴 Missing Supabase configuration');
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  // Handle both GET (with tmdbId) and POST (with title/year) requests
  if (req.method === 'GET') {
    const { tmdbId } = req.query;
    
    if (!tmdbId) {
      return res.status(400).json({ error: 'tmdbId parameter is required for GET requests' });
    }
    
    // Validate tmdbId is a valid number to prevent NaN crashes
    const tmdbIdNum = parseInt(tmdbId, 10);
    if (isNaN(tmdbIdNum)) {
      return res.status(400).json({ error: 'Invalid tmdbId parameter - must be a number' });
    }

    // Look up movie by tmdbId to get title and year
    try {
      console.log(`🔍 API DEBUG: Looking up movie with tmdbId=${tmdbId}`);
      console.log(`🔍 API DEBUG: ENV vars - SUPABASE_URL=${!!process.env.NEXT_PUBLIC_SUPABASE_URL}, SUPABASE_KEY=${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Try to find movie by tmdb_id first
      let { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('title, year, tmdb_id')
        .eq('tmdb_id', tmdbIdNum)
        .single();
      
      console.log(`🔍 API DEBUG: TMDB ID lookup result - movie=${!!movie}, error=${movieError?.message || 'none'}`);
      
      // PHASE 1: COMMENTED OUT TMDB GENERATION - FOCUS ON 13K EXISTING ANALYSES
      // Movie not found in database - return error (skip TMDB lookup for Phase 1)

      if (movieError || !movie) {
        console.log(`🎬 Movie ${tmdbId} not in database (error: ${movieError?.message || 'not found'})`);
        console.log(`📋 PHASE 1: Skipping TMDB generation - focusing on existing 13k analyses only`);
        
        return res.status(404).json({ 
          error: 'Movie not found in database',
          phase: 'Phase 1 - existing analyses only',
          tmdbId: tmdbIdNum,
          note: 'TMDB generation disabled for Phase 1 scope'
        });
      } else {
        title = movie.title;
        year = movie.year;
      }
    } catch (error) {
      console.error('Error looking up movie by tmdbId:', error);
      return res.status(500).json({ error: 'Failed to lookup movie' });
    }
    
  } else if (req.method === 'POST') {
    ({ title, year } = req.body);

    if (!title || !year) {
      return res.status(400).json({ error: 'Movie title and year are required' });
    }
  } else {
    return res.status(405).json({ error: 'Only GET and POST methods allowed' });
  }

  try {
    console.time(`🎬 API analysis for ${title} (${year})`);

    // Initialize cache service
    const cache = getCache();

    // Try Redis cache first for complete analysis
    const analysisResult = await cache.cacheMovieAnalysis(
      `${title}_${year}`,
      'complete_analysis',
      async () => {
        console.log(`🔄 Cache miss - generating fresh analysis for ${title} (${year})`);

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // First, try to find the movie in database
        const { data: movie, error: movieError } = await supabase
          .from('movies')
          .select('id')
          .eq('title', title)
          .eq('year', year)
          .single();

        if (movieError || !movie) {
          return {
            error: 'Movie not found in database',
            analysis: `${title} (${year}) is a notable film that has made significant contributions to cinema.`,
            cached: false,
          };
        }

        // Check database cache (prefer newer movie_analysis, fallback to page_analysis)
        let existingAnalysis = null;
        let analysisError = null;
        
        // Try newer movie_analysis type first
        const { data: movieAnalysis, error: movieAnalysisError } = await supabase
          .from('movie_analyses')
          .select('claude_response')
          .eq('movie_id', movie.id)
          .eq('analysis_type', 'movie_analysis')
          .single();
          
        if (movieAnalysis && !movieAnalysisError) {
          existingAnalysis = movieAnalysis;
        } else {
          // Fallback to older page_analysis type
          const { data: pageAnalysis, error: pageError } = await supabase
            .from('movie_analyses')
            .select('claude_response')
            .eq('movie_id', movie.id)
            .eq('analysis_type', 'page_analysis')
            .single();
            
          existingAnalysis = pageAnalysis;
          analysisError = pageError;
        }

        if (existingAnalysis && !analysisError) {
          console.log(`📦 Using database cached analysis for ${title} (${year})`);
          
          const rawAnalysis = existingAnalysis.claude_response.raw_content;
          let processedAnalysis = rawAnalysis;
          let movieData = existingAnalysis.claude_response.movie_data || null;
          
          // If no movie_data exists, process MOVIES: lines to enhance with TMDB IDs
          if (!movieData && rawAnalysis.includes('MOVIES:')) {
            try {
              console.log(`🔗 Processing MOVIES: lines for cached analysis ${title} (${year})`);
              
              // Look up current movie's TMDB ID for self-reference prevention
              const { data: currentMovieData } = await supabase
                .from('movies')
                .select('tmdb_id')
                .eq('title', title)
                .eq('year', year)
                .single();
              
              const currentTmdbId = currentMovieData?.tmdb_id || null;
              
              // Process movie references
              const { processAnalysisMovies } = await import('../../lib/analysis-movie-linker.js');
              const movieResult = await processAnalysisMovies(rawAnalysis, currentTmdbId);
              
              processedAnalysis = movieResult.processedContent;
              movieData = {
                featuredMovies: movieResult.featuredMovies,
                linkedMovies: movieResult.linkedMovies,
                allMovies: movieResult.allMovies,
                stats: {
                  totalMoviesProcessed: movieResult.allMovies.length,
                  featuredMoviesCount: movieResult.featuredMovies.length,
                  linkedMoviesCount: movieResult.linkedMovies.length,
                  newMoviesCreated: movieResult.allMovies.filter(m => !m.id).length
                }
              };
              
              console.log(`✅ Enhanced cached analysis: ${movieData.stats.featuredMoviesCount} featured movies, ${movieData.stats.linkedMoviesCount} linked movies`);
            } catch (linkingError) {
              console.warn(`⚠️ Movie linking failed for cached analysis:`, linkingError.message);
              // Continue with raw analysis if enhancement fails
            }
          }
          
          return {
            analysis: processedAnalysis, // Return enhanced content with links if processed
            rawAnalysis: rawAnalysis, // Include original for debugging
            movie: { title, year },
            cached: true,
            source: movieData ? 'database_enhanced' : 'database',
            entityData: existingAnalysis.claude_response.entity_data?.entities || null,
            movieData: movieData, // Include enhanced movie data for MediaCards
          };
        }

        // PHASE 1: NO ANALYSIS GENERATION - RETURN ERROR FOR MISSING ANALYSIS
        console.log(`📋 PHASE 1: No existing analysis found for ${title} (${year}) - skipping generation`);
        return {
          error: 'Analysis not found in database',
          phase: 'Phase 1 - existing analyses only',
          movie: { title, year },
          note: 'Claude generation disabled for Phase 1 scope'
        };
      }
    );

    // Set cache headers and return result - 30 days for max speed
    console.timeEnd(`🎬 API analysis for ${title} (${year})`);
    res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=5184000');
    res.status(200).json(analysisResult);
  } catch (error) {
    console.timeEnd(`🎬 API analysis for ${title} (${year})`);
    console.error('🔴 Error generating movie analysis:', error);
    res.status(500).json({
      error: 'Failed to generate movie analysis',
      analysis: `${title} (${year}) is a notable film that has made significant contributions to cinema. This classic work showcases exceptional filmmaking and continues to be appreciated by audiences and critics alike.`,
      cached: false,
      source: 'error_fallback',
    });
  }
}

// Export with cache middleware
export default withCache(movieAnalysisHandler);
```

---

## 2. FAILING ENDPOINT: pages/api/debug-db-connectivity.js

```javascript
// Debug endpoint to test production database connectivity
import { withCache } from '../../lib/cache.js';

async function debugHandler(req, res) {
  const tests = [];
  let overallStatus = 'ok';

  try {
    // Test 1: Environment variables
    tests.push({
      test: 'Environment Variables',
      status: 'checking',
      details: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        supabaseKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      }
    });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      tests[0].status = 'fail';
      tests[0].error = 'Missing required environment variables';
      overallStatus = 'fail';
    } else {
      tests[0].status = 'pass';
    }

    // Test 2: Supabase client creation
    let supabase = null;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      tests.push({
        test: 'Supabase Client Creation',
        status: 'pass',
        details: 'Client created successfully'
      });
    } catch (error) {
      tests.push({
        test: 'Supabase Client Creation',
        status: 'fail',
        error: error.message
      });
      overallStatus = 'fail';
    }

    // Test 3: Basic database connection (using EXACT pattern from working movie-analysis)
    if (supabase) {
      try {
        // Copy exact working pattern from movie-analysis.js line 47-51
        let { data: movie, error: movieError } = await supabase
          .from('movies')
          .select('title, year, tmdb_id')
          .eq('tmdb_id', 550)
          .single();
        
        if (movieError || !movie) {
          tests.push({
            test: 'Database Connection',
            status: 'fail',
            error: movieError?.message || 'No data returned',
            details: movieError
          });
          overallStatus = 'fail';
        } else {
          tests.push({
            test: 'Database Connection', 
            status: 'pass',
            details: `Successfully queried movie: ${movie.title} (${movie.year})`
          });
        }
      } catch (error) {
        tests.push({
          test: 'Database Connection',
          status: 'fail',
          error: error.message
        });
        overallStatus = 'fail';
      }
    }

    // Test 4: Movies table structure
    if (supabase && overallStatus !== 'fail') {
      try {
        const { data, error } = await supabase.from('movies').select('id, title, year, tmdb_id').limit(1);
        if (error) {
          tests.push({
            test: 'Movies Table Structure',
            status: 'fail',
            error: error.message
          });
          overallStatus = 'fail';
        } else {
          tests.push({
            test: 'Movies Table Structure',
            status: 'pass',
            details: `Sample row: ${data?.length ? JSON.stringify(data[0]) : 'No data'}`
          });
        }
      } catch (error) {
        tests.push({
          test: 'Movies Table Structure',
          status: 'fail',
          error: error.message
        });
        overallStatus = 'fail';
      }
    }

    // Test 5: Movie analyses table
    if (supabase && overallStatus !== 'fail') {
      try {
        const { data, error } = await supabase.from('movie_analyses').select('id, movie_id, analysis_type').limit(1);
        if (error) {
          tests.push({
            test: 'Movie Analyses Table',
            status: 'fail',
            error: error.message
          });
          overallStatus = 'fail';
        } else {
          tests.push({
            test: 'Movie Analyses Table',
            status: 'pass',
            details: `Sample analysis: ${data?.length ? JSON.stringify(data[0]) : 'No analyses found'}`
          });
        }
      } catch (error) {
        tests.push({
          test: 'Movie Analyses Table',
          status: 'fail',
          error: error.message
        });
        overallStatus = 'fail';
      }
    }

    // Test 6: Specific movie lookup (Fight Club)
    if (supabase && overallStatus !== 'fail') {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('id, title, year, tmdb_id')
          .eq('tmdb_id', 550)
          .single();
        
        if (error) {
          tests.push({
            test: 'Fight Club Lookup (tmdb_id=550)',
            status: 'fail',
            error: error.message
          });
        } else if (!data) {
          tests.push({
            test: 'Fight Club Lookup (tmdb_id=550)',
            status: 'fail',
            error: 'Movie not found in database'
          });
        } else {
          tests.push({
            test: 'Fight Club Lookup (tmdb_id=550)',
            status: 'pass',
            details: data
          });
        }
      } catch (error) {
        tests.push({
          test: 'Fight Club Lookup (tmdb_id=550)',
          status: 'fail',
          error: error.message
        });
      }
    }

  } catch (error) {
    overallStatus = 'fail';
    tests.push({
      test: 'Overall Test Suite',
      status: 'fail',
      error: error.message
    });
  }

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    tests: tests,
    summary: {
      total: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length
    }
  });
}

// Export with cache middleware (same as movie-analysis)
export default withCache(debugHandler);
```

---

## 3. FAILING ENDPOINT: pages/api/test-db-minimal.js

```javascript
// Minimal database connection test
export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const tests = [];

    // Test 1: Working pattern (same as movie-analysis)
    try {
      const { data: movie, error } = await supabase
        .from('movies')
        .select('id, title')
        .limit(1);
      tests.push({
        test: 'Basic select with limit',
        success: !error,
        error: error?.message,
        hasData: !!data && data.length > 0
      });
    } catch (e) {
      tests.push({
        test: 'Basic select with limit',
        success: false,
        error: e.message,
        hasData: false
      });
    }

    // Test 2: Count query without options
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact' });
      tests.push({
        test: 'Count query (exact only)',
        success: !error,
        error: error?.message,
        count: data?.length || 0
      });
    } catch (e) {
      tests.push({
        test: 'Count query (exact only)',
        success: false,
        error: e.message,
        count: 0
      });
    }

    // Test 3: Head option (the suspected culprit)
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('id', { head: true });
      tests.push({
        test: 'Head option query',
        success: !error,
        error: error?.message,
        hasData: !!data
      });
    } catch (e) {
      tests.push({
        test: 'Head option query',
        success: false,
        error: e.message,
        hasData: false
      });
    }

    return res.status(200).json({ 
      tests: tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.success).length,
        failed: tests.filter(t => !t.success).length
      }
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}
```

---

## 4. CACHE MIDDLEWARE: lib/cache.js

```javascript
// Cache Middleware and Utilities for MovieGenius
// Provides standardized caching patterns for all API endpoints

// Only import Redis on server-side to avoid Node.js module issues in browser
let getRedis = null;

// Initialize Redis import for server-side only (must be async to avoid bundling)
async function initRedis() {
  if (typeof window !== 'undefined') return null; // Client-side, skip Redis
  
  try {
    const redisModule = await import('./redis.js');
    getRedis = redisModule.default;
    return getRedis();
  } catch (error) {
    console.warn('Redis not available, using memory-only cache');
    return null;
  }
}

class CacheService {
  constructor() {
    // Only use Redis on server-side (will be initialized lazily)
    this.redis = null;
    this.redisInitialized = false;
    this.enabled = typeof process !== 'undefined' ? process.env.CACHE_ENABLED !== 'false' : false;

    // Performance tracking
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  // Initialize Redis connection if needed (server-side only)
  async ensureRedis() {
    if (typeof window !== 'undefined') return null; // Client-side
    if (this.redisInitialized) return this.redis;
    
    this.redis = await initRedis();
    this.redisInitialized = true;
    return this.redis;
  }

  // Check if Redis is available and cache is enabled
  async isRedisAvailable() {
    if (!this.enabled) return false;
    await this.ensureRedis();
    return this.redis !== null;
  }

  // Helper function for API middleware
  export function withCache(handler) {
    return async (req, res) => {
      // Add cache instance to request for easy access
      req.cache = getCache();

      // Add cache headers for better client-side caching
      if (req.method === 'GET') {
        res.setHeader('Vary', 'Accept-Encoding');
      }

      return handler(req, res);
    };
  }
}
```

---

## 5. RECENT COMMITS

```
0a6f8530 Use exact working database query pattern from movie-analysis endpoint
77648429 Apply withCache middleware to debug endpoint to match working movie-analysis setup
17e1aa98 Update minimal test to isolate specific failing query patterns
6004b384 Add minimal database connection test endpoint
29ac77ad Add targeted database schema verification endpoint
395b707c Add database connectivity debug endpoint
67f379ea Phase 1: Remove loading states and fix API stability
1c1d0a92 Remove conflicting simplified static movie page + add test frameworks
be42c8cc Restore Bearer token authentication support
```

---

## CURRENT STATUS

- **Production**: movie-analysis endpoint works ✅, all other endpoints fail ❌ "TypeError: fetch failed"
- **Development**: All endpoints work ✅
- **Evidence**: 13k analyses were successfully written, proving database connectivity works
- **Hypothesis**: Something specific about movie-analysis endpoint setup allows it to work while others fail

## TEST RESULTS

1. **Movie Analysis Endpoint**: 
   - `curl https://moviegenius-production.up.railway.app/api/movie-analysis?tmdbId=550`
   - Returns: `{"error":"Movie not found in database","phase":"Phase 1 - existing analyses only"...}`
   - ✅ Database query succeeded (movie not found is expected response)

2. **Debug Endpoint**:
   - `curl https://moviegenius-production.up.railway.app/api/debug-db-connectivity`
   - Returns: `"TypeError: fetch failed"` at undici:13510:13
   - ❌ Database query failed at HTTP transport level

3. **Minimal Test Endpoint**:
   - `curl https://moviegenius-production.up.railway.app/api/test-db-minimal`
   - Returns: `"TypeError: fetch failed"` 
   - ❌ Database query failed at HTTP transport level