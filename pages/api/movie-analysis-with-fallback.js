// Railway PostgreSQL movie-analysis API endpoint with Supabase fallback
// Ensures zero downtime during migration by falling back to Supabase when movie not found in Railway

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { logger, dbLogger, apiLogger, railwayLogger } from '../../lib/observability/logger.js';

// Railway PostgreSQL connection helper
const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'production') {
      railwayLogger.error('Database connection failed - no URL configured', {
        available_env_vars: Object.keys(process.env).filter(k => k.includes('DATABASE')),
        node_env: process.env.NODE_ENV,
        build_context: 'runtime'
      });
      throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set in environment variables');
    } else {
      railwayLogger.warn('Database URL not found during build', {
        node_env: process.env.NODE_ENV,
        build_context: 'build-time'
      });
      return null;
    }
  }
  
  railwayLogger.info('Creating Railway PostgreSQL client', {
    has_ssl: dbUrl.includes('sslmode=require'),
    host: dbUrl.match(/host=([^&\s]+)/)?.[1] || 'unknown'
  });
  
  return new Client({ connectionString: dbUrl });
};

// Supabase fallback connection
const getSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

async function trySupabaseFallback(tmdbId, startTime) {
  logger.info('Attempting Supabase fallback', { tmdbId });
  
  try {
    const supabase = getSupabaseClient();
    
    // Look up movie by TMDB ID
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', parseInt(tmdbId))
      .single();

    if (movieError || !movie) {
      logger.movieAnalysis(tmdbId, 'failed', { 
        reason: 'movie_not_found_supabase_fallback',
        duration: Date.now() - startTime 
      });
      return null;
    }

    // Get existing analysis
    const { data: analyses, error: analysisError } = await supabase
      .from('movie_analyses')
      .select('*')
      .eq('movie_id', movie.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (analysisError || !analyses || analyses.length === 0) {
      logger.movieAnalysis(tmdbId, 'completed', { 
        status: 'no_analysis_supabase_fallback',
        duration: Date.now() - startTime,
        source: 'supabase_fallback'
      });
      return {
        success: true,
        movie: {
          title: movie.title,
          year: movie.year,
          tmdb_id: movie.tmdb_id
        },
        analysis: null,
        message: 'Movie found but no analysis available',
        source: 'supabase-fallback'
      };
    }

    const analysis = analyses[0];
    
    // Extract analysis content (handle both string and object formats)
    let analysisContent = '';
    const claudeResponse = analysis.claude_response;
    
    if (typeof claudeResponse === 'string') {
      analysisContent = claudeResponse;
    } else if (claudeResponse && claudeResponse.raw_content) {
      analysisContent = claudeResponse.raw_content;
    } else if (claudeResponse && claudeResponse.content) {
      analysisContent = JSON.stringify(claudeResponse, null, 2);
    }

    logger.movieAnalysis(tmdbId, 'completed', {
      status: 'success_supabase_fallback',
      duration: Date.now() - startTime,
      source: 'supabase_fallback',
      analysisLength: analysisContent.length,
      analysisCreated: analysis.created_at
    });

    return {
      success: true,
      analysis: analysisContent,
      rawAnalysis: analysisContent,
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      },
      cached: true,
      source: 'supabase-fallback',
      fallback: true,
      performance: {
        total_time: Date.now() - startTime
      }
    };

  } catch (error) {
    logger.error('Supabase fallback failed', { tmdbId, error: error.message });
    return null;
  }
}

