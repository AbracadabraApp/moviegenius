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

  // Handle both GET (with tmdbId) and POST (with title/year) requests
  if (req.method === 'GET') {
    const { tmdbId } = req.query;
    
    if (!tmdbId) {
      return res.status(400).json({ error: 'tmdbId parameter is required for GET requests' });
    }

    // Look up movie by tmdbId to get title and year
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('title, year')
        .eq('tmdb_id', parseInt(tmdbId))
        .single();

      if (movieError || !movie) {
        // For TMDB discovery scenarios, try to create the movie entry if it doesn't exist
        try {
          console.log(`🎬 Movie ${tmdbId} not in database, attempting TMDB lookup for analysis request`);
          const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
          const { createBasicMovieEntry } = await import('../../lib/services/database-search');
          
          const tmdbMovie = await getTMDBMovieDetails(parseInt(tmdbId));
          if (tmdbMovie) {
            const newMovieEntry = await createBasicMovieEntry(tmdbMovie);
            title = newMovieEntry.title;
            year = newMovieEntry.year;
            console.log(`💾 Created movie entry for analysis: ${title} (${year})`);
          } else {
            return res.status(404).json({ error: 'Movie not found in TMDB' });
          }
        } catch (tmdbError) {
          console.log('TMDB lookup failed for analysis request:', tmdbError.message);
          return res.status(404).json({ error: 'Movie not found' });
        }
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

        // Check database cache (fallback)
        const { data: existingAnalysis, error: analysisError } = await supabase
          .from('movie_analyses')
          .select('claude_response')
          .eq('movie_id', movie.id)
          .eq('analysis_type', 'page_analysis')
          .single();

        if (existingAnalysis && !analysisError) {
          console.log(`📦 Using database cached analysis for ${title} (${year})`);
          return {
            analysis: existingAnalysis.claude_response.raw_content,
            movie: { title, year },
            cached: true,
            source: 'database',
            entityData: existingAnalysis.claude_response.entity_data?.entities || null,
          };
        }

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
      }
    );

    // Set cache headers and return result
    console.timeEnd(`🎬 API analysis for ${title} (${year})`);
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=1209600');
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
