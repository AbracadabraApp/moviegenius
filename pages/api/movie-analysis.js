// Railway PostgreSQL movie-analysis API endpoint with comprehensive observability
// Enhanced with error logging, performance monitoring, and health tracking

import { Client } from 'pg';
import { logger, dbLogger, apiLogger, railwayLogger } from '../../lib/observability/logger.js';

// Railway PostgreSQL connection helper with comprehensive logging
const getRailwayClient = () => {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  // During build time, environment variables may not be available
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'production') {
      railwayLogger.error('Database connection failed - no URL configured', {
        available_env_vars: Object.keys(process.env).filter(k => k.includes('DATABASE')),
        node_env: process.env.NODE_ENV,
        build_context: 'runtime'
      });
      throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set in environment variables');
    } else {
      // During build, return a placeholder that won't be used
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

export default async function movieAnalysisHandler(req, res) {
  const startTime = Date.now();
  
  // Log API request
  apiLogger.apiRequest('GET', '/api/movie-analysis', req.query);
  
  if (req.method !== 'GET') {
    apiLogger.apiResponse('GET', '/api/movie-analysis', 405, Date.now() - startTime);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    apiLogger.apiResponse('GET', '/api/movie-analysis', 400, Date.now() - startTime);
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  // Start movie analysis tracking
  logger.movieAnalysis(tmdbId, 'started', { source: 'api_request' });

  let client = null;
  try {
    client = getRailwayClient();
    
    if (!client) {
      logger.movieAnalysis(tmdbId, 'failed', { 
        reason: 'no_database_client',
        duration: Date.now() - startTime 
      });
      apiLogger.apiResponse('GET', '/api/movie-analysis', 500, Date.now() - startTime);
      return res.status(500).json({
        error: 'Database connection not available',
        message: 'DATABASE_URL not configured'
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
      
      let movie; // Declare movie variable in proper scope
      
      if (movieResult.rows.length === 0) {
        console.log(`🎬 Movie ${tmdbId} not in Railway database, attempting TMDB lookup for analysis request`);
        logger.movieAnalysis(tmdbId, 'tmdb_discovery_started', { reason: 'movie_not_found' });
        
        // For TMDB discovery scenarios, try to create the movie entry if it doesn't exist
        try {
          console.log(`🔍 ENVIRONMENT DEBUG: TMDB_KEY=${!!process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
          
          console.log(`🔍 Attempting dynamic import of tmdb-search service...`);
          const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search.js');
          console.log(`✅ Successfully imported getTMDBMovieDetails function`);
          
          console.log(`🔍 Attempting dynamic import of railway-database-search service...`);
          const { createBasicMovieEntryRailway } = await import('../../lib/services/railway-database-search.js');
          console.log(`✅ Successfully imported createBasicMovieEntryRailway function`);
          
          console.log(`🔍 Fetching TMDB details for ID ${tmdbId}...`);
          const tmdbMovie = await getTMDBMovieDetails(parseInt(tmdbId));
          console.log(`🔍 TMDB result:`, tmdbMovie ? `${tmdbMovie.title} (${tmdbMovie.release_date})` : 'null');
          
          if (tmdbMovie && tmdbMovie.title) {
            const movieYear = tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null;
            console.log(`✅ Found TMDB movie: ${tmdbMovie.title} (${movieYear})`);
            logger.movieAnalysis(tmdbId, 'tmdb_movie_found', { title: tmdbMovie.title, year: movieYear });
            
            const newMovieEntry = await createBasicMovieEntryRailway(tmdbMovie);
            
            if (!newMovieEntry) {
              console.error(`❌ Failed to create movie entry for ${tmdbMovie.title} (${movieYear})`);
              throw new Error('Failed to create movie database entry');
            }
            
            console.log(`💾 Created movie entry for analysis: ${newMovieEntry.title} (${newMovieEntry.year})`);
            logger.movieAnalysis(tmdbId, 'movie_created', { 
              title: newMovieEntry.title, 
              year: newMovieEntry.year,
              movieId: newMovieEntry.id 
            });
            
            // Use the newly created movie - requery to get full movie data
            const newMovieResult = await client.query(movieQuery, [parseInt(tmdbId)]);
            
            if (newMovieResult.rows.length > 0) {
              movie = newMovieResult.rows[0];
              console.log(`✅ RAILWAY API: Using newly created movie - ${movie.title} (${movie.year})`);
            } else {
              throw new Error('Failed to retrieve newly created movie entry');
            }
          } else {
            console.log(`❌ No TMDB movie found for ID ${tmdbId} - tmdbMovie:`, tmdbMovie);
            logger.movieAnalysis(tmdbId, 'failed', { 
              reason: 'tmdb_not_found',
              duration: Date.now() - startTime 
            });
            apiLogger.apiResponse('GET', '/api/movie-analysis', 404, Date.now() - startTime);
            return res.status(404).json({ 
              error: 'Movie not found in TMDB', 
              details: 'TMDB API returned invalid or null response',
              tmdbId: parseInt(tmdbId),
              debug: { tmdbMovie: !!tmdbMovie, hasTitle: !!(tmdbMovie?.title) }
            });
          }
        } catch (tmdbError) {
          console.error('TMDB lookup failed for analysis request:', tmdbError);
          logger.movieAnalysis(tmdbId, 'failed', { 
            reason: 'tmdb_error',
            error: tmdbError.message,
            duration: Date.now() - startTime 
          });
          apiLogger.apiResponse('GET', '/api/movie-analysis', 404, Date.now() - startTime);
          return res.status(404).json({ 
            error: 'Movie not found in TMDB',
            details: tmdbError.message,
            tmdbId: parseInt(tmdbId)
          });
        }
      } else {
        movie = movieResult.rows[0];
      }
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
        console.log(`🤖 No analysis found for ${movie.title} (${movie.year}), generating fresh Claude analysis...`);
        logger.movieAnalysis(tmdbId, 'claude_generation_started', { 
          title: movie.title,
          year: movie.year
        });

        // Generate new analysis with Claude using modular prompt system
        try {
          const claudeStartTime = Date.now();
          console.log(`🤖 Generating fresh Claude analysis for ${movie.title} (${movie.year})`);
          
          const { Anthropic } = await import('@anthropic-ai/sdk');
          const { buildPrompt } = await import('../../lib/prompts/builder.js');

          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          // Use modular prompt system for MOVIE_ANALYSIS context
          const promptConfig = buildPrompt(
            'MOVIE_ANALYSIS',
            'Include 3-5 Explore Further topics for deeper analysis'
          );
          const userPrompt = `${movie.title} (${movie.year})`;
          
          // DEBUG: Log the actual system prompt being sent
          console.log(`🔍 PROMPT DEBUG: System prompt for ${movie.title} (${movie.year}):`);
          console.log(`📝 First 500 chars: ${promptConfig.system[0].text.substring(0, 500)}...`);
          console.log(`🎯 Model: ${promptConfig.model}`);
          console.log(`🔧 Temperature: ${promptConfig.temperature}`);

          const message = await anthropic.messages.create({
            ...promptConfig,
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          });

          const rawAnalysis = message.content[0].text;
          const claudeEndTime = Date.now();
          const claudeDuration = (claudeEndTime - claudeStartTime) / 1000;
          console.log(`✅ Claude analysis complete (${claudeDuration.toFixed(2)}s)`);

          // Calculate cost estimate (rough)
          const costEstimate =
            (message.usage.input_tokens * 3) / 1000000 + (message.usage.output_tokens * 15) / 1000000;

          // Save to database
          const dbStartTime = Date.now();
          const analysisData = {
            raw_content: rawAnalysis, // Original Claude response
            generated_at: new Date().toISOString(),
            cost_estimate: costEstimate,
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
            model: promptConfig.model, // Use configurable model from prompt system
          };

          const insertAnalysisQuery = `
            INSERT INTO movie_analyses (movie_id, analysis_type, claude_response, query_text, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
          `;
          
          const insertResult = await client.query(insertAnalysisQuery, [
            movie.id,
            'page_analysis',
            analysisData,
            `Movie page analysis for ${movie.title} (${movie.year})`
          ]);

          const dbEndTime = Date.now();
          const dbDuration = (dbEndTime - dbStartTime) / 1000;
          
          if (insertResult.rows.length > 0) {
            console.log(`💾 Saved analysis to database (${dbDuration.toFixed(2)}s) - Cost: $${costEstimate.toFixed(4)}`);
            logger.movieAnalysis(tmdbId, 'claude_analysis_saved', { 
              cost: costEstimate,
              tokens: message.usage.input_tokens + message.usage.output_tokens,
              duration: claudeDuration
            });

            // 🚀 IMMEDIATE ASYNC LINK PROCESSING - Fire and forget, no blocking
            const { triggerAsyncLinkProcessing } = await import('../../lib/async-link-processor.js');
            triggerAsyncLinkProcessing(insertResult.rows[0].id, parseInt(tmdbId));
          } else {
            console.error(`❌ Failed to save analysis to database`);
          }

          // Return fresh analysis result
          logger.movieAnalysis(tmdbId, 'completed', { 
            status: 'fresh_analysis',
            duration: Date.now() - startTime,
            source: 'claude_fresh',
            cost: costEstimate
          });
          apiLogger.apiResponse('GET', '/api/movie-analysis', 200, Date.now() - startTime);
          return res.status(200).json({
            success: true,
            analysis: rawAnalysis,
            rawAnalysis: rawAnalysis,
            movie: {
              title: movie.title,
              year: movie.year,
              tmdb_id: movie.tmdb_id
            },
            cached: false,
            source: 'claude_fresh',
            cost: costEstimate,
            timing: {
              claude: claudeDuration,
              database: dbDuration,
              total: (Date.now() - startTime) / 1000
            }
          });

        } catch (claudeError) {
          console.error('❌ Claude analysis generation failed:', claudeError);
          logger.movieAnalysis(tmdbId, 'failed', { 
            reason: 'claude_error',
            error: claudeError.message,
            duration: Date.now() - startTime 
          });
          
          // Fallback: return movie found but no analysis  
          apiLogger.apiResponse('GET', '/api/movie-analysis', 200, Date.now() - startTime);
          return res.status(200).json({
            success: true,
            movie: {
              title: movie.title,
              year: movie.year,
              tmdb_id: movie.tmdb_id
            },
            analysis: `${movie.title} (${movie.year}) is a notable film that has made significant contributions to cinema.`,
            cached: false,
            source: 'error_fallback',
            error: 'Failed to generate fresh analysis'
          });
        }
      }

      const analysis = analysisResult.rows[0];
      
      // Helper function to clean ** patterns for readable text
      function cleanMovieTitlePatterns(content) {
        if (!content || typeof content !== 'string') return content;
        
        // Pattern 1: **Movie Title** (Year) → Movie Title (Year)
        content = content.replace(/\*\*([^*]+)\*\*\s*\((\d{4})\)/g, '$1 ($2)');
        
        // Pattern 2: **Movie Title** → Movie Title  
        content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
        
        return content;
      }

      // NEW 3-TIER CONTENT SERVING LOGIC
      let analysisContent = '';
      const claudeResponse = analysis.claude_response;
      
      if (typeof claudeResponse === 'string') {
        // Tier 2: String format - clean ** patterns
        analysisContent = cleanMovieTitlePatterns(claudeResponse);
      } else if (claudeResponse && claudeResponse.processed_content && claudeResponse.processed_content.trim()) {
        // Tier 1: Processed content (HTML movie links) - BEST
        analysisContent = claudeResponse.processed_content;
      } else if (claudeResponse && claudeResponse.raw_content) {
        // Tier 2: Raw content - clean ** patterns  
        analysisContent = cleanMovieTitlePatterns(claudeResponse.raw_content);
      } else {
        // Tier 3: Fallback message
        analysisContent = 'Analysis content unavailable for this movie.';
      }

      // Log successful analysis retrieval
      logger.movieAnalysis(tmdbId, 'completed', {
        status: 'success',
        duration: Date.now() - startTime,
        source: 'database',
        analysisLength: analysisContent.length,
        analysisCreated: analysis.created_at
      });

      // Return successful response - match the format expected by MovieAnalysisWithEntities
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
        performance: {
          total_time: Date.now() - startTime,
          connect_time: connectTime,
          movie_query_time: movieQueryTime,
          analysis_query_time: analysisQueryTime
        }
      };
      
      apiLogger.apiResponse('GET', '/api/movie-analysis', 200, Date.now() - startTime, JSON.stringify(response).length);
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
    
    dbLogger.dbError('movie analysis query', [tmdbId], error);
    railwayLogger.error('Movie analysis database error', {
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
    
    apiLogger.apiResponse('GET', '/api/movie-analysis', 500, Date.now() - startTime);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'railway-postgresql',
      tmdbId: tmdbId,
      duration: Date.now() - startTime
    });
  }
}