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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Movie title and year are required' });
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
            cached: false
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
            entityData: existingAnalysis.claude_response.entity_data?.entities || null
          };
        }

        // Generate new analysis with Claude using modular prompt system
        console.log(`🤖 Generating fresh Claude analysis for ${title} (${year})`);
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const { buildPrompt } = await import('../../lib/prompts/builder.js');
        
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Use modular prompt system for MOVIE_ANALYSIS context
        const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Include 3-5 Explore Further topics for deeper analysis');
        const userPrompt = `${title} (${year})`;

        const message = await anthropic.messages.create({
          ...promptConfig,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });

        const analysis = message.content[0].text;
        
        // Run entity detection to discover new MediaCards (but skip linking for MVP)
        let entityData = null;
        try {
          console.log(`🔍 Running entity detection for ${title} (${year}) - creating new MediaCards`);
          const { EntityDetector } = await import('../../lib/entity-linking/EntityDetector.js');
          const detector = new EntityDetector();
          entityData = await detector.detectEntities(analysis, { 
            linkPeople: false,  // Skip people linking for MVP
            linkMovies: false,  // Skip movie linking for MVP
            saveEntities: true  // But still save new entities to database
          });
          const newMoviesCount = entityData.stats?.newMoviesCreated || 0;
          console.log(`✅ Entity detection complete: ${entityData.people.length} people, ${entityData.movies.length} movies detected, ${newMoviesCount} new MediaCards created`);
        } catch (entityError) {
          console.warn('Entity detection failed:', entityError.message);
          // Continue without entity data - don't fail the whole request
        }
        
        // Calculate cost estimate (rough)
        const costEstimate = (message.usage.input_tokens * 3 / 1000000) + (message.usage.output_tokens * 15 / 1000000);
        
        // Save to database
        const analysisData = {
          raw_content: analysis,
          generated_at: new Date().toISOString(),
          cost_estimate: costEstimate,
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          model: promptConfig.model, // Use configurable model from prompt system
          entity_data: entityData ? { entities: entityData } : null
        };

        const { error: saveError } = await supabase
          .from('movie_analyses')
          .insert({
            movie_id: movie.id,
            analysis_type: 'page_analysis',
            claude_response: analysisData,
            query_text: `Movie page analysis for ${title} (${year})`
          });

        if (saveError) {
          console.error('Failed to save analysis to database:', saveError);
          // Don't fail the request, just log the error
        } else {
          console.log(`💾 Saved analysis for ${title} (${year}) - Cost: $${costEstimate.toFixed(4)}`);
        }

        // Return fresh analysis result for caching
        return {
          analysis: analysis,
          movie: { title, year },
          cached: false,
          source: 'claude_fresh',
          cost: costEstimate,
          entityData: entityData
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
      source: 'error_fallback'
    });
  }
}

// Export with cache middleware
export default withCache(movieAnalysisHandler);