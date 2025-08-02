#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function batchProcessDirect() {
  console.log('🎬 Processing 49 essential movies with DIRECT Claude generation...');

  // Read the test list (excluding 996)
  const testList = readFileSync(resolve(__dirname, '../PROMPT_C3_Test_LIST.txt'), 'utf-8')
    .split('\n')
    .map(id => id.trim())
    .filter(id => id && id !== '996');

  console.log(`📋 Found ${testList.length} movies to process (excluding 996)`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < testList.length; i++) {
    const tmdbId = testList[i];
    const progress = `[${i + 1}/${testList.length}]`;
    
    try {
      console.log(`\n${progress} Processing TMDB ID: ${tmdbId}`);
      
      // Find movie in database
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .eq('tmdb_id', tmdbId)
        .single();

      if (!movie) {
        console.log(`⚠️  Movie ${tmdbId} not found in database`);
        results.skipped.push({ tmdbId, reason: 'Not in database' });
        continue;
      }

      console.log(`✅ Found: "${movie.title}" (${movie.year})`);

      // Call direct API endpoint
      const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${tmdbId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const apiResult = await response.json();
      
      if (apiResult.error) {
        throw new Error(apiResult.error);
      }

      console.log(`✅ Generated ${apiResult.format} analysis`);
      console.log(`   ⏱️  Time: ${apiResult.timing.total.toFixed(1)}s | 💰 Cost: $${apiResult.cost.toFixed(4)} | 🎯 Tokens: ${apiResult.tokens.input}+${apiResult.tokens.output}`);
      
      // Show first 200 chars of analysis for verification
      const preview = apiResult.format === 'json' ? 
        JSON.stringify(JSON.parse(apiResult.analysis), null, 2).substring(0, 200) + '...' :
        apiResult.analysis.substring(0, 200) + '...';
      console.log(`   📄 Preview: ${preview}`);
      
      results.success.push({ 
        tmdbId, 
        title: movie.title, 
        format: apiResult.format,
        timing: apiResult.timing.total,
        cost: apiResult.cost,
        tokens: apiResult.tokens
      });

      // Brief pause to avoid overwhelming Claude
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Failed to process ${tmdbId}:`, error.message);
      console.error(`🛑 STOPPING BATCH - Error encountered on movie ${i + 1}/${testList.length}`);
      process.exit(1);
    }
  }

  // Print summary
  console.log('\n🎯 DIRECT BATCH PROCESSING SUMMARY');
  console.log('==================================');
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Skipped: ${results.skipped.length}`);
  console.log(`📊 Total: ${testList.length}`);

  if (results.success.length > 0) {
    const totalCost = results.success.reduce((sum, r) => sum + r.cost, 0);
    const avgTime = results.success.reduce((sum, r) => sum + r.timing, 0) / results.success.length;
    const jsonCount = results.success.filter(r => r.format === 'json').length;
    const textCount = results.success.filter(r => r.format === 'text').length;
    
    console.log('\n📊 SUCCESS METRICS:');
    console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
    console.log(`⏱️  Average time: ${avgTime.toFixed(1)}s`);
    console.log(`📄 JSON format: ${jsonCount} (${((jsonCount/results.success.length)*100).toFixed(1)}%)`);
    console.log(`📝 Text format: ${textCount} (${((textCount/results.success.length)*100).toFixed(1)}%)`);
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED MOVIES:');
    results.failed.forEach(movie => {
      console.log(`   ${movie.tmdbId}: ${movie.error}`);
    });
  }

  console.log('\n🎬 Direct batch processing complete!');
}

batchProcessDirect().catch(console.error);