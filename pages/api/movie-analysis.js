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
      
      const { createSupabaseClient } = await import('../../lib/supabase-client.js');
      const supabase = createSupabaseClient();

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

        /* PHASE 3 - RESTORE DYNAMIC PAGES (TMDB GENERATION) - COMMENTED OUT FOR PHASE 1
        // For TMDB discovery scenarios, try to create the movie entry if it doesn't exist
        try {
          console.log(`🔍 ENVIRONMENT DEBUG: TMDB_KEY=${!!process.env.NEXT_PUBLIC_TMDB_API_KEY}, SUPABASE_URL=${!!process.env.NEXT_PUBLIC_SUPABASE_URL}, SUPABASE_KEY=${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
          
          console.log(`🔍 Attempting dynamic import of tmdb-search service...`);
          const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
          console.log(`✅ Successfully imported getTMDBMovieDetails function`);
          
          console.log(`🔍 Attempting dynamic import of database-search service...`);
          const { createBasicMovieEntry } = await import('../../lib/services/database-search');
          console.log(`✅ Successfully imported createBasicMovieEntry function`);
          
          console.log(`🔍 Fetching TMDB details for ID ${tmdbId}...`);
          const tmdbMovie = await getTMDBMovieDetails(parseInt(tmdbId));
          console.log(`🔍 TMDB result:`, tmdbMovie ? `${tmdbMovie.title} (${tmdbMovie.release_date})` : 'null');
          
          if (tmdbMovie) {
            // Extract year from release_date for database entry
            const movieYear = tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null;
            console.log(`✅ Found TMDB movie: ${tmdbMovie.title} (${movieYear})`);
            
            // Create database entry with extracted year
            const newMovieEntry = await createBasicMovieEntry(tmdbMovie);
            title = newMovieEntry.title;
            year = movieYear; // Use extracted year, not release_date
            console.log(`💾 Created movie entry for analysis: ${title} (${year})`);
          } else {
            console.log(`❌ No TMDB movie found for ID ${tmdbId}`);
            return res.status(404).json({ error: 'Movie not found in TMDB' });
          }
        } catch (tmdbError) {
          console.error('TMDB lookup failed for analysis request:', tmdbError);
          return res.status(404).json({ 
            error: 'Movie not found in TMDB',
            details: tmdbError.message,
            tmdbId: parseInt(tmdbId)
          });
        }
        */
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

        const { createSupabaseClient } = await import('../../lib/supabase-client.js');
        const supabase = createSupabaseClient();

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

        // END OF PHASE 3 COMMENTED OUT CODE

        /* PHASE 3 - RESTORE DYNAMIC PAGES (CLAUDE ANALYSIS GENERATION) - COMMENTED OUT FOR PHASE 1
        // Generate new analysis with Claude using modular prompt system
        const processStartTime = Date.now();
        console.log(`🚀 Starting end-to-end analysis process for ${title} (${year})...`);
        
        const claudeStartTime = Date.now();
        console.log(`🤖 Generating fresh Claude analysis for ${title} (${year})`);
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
        const userPrompt = `${title} (${year})`;
        
        // DEBUG: Log the actual system prompt being sent
        console.log(`🔍 PROMPT DEBUG: System prompt for ${title} (${year}):`);
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

        // Process movie references and generate linked content
        const linkingStartTime = Date.now();
        let linkingEndTime = linkingStartTime; // Initialize to startTime as default
        let processedAnalysis = rawAnalysis;
        let movieData = null;
        try {
          console.log(`🔗 Processing movie references for ${title} (${year})...`);
          const { processAnalysisMovies } = await import('../../lib/analysis-movie-linker.js');
          
          const movieResult = await processAnalysisMovies(rawAnalysis, movie.tmdb_id);
          processedAnalysis = movieResult.processedContent;
          movieData = {
            featuredMovies: movieResult.featuredMovies,
            linkedMovies: movieResult.linkedMovies,
            allMovies: movieResult.allMovies,
            stats: {
              totalMoviesProcessed: movieResult.allMovies.length,
              featuredMoviesCount: movieResult.featuredMovies.length,
              linkedMoviesCount: movieResult.linkedMovies.length,
              newMoviesCreated: movieResult.allMovies.filter(m => !m.id).length // Movies without existing DB entry
            }
          };
          
          linkingEndTime = Date.now();
          const linkingDuration = (linkingEndTime - linkingStartTime) / 1000;
          console.log(`✅ Movie processing complete (${linkingDuration.toFixed(2)}s): ${movieData.stats.totalMoviesProcessed} movies processed, ${movieData.stats.newMoviesCreated} new movies created`);
        } catch (movieError) {
          linkingEndTime = Date.now();
          const linkingDuration = (linkingEndTime - linkingStartTime) / 1000;
          console.warn(`❌ Movie linking failed (${linkingDuration.toFixed(2)}s):`, movieError.message);
          // Continue with raw analysis - don't fail the whole request
          processedAnalysis = rawAnalysis;
        }

        // Calculate cost estimate (rough)
        const costEstimate =
          (message.usage.input_tokens * 3) / 1000000 + (message.usage.output_tokens * 15) / 1000000;

        // Generate quality metrics for monitoring
        const qualityStartTime = Date.now();
        let qualityReport = null;
        try {
          console.log(`📊 Generating quality metrics for ${title} (${year})...`);
          const { generateValidationReport } = await import('../../lib/validation/analysis-validator.js');
          qualityReport = generateValidationReport(rawAnalysis, `${title} (${year})`);
          
          const qualityEndTime = Date.now();
          const qualityDuration = (qualityEndTime - qualityStartTime) / 1000;
          console.log(`✅ Quality metrics generated (${qualityDuration.toFixed(2)}s): ${qualityReport.overallScore}/100`);
        } catch (qualityError) {
          console.warn(`⚠️ Quality metrics generation failed:`, qualityError.message);
        }

        // Save to database
        const dbStartTime = Date.now();
        const analysisData = {
          raw_content: rawAnalysis, // Original Claude response
          processed_content: processedAnalysis, // Content with HTML links
          generated_at: new Date().toISOString(),
          cost_estimate: costEstimate,
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          model: promptConfig.model, // Use configurable model from prompt system
          movie_data: movieData, // Processed movie references for Featured Films
          linking_enabled: true, // Flag to indicate this analysis has integrated linking
        };

        const { error: saveError } = await supabase.from('movie_analyses').insert({
          movie_id: movie.id,
          analysis_type: 'page_analysis',
          claude_response: analysisData,
          query_text: `Movie page analysis for ${title} (${year})`,
        });

        const dbEndTime = Date.now();
        const dbDuration = (dbEndTime - dbStartTime) / 1000;
        
        if (saveError) {
          console.error(`❌ Failed to save analysis to database (${dbDuration.toFixed(2)}s):`, saveError);
          // Don't fail the request, just log the error
        } else {
          console.log(`💾 Saved analysis to database (${dbDuration.toFixed(2)}s) - Cost: $${costEstimate.toFixed(4)}`);
          
          // Record quality metrics for monitoring (async, don't block response)
          if (qualityReport) {
            const metricsStartTime = Date.now();
            import('../../lib/analysis-quality-metrics.js').then(({ qualityMetrics }) => {
              qualityMetrics.recordAnalysisMetrics(movie.id, qualityReport, {
                model: promptConfig.model,
                cost: costEstimate,
                generationTime: claudeDuration,
                contextType: 'MOVIE_ANALYSIS'
              }).then(() => {
                const metricsEndTime = Date.now();
                const metricsDuration = (metricsEndTime - metricsStartTime) / 1000;
                console.log(`📊 Quality metrics recorded (${metricsDuration.toFixed(2)}s)`);
              }).catch(error => {
                console.warn(`⚠️ Failed to record quality metrics:`, error.message);
              });
            }).catch(error => {
              console.warn(`⚠️ Failed to import quality metrics:`, error.message);
            });
          }
        }

        // Calculate and log end-to-end timing
        const processEndTime = Date.now();
        const totalDuration = (processEndTime - processStartTime) / 1000;
        
        console.log(`🏁 END-TO-END COMPLETE (${totalDuration.toFixed(2)}s total):`);
        console.log(`   Claude generation: ${claudeDuration.toFixed(2)}s (${((claudeDuration/totalDuration)*100).toFixed(1)}%)`);
        console.log(`   Movie linking: ${((linkingEndTime || linkingStartTime) - linkingStartTime)/1000}s (${(((linkingEndTime || linkingStartTime) - linkingStartTime)/1000/totalDuration*100).toFixed(1)}%)`);
        console.log(`   Database save: ${dbDuration.toFixed(2)}s (${((dbDuration/totalDuration)*100).toFixed(1)}%)`);
        console.log(`   Cost: $${costEstimate.toFixed(4)} | Tokens: ${message.usage.input_tokens}+${message.usage.output_tokens}`);

        // Return fresh analysis result for caching
        return {
          analysis: processedAnalysis, // Return content with HTML links
          rawAnalysis: rawAnalysis, // Include original for debugging
          movie: { title, year },
          cached: false,
          source: 'claude_fresh_with_linking',
          cost: costEstimate,
          movieData: movieData, // Include movie data for Featured Films
          linkingEnabled: true,
          timing: {
            total: totalDuration,
            claude: claudeDuration,
            linking: ((linkingEndTime || linkingStartTime) - linkingStartTime) / 1000,
            database: dbDuration,
            breakdown: {
              claude: `${((claudeDuration/totalDuration)*100).toFixed(1)}%`,
              linking: `${(((linkingEndTime || linkingStartTime) - linkingStartTime)/1000/totalDuration*100).toFixed(1)}%`,
              database: `${((dbDuration/totalDuration)*100).toFixed(1)}%`
            }
          }
        };
        */
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
