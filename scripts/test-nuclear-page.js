#!/usr/bin/env node

/**
 * Test Nuclear Page Generator
 * 
 * Creates a single nuclear page for testing layout and features
 * Usage: node scripts/test-nuclear-page.js [tmdb_id]
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../lib/prompts/builder.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateTestNuclearPage(tmdbId) {
  try {
    console.log(`🚀 Generating test nuclear page for TMDB ID: ${tmdbId}`);
    
    // Get movie from database
    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    if (error || !movie) {
      console.error(`❌ Movie not found in database: ${tmdbId}`);
      console.log('💡 Try one of these popular movies:');
      console.log('   • The Matrix (603)');
      console.log('   • Pulp Fiction (680)');
      console.log('   • The Godfather (238)');
      console.log('   • Fight Club (550)');
      console.log('   • Inception (27205)');
      return;
    }

    console.log(`🎬 Found movie: ${movie.title} (${movie.year})`);

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('movie_analyses')
      .select('claude_response')
      .eq('movie_id', movie.id)
      .eq('analysis_type', 'page_analysis')
      .single();

    if (existingAnalysis) {
      console.log('✅ Analysis already exists! Page is nuclear-ready.');
      console.log(`🔗 Visit: http://localhost:3001/movie/${tmdbId}`);
      return;
    }

    // Generate Claude analysis
    console.log('🤖 Generating Claude analysis...');
    
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

    console.log(`💰 Analysis generated (Cost: $${cost.toFixed(4)}, Tokens: ${usage.input_tokens + usage.output_tokens})`);

    // Save analysis
    const analysisData = {
      raw_content: analysis,
      generated_at: new Date().toISOString(),
      cost_estimate: cost,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      model: 'claude-3-5-sonnet-20241022',
      test_generated: true, // Flag for test
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

    console.log('✅ Analysis saved to database!');
    console.log('');
    console.log('🎯 TEST RESULTS:');
    console.log(`📄 Movie: ${movie.title} (${movie.year})`);
    console.log(`🔗 URL: http://localhost:3001/movie/${tmdbId}`);
    console.log(`💰 Cost: $${cost.toFixed(4)}`);
    console.log(`📝 Tokens: ${usage.input_tokens + usage.output_tokens}`);
    console.log('');
    console.log('📋 What to test:');
    console.log('   ✅ Page loads instantly (should be <100ms after first visit)');
    console.log('   ✅ Full Claude analysis appears immediately');
    console.log('   ✅ "Featured Movies" section with related films');
    console.log('   ✅ "Explore Further" topics');
    console.log('   ✅ "Related Films" section at bottom');
    console.log('   ✅ No loading states - everything static');
    console.log('');
    console.log('🔄 To test nuclear vs ISR:');
    console.log('   1. Visit the URL above (nuclear page)');
    console.log('   2. Visit a random movie page (ISR page)');
    console.log('   3. Compare load times and content availability');

  } catch (error) {
    console.error('❌ Failed to generate test nuclear page:', error);
  }
}

// Get TMDB ID from command line or use default
const tmdbId = process.argv[2] || '550'; // Default to Fight Club

generateTestNuclearPage(parseInt(tmdbId));