#!/usr/bin/env node

/**
 * Resume Batch Processing 
 * Continue processing remaining batch results
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resumeProcessing() {
  console.log('🔄 Resuming Batch Processing');
  console.log('📊 Processing remaining batch results');
  console.log('');

  try {
    // Get batch info
    const batchInfo = JSON.parse(readFileSync('./batch-info.json', 'utf8'));
    const movieIds = JSON.parse(readFileSync('./movie-ids-to-process.json', 'utf8'));
    
    // Get movies that already have analysis (to skip)
    console.log('🔍 Finding movies that still need processing...');
    const existingAnalyses = new Set();
    const batchSize = 100;
    
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      const { data: analyses } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis')
        .in('movie_id', batch);
      
      analyses?.forEach(a => existingAnalyses.add(a.movie_id));
    }
    
    console.log(`✅ Found ${existingAnalyses.size} movies already processed`);
    console.log(`⏳ ${movieIds.length - existingAnalyses.size} movies remaining`);

    // Get movie details for all movies (for lookup)
    const movies = [];
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      const { data: movieBatch } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .in('id', batch);
      
      if (movieBatch) {
        movies.push(...movieBatch);
      }
    }

    // Process batch results, skipping already processed ones
    console.log('📥 Processing batch results...');
    const batchResults = await anthropic.beta.messages.batches.results(batchInfo.id);
    
    let successful = existingAnalyses.size; // Start from current count
    let failed = 0;
    let skipped = 0;

    for await (const result of batchResults) {
      const movieId = result.custom_id.replace('movie_', '');
      
      // Skip if already processed
      if (existingAnalyses.has(movieId)) {
        skipped++;
        continue;
      }
      
      const movie = movies.find(m => m.id === movieId);
      
      if (!movie) {
        console.warn(`⚠️  Movie not found: ${movieId}`);
        failed++;
        continue;
      }

      try {
        if (result.result.type === 'succeeded') {
          const analysis = result.result.message.content[0].text;
          const usage = result.result.message.usage;

          await supabase.from('movie_analyses').insert({
            movie_id: movie.id,
            analysis_type: 'page_analysis',
            claude_response: {
              raw_content: analysis,
              generated_at: new Date().toISOString(),
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              model: 'claude-3-5-sonnet-20241022',
              batch_generated: true,
            },
            query_text: `Batch regeneration for ${movie.title} (${movie.year})`,
          });

          successful++;
          
          if ((successful - existingAnalyses.size) % 100 === 0) {
            console.log(`  ✅ Processed ${successful - existingAnalyses.size} new analyses (${successful} total)...`);
          }
          
        } else {
          console.error(`❌ Failed: ${movie.title} - ${result.result.error?.message}`);
          failed++;
        }

      } catch (error) {
        console.error(`❌ Error saving ${movie.title}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n🎉 Batch processing complete!`);
    console.log(`✅ Total successful: ${successful}/6170`);
    console.log(`⏭️  Skipped (already processed): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (successful >= 6170) {
      console.log(`\n🎯 CRISIS FULLY RESOLVED!`);
      console.log(`✅ All 6,170 movie analyses successfully regenerated`);
      console.log(`💰 50% cost savings achieved with Claude Batch API`);
    }

  } catch (error) {
    console.error('❌ Resume processing failed:', error.message);
  }
}

resumeProcessing();