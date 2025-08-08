/**
 * Create Test Nuclear Page API
 * 
 * Manually creates a nuclear page for testing layout and features
 * POST /api/create-test-nuclear { tmdbId: 550 }
 */

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../../lib/prompts/builder.js';

const pool = getPool();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { tmdbId } = req.body;

  if (!tmdbId) {
    return res.status(400).json({ 
      error: 'TMDB ID required',
      example: { tmdbId: 550 },
      suggestions: [
        { title: 'Fight Club', tmdbId: 550 },
        { title: 'The Matrix', tmdbId: 603 },
        { title: 'Pulp Fiction', tmdbId: 680 },
        { title: 'The Godfather', tmdbId: 238 },
        { title: 'Inception', tmdbId: 27205 }
      ]
    });
  }

  try {
    console.log(`🚀 Creating test nuclear page for TMDB ID: ${tmdbId}`);
    
    // Get movie from database
    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    if (error || !movie) {
      return res.status(404).json({
        error: `Movie not found in database: ${tmdbId}`,
        suggestions: [
          'Try Fight Club (550)',
          'Try The Matrix (603)', 
          'Try Pulp Fiction (680)',
          'Check /api/nuclear-status for available movies'
        ]
      });
    }

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('movie_analyses')
      .select('claude_response, created_at')
      .eq('movie_id', movie.id)
      .eq('analysis_type', 'page_analysis')
      .single();

    if (existingAnalysis) {
      return res.status(200).json({
        success: true,
        message: 'Nuclear page already exists!',
        movie: {
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdb_id
        },
        analysisCreated: existingAnalysis.created_at,
        url: `${req.headers.origin || 'http://localhost:3000'}/movie/${tmdbId}`,
        instructions: [
          'Visit the URL above to see the nuclear page',
          'Page should load instantly with full analysis',
          'Compare with a non-nuclear movie page for speed difference'
        ]
      });
    }

    // Generate Claude analysis
    console.log(`🤖 Generating Claude analysis for ${movie.title}...`);
    
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', 
      'Include 3-4 accessibly written Explore Further topics for additional explorations');
    
    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [{ 
        role: 'user', 
        content: `${movie.title} (${movie.year})` 
      }]
    });

    const analysis = message.content[0].text;
    const usage = message.usage;
    
    // Calculate cost
    const cost = ((usage.input_tokens * 3 / 1000000) + 
                 (usage.output_tokens * 15 / 1000000));

    // Save analysis
    const analysisData = {
      raw_content: analysis,
      generated_at: new Date().toISOString(),
      cost_estimate: cost,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      model: 'claude-3-5-sonnet-20241022',
      test_generated: true, // Flag for manual test
      entity_data: null
    };

    await supabase
      .from('movie_analyses')
      .insert({
        movie_id: movie.id,
        analysis_type: 'page_analysis',
        claude_response: analysisData,
        query_text: `Test nuclear page for ${movie.title} (${movie.year})`
      });


    // Force regeneration of static page by clearing Next.js cache
    // (This would normally happen automatically in production)
    try {
      await res.revalidate(`/movie/${tmdbId}`);
      console.log('🔄 Triggered page regeneration');
    } catch (revalidateError) {
      console.warn('⚠️ Could not trigger revalidation:', revalidateError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Nuclear page created successfully!',
      movie: {
        title: movie.title,
        year: movie.year,
        tmdbId: movie.tmdb_id
      },
      generation: {
        cost: cost,
        tokens: usage.input_tokens + usage.output_tokens,
        model: 'claude-3-5-sonnet-20241022'
      },
      url: `${req.headers.origin || 'http://localhost:3000'}/movie/${tmdbId}`,
      testInstructions: [
        '1. Visit the URL above to see the nuclear page',
        '2. Page should load instantly with full Claude analysis',
        '3. Check for "Featured Movies" and "Explore Further" sections', 
        '4. Compare load time with a random movie page (ISR)',
        '5. No loading states should appear - everything static'
      ],
      nucleaFeatures: [
        '⚡ Instant load (<100ms after first visit)',
        '📝 Full Claude analysis immediately visible',
        '🎬 Featured movies section with related films',
        '🔍 Explore Further topics for deeper dives',
        '🎭 Related Films section at bottom',
        '🚫 No loading spinners or placeholders'
      ]
    });

  } catch (error) {
    console.error('❌ Failed to create test nuclear page:', error);
    res.status(500).json({
      error: 'Failed to create nuclear page',
      details: error.message
    });
  }
}