#!/usr/bin/env node

/**
 * Simple Movie Analysis Regeneration
 * Processes movies one by one with high-quality prompts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../lib/prompts/builder.js';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getMissingAnalysisMovies(limit = 10) {
  console.log('🔍 Finding movies without analysis...');
  
  // Get all movies with TMDB data
  const { data: allMovies } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id')
    .not('tmdb_id', 'is', null)
    .limit(limit * 3); // Get extra to account for filtering

  if (!allMovies?.length) {
    console.log('❌ No movies found');
    return [];
  }

  // Check which ones have analysis  
  const movieIds = allMovies.map(m => m.id);
  const { data: existingAnalyses } = await supabase
    .from('movie_analyses')
    .select('movie_id')
    .eq('analysis_type', 'page_analysis')
    .in('movie_id', movieIds);

  const analyzedIds = new Set(existingAnalyses?.map(a => a.movie_id) || []);
  const missingAnalysis = allMovies.filter(m => !analyzedIds.has(m.id));

  return missingAnalysis.slice(0, limit);
}

async function generateAnalysis(movie) {
  console.log(`🎬 Processing: ${movie.title} (${movie.year})`);
  
  try {
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-4 accessibly written Explore Further topics for additional explorations'
    );

    const response = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: `${movie.title} (${movie.year})`,
        },
      ],
    });

    const analysis = response.content[0].text;
    const usage = response.usage;

    // Save to database
    await supabase.from('movie_analyses').insert({
      movie_id: movie.id,
      analysis_type: 'page_analysis',
      claude_response: {
        raw_content: analysis,
        generated_at: new Date().toISOString(),
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        model: 'claude-3-5-sonnet-20241022',
      },
      query_text: `Regenerated analysis for ${movie.title} (${movie.year})`,
    });

    console.log(`✅ Generated analysis for ${movie.title} (${usage.input_tokens + usage.output_tokens} tokens)`);
    return { success: true, tokens: usage.input_tokens + usage.output_tokens };

  } catch (error) {
    console.error(`❌ Failed to generate analysis for ${movie.title}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args.find(arg => !isNaN(parseInt(arg)))) || 5;

  console.log(`🚀 Simple Movie Analysis Regeneration`);
  console.log(`📊 Processing ${count} movies`);
  console.log('');

  // Get movies that need analysis
  const movies = await getMissingAnalysisMovies(count);
  
  if (movies.length === 0) {
    console.log('✅ No movies need analysis');
    return;
  }

  console.log(`📋 Found ${movies.length} movies needing analysis:`);
  movies.forEach((movie, i) => {
    console.log(`  ${i + 1}. ${movie.title} (${movie.year})`);
  });
  console.log('');

  // Confirm
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const proceed = await new Promise(resolve => {
    rl.question(`❓ Generate analysis for ${movies.length} movies? (y/N): `, answer => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });

  rl.close();

  if (!proceed) {
    console.log('❌ Cancelled');
    return;
  }

  // Process movies one by one
  let successful = 0;
  let failed = 0;
  let totalTokens = 0;

  for (const [index, movie] of movies.entries()) {
    console.log(`\n[${index + 1}/${movies.length}]`);
    
    const result = await generateAnalysis(movie);
    
    if (result.success) {
      successful++;
      totalTokens += result.tokens;
    } else {
      failed++;
    }

    // Small delay to be respectful
    if (index < movies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n✅ Processing complete!');
  console.log(`📊 Results: ${successful} successful, ${failed} failed`);
  console.log(`🎯 Total tokens: ${totalTokens.toLocaleString()}`);
  
  if (failed > 0) {
    console.log('⚠️  Some analyses failed. Check logs above for details.');
  }
}

main().catch(console.error);