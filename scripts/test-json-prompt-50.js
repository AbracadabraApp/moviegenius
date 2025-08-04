#!/usr/bin/env node

/**
 * Test JSON Prompt with 50 Diverse Movies
 * Tests the new JSON-based analysis prompt with C3 test list
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

async function loadTestMovies() {
  console.log('🎬 Loading test movies from C3 test list...');
  
  // Read TMDB IDs from test file
  const tmdbIds = readFileSync('./PROMPT_C3_Test_LIST.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !isNaN(line))
    .map(id => parseInt(id));

  console.log(`📋 Found ${tmdbIds.length} TMDB IDs`);

  // Get movie details from database
  const movies = [];
  const batchSize = 50; // All at once since it's only 50

  const { data: movieBatch, error } = await supabase
    .from('movies')
    .select('id, title, year, tmdb_id')
    .in('tmdb_id', tmdbIds)
    .not('tmdb_id', 'is', null);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  if (movieBatch) {
    movies.push(...movieBatch);
  }

  console.log(`✅ Loaded ${movies.length} movie details`);
  console.log(`📝 Sample: ${movies[0]?.title} (${movies[0]?.year})`);
  
  return movies;
}

async function createTestBatch(movies) {
  console.log(`🔧 Building batch requests for ${movies.length} movies...`);
  
  // Use the new JSON prompt
  const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Generate comprehensive JSON analysis for batch testing');

  const requests = movies.map(movie => ({
    custom_id: `test_${movie.tmdb_id}`,
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

async function submitTestBatch(requests) {
  console.log(`🚀 Submitting test batch to Claude Batch API...`);
  
  try {
    const batch = await anthropic.beta.messages.batches.create({
      requests: requests,
    });

    console.log(`✅ Test batch submitted successfully!`);
    console.log(`📊 Batch ID: ${batch.id}`);
    console.log(`📊 Status: ${batch.processing_status}`);
    console.log(`📊 Request count: ${batch.request_counts?.total || requests.length}`);
    console.log(`💰 Estimated cost: $${(requests.length * 0.04).toFixed(2)} (50% batch savings)`);
    
    // Save batch info for monitoring
    const batchInfo = {
      id: batch.id,
      submitted_at: new Date().toISOString(),
      movie_count: requests.length,
      purpose: 'C3_JSON_prompt_testing',
      estimated_cost: requests.length * 0.04
    };
    
    writeFileSync('./test-batch-info.json', JSON.stringify(batchInfo, null, 2));
    console.log(`📁 Batch info saved to test-batch-info.json`);
    
    return batch;
    
  } catch (error) {
    console.error('❌ Batch submission failed:', error.message);
    throw error;
  }
}

async function checkBatchStatus() {
  try {
    const batchInfo = JSON.parse(readFileSync('./test-batch-info.json', 'utf8'));
    console.log(`🔍 Checking status of batch: ${batchInfo.id}`);
    
    const batch = await anthropic.beta.messages.batches.retrieve(batchInfo.id);
    
    console.log(`📊 Status: ${batch.processing_status}`);
    console.log(`📊 Request counts:`, batch.request_counts);
    
    if (batch.processing_status === 'ended') {
      console.log(`✅ Batch complete! Ready to process results.`);
      console.log(`💡 Run: node scripts/process-test-results.js`);
    } else {
      console.log(`⏳ Batch still processing... Check again in a few minutes.`);
    }
    
    return batch;
    
  } catch (error) {
    console.error('❌ Failed to check batch status:', error.message);
  }
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'submit':
        const movies = await loadTestMovies();
        const requests = await createTestBatch(movies);
        await submitTestBatch(requests);
        break;
        
      case 'status':
        await checkBatchStatus();
        break;
        
      default:
        console.log(`
🧪 JSON Prompt Test Commands:

  node scripts/test-json-prompt-50.js submit   # Submit 50-movie test batch
  node scripts/test-json-prompt-50.js status   # Check batch status

Test will use movies from PROMPT_C3_Test_LIST.txt
        `);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();