export default async function movieAnalysisWithFallbackHandler(req, res) {
  const startTime = Date.now();
  
  // Log API request
  apiLogger.apiRequest('GET', '/api/movie-analysis-with-fallback', req.query);
  
  if (req.method !== 'GET') {
    apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 405, Date.now() - startTime);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 400, Date.now() - startTime);
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  // Start movie analysis tracking
  logger.movieAnalysis(tmdbId, 'started', { source: 'api_request_with_fallback' });

  let client = null;
  try {
    // Try Railway first
    client = getRailwayClient();
    
    if (!client) {
      logger.movieAnalysis(tmdbId, 'railway_unavailable', { 
        reason: 'no_database_client',
        duration: Date.now() - startTime 
      });
      
      // Go straight to Supabase fallback
      const fallbackResult = await trySupabaseFallback(tmdbId, startTime);
      if (fallbackResult) {
        apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 200, Date.now() - startTime);
        return res.status(200).json(fallbackResult);
      }
      
      apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 500, Date.now() - startTime);
      return res.status(500).json({
        error: 'Database connection not available',
        message: 'Both Railway and Supabase unavailable'
      });
    }
    
    // Connect with timing
    const connectStart = Date.now();
    await client.connect();
    const connectTime = Date.now() - connectStart;
    
    railwayLogger.railwayConnection('connected', { connectionTime: connectTime });
    
    try {
      // Look up movie by TMDB ID with timing
      const movieQueryStart = Date.now();
      const movieQuery = 'SELECT * FROM movies WHERE tmdb_id = $1';
      const movieResult = await client.query(movieQuery, [parseInt(tmdbId)]);
      const movieQueryTime = Date.now() - movieQueryStart;
      
      dbLogger.dbQuery(movieQuery, [parseInt(tmdbId)], movieQueryTime, movieResult.rowCount);
      
      // If not found in Railway, try Supabase fallback
      if (movieResult.rows.length === 0) {
        logger.movieAnalysis(tmdbId, 'railway_miss', { 
          reason: 'movie_not_found_in_railway',
          duration: Date.now() - startTime 
        });
        
        await client.end();
        client = null;
        
        const fallbackResult = await trySupabaseFallback(tmdbId, startTime);
        if (fallbackResult) {
          apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 200, Date.now() - startTime);
          return res.status(200).json(fallbackResult);
        }
        
        // Neither Railway nor Supabase has the movie
        logger.movieAnalysis(tmdbId, 'failed', { 
          reason: 'movie_not_found_anywhere',
          duration: Date.now() - startTime 
        });
        apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 404, Date.now() - startTime);
        return res.status(404).json({ 
          error: 'Movie not found',
          tmdbId: tmdbId,
          source: 'railway-postgresql-with-supabase-fallback',
          checked: ['railway', 'supabase']
        });
      }

      const movie = movieResult.rows[0];
      logger.info('Movie found in Railway database', {
        tmdbId,
        title: movie.title,
        year: movie.year,
        movieId: movie.id
      });

      // Get existing analysis with timing
      const analysisQueryStart = Date.now();
      const analysisQuery = 'SELECT * FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC LIMIT 1';
      const analysisResult = await client.query(analysisQuery, [movie.id]);
      const analysisQueryTime = Date.now() - analysisQueryStart;
      
      dbLogger.dbQuery(analysisQuery, [movie.id], analysisQueryTime, analysisResult.rowCount);
      
      if (analysisResult.rows.length === 0) {
        logger.movieAnalysis(tmdbId, 'completed', { 
          status: 'no_analysis_railway',
          duration: Date.now() - startTime,
          source: 'railway'
        });
        apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 200, Date.now() - startTime);
        return res.status(200).json({
          success: true,
          movie: {
            title: movie.title,
            year: movie.year,
            tmdb_id: movie.tmdb_id
          },
          analysis: null,
          message: 'Movie found but no analysis available',
          source: 'railway-postgresql'
        });
      }

      const analysis = analysisResult.rows[0];
      
      // Extract analysis content (handle both string and object formats)
      let analysisContent = '';
      const claudeResponse = analysis.claude_response;
      
      if (typeof claudeResponse === 'string') {
        analysisContent = claudeResponse;
      } else if (claudeResponse && claudeResponse.raw_content) {
        analysisContent = claudeResponse.raw_content;
      } else if (claudeResponse && claudeResponse.content) {
        analysisContent = JSON.stringify(claudeResponse, null, 2);
      }

      // Log successful analysis retrieval
      logger.movieAnalysis(tmdbId, 'completed', {
        status: 'success_railway',
        duration: Date.now() - startTime,
        source: 'railway',
        analysisLength: analysisContent.length,
        analysisCreated: analysis.created_at
      });

      // Return successful response
      const response = {
        success: true,
        analysis: analysisContent,
        rawAnalysis: analysisContent,
        movie: {
          title: movie.title,
          year: movie.year,
          tmdb_id: movie.tmdb_id
        },
        cached: true,
        source: 'railway-postgresql',
        fallback: false,
        performance: {
          total_time: Date.now() - startTime,
          connect_time: connectTime,
          movie_query_time: movieQueryTime,
          analysis_query_time: analysisQueryTime
        }
      };
      
      apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 200, Date.now() - startTime, JSON.stringify(response).length);
      return res.status(200).json(response);
      
    } finally {
      if (client) {
        await client.end();
        railwayLogger.info('Database connection closed', { tmdbId, duration: Date.now() - startTime });
      }
    }

  } catch (error) {
    // Comprehensive error logging
    logger.movieAnalysis(tmdbId, 'failed', {
      reason: 'database_error',
      duration: Date.now() - startTime,
      error: error.message,
      errorCode: error.code
    });
    
    dbLogger.dbError('movie analysis query with fallback', [tmdbId], error);
    railwayLogger.error('Movie analysis database error with fallback', {
      tmdbId,
      error: error.message,
      code: error.code,
      duration: Date.now() - startTime
    });
    
    // Close connection if it exists
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        logger.error('Failed to close database connection', { tmdbId }, closeError);
      }
    }
    
    // Try Supabase fallback on error
    try {
      const fallbackResult = await trySupabaseFallback(tmdbId, startTime);
      if (fallbackResult) {
        logger.info('Supabase fallback succeeded after Railway error', { tmdbId });
        apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 200, Date.now() - startTime);
        return res.status(200).json(fallbackResult);
      }
    } catch (fallbackError) {
      logger.error('Supabase fallback also failed', { tmdbId, fallbackError: fallbackError.message });
    }
    
    apiLogger.apiResponse('GET', '/api/movie-analysis-with-fallback', 500, Date.now() - startTime);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'railway-postgresql-with-supabase-fallback',
      tmdbId: tmdbId,
      duration: Date.now() - startTime
    });
  }
}