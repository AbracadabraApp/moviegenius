// pages/api/movie-analysis-direct.js
/**
 * Direct Movie Analysis API Route - No Caching
 * 
 * Bypasses all caching layers and goes straight to Claude generation
 * Used for testing the new JSON prompt format
 */

import { createClient, supabase } from '../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

async function movieAnalysisDirectHandler(req, res) {
  let title, year;

  // Handle both GET (with tmdbId) and POST (with title/year) requests
  if (req.method === 'GET') {
    const { tmdbId } = req.query;
    
    if (!tmdbId) {
      return res.status(400).json({ error: 'tmdbId parameter is required for GET requests' });
    }

    // Look up movie by tmdbId to get title and year
    try {

      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .eq('tmdb_id', parseInt(tmdbId))
        .single();

      if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
      }

      title = movie.title;
      year = movie.year;
      
      // Check if analysis already exists in database
      const { data: existingAnalysis } = await supabase
        .from('movie_analyses')
        .select('id, analysis_type, claude_response')
        .eq('movie_id', movie.id)
        .eq('analysis_type', 'page_analysis')
        .single();
      
      if (existingAnalysis) {
        console.log(`📄 DIRECT: Analysis already exists for ${title} (${year}), returning existing`);
        
        const rawContent = existingAnalysis.claude_response?.raw_content || '';
        let format = 'text';
        let jsonContent = rawContent;
        
        // Check if existing is JSON format
        try {
          if (rawContent.includes('<thought_process>')) {
            const jsonStart = rawContent.indexOf('{');
            const jsonEnd = rawContent.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              jsonContent = rawContent.substring(jsonStart, jsonEnd + 1);
            }
          }
          JSON.parse(jsonContent);
          format = 'json';
        } catch (e) {
          format = 'text';
        }
        
        return res.status(200).json({
          analysis: format === 'json' ? jsonContent : rawContent,
          rawAnalysis: rawContent,
          movie: { title, year },
          cached: true,
          source: 'database_existing',
          format: format,
          cost: 0, // No cost for existing analysis
          timing: {
            total: 0,
            claude: 0,
            linking: 0,
            database: 0
          },
          tokens: {
            input: existingAnalysis.claude_response?.input_tokens || 0,
            output: existingAnalysis.claude_response?.output_tokens || 0
          }
        });
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
    console.log(`🎬 DIRECT: Starting Claude generation for ${title} (${year})...`);
    
    const claudeStartTime = Date.now();
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
    
    console.log(`✅ DIRECT: Claude analysis complete (${claudeDuration.toFixed(2)}s)`);
    
    // Log detailed cache information if available
    if (message.usage.cache_creation_input_tokens || message.usage.cache_read_input_tokens) {
      console.log(`🔄 DIRECT: Cache usage - Created: ${message.usage.cache_creation_input_tokens || 0} | Read: ${message.usage.cache_read_input_tokens || 0}`);
    }
    console.log(`📄 DIRECT: Response length: ${rawAnalysis.length} characters`);
    
    // Check if it's JSON format
    let isJsonFormat = false;
    let jsonContent = rawAnalysis;
    
    try {
      // Handle thought_process prefix if present
      if (rawAnalysis.includes('<thought_process>')) {
        const jsonStart = rawAnalysis.indexOf('{');
        const jsonEnd = rawAnalysis.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonContent = rawAnalysis.substring(jsonStart, jsonEnd + 1);
          console.log(`🔧 DIRECT: Extracted JSON from response with thought_process tags`);
        }
      }
      
      const parsedJson = JSON.parse(jsonContent);
      isJsonFormat = true;
      console.log(`✅ DIRECT: Valid JSON format detected (${parsedJson.metadata?.wordCount || 'unknown'} words)`);
    } catch (e) {
      console.log(`📝 DIRECT: Text format detected (not JSON)`);
    }

    // Calculate actual cost accounting for prompt caching
    const inputTokens = message.usage.input_tokens || 0;
    const outputTokens = message.usage.output_tokens || 0;
    const cacheCreationTokens = message.usage.cache_creation_input_tokens || 0;
    const cacheReadTokens = message.usage.cache_read_input_tokens || 0;
    
    // Standard rates: input $3/M, output $15/M, cache creation $3.75/M, cache read $0.30/M
    const freshInputTokens = inputTokens - cacheReadTokens;
    const actualCost = 
      (freshInputTokens * 3) / 1000000 +           // Fresh input tokens at standard rate
      (outputTokens * 15) / 1000000 +              // Output tokens at standard rate  
      (cacheCreationTokens * 3.75) / 1000000 +     // Cache creation at 25% premium
      (cacheReadTokens * 0.30) / 1000000;          // Cache reads at 90% discount
    
    console.log(`💰 DIRECT: Cost breakdown - Fresh input: $${((freshInputTokens * 3) / 1000000).toFixed(6)} | Output: $${((outputTokens * 15) / 1000000).toFixed(6)} | Cache read: $${((cacheReadTokens * 0.30) / 1000000).toFixed(6)} | Total: $${actualCost.toFixed(6)}`);

    // Save to database
    const dbStartTime = Date.now();
    let movie_id = null;
    
    try {
      // Get movie_id for database saving
      const { data: movieForSave } = await supabase
        .from('movies')
        .select('id')
        .eq('title', title)
        .eq('year', year)
        .single();
      
      movie_id = movieForSave?.id;
      
      if (movie_id) {
        const analysisData = {
          raw_content: rawAnalysis,
          generated_at: new Date().toISOString(),
          cost_estimate: actualCost,
          actual_cost: actualCost, // Real cost accounting for caching
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          cache_creation_input_tokens: message.usage.cache_creation_input_tokens || 0,
          cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
          model: promptConfig.model,
          direct_api_generated: true, // Flag to distinguish from cached API
        };

        // Use UPSERT to handle duplicate key constraint
        const { error: saveError } = await supabase
          .from('movie_analyses')
          .upsert({
            movie_id: movie_id,
            analysis_type: 'page_analysis',
            claude_response: analysisData,
            query_text: `Direct API analysis for ${title} (${year})`,
          }, {
            onConflict: 'movie_id,analysis_type'
          });

        if (saveError) {
          console.error(`❌ DIRECT: Failed to save analysis: ${saveError.message}`);
        } else {
          const dbDuration = (Date.now() - dbStartTime) / 1000;
          console.log(`💾 DIRECT: Saved analysis to database (${dbDuration.toFixed(2)}s)`);
        }
      }
    } catch (dbError) {
      console.error(`⚠️  DIRECT: Database save failed: ${dbError.message}`);
    }

    // Return result
    return res.status(200).json({
      analysis: isJsonFormat ? jsonContent : rawAnalysis,
      rawAnalysis: rawAnalysis,
      movie: { title, year },
      cached: false,
      source: 'claude_direct',
      format: isJsonFormat ? 'json' : 'text',
      cost: actualCost,
      timing: {
        total: claudeDuration,
        claude: claudeDuration,
        linking: 0,
        database: 0
      },
      tokens: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('🔴 DIRECT: Error generating movie analysis:', error);
    res.status(500).json({
      error: 'Failed to generate movie analysis',
      details: error.message,
      movie: { title, year }
    });
  }
}

export default movieAnalysisDirectHandler;