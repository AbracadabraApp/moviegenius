// Railway PostgreSQL movie-analysis API endpoint - UNIFIED VERSION
// Uses the new lib/railway-db.js for all database operations

import { MovieService } from './railway-db.js';
import { logger, dbLogger, apiLogger, railwayLogger } from '../../lib/observability/logger.js';
import { processAnalysisContent } from '../../lib/movie-analysis-linker.js';

// Minimal implementation for JSON analysis link processing
async function processJsonAnalysisForLinks(parsedContent, currentMovieTitle) {
  if (!parsedContent || !parsedContent.content) {
    return { processed_content: JSON.stringify(parsedContent) };
  }

  // Minimal processing to prevent errors
  return {
    processed_content: JSON.stringify(parsedContent),
    content: parsedContent.content
  };
}

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

  try {
    // Look up movie by TMDB ID using MovieService
    const movieQueryStart = Date.now();
    let movie = await MovieService.getMovieByTMDBId(tmdbId);
    const movieQueryTime = Date.now() - movieQueryStart;
    
    if (!movie) {
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
            movie = await MovieService.getMovieByTMDBId(tmdbId);
            
            if (movie) {
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
      }
    
    logger.info('Movie found in Railway database', {
      tmdbId,
      title: movie.title,
      year: movie.year,
      movieId: movie.id
    });

    // Get existing analysis using MovieService
    const analysisQueryStart = Date.now();
    const analysis = await MovieService.getMovieAnalysis(movie.id);
    const analysisQueryTime = Date.now() - analysisQueryStart;
    
    if (!analysis) {
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

          // 🔗 PROCESS LINKS IMMEDIATELY (one time only, at creation)
          console.log(`🔗 Processing links for fresh analysis of "${movie.title}" (${movie.year})`);
          const linkProcessingStart = Date.now();

          let processedAnalysis = rawAnalysis;
          try {
            processedAnalysis = await processAnalysisContent(
              rawAnalysis,
              movie.title,
              `Fresh analysis for ${movie.title}`,
              rawAnalysis, // For KEY_CONTRIBUTORS extraction
              {
                processMovies: true,
                processContributors: true
              }
            );
            console.log(`✅ Links processed in ${Date.now() - linkProcessingStart}ms`);
          } catch (linkError) {
            console.error('⚠️ Link processing failed for fresh analysis:', linkError.message);
            processedAnalysis = rawAnalysis; // Fallback
          }

          // Save to database WITH processed links
          const dbStartTime = Date.now();
          const hasLinks = processedAnalysis.includes('<a href=');
          const linkCount = (processedAnalysis.match(/<a href=/g) || []).length;

          const analysisData = {
            raw_content: rawAnalysis,              // Original Claude response (backup)
            processed_content: processedAnalysis,  // With HTML links (primary)
            generated_at: new Date().toISOString(),
            linked_at: new Date().toISOString(),   // Links added immediately
            has_links: hasLinks,
            link_count: linkCount,
            cost_estimate: costEstimate,
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
            model: promptConfig.model,
          };

          // Save using MovieService
          const insertResult = await MovieService.upsertMovieAnalysis(movie.id, analysisData);

          const dbEndTime = Date.now();
          const dbDuration = (dbEndTime - dbStartTime) / 1000;
          
          if (insertResult) {
            console.log(`💾 Saved analysis to database (${dbDuration.toFixed(2)}s) - Cost: $${costEstimate.toFixed(4)}`);
            logger.movieAnalysis(tmdbId, 'claude_analysis_saved', {
              cost: costEstimate,
              tokens: message.usage.input_tokens + message.usage.output_tokens,
              duration: claudeDuration
            });
          } else {
            console.error(`❌ Failed to save analysis to database`);
          }

          // Return fresh analysis result with links
          logger.movieAnalysis(tmdbId, 'completed', {
            status: 'fresh_analysis',
            duration: Date.now() - startTime,
            source: 'claude_fresh',
            cost: costEstimate
          });
          apiLogger.apiResponse('GET', '/api/movie-analysis', 200, Date.now() - startTime);
          return res.status(200).json({
            success: true,
            analysis: processedAnalysis,  // Return with links
            rawAnalysis: rawAnalysis,
            movie: {
              title: movie.title,
              year: movie.year,
              tmdb_id: movie.tmdb_id
            },
            cached: false,
            source: 'claude_fresh',
            cost: costEstimate,
            hasLinks: hasLinks,
            linkCount: linkCount,
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
            analysis: null,
            cached: false,
            source: 'error_fallback',
            error: 'Failed to generate fresh analysis'
          });
        }
      }
      
      // Helper function to clean ** patterns for readable text
      function cleanMovieTitlePatterns(content) {
        if (!content || typeof content !== 'string') return content;
        
        // Pattern 1: **Movie Title** (Year) → Movie Title (Year)
        content = content.replace(/\*\*([^*]+)\*\*\s*\((\d{4})\)/g, '$1 ($2)');
        
        // Pattern 2: **Movie Title** → Movie Title  
        content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
        
        return content;
      }

      // Return analysis content - prefer display_text (with links) over claude_text (original)
      let claudeText = '';    // Original from Claude API (backup/debugging)
      let displayText = '';   // For browser display (with HTML links)

      if (analysis.claude_response) {
        if (typeof analysis.claude_response === 'string') {
          // Legacy string format (no links)
          claudeText = analysis.claude_response;
          displayText = analysis.claude_response;
        } else {
          // Object format - use descriptive variable names
          claudeText = analysis.claude_response.raw_content || '';           // From Claude API
          displayText = analysis.claude_response.processed_content || claudeText;  // For browser (prefer with links)
        }
      } else {
        claudeText = null;
        displayText = null;
      }

      // ⚡ SIMPLE READ: Just return what's in the database
      // Links were already processed and saved when the analysis was created
      if (analysis.has_links) {
        console.log(`⚡ Serving pre-linked display text (${analysis.link_count || 0} links, linked_at: ${analysis.linked_at})`);
      } else {
        console.log(`📝 Serving legacy content without links`);
      }

      // Log successful analysis retrieval
      logger.movieAnalysis(tmdbId, 'completed', {
        status: 'success',
        duration: Date.now() - startTime,
        source: 'database',
        hasLinks: analysis.has_links || false,
        linkCount: analysis.link_count || 0,
        analysisCreated: analysis.created_at
      });

    // Return successful response - serve pre-linked content
    const response = {
      success: true,
      analysis: displayText || claudeText,  // Primary: display_text (with links) for browser
      rawAnalysis: claudeText,              // Backup: claude_text (original from API)
      movie: {
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id
      },
      cached: true,
      source: 'railway-postgresql',
      hasLinks: analysis.has_links || false,
      linkCount: analysis.link_count || 0,
      performance: {
        total_time: Date.now() - startTime,
        movie_query_time: movieQueryTime,
        analysis_query_time: analysisQueryTime
      }
    };
    
    apiLogger.apiResponse('GET', '/api/movie-analysis', 200, Date.now() - startTime, JSON.stringify(response).length);
    return res.status(200).json(response);

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