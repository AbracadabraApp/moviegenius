#!/usr/bin/env node

/**
 * Claude Batch API Movie Analysis Regeneration
 * Processes 6,170 movies using Claude Batch API for 50% cost savings
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

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

const MOVIE_IDS_FILE = './movie-ids-to-process.json';

async function getMovieDetails(movieIds) {
  console.log(`🔍 Getting movie details for ${movieIds.length} movies...`);
  
  const movies = [];
  const batchSize = 100; // Supabase limit
  
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    
    const { data: movieBatch } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .in('id', batch);
    
    if (movieBatch) {
      movies.push(...movieBatch);
    }
    
    if ((i + batchSize) % 1000 === 0) {
      console.log(`  📦 Loaded ${Math.min(i + batchSize, movieIds.length)}/${movieIds.length} movies...`);
    }
  }
  
  console.log(`✅ Loaded ${movies.length} movie details`);
  return movies;
}

function buildBatchRequests(movies) {
  console.log(`🔧 Building batch requests for ${movies.length} movies...`);
  
  const promptConfig = buildPrompt(
    'MOVIE_ANALYSIS',
    'Include 3-4 accessibly written Explore Further topics for additional explorations'
  );

  const requests = movies.map(movie => ({
    custom_id: `movie_${movie.id}`,
    params: {
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: `${movie.title} (${movie.year})`,
        },
      ],
    },
  }));

  console.log(`✅ Built ${requests.length} batch requests`);
  return requests;
}

async function submitBatch(requests) {
  console.log(`🚀 Submitting batch of ${requests.length} requests to Claude...`);
  
  try {
    const batch = await anthropic.beta.messages.batches.create({
      requests: requests,
    });

    console.log(`✅ Batch submitted successfully!`);
    console.log(`📊 Batch ID: ${batch.id}`);
    console.log(`📊 Status: ${batch.processing_status}`);
    console.log(`📊 Request count: ${batch.request_counts?.total || requests.length}`);
    
    // Save batch info for monitoring
    const batchInfo = {
      id: batch.id,
      submitted_at: new Date().toISOString(),
      request_count: requests.length,
      status: batch.processing_status
    };
    
    writeFileSync('./batch-info.json', JSON.stringify(batchInfo, null, 2));
    console.log(`💾 Batch info saved to: ./batch-info.json`);
    
    return batch;
  } catch (error) {
    console.error('❌ Failed to submit batch:', error.message);
    throw error;
  }
}

async function waitForCompletion(batchId) {
  console.log(`⏳ Waiting for batch completion: ${batchId}`);
  console.log(`ℹ️  This may take 1-24 hours. You can stop this script and run it again later.`);
  
  let pollCount = 0;
  const startTime = Date.now();
  
  while (true) {
    try {
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      pollCount++;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
      console.log(`📊 Poll ${pollCount} (${elapsed}m): Status = ${batch.processing_status}`);
      
      if (batch.processing_status === 'completed') {
        console.log(`✅ Batch completed after ${elapsed} minutes!`);
        return batch;
      }
      
      if (batch.processing_status === 'failed') {
        console.error(`❌ Batch failed: ${batch.errors?.[0]?.message || 'Unknown error'}`);
        throw new Error('Batch processing failed');
      }
      
      // Wait 5 minutes between polls
      console.log(`⏸️  Waiting 5 minutes before next check...`);
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      
    } catch (error) {
      console.error(`⚠️  Error checking batch status: ${error.message}`);
      console.log(`🔄 Retrying in 1 minute...`);
      await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
  }
}

async function processBatchResults(batchId, movies) {
  console.log(`📥 Processing batch results for ${movies.length} movies...`);
  
  try {
    const batchResults = await anthropic.beta.messages.batches.results.retrieve(batchId);
    console.log(`📊 Retrieved ${batchResults.length} results`);
    
    let successful = 0;
    let failed = 0;
    const failures = [];
    
    for (const result of batchResults) {
      try {
        const movieId = result.custom_id.replace('movie_', '');
        const movie = movies.find(m => m.id === movieId);
        
        if (!movie) {
          console.warn(`⚠️  Movie not found for custom_id: ${result.custom_id}`);
          failed++;
          continue;
        }
        
        if (result.result.type === 'succeeded') {
          const analysis = result.result.message.content[0].text;
          const usage = result.result.message.usage;
          
          // Save analysis to database
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
          
          if (successful % 100 === 0) {
            console.log(`  ✅ Saved ${successful}/${batchResults.length} analyses...`);
          }
          
        } else {
          console.error(`❌ Analysis failed for ${movie.title}: ${result.result.error?.message}`);
          failures.push({
            movie: movie.title,
            error: result.result.error?.message
          });
          failed++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing result: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n✅ Batch processing complete!`);
    console.log(`📊 Results: ${successful} successful, ${failed} failed`);
    
    if (failures.length > 0) {
      console.log(`\n⚠️  Failed analyses:`);
      failures.slice(0, 10).forEach((failure, i) => {
        console.log(`  ${i + 1}. ${failure.movie}: ${failure.error}`);
      });
      if (failures.length > 10) {
        console.log(`  ... and ${failures.length - 10} more failures`);
      }
    }
    
    return { successful, failed, failures };
    
  } catch (error) {
    console.error('❌ Failed to process batch results:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Claude Batch API Movie Analysis Regeneration');
  console.log('💰 50% cost savings with batch processing');
  console.log('');
  
  try {
    if (command === 'submit') {
      // Step 1: Load movie IDs
      console.log('📋 Step 1: Loading movie IDs...');
      const movieIds = JSON.parse(readFileSync(MOVIE_IDS_FILE, 'utf8'));
      console.log(`✅ Loaded ${movieIds.length} movie IDs`);
      
      // Step 2: Get movie details
      console.log('\n📋 Step 2: Getting movie details...');
      const movies = await getMovieDetails(movieIds);
      
      // Step 3: Build batch requests
      console.log('\n📋 Step 3: Building batch requests...');
      const requests = buildBatchRequests(movies);
      
      // Step 4: Submit batch
      console.log('\n📋 Step 4: Submitting batch...');
      const batch = await submitBatch(requests);
      
      console.log('\n🎉 Batch submitted successfully!');
      console.log(`📊 Batch ID: ${batch.id}`);
      console.log(`\nNext: Run "node scripts/batch-regenerate.js wait" to monitor progress`);
      
    } else if (command === 'wait') {
      // Load batch info
      const batchInfo = JSON.parse(readFileSync('./batch-info.json', 'utf8'));
      console.log(`📊 Monitoring batch: ${batchInfo.id}`);
      
      // Wait for completion
      const completedBatch = await waitForCompletion(batchInfo.id);
      
      // Get movie details
      const movieIds = JSON.parse(readFileSync(MOVIE_IDS_FILE, 'utf8'));
      const movies = await getMovieDetails(movieIds);
      
      // Process results
      console.log('\n📋 Processing results...');
      await processBatchResults(completedBatch.id, movies);
      
    } else {
      console.log('Usage:');
      console.log('  node scripts/batch-regenerate.js submit   # Submit batch to Claude');
      console.log('  node scripts/batch-regenerate.js wait     # Wait for completion and process results');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